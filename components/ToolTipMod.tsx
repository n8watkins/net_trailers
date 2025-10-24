import React from 'react'
import { Tooltip, TooltipProps } from '@mui/material'

interface ToolTipModProps {
    children: React.ReactElement
    title: string
    anchorEl?: HTMLElement | null
}

function ToolTipMod({ children, title }: ToolTipModProps) {
    // Don't render tooltip if title is empty
    if (!title) {
        return children
    }

    return (
        <Tooltip
            title={title}
            placement="top"
            arrow
            enterDelay={200}
            leaveDelay={0}
            disableInteractive={false}
            PopperProps={{
                sx: {
                    zIndex: 60000, // Higher than modal's 50000
                },
                container: typeof document !== 'undefined' ? document.body : undefined,
                modifiers: [
                    {
                        name: 'offset',
                        options: {
                            offset: [0, 10],
                        },
                    },
                    {
                        name: 'preventOverflow',
                        options: {
                            boundary: 'viewport',
                        },
                    },
                ],
            }}
            slotProps={{
                arrow: {
                    sx: {
                        color: 'white',
                    },
                },
                tooltip: {
                    sx: {
                        color: '#141414',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        backgroundColor: 'white',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    },
                },
            }}
        >
            {children}
        </Tooltip>
    )
}

export default ToolTipMod
