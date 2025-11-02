const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    collectCoverageFrom: [
        'components/**/*.{js,jsx,ts,tsx}',
        'hooks/**/*.{js,jsx,ts,tsx}',
        'utils/**/*.{js,jsx,ts,tsx}',
        'stores/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
        'app/**/*.{js,jsx,ts,tsx}',
        '!app/layout.tsx',
        '!app/**/layout.tsx',
        '!app/**/loading.tsx',
        '!app/**/error.tsx',
        '!app/**/not-found.tsx',
        '!app/api/**',
        '!**/*.d.ts',
        '!**/node_modules/**',
    ],
    testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
    moduleNameMapper: {
        // Handle module aliases (if you use them in your Next.js app)
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
        '^@/utils/(.*)$': '<rootDir>/utils/$1',
        '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
        '^@/stores/(.*)$': '<rootDir>/stores/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
    },
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
