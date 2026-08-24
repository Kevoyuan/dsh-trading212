// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './clipboard.ts'

describe('copyText', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('uses the modern clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await copyText('hello dsh')
    expect(writeText).toHaveBeenCalledWith('hello dsh')
  })

  it('falls back to a selected textarea when iframe clipboard permission is rejected', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const command = vi.fn(() => true)
    Object.defineProperty(document, 'execCommand', { configurable: true, value: command })
    await copyText('fallback text')
    expect(command).toHaveBeenCalledWith('copy')
    expect(document.querySelector('textarea')).toBeNull()
  })
})
