// Serves uploaded images from the R2 bucket (UPLOADS) at /uploads/<key>,
// before Next runs. lib/uploads.ts decides what can be uploaded.

const UPLOAD_PATH = /^\/uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.[a-z0-9]+$/

export function isUploadPath(pathname: string): boolean {
    return UPLOAD_PATH.test(pathname)
}

/** The stored image, or a 404. Keys are random and never rewritten, so browsers keep them. */
export async function serveUpload(request: Request, bucket: R2Bucket): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    if (!isUploadPath(pathname)) return new Response('Not found', { status: 404 })
    const object = await bucket.get(pathname.slice(1), {
        onlyIf: request.headers,
        range: request.headers,
    })
    if (!object) return new Response('Not found', { status: 404 })
    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('ETag', object.httpEtag)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    // Served from the site's own origin: never sniffed or run as a page.
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
    if (!('body' in object)) return new Response(null, { status: 304, headers })
    return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}

/**
 * The ASSETS binding as Next's image optimizer sees it: OpenNext reads local
 * images (`/uploads/...` included) through ASSETS, so uploads are answered
 * from R2 and everything else from the static assets.
 */
export function assetsWithUploads(assets: Fetcher, bucket: R2Bucket): Fetcher {
    return new Proxy(assets, {
        get(target, property, receiver) {
            if (property === 'fetch') {
                return (input: RequestInfo | URL, init?: RequestInit) => {
                    const request = new Request(input, init)
                    if (isUploadPath(new URL(request.url).pathname))
                        return serveUpload(request, bucket)
                    return target.fetch(request)
                }
            }
            return Reflect.get(target, property, receiver)
        },
    })
}
