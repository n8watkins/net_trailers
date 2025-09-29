#!/usr/bin/env node

/**
 * Script to help migrate from Recoil to Zustand
 * This will update common imports and patterns
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// Files to process
const files = [
    './components/Banner.tsx',
    './components/ContentCard.tsx',
    './components/ContentImage.tsx',
    './components/LikeOptions.tsx',
    './components/ListDropdown.tsx',
    './components/Row.tsx',
    './components/SearchBar.tsx',
    './components/SearchFilters.tsx',
    './components/SearchFiltersDropdown.tsx',
    './components/SearchResults.tsx',
    './components/SimpleLikeButton.tsx',
    './components/WatchLaterButton.tsx',
]

// Common replacements
const replacements = [
    // Remove Recoil imports
    {
        from: /import\s*{\s*useRecoilState\s*,?\s*useRecoilValue\s*}\s*from\s*['"]recoil['"]/g,
        to: '',
    },
    {
        from: /import\s*{\s*useRecoilState\s*}\s*from\s*['"]recoil['"]/g,
        to: '',
    },
    {
        from: /import\s*{\s*useRecoilValue\s*}\s*from\s*['"]recoil['"]/g,
        to: '',
    },

    // Replace modal atom imports
    {
        from: /import\s*{\s*modalState.*?}\s*from\s*['"]\.\.\/atoms\/modalAtom['"]/g,
        to: "import { useAppStore } from '../stores/appStore'",
    },

    // Replace list modal atom imports
    {
        from: /import\s*{\s*listModalState\s*}\s*from\s*['"]\.\.\/atoms\/listModalAtom['"]/g,
        to: "import { useAppStore } from '../stores/appStore'",
    },

    // Replace user data atom imports
    {
        from: /import\s*{\s*.*?\s*}\s*from\s*['"]\.\.\/atoms\/userDataAtom['"]/g,
        to: '',
    },

    // Replace error atom imports
    {
        from: /import\s*{\s*loadingState\s*}\s*from\s*['"]\.\.\/atoms\/errorAtom['"]/g,
        to: '',
    },

    // Replace search atom imports
    {
        from: /import\s*{\s*searchState.*?}\s*from\s*['"]\.\.\/atoms\/searchAtom['"]/g,
        to: "import { useAppStore } from '../stores/appStore'",
    },

    // Replace useRecoilState usage for modal
    {
        from: /const\s*\[showModal,\s*setShowModal\]\s*=\s*useRecoilState\(modalState\)/g,
        to: 'const { modal: { isOpen: showModal }, openModal, closeModal } = useAppStore()',
    },

    // Replace useRecoilState usage for list modal
    {
        from: /const\s*\[listModal,\s*setListModal\]\s*=\s*useRecoilState\(listModalState\)/g,
        to: 'const { listModal, openListModal, closeListModal } = useAppStore()',
    },

    // Update setShowModal calls
    {
        from: /setShowModal\(true\)/g,
        to: 'openModal(content)',
    },
    {
        from: /setShowModal\(false\)/g,
        to: 'closeModal()',
    },
]

function processFile(filePath) {
    console.log(`Processing ${filePath}...`)

    try {
        let content = fs.readFileSync(filePath, 'utf8')
        let modified = false

        replacements.forEach(({ from, to }) => {
            const newContent = content.replace(from, to)
            if (newContent !== content) {
                content = newContent
                modified = true
            }
        })

        if (modified) {
            // Clean up multiple blank lines
            content = content.replace(/\n\n\n+/g, '\n\n')

            fs.writeFileSync(filePath, content)
            console.log(`✅ Updated ${filePath}`)
        } else {
            console.log(`⏭️  No changes needed for ${filePath}`)
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message)
    }
}

// Process all files
files.forEach(processFile)

console.log('\n🎉 Migration helper complete!')
console.log(
    'Note: This script makes basic replacements. Manual review and additional fixes may be needed.'
)
