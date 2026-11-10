/**
 * Gemini Model Router
 *
 * gemini-3.5-flash-lite first, with gemini-3.1-flash-lite as the backup. The
 * backup is tried when the first model is rate limited, overloaded (5xx) or
 * unreachable; a rejected key or a bad request is never retried on another
 * model. Tracks timing and metadata for each attempt.
 */

import { apiLog, apiWarn, apiError } from '@/utils/debugLogger'

const DEFAULT_MODEL_PRIORITY = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] as const

// Kept as a separate export for endpoints that import it; same order.
const FLASH_LITE_PRIORITY = DEFAULT_MODEL_PRIORITY

type GeminiModel = (typeof DEFAULT_MODEL_PRIORITY)[number]

interface ModelAttempt {
    modelName: GeminiModel
    durationMs: number
    wasRateLimited: boolean
    errorMessage?: string
}

interface GeminiRouterResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    metadata: {
        chosenModel: GeminiModel | null
        totalDurationMs: number
        attempts: ModelAttempt[]
    }
}

interface GeminiRequestConfig {
    contents: any[]
    generationConfig: {
        temperature: number
        maxOutputTokens: number
    }
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(status: number, errorData: any): boolean {
    // HTTP 429
    if (status === 429) return true

    // Check error code
    if (errorData?.error?.code === 'RESOURCE_EXHAUSTED') return true

    // Check error message
    const message = errorData?.error?.message?.toLowerCase() || ''
    return message.includes('rate limit') || message.includes('quota')
}

/**
 * Call a specific Gemini model
 */
async function callGeminiModel(
    model: GeminiModel,
    config: GeminiRequestConfig,
    apiKey: string
): Promise<{ success: boolean; data?: any; status: number; errorData?: any }> {
    // The key goes in a header, not the URL: newer AI Studio keys (AQ.) are
    // accepted there, and a key in a URL can end up in logs.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(config),
        })

        const data = await response.json()

        if (!response.ok) {
            return {
                success: false,
                status: response.status,
                errorData: data,
            }
        }

        return {
            success: true,
            data,
            status: response.status,
        }
    } catch (error) {
        return {
            success: false,
            status: 500,
            errorData: { error: { message: (error as Error).message } },
        }
    }
}

/**
 * Try all models in sequence, falling back on rate limits
 */
async function tryModels(
    config: GeminiRequestConfig,
    apiKey: string,
    passNumber: number,
    modelPriority: readonly GeminiModel[]
): Promise<{
    success: boolean
    data?: any
    chosenModel: GeminiModel | null
    attempts: ModelAttempt[]
}> {
    const attempts: ModelAttempt[] = []

    for (const model of modelPriority) {
        const attemptStart = Date.now()

        apiLog(`[Gemini Router] Pass ${passNumber}: Trying ${model}...`, config.generationConfig)

        const result = await callGeminiModel(model, config, apiKey)
        const attemptEnd = Date.now()
        const durationMs = attemptEnd - attemptStart

        if (result.success) {
            // Success!
            attempts.push({
                modelName: model,
                durationMs,
                wasRateLimited: false,
            })

            apiLog(`[Gemini Router] ✓ Success with ${model} (${durationMs}ms)`)

            return {
                success: true,
                data: result.data,
                chosenModel: model,
                attempts,
            }
        }

        // Check if rate limited
        const wasRateLimited = isRateLimitError(result.status, result.errorData)

        attempts.push({
            modelName: model,
            durationMs,
            wasRateLimited,
            errorMessage: result.errorData?.error?.message || `HTTP ${result.status}`,
        })

        // Overloaded or unreachable: the backup model may still answer.
        const unavailable = result.status === 0 || result.status >= 500

        if (wasRateLimited || unavailable) {
            apiWarn(
                `[Gemini Router] ✗ ${wasRateLimited ? 'Rate limit' : `HTTP ${result.status}`} on ${model} (${durationMs}ms) - falling back to next model`
            )
            // Continue to next model
        } else {
            // Non-rate-limit error - surface it
            apiError(
                `[Gemini Router] ✗ Error on ${model} (${durationMs}ms):`,
                result.errorData?.error?.message
            )

            return {
                success: false,
                chosenModel: null,
                attempts,
            }
        }
    }

    // All models were rate limited
    apiWarn(`[Gemini Router] All models rate-limited on pass ${passNumber}`)

    return {
        success: false,
        chosenModel: null,
        attempts,
    }
}

/**
 * Main router function - tries models with automatic fallback
 *
 * @param config - Gemini API request configuration
 * @param apiKey - Gemini API key
 * @param modelPriority - Optional custom model priority order (defaults to DEFAULT_MODEL_PRIORITY)
 */
export async function routeGeminiRequest<T = any>(
    config: GeminiRequestConfig,
    apiKey: string,
    modelPriority: readonly GeminiModel[] = DEFAULT_MODEL_PRIORITY
): Promise<GeminiRouterResponse<T>> {
    const globalStart = Date.now()

    apiLog('[Gemini Router] Starting request with fallback chain', {
        priorityModel: modelPriority[0],
    })

    // First pass
    const firstPass = await tryModels(config, apiKey, 1, modelPriority)

    if (firstPass.success) {
        const totalDurationMs = Date.now() - globalStart

        return {
            success: true,
            data: firstPass.data,
            metadata: {
                chosenModel: firstPass.chosenModel,
                totalDurationMs,
                attempts: firstPass.attempts,
            },
        }
    }

    // Check if all were rate limited
    const allRateLimited = firstPass.attempts.every((a) => a.wasRateLimited)

    if (!allRateLimited) {
        // Non-rate-limit error occurred - don't retry
        const totalDurationMs = Date.now() - globalStart

        return {
            success: false,
            error:
                firstPass.attempts[firstPass.attempts.length - 1]?.errorMessage || 'Request failed',
            metadata: {
                chosenModel: null,
                totalDurationMs,
                attempts: firstPass.attempts,
            },
        }
    }

    // All models rate-limited - wait and retry
    apiWarn('[Gemini Router] All models rate-limited - waiting 7 seconds before retry')
    await new Promise((resolve) => setTimeout(resolve, 7000)) // Wait 7 seconds

    // Second pass
    const secondPass = await tryModels(config, apiKey, 2, modelPriority)

    const totalDurationMs = Date.now() - globalStart
    const allAttempts = [...firstPass.attempts, ...secondPass.attempts]

    if (secondPass.success) {
        return {
            success: true,
            data: secondPass.data,
            metadata: {
                chosenModel: secondPass.chosenModel,
                totalDurationMs,
                attempts: allAttempts,
            },
        }
    }

    // Still failed after retry
    const allStillRateLimited = secondPass.attempts.every((a) => a.wasRateLimited)

    if (allStillRateLimited) {
        apiError('[Gemini Router] All models still rate-limited after retry')

        return {
            success: false,
            error: 'The system is temporarily busy due to rate limits. Please try again soon.',
            metadata: {
                chosenModel: null,
                totalDurationMs,
                attempts: allAttempts,
            },
        }
    }

    // Non-rate-limit error on second pass
    return {
        success: false,
        error:
            secondPass.attempts[secondPass.attempts.length - 1]?.errorMessage ||
            'Request failed after retry',
        metadata: {
            chosenModel: null,
            totalDurationMs,
            attempts: allAttempts,
        },
    }
}

/**
 * Helper to extract text from Gemini response
 */
export function extractGeminiText(data: any): string | null {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null
}

/**
 * Export model priority configurations for use in specific endpoints
 */
export { FLASH_LITE_PRIORITY, DEFAULT_MODEL_PRIORITY }
