export type Language = 'zh' | 'en'
export type LanguagePreference = 'auto' | Language

const STORAGE_KEY = 'dsh-trading212:language'
const fromHost = new URLSearchParams(location.search).get('dshLocale') === 'en' ? 'en' : 'zh'
const stored = localStorage.getItem(STORAGE_KEY)
let preference: LanguagePreference = stored === 'zh' || stored === 'en' ? stored : 'auto'
let snapshot = { preference, host: fromHost as Language, active: (preference === 'auto' ? fromHost : preference) as Language, revision: 0 }
const listeners = new Set<() => void>()

export const languageStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) },
  getSnapshot() { return snapshot },
  setPreference(next: LanguagePreference) {
    preference = next
    if (next === 'auto') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
    snapshot = { ...snapshot, preference: next, active: next === 'auto' ? snapshot.host : next, revision: snapshot.revision + 1 }
    document.documentElement.lang = snapshot.active === 'zh' ? 'zh-CN' : 'en'
    listeners.forEach(listener => listener())
  },
}

document.documentElement.lang = snapshot.active === 'zh' ? 'zh-CN' : 'en'

export const tx = (zh: string, en: string) => snapshot.active === 'zh' ? zh : en
export const localeCode = () => snapshot.active === 'zh' ? 'zh-CN' : 'en-US'
