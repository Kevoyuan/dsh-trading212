// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { themeStore } from './theme.ts'

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    themeStore.setPreference('auto')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('updates preference and document attributes on setPreference', () => {
    themeStore.setPreference('dark')
    expect(themeStore.getSnapshot().preference).toBe('dark')
    expect(themeStore.getSnapshot().active).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem('dsh-trading212:theme')).toBe('dark')

    themeStore.setPreference('light')
    expect(themeStore.getSnapshot().preference).toBe('light')
    expect(themeStore.getSnapshot().active).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(localStorage.getItem('dsh-trading212:theme')).toBe('light')

    themeStore.setPreference('auto')
    expect(themeStore.getSnapshot().preference).toBe('auto')
    expect(localStorage.getItem('dsh-trading212:theme')).toBeNull()
  })

  it('toggles active theme', () => {
    themeStore.setPreference('light')
    themeStore.toggle()
    expect(themeStore.getSnapshot().active).toBe('dark')
    themeStore.toggle()
    expect(themeStore.getSnapshot().active).toBe('light')
  })

  it('notifies subscribers on preference change', () => {
    const listener = vi.fn()
    const unsubscribe = themeStore.subscribe(listener)
    themeStore.setPreference('dark')
    expect(listener).toHaveBeenCalled()
    unsubscribe()
  })
})
