export async function copyText(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText !== undefined) {
      await navigator.clipboard.writeText(value)
      return
    }
  } catch {
    // Electron and iframe permission policies can reject the modern API.
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.readOnly = true
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  const selection = document.getSelection()
  const previous = selection?.rangeCount ? selection.getRangeAt(0) : undefined
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)
  let copied = false
  try { copied = document.execCommand('copy') } catch { copied = false }
  textarea.remove()
  if (previous !== undefined && selection !== null) {
    selection.removeAllRanges()
    selection.addRange(previous)
  }
  if (!copied) throw new Error('clipboard unavailable')
}
