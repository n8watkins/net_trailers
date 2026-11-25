import type { ReactNode } from 'react'

/**
 * The inline Markdown the changelog uses: **bold**, `code`, _italic_ and
 * [links](https://...). Rendered as elements, never as HTML, so nothing in
 * the file can inject markup.
 */
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|(?<![\w*])_[^_]+_(?![\w]))/

export default function ChangelogInline({ text }: { text: string }) {
    return <>{renderInline(text)}</>
}

export function renderInline(text: string): ReactNode[] {
    return text
        .split(TOKEN)
        .filter((part) => part !== '')
        .map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                return (
                    <strong key={i} className="font-semibold text-white">
                        {part.slice(2, -2)}
                    </strong>
                )
            }
            if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
                return (
                    <code
                        key={i}
                        className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[0.85em] text-zinc-200"
                    >
                        {part.slice(1, -1)}
                    </code>
                )
            }
            const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
            if (link) {
                const [, label, href] = link
                if (!/^https:\/\//.test(href)) return <span key={i}>{label}</span>
                return (
                    <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded font-medium text-brand-400 underline-offset-2 hover:text-brand-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                        {label}
                    </a>
                )
            }
            if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
                return <em key={i}>{part.slice(1, -1)}</em>
            }
            return <span key={i}>{part}</span>
        })
}
