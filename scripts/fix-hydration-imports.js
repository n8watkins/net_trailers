#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Files that need to be updated
const filesToUpdate = [
    'hooks/useAuth.tsx',
    'components/Banner.tsx',
    'pages/index.tsx',
    'components/SearchResults.tsx',
    'pages/watchlists.tsx',
    'pages/liked.tsx',
    'pages/hidden.tsx',
    'components/Modal.tsx',
    'components/SearchFiltersDropdown.tsx',
    'components/SearchFilters.tsx',
    'components/SearchBar.tsx',
    'components/ContentImage.tsx',
    'components/ContentCard.tsx',
    'components/ListDropdown.tsx',
    'components/LikeOptions.tsx',
    'components/SimpleLikeButton.tsx',
]

const projectRoot = path.join(__dirname, '..')

console.log('🔧 Fixing hydration imports in all components...\n')

filesToUpdate.forEach((file) => {
    const filePath = path.join(projectRoot, file)

    try {
        let content = fs.readFileSync(filePath, 'utf8')
        const originalContent = content

        // Replace the import statement
        content = content.replace(
            /import\s*{\s*useAppStore\s*}\s*from\s*['"]\.\.\/stores\/appStore['"]/g,
            "import { useAppStoreHydrated as useAppStore } from '../hooks/useAppStoreHydrated'"
        )

        // Also handle relative paths from pages directory
        content = content.replace(
            /import\s*{\s*useAppStore\s*}\s*from\s*['"]\.\.\/\.\.\/stores\/appStore['"]/g,
            "import { useAppStoreHydrated as useAppStore } from '../../hooks/useAppStoreHydrated'"
        )

        // Handle different relative paths
        content = content.replace(
            /import\s*{\s*useAppStore\s*}\s*from\s*['"]\.\/stores\/appStore['"]/g,
            "import { useAppStoreHydrated as useAppStore } from './hooks/useAppStoreHydrated'"
        )

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8')
            console.log(`✅ Updated: ${file}`)
        } else {
            console.log(`⏭️  Skipped: ${file} (no changes needed)`)
        }
    } catch (error) {
        console.error(`❌ Error processing ${file}:`, error.message)
    }
})

console.log('\n✨ Import fix complete!')
