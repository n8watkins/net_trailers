import { UserPreferences } from '../types/shared'
import { getTitle, getYear, getContentType } from '../typings'

export interface CSVExportRow {
    title: string
    year: string
    type: string
    rating: string
    tmdb_id: number
    imdb_id?: string
    overview?: string
    rating_timestamp?: string
    date_added: string
}

export function generateCSVContent(userPreferences: UserPreferences): string {
    const rows: CSVExportRow[] = []

    // Add watchlist items
    userPreferences.defaultWatchlist.forEach((content) => {
        rows.push({
            title: getTitle(content),
            year: getYear(content),
            type: getContentType(content),
            rating: 'watchlist',
            tmdb_id: content.id,
            imdb_id: content.external_ids?.imdb_id || '',
            overview: content.overview || '',
            date_added: new Date(userPreferences.lastActive).toISOString().split('T')[0],
        })
    })

    // Add liked items
    userPreferences.likedMovies.forEach((content) => {
        rows.push({
            title: getTitle(content),
            year: getYear(content),
            type: getContentType(content),
            rating: 'liked',
            tmdb_id: content.id,
            imdb_id: content.external_ids?.imdb_id || '',
            overview: content.overview || '',
            date_added: new Date(userPreferences.lastActive).toISOString().split('T')[0],
        })
    })

    // Add hidden items
    userPreferences.hiddenMovies.forEach((content) => {
        rows.push({
            title: getTitle(content),
            year: getYear(content),
            type: getContentType(content),
            rating: 'hidden',
            tmdb_id: content.id,
            imdb_id: content.external_ids?.imdb_id || '',
            overview: content.overview || '',
            date_added: new Date(userPreferences.lastActive).toISOString().split('T')[0],
        })
    })

    // Sort by date added (most recent first)
    rows.sort((a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime())

    // Generate CSV content
    const headers = [
        'Title',
        'Year',
        'Type',
        'Rating',
        'TMDB ID',
        'IMDB ID',
        'Overview',
        'Rating Date',
        'Date Added',
    ]

    const csvRows = [
        headers.join(','),
        ...rows.map((row) =>
            [
                escapeCSVField(row.title),
                escapeCSVField(row.year),
                escapeCSVField(row.type),
                escapeCSVField(row.rating),
                row.tmdb_id.toString(),
                escapeCSVField(row.imdb_id || ''),
                escapeCSVField(row.overview || ''),
                escapeCSVField(row.rating_timestamp || ''),
                escapeCSVField(row.date_added),
            ].join(',')
        ),
    ]

    return csvRows.join('\n')
}

function escapeCSVField(field: string): string {
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
    }
    return field
}

export function downloadCSV(csvContent: string, filename: string = 'nettrailer-export.csv'): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
}

export function exportUserDataToCSV(userPreferences: UserPreferences): void {
    const csvContent = generateCSVContent(userPreferences)
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `nettrailer-export-${timestamp}.csv`
    downloadCSV(csvContent, filename)
}
