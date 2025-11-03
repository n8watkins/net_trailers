/**
 * Test script for Custom Rows Firebase integration
 *
 * This script tests:
 * 1. Creating custom rows
 * 2. Reading custom rows
 * 3. Updating custom rows
 * 4. Deleting custom rows
 */

// Load environment variables FIRST
import './load-env'

import { CustomRowsFirestore } from '../utils/firestore/customRows'
import { CustomRowFormData } from '../types/customRows'

const TEST_USER_ID = 'test-user-123'

async function testCustomRows() {
    console.log('\n' + '='.repeat(70))
    console.log('🧪 Testing Custom Rows Firebase Integration')
    console.log('='.repeat(70))

    try {
        // Test 1: Create a custom row
        console.log('\n📝 Test 1: Creating a custom row...')
        const rowData1: CustomRowFormData = {
            name: 'Action Movies',
            genres: [28], // Action genre ID
            genreLogic: 'AND',
            mediaType: 'movie',
            enabled: true,
        }

        const createdRow1 = await CustomRowsFirestore.createCustomRow(TEST_USER_ID, rowData1)
        console.log('   ✅ Row created:', createdRow1.id, '-', createdRow1.name)

        // Test 2: Create another row
        console.log('\n📝 Test 2: Creating another custom row...')
        const rowData2: CustomRowFormData = {
            name: 'Sci-Fi & Thriller TV Shows',
            genres: [10765, 9648], // Sci-Fi & Fantasy, Mystery
            genreLogic: 'OR',
            mediaType: 'tv',
            enabled: true,
        }

        const createdRow2 = await CustomRowsFirestore.createCustomRow(TEST_USER_ID, rowData2)
        console.log('   ✅ Row created:', createdRow2.id, '-', createdRow2.name)

        // Test 3: Get all rows
        console.log('\n📚 Test 3: Getting all custom rows...')
        const allRows = await CustomRowsFirestore.getUserCustomRows(TEST_USER_ID)
        console.log(`   ✅ Found ${allRows.length} rows:`)
        allRows.forEach((row) => {
            console.log(`      - ${row.name} (${row.mediaType})`)
        })

        // Test 4: Get a specific row
        console.log('\n🔍 Test 4: Getting specific row...')
        const specificRow = await CustomRowsFirestore.getCustomRow(TEST_USER_ID, createdRow1.id)
        console.log('   ✅ Found row:', specificRow?.name)

        // Test 5: Update a row
        console.log('\n✏️  Test 5: Updating row...')
        const updatedRow = await CustomRowsFirestore.updateCustomRow(TEST_USER_ID, createdRow1.id, {
            name: 'Action & Adventure Movies',
            genres: [28, 12], // Action + Adventure
        })
        console.log('   ✅ Updated row:', updatedRow.name)
        console.log('   ✅ New genres:', updatedRow.genres)

        // Test 6: Toggle enabled status
        console.log('\n🔄 Test 6: Toggling enabled status...')
        const newStatus = await CustomRowsFirestore.toggleRowEnabled(TEST_USER_ID, createdRow2.id)
        console.log('   ✅ New enabled status:', newStatus)

        // Test 7: Delete a row
        console.log('\n🗑️  Test 7: Deleting row...')
        await CustomRowsFirestore.deleteCustomRow(TEST_USER_ID, createdRow1.id)
        console.log('   ✅ Row deleted:', createdRow1.id)

        // Test 8: Verify deletion
        console.log('\n📊 Test 8: Verifying final state...')
        const finalRows = await CustomRowsFirestore.getUserCustomRows(TEST_USER_ID)
        console.log(`   ✅ Remaining rows: ${finalRows.length}`)
        finalRows.forEach((row) => {
            console.log(`      - ${row.name} (enabled: ${row.enabled})`)
        })

        // Cleanup: Delete remaining rows
        console.log('\n🧹 Cleanup: Deleting remaining test rows...')
        for (const row of finalRows) {
            await CustomRowsFirestore.deleteCustomRow(TEST_USER_ID, row.id)
            console.log(`   ✅ Deleted: ${row.name}`)
        }

        console.log('\n' + '='.repeat(70))
        console.log('✅ All tests passed!')
        console.log('='.repeat(70))
    } catch (error: any) {
        console.error('\n' + '='.repeat(70))
        console.error('❌ Test failed!')
        console.error('='.repeat(70))
        console.error('\nError:', error.message)
        console.error('\nStack:', error.stack)
        throw error
    }
}

// Run the tests
testCustomRows()
    .then(() => {
        console.log('\n✅ Test script completed successfully!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Test script failed:', error.message)
        process.exit(1)
    })
