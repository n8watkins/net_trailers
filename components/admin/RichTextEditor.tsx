'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import {
    BoldIcon,
    ItalicIcon,
    UnderlineIcon,
    ListBulletIcon,
    NumberedListIcon,
    LinkIcon,
} from '@heroicons/react/24/outline'
import { useEffect } from 'react'

interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    placeholder?: string
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    style: 'color: #3b82f6; text-decoration: underline;',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3',
                style: 'color: #fff;',
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML())
        },
    })

    // Update editor content when value changes externally
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value)
        }
    }, [value, editor])

    if (!editor) {
        return null
    }

    const setLink = () => {
        const url = window.prompt('Enter URL:')
        if (url) {
            editor.chain().focus().setLink({ href: url }).run()
        }
    }

    const ToolbarButton = ({
        onClick,
        active,
        children,
        title,
    }: {
        onClick: () => void
        active?: boolean
        children: React.ReactNode
        title: string
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`rounded p-2 transition-colors ${
                active
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
        >
            {children}
        </button>
    )

    return (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-1 border-b border-gray-700 bg-gray-850 p-2">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <BoldIcon className="h-5 w-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <ItalicIcon className="h-5 w-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon className="h-5 w-5" />
                </ToolbarButton>

                <div className="mx-2 w-px bg-gray-700" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive('heading', { level: 2 })}
                    title="Heading"
                >
                    <span className="text-sm font-bold">H2</span>
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    active={editor.isActive('heading', { level: 3 })}
                    title="Subheading"
                >
                    <span className="text-sm font-bold">H3</span>
                </ToolbarButton>

                <div className="mx-2 w-px bg-gray-700" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    title="Bullet List"
                >
                    <ListBulletIcon className="h-5 w-5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    title="Numbered List"
                >
                    <NumberedListIcon className="h-5 w-5" />
                </ToolbarButton>

                <div className="mx-2 w-px bg-gray-700" />

                <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Add Link">
                    <LinkIcon className="h-5 w-5" />
                </ToolbarButton>

                {editor.isActive('link') && (
                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        title="Remove Link"
                    >
                        <span className="text-xs">×</span>
                    </ToolbarButton>
                )}
            </div>

            {/* Editor */}
            <EditorContent
                editor={editor}
                className="prose-headings:text-white prose-p:text-white prose-strong:text-white prose-em:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white"
            />

            {!editor.getText() && placeholder && (
                <div className="pointer-events-none absolute left-4 top-[60px] text-gray-500">
                    {placeholder}
                </div>
            )}
        </div>
    )
}
