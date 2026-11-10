import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * What the app's own code reads from the Worker's bindings (wrangler.jsonc).
 * The full, generated types (cloudflare-env.d.ts) belong to the worker/
 * TypeScript project, whose runtime types would clash with the DOM ones here,
 * so this is the narrow shape the app relies on; __tests__/worker/crons.test.ts
 * checks that wrangler.jsonc has these bindings.
 */
export interface AppBindings {
    /** Uploaded images (lib/uploads.ts). */
    UPLOADS?: {
        put(
            key: string,
            value: ArrayBuffer,
            options?: { httpMetadata?: { contentType?: string } }
        ): Promise<unknown>
        delete(key: string): Promise<void>
    }
    /** Cloudflare Email Service (lib/email/cloudflare.ts). */
    EMAIL?: import('@/lib/email/cloudflare').EmailBinding
    /** The Worker itself, for the server's calls to its own API (lib/selfFetch.ts). */
    WORKER_SELF_REFERENCE?: { fetch(request: Request): Promise<Response> }
}

/**
 * The Worker's bindings for the current request, or undefined off Workers
 * (next dev, next start, tests), where callers fall back or answer that the
 * feature isn't available.
 */
export function cloudflareEnv(): AppBindings | undefined {
    try {
        return getCloudflareContext().env as AppBindings
    } catch {
        return undefined
    }
}
