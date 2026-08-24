import { build as esbuild } from 'esbuild'
import { build as viteBuild } from 'vite'
import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const lib = resolve(root, 'lib')

await rm(lib, { recursive: true, force: true })
await mkdir(lib, { recursive: true })

await esbuild({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(lib, 'index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  external: ['@deepseek-ai/*'],
})

const clientTmp = resolve(lib, '.client.cjs')
await esbuild({
  entryPoints: [resolve(root, 'src/client/index.tsx')],
  outfile: clientTmp,
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', '@deepseek-ai/*'],
})

const clientCode = await readFile(clientTmp, 'utf8')
const wrapped = `window.__ModuleLoader__.load({\n  id: 'dsh-trading212',\n  factory: (require) => {\n    const module = { exports: {} };\n    const exports = module.exports;\n${clientCode.split('\n').map(line => `    ${line}`).join('\n')}\n    return module.exports;\n  },\n});\n`
await writeFile(resolve(lib, 'client.js'), wrapped)
await unlink(clientTmp)
await writeFile(resolve(lib, 'index.d.ts'), `import type { Context } from '@deepseek-ai/cordis'
import type Schema from '@deepseek-ai/schemastery'
export declare const name = "dsh-trading212"
export declare const inject: string[]
export interface Config {
  requestTimeoutMs: number
  cacheTtlMs: number
}
export declare const Config: Schema<Config>
export declare function apply(ctx: Context, config: Config): void
`)

await viteBuild({ configFile: resolve(root, 'vite.config.ts') })
