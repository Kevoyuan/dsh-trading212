export type Theme = 'light' | 'dark'
export type ThemePreference = 'auto' | Theme

const STORAGE_KEY = 'dsh-trading212:theme'

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
let preference: ThemePreference = stored === 'light' || stored === 'dark' ? stored : 'auto'
const initialSystem = getSystemTheme()
let snapshot = {
  preference,
  system: initialSystem,
  active: (preference === 'auto' ? initialSystem : preference) as Theme,
  revision: 0,
}
const listeners = new Set<() => void>()

function applyThemeToDocument(theme: Theme) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.colorScheme = theme
  }
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (e: MediaQueryListEvent) => {
      const system = e.matches ? 'dark' : 'light'
      if (snapshot.preference === 'auto') {
        snapshot = { ...snapshot, system, active: system, revision: snapshot.revision + 1 }
        applyThemeToDocument(system)
        listeners.forEach(l => l())
      } else {
        snapshot = { ...snapshot, system, revision: snapshot.revision + 1 }
        listeners.forEach(l => l())
      }
    }
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onSystemChange)
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(onSystemChange)
    }
  } catch {
    // Media query listeners unsupported
  }
}

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot() {
    return snapshot
  },
  setPreference(next: ThemePreference) {
    preference = next
    if (next === 'auto') {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
    } else {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next)
    }
    const active = next === 'auto' ? getSystemTheme() : next
    snapshot = { ...snapshot, preference: next, active, revision: snapshot.revision + 1 }
    applyThemeToDocument(active)
    listeners.forEach(l => l())
  },
  toggle() {
    const next = snapshot.active === 'dark' ? 'light' : 'dark'
    this.setPreference(next)
  },
}

applyThemeToDocument(snapshot.active)
