/**
 * Script to automatically update broken seed data images
 */

import * as fs from 'fs'
import * as path from 'path'

// Image updates based on TMDB API responses
const movieUpdates = {
    278: {
        backdrop_path: '/zfbjgQE1uSd9wiPTX4VzsLi0rGG.jpg',
    },
    424: {
        backdrop_path: '/zb6fM1CX41D9rF9hdgclu0peUmy.jpg',
    },
    27205: {
        poster_path: '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
    },
    129: {
        backdrop_path: '/ukfI9QkU1aIhOhKXYWE9n3z1mFR.jpg',
    },
    497: {
        poster_path: '/o0lO84GI7qrG6XFvtsPOSV7CTNa.jpg',
        backdrop_path: '/b6HWTOxn1xevvyHU2K9ICvaRU6g.jpg',
    },
    769: {
        backdrop_path: '/gILte6Zd7m1YneIr6MVhh30S9pr.jpg',
    },
    299536: {
        backdrop_path: '/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg',
    },
    603: {
        poster_path: '/p96dm7sCMn4VYAStA6siNz30G1r.jpg',
        backdrop_path: '/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg',
    },
    157336: {
        backdrop_path: '/5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg',
    },
    389: {
        backdrop_path: '/w4bTBXcqXc2TUyS5Fc4h67uWbPn.jpg',
    },
    19404: {
        poster_path: '/2CAL2433ZeIihfX1Hb2139CX0pW.jpg',
        backdrop_path: '/zQDFHYNVVVp9OAYSixYAG1SyX1l.jpg',
    },
    346: {
        poster_path: '/lOMGc8bnSwQhS4XyE1S99uH8NXf.jpg',
        backdrop_path: '/qvZ91FwMq6O47VViAr8vZNQz3WI.jpg',
    },
}

const tvUpdates = {
    1396: {
        poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
        backdrop_path: '/63FA8vwSZnXkGxedrDQwni4JuZN.jpg',
    },
    1399: {
        backdrop_path: '/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg',
    },
    94605: {
        poster_path: '/zO5xURaYgMX6WpXolp83zVk03Yh.jpg',
        backdrop_path: '/sYXLeu5usz6yEz0k00FYvtEdodD.jpg',
    },
    60625: {
        poster_path: '/WGRQ8FpjkDTzivQJ43t94bOuY0.jpg',
        backdrop_path: '/9In9QgVJx7PlFOAgVHCKKSbo605.jpg',
    },
    82856: {
        poster_path: '/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
        backdrop_path: '/9zcbqSxdsRMZWHYtyCd1nXPr2xq.jpg',
    },
    85271: {
        poster_path: '/frobUz2X5Pc8OiVZU8Oo5K3NKMM.jpg',
        backdrop_path: '/lOr9NKxh4vMweufMOUDJjJhCRHW.jpg',
    },
    60059: {
        backdrop_path: '/t15KHp3iNfHVQBNIaqUGW12xQA4.jpg',
    },
    100088: {
        poster_path: '/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg',
        backdrop_path: '/uQ4lG7E7mlyKsGvbASftQ6Hu2IX.jpg',
    },
    61889: {
        poster_path: '/ig5sp7GzfQZw2dXgrM8OXUpOPri.jpg',
        backdrop_path: '/qsnXwGS7KBbX4JLqHvICngtR8qg.jpg',
    },
    37854: {
        backdrop_path: '/oVfucXvhutTpYExG9k06NJqnpT9.jpg',
    },
    60574: {
        backdrop_path: '/l8v3gJDlASN0lNn51gR8zQJsu5O.jpg',
    },
    87108: {
        backdrop_path: '/3URK0z9PzpVNJrGE7XOuyy6KFzk.jpg',
    },
}

function updateSeedData() {
    const seedDataPath = path.resolve(process.cwd(), 'utils/seedData.ts')
    let content = fs.readFileSync(seedDataPath, 'utf-8')

    let updatedCount = 0

    // Update movie images
    for (const [id, updates] of Object.entries(movieUpdates)) {
        const idNum = parseInt(id)
        if (updates.poster_path) {
            const posterRegex = new RegExp(`(id: ${idNum},.*?poster_path: ')([^']+)(')`, 's')
            const match = content.match(posterRegex)
            if (match && match[2] !== updates.poster_path) {
                content = content.replace(posterRegex, `$1${updates.poster_path}$3`)
                console.log(`✅ Updated movie ${id} poster`)
                updatedCount++
            }
        }

        if (updates.backdrop_path) {
            const backdropRegex = new RegExp(`(id: ${idNum},.*?backdrop_path: ')([^']+)(')`, 's')
            const match = content.match(backdropRegex)
            if (match && match[2] !== updates.backdrop_path) {
                content = content.replace(backdropRegex, `$1${updates.backdrop_path}$3`)
                console.log(`✅ Updated movie ${id} backdrop`)
                updatedCount++
            }
        }
    }

    // Update TV show images
    for (const [id, updates] of Object.entries(tvUpdates)) {
        const idNum = parseInt(id)
        if (updates.poster_path) {
            const posterRegex = new RegExp(`(id: ${idNum},.*?poster_path: ')([^']+)(')`, 's')
            const match = content.match(posterRegex)
            if (match && match[2] !== updates.poster_path) {
                content = content.replace(posterRegex, `$1${updates.poster_path}$3`)
                console.log(`✅ Updated TV ${id} poster`)
                updatedCount++
            }
        }

        if (updates.backdrop_path) {
            const backdropRegex = new RegExp(`(id: ${idNum},.*?backdrop_path: ')([^']+)(')`, 's')
            const match = content.match(backdropRegex)
            if (match && match[2] !== updates.backdrop_path) {
                content = content.replace(backdropRegex, `$1${updates.backdrop_path}$3`)
                console.log(`✅ Updated TV ${id} backdrop`)
                updatedCount++
            }
        }
    }

    // Write back to file
    fs.writeFileSync(seedDataPath, content, 'utf-8')

    console.log(`\n🎉 Updated ${updatedCount} image paths in seedData.ts`)
}

updateSeedData()
