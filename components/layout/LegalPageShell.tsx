'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import SubPageLayout from './SubPageLayout'

interface LegalPageShellProps {
    title: string
    lastUpdated: string
    children: ReactNode
}

/**
 * The shared sub-page frame (header, navigation, even side margins) for the
 * long-form legal pages, with the NetTrailers mark beside the title as on the
 * Security page. The pages stay server components so they keep their metadata.
 */
export default function LegalPageShell({ title, lastUpdated, children }: LegalPageShellProps) {
    return (
        <SubPageLayout
            title={title}
            icon={
                <Image
                    src="/nettrailers-mark.svg"
                    width={28}
                    height={28}
                    alt=""
                    unoptimized
                    className="h-7 w-7"
                />
            }
            description={`Last updated: ${lastUpdated}`}
        >
            <div className="max-w-4xl">{children}</div>
        </SubPageLayout>
    )
}
