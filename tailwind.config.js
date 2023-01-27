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
        },
    },
    plugins: [
        require('tailwindcss-textshadow'),
        require('tailwind-scrollbar-hide'),
        require('tailwind-scrollbar')({ nocompatible: true }),
    ],
}
