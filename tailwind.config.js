/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        screens: {
            xs: '375px',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '2xl': '1536px',
        },
        extend: {
            animation: {
                // bounceOnce: 'bounce 1s',
                scaleUp: 'scaleUp .75s',
                yee: 'yee .75s',
                boo: 'boo .75s',
                heartBeat: 'heartBeat 0.8s ease-in-out',
            },
            keyframes: {
                // bounceOnce: {
                //     '0%, 100%': {
                //         transform: 'translateY(25)',
                //         animationTimingFunction: 'cubic-bezier(0, 0, 0, 0)',
                //     },
                // },
                scaleUp: {
                    '0%': {
                        transform: 'scale(1)',
                    },
                    '50%': {
                        transform: 'scale(2)',
                    },
                    '100%': {
                        transform: 'scale(1)',
                    },
                },
                boo: {
                    '0%': {
                        transform: 'scale(1)',
                    },
                    '50%': {
                        transform: 'scale(1.5)',
                        transform: 'translateY(1em)',
                    },
                    '100%': {
                        transform: 'scale(1)',
                    },
                },
                yee: {
                    '0%': {
                        transform: 'scale(1)',
                    },
                    '50%': {
                        transform: 'scale(1.5)',
                        transform: 'translateY(-1em)',
                    },
                    '100%': {
                        transform: 'scale(1)',
                    },
                },
                heartBeat: {
                    '0%': {
                        transform: 'scale(1)',
                    },
                    '14%': {
                        transform: 'scale(1.3)',
                    },
                    '28%': {
                        transform: 'scale(1)',
                    },
                    '42%': {
                        transform: 'scale(1.3)',
                    },
                    '70%': {
                        transform: 'scale(1)',
                    },
                },
            },
            scale: {
                102: '1.02',
            },

            textShadow: {
                '3xl': '0 0 3px rgba(0, 0, 0, .8), 0 0 5px rgba(0, 0, 0, .9)',
                yellow: '0 0 2px #fbbf24, 0 0 5px #fbbf24',
                yel: 'rgb(255 204 0) 1px 0px 1px',
            },
            fontFamily: {
                russo: ['Russo One'],
                fancy: ['Dancing Script'],
                lex: ['Lexend Deca', 'sans-serif'],
            },
            backgroundImage: {
                moreInfo:
                    'linear-gradient(to bottom,rgba(20,20,20,0) 0,rgba(20,20,20,0) 50%,rgba(20,20,20, 10%) 70%,rgba(20,20,20, 100%) 80%,rgba(20,20,20,100%))',
            },
            dropShadow: {
                '3xl': '0 35px 35px rgba(0, 0, 0, 0.25)',
                '4xl': '16px 16px 20px black',
            },
            boxShadow: {
                '3xl': '10px 10px 60px -15px rgba(0, 0, 0,.9)',
                extra: '0px 25px 50px -12px rgba(0, 0, 0, 0.25)',
            },
            // Custom z-index scale for consistent layering
            // See docs/Z_INDEX_HIERARCHY.md for full documentation
            zIndex: {
                // Dropdowns & overlays
                dropdown: '110',
                'mobile-backdrop': '105',
                // Fixed navigation
                header: '200',
                // Above header elements
                'dropdown-above': '250',
                // Inline pickers
                picker: '1500',
                // Debug tools (dev only)
                debug: '9999',
                // Auth modal
                auth: '9999',
                // Settings modal
                settings: '10000',
                // Standard modals
                modal: '50000',
                // Nested/list selection modals
                'modal-nested': '55000',
                // Collection builder
                'modal-builder': '56000',
                // Delete confirmation
                'modal-delete': '60000',
                // Editor modal layers
                'modal-editor-bg': '99998',
                'modal-editor': '99999',
                'modal-editor-inner': '100000',
                // Top layer (toast, critical)
                toast: '100001',
            },
        },
    },
    plugins: [
        require('tailwind-scrollbar-hide'),
        require('tailwind-scrollbar')({ nocompatible: true }),
        require('tailwindcss-autofill'),
        require('tailwindcss-shadow-fill'),
    ],
}
