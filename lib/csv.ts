/**
 * CSV for spreadsheets (RFC 4180): every cell is quoted, quotes are doubled,
 * and a cell that a spreadsheet would run as a formula (starting with = + - @,
 * a tab or a carriage return) gets a leading apostrophe.
 */

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
    let text = value === null || value === undefined ? '' : String(value)
    if (FORMULA_START.test(text)) text = `'${text}`
    return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: unknown[][]): string {
    return rows.map((row) => row.map(csvCell).join(',')).join('\r\n')
}
