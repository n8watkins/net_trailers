import { cloudflareEnv } from './cloudflare/env'
import { requestOrigin } from './requestOrigin'

/**
 * Fetches one of the app's own routes from the server (the home page's rows,
 * a shared collection's metadata). On Cloudflare it goes through the Worker's
 * service binding to itself (WORKER_SELF_REFERENCE), with no trip over the
 * public internet; elsewhere (next dev, next start) it is a plain fetch to the
 * request's own origin.
 */
export async function selfFetch(path: string, init?: RequestInit): Promise<Response> {
    const url = new URL(path, await requestOrigin())
    const self = cloudflareEnv()?.WORKER_SELF_REFERENCE
    if (self) return self.fetch(new Request(url, init))
    return fetch(url, init)
}
