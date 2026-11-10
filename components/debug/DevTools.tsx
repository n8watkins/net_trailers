'use client'

import DebugControls from './DebugControls'
import WebVitalsHUD from './WebVitalsHUD'

/** Development-only overlays, loaded by app/providers.tsx under `next dev` only. */
export default function DevTools() {
    return (
        <>
            <DebugControls />
            <WebVitalsHUD />
        </>
    )
}
