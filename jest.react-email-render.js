/* eslint-disable @typescript-eslint/no-require-imports */
// Jest-only stand-in for @react-email/render (see jest.config.js): the real one
// loads react-dom/server with a dynamic import, which Jest does not allow.
const { renderToStaticMarkup } = require('react-dom/server')
const { toPlainText } = require('./node_modules/@react-email/render/dist/edge/index.cjs')

async function render(element) {
    return `<!DOCTYPE html>${renderToStaticMarkup(element)}`
}

module.exports = { render, toPlainText }
