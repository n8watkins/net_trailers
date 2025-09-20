/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            animation: {
                // bounceOnce: 'bounce 1s',
                scaleUp: 'scaleUp .75s',
                yee: 'yee .75s',
                boo: 'boo .75s',
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
            },
            scale: {
                '102': '1.02',
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
        },
    },
    plugins: [
        require('tailwind-scrollbar-hide'),
        require('tailwind-scrollbar')({ nocompatible: true }),
        require('tailwindcss-autofill'),
        require('tailwindcss-shadow-fill'),
        require('@tailwindcss/line-clamp'),
    ],
}
