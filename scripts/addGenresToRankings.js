const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../utils/seed/seedRankings.ts')
let content = fs.readFileSync(filePath, 'utf8')

// Genre mappings for each category
const genreMappings = [
    {
        pattern: /Star Wars.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Sci-Fi', 'Fantasy', 'Adventure'],",
    },
    {
        pattern: /Harry Potter.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Fantasy', 'Adventure', 'Drama'],",
    },
    {
        pattern: /LOTR.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Fantasy', 'Adventure', 'Drama'],",
    },
    {
        pattern: /Pixar.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Animation', 'Comedy', 'Family'],",
    },
    {
        pattern: /Disney Animation.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Animation', 'Fantasy', 'Family'],",
    },
    {
        pattern: /Horror.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Horror', 'Thriller', 'Mystery'],",
    },
    {
        pattern: /Sci-Fi \(🚀\).*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Sci-Fi', 'Thriller', 'Drama'],",
    },
    {
        pattern: /Anime.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Animation', 'Fantasy', 'Adventure'],",
    },
    {
        pattern: /True Crime.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: ['Documentary', 'Crime', 'Mystery'],
    },
    {
        pattern: /Comedy \(😂\).*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Comedy', 'Romance'],",
    },
    {
        pattern: /Romance \(💕\).*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Romance', 'Drama', 'Comedy'],",
    },
    {
        pattern: /Action \(💥\).*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Action', 'Thriller', 'Adventure'],",
    },
    {
        pattern: /Netflix.*?\n(.*?tvShows: \[.*?\],)/gs,
        genres: "genres: ['Drama', 'Thriller', 'Sci-Fi'],",
    },
]

// Add genres to templates that are missing them
const lines = content.split('\n')
const result = []
let inTemplate = false
let needsGenres = false

for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    result.push(line)

    // Check if this line closes a template object
    if (line.trim() === 'tvShows: [],') {
        // Check next line - if it's not genres, we need to add it
        if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim()
            if (!nextLine.startsWith('genres:')) {
                // Determine genre based on previous context
                let genreToAdd = "genres: ['Drama']," // default

                // Look backwards to find category comment
                for (let j = i; j >= Math.max(0, i - 50); j--) {
                    const prevLine = lines[j]
                    if (prevLine.includes('Star Wars')) {
                        genreToAdd = "genres: ['Sci-Fi', 'Fantasy', 'Adventure'],"
                        break
                    } else if (prevLine.includes('Harry Potter')) {
                        genreToAdd = "genres: ['Fantasy', 'Adventure', 'Drama'],"
                        break
                    } else if (prevLine.includes('LOTR')) {
                        genreToAdd = "genres: ['Fantasy', 'Adventure', 'Drama'],"
                        break
                    } else if (prevLine.includes('Pixar')) {
                        genreToAdd = "genres: ['Animation', 'Comedy', 'Family'],"
                        break
                    } else if (prevLine.includes('Disney Animation')) {
                        genreToAdd = "genres: ['Animation', 'Fantasy', 'Family'],"
                        break
                    } else if (prevLine.includes('Horror')) {
                        genreToAdd = "genres: ['Horror', 'Thriller', 'Mystery'],"
                        break
                    } else if (prevLine.includes('Sci-Fi (🚀)')) {
                        genreToAdd = "genres: ['Sci-Fi', 'Thriller', 'Drama'],"
                        break
                    } else if (prevLine.includes('Anime')) {
                        genreToAdd = "genres: ['Animation', 'Fantasy', 'Adventure'],"
                        break
                    } else if (prevLine.includes('True Crime')) {
                        genreToAdd = "genres: ['Documentary', 'Crime', 'Mystery'],"
                        break
                    } else if (prevLine.includes('Comedy (😂)')) {
                        genreToAdd = "genres: ['Comedy', 'Romance'],"
                        break
                    } else if (prevLine.includes('Romance (💕)')) {
                        genreToAdd = "genres: ['Romance', 'Drama', 'Comedy'],"
                        break
                    } else if (prevLine.includes('Action (💥)')) {
                        genreToAdd = "genres: ['Action', 'Thriller', 'Adventure'],"
                        break
                    } else if (prevLine.includes('Netflix')) {
                        genreToAdd = "genres: ['Drama', 'Thriller', 'Sci-Fi'],"
                        break
                    }
                }

                result.push(`        ${genreToAdd}`)
            }
        }
    }
}

fs.writeFileSync(filePath, result.join('\n'), 'utf8')
console.log('✅ Added genres to all ranking templates')
