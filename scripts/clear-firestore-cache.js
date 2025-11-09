/**
 * Clear Firestore IndexedDB Cache
 *
 * Run this script to clear corrupted Firestore persistent cache.
 * This fixes the "INTERNAL ASSERTION FAILED: Unexpected state (ID: ca9)" error.
 *
 * Usage: node scripts/clear-firestore-cache.js
 */

console.log('🧹 Clearing Firestore IndexedDB cache...\n')

console.log('Please follow these steps in your browser:\n')
console.log('1. Open Chrome DevTools (F12)')
console.log('2. Go to the "Application" tab')
console.log('3. In the left sidebar, expand "Storage" → "IndexedDB"')
console.log('4. Look for databases starting with "firestore/"')
console.log('5. Right-click each one and select "Delete database"')
console.log('6. Refresh the page\n')

console.log('Alternatively, run this in your browser console:\n')
console.log(`
// Delete all Firestore IndexedDB databases
indexedDB.databases().then(dbs => {
    dbs.forEach(db => {
        if (db.name.startsWith('firestore/')) {
            console.log('Deleting:', db.name)
            indexedDB.deleteDatabase(db.name)
        }
    })
    console.log('✅ Cache cleared! Refresh the page.')
})
`)

console.log('\n✅ After clearing cache, the errors should be resolved.')
