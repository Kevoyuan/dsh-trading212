import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname)
const css = readFileSync(resolve(root, 'dirA.css'), 'utf8')
const body = readFileSync(resolve(root, 'dirA-body.html'), 'utf8')
if (!body.includes('/*__CSS__*/')) throw new Error('dirA-body.html missing CSS slot')
const out = body.replace('/*__CSS__*/', () => css)
writeFileSync(resolve(root, 'dirA.html'), out)
console.log('wrote design-demos/dirA.html (' + out.length + ' chars)')
