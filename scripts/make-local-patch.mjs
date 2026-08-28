import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'src/index.ts')
const output = resolve(root, 'cordis.local.patch.yml')

const patch = `- insert:
    - id: trading212-local
      name: ${JSON.stringify(source)}
      inject:
        - tools
        - credentials
        - webServer
      config:
        requestTimeoutMs: 15000
        cacheTtlMs: 5000
        marketCacheTtlMs: 900000
`

await writeFile(output, patch)
console.log(`Wrote ${output}`)
