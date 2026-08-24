import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

describe('official dsh client module loader entry', () => {
  it('keeps the workspace draggable and the iframe viewport-sized', async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

    expect(source).toContain('role: "region"')
    expect(source).not.toContain('"aria-modal": "true"')
    expect(source).toContain('.t212-overlay iframe{bottom:auto;height:calc(100% - 32px)}')
    expect(source).toContain('@media(max-width:768px){.t212-overlay iframe{height:calc(100% - 44px)}}')
  })

  it('registers an exact id and returns the client exports from its factory', async () => {
    const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
    let registration: { id: string; factory: (require: (id: string) => unknown) => unknown } | undefined
    const context = vm.createContext({
      window: { __ModuleLoader__: { load: vi.fn((entry: typeof registration) => { registration = entry }) } },
      document: { createElement: () => ({ dataset: {}, remove: vi.fn() }), head: { appendChild: vi.fn() } },
    })
    vm.runInContext(source, context, { filename: 'lib/client.js' })
    expect(registration?.id).toBe('dsh-trading212')

    const client = registration?.factory(id => {
      if (id === 'react') return { useEffect: vi.fn(), useLayoutEffect: vi.fn(), useRef: vi.fn(), useState: vi.fn(), useSyncExternalStore: vi.fn() }
      if (id === 'react/jsx-runtime') return { jsx: vi.fn(), jsxs: vi.fn(), Fragment: Symbol('Fragment') }
      throw new Error(`unexpected client dependency: ${id}`)
    }) as { apply: (ctx: unknown) => void; inject?: unknown }
    expect(typeof client.apply).toBe('function')
    expect(client.inject).toEqual(['slots', 'locale'])

    const registered: string[] = []
    client.apply({
      effect: (callback: () => unknown) => callback(),
      locale: { getLocale: () => ({ active: 'en' }), subscribe: () => vi.fn() },
      slots: {
        inject: (_name: string, callback: () => unknown) => callback(),
        register: (entry: { name: string }) => { registered.push(entry.name) },
      },
    })
    expect(registered).toEqual(['sidebar.footer.action', 'shell.overlay'])
  })
})
