import React from 'react'
import { Tooltip, TooltipProps } from '@mui/material'

interface ToolTipModProps {
    children: React.ReactElement
    title: string
    anchorEl?: HTMLElement | null
}

function ToolTipMod({ children, title }: ToolTipModProps) {
    return (
        <Tooltip
            title={title}
            placement="top"
            arrow
            enterDelay={200}
            leaveDelay={0}
            componentsProps={{
                popper: {
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 15, 0, 0],
                            },
                        },
                    ],
                },

                arrow: {
                    sx: {
                        color: '#4A4A4A',
                        '&::before': {
                            backgroundColor: 'white',
                        },
                    },
                },
                tooltip: {
                    sx: {
                        color: '#141414',
                        fontSize: '1.3rem',
                        fontWeight: '600',
                        backgroundColor: 'white',
                        border: '1px solid white',
                        boxShadow: '5px 5px 20px black',
                    },
                },
            }}
        >
            {children}
        </Tooltip>
    )
}

export default ToolTipMod
