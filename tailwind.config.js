/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
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
                'more-info':
                    'linear-gradient(to bottom,rgba(20,20,20,0) 0,rgba(20,20,20,.15) 15%,rgba(20,20,20,.25) 30%,rgba(20,20,20,.3) 50%,#141414 100%);',
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
        require('tailwindcss-textshadow'),
        require('tailwind-scrollbar-hide'),
        require('tailwind-scrollbar')({ nocompatible: true }),
        require('tailwindcss-autofill'),
        require('tailwindcss-shadow-fill'),
    ],
}
