/**
 * @jest-environment node
 *
 * Parsing Gemini's smart-search reply (utils/gemini/responseParser.ts).
 */

import { extractJsonObject, parseGeminiResponse } from '../../utils/gemini/responseParser'

const reply = {
    movies: [{ title: 'Knives Out', year: 2019 }],
    rowName: 'Rainy Day Sleuthing',
    mediaType: 'movie',
    genreFallback: [9648],
}

describe('extractJsonObject', () => {
    it('reads plain JSON and JSON in a code fence', () => {
        expect(extractJsonObject(JSON.stringify(reply))).toEqual(reply)
        expect(extractJsonObject('```json\n' + JSON.stringify(reply) + '\n```')).toEqual(reply)
    })

    it('reads the object when a sentence comes before or after it', () => {
        expect(
            extractJsonObject(`Here you go:\n${JSON.stringify(reply)}\nEnjoy the mysteries!`)
        ).toEqual(reply)
    })

    it('still fails on a reply that holds no complete object', () => {
        expect(() => extractJsonObject('{"movies": [{"title": "Clue", "year')).toThrow()
    })
})

describe('parseGeminiResponse', () => {
    it('keeps the fields and falls back for an unknown emoji and colour', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
        const parsed = parseGeminiResponse(JSON.stringify({ ...reply, emoji: '☕', color: 'x' }))
        expect(parsed).toMatchObject({
            movies: reply.movies,
            rowName: reply.rowName,
            mediaType: 'movie',
            emoji: '🎬',
            color: '#ef4444',
        })
        warn.mockRestore()
    })

    it('logs one short line and throws a plain error for an unreadable reply', () => {
        const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
        expect(() => parseGeminiResponse('{"movies": [')).toThrow('Failed to parse AI response')
        expect(error).toHaveBeenCalledTimes(1)
        expect(error.mock.calls[0][0]).toMatch(/Failed to parse Gemini response \(12 chars\)/)
        error.mockRestore()
    })
})
