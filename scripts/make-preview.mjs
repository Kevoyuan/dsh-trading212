import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(root, 'src/app/styles.css'), 'utf8')

const body = readFileSync(resolve(root, 'src/app/preview-body.html'), 'utf8')
const out = body.replace('/*__CSS__*/', () => css)
writeFileSync(resolve(root, 'preview-redesign.html'), out)
console.log('preview-redesign.html regenerated (' + out.length + ' chars)')

const bodyEn = readFileSync(resolve(root, 'src/app/preview-body.en.html'), 'utf8')
const outEn = bodyEn.replace('/*__CSS__*/', () => css)
writeFileSync(resolve(root, 'preview-redesign-en.html'), outEn)
console.log('preview-redesign-en.html regenerated (' + outEn.length + ' chars)')