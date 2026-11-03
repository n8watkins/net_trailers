// Markdown imported as text at build time (`with { turbopackModuleType: 'raw' }`).
declare module '*.md' {
    const content: string
    export default content
}
