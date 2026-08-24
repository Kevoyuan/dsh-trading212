import React, { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

const state = { open: false, listeners: new Set<() => void>() }
const subscribe = (listener: () => void) => { state.listeners.add(listener); return () => state.listeners.delete(listener) }
const setOpen = (open: boolean) => { state.open = open; state.listeners.forEach(listener => listener()) }
const useOpen = () => useSyncExternalStore(subscribe, () => state.open)

type HostLanguage = 'zh' | 'en'
const languageState = { active: 'zh' as HostLanguage, listeners: new Set<() => void>() }
const setHostLanguage = (active: HostLanguage) => { if (languageState.active !== active) { languageState.active = active; languageState.listeners.forEach(listener => listener()) } }
const useHostLanguage = () => useSyncExternalStore(listener => { languageState.listeners.add(listener); return () => languageState.listeners.delete(listener) }, () => languageState.active)

function WorkspaceSwitch({ wide, placement = 'host' }: { wide: boolean; placement?: 'host' | 'overlay' }) {
  const open = useOpen()
  const language = useHostLanguage()
  return <div data-placement={placement} className={`t212-workspace-switch ${wide ? 'is-wide' : ''} ${open ? 'is-dashboard' : 'is-dsh'}`} role="group" aria-label={language === 'zh' ? '工作区切换' : 'Workspace switcher'}>
    <button className={!open ? 'active' : ''} type="button" aria-pressed={!open} onClick={() => setOpen(false)} aria-label={language === 'zh' ? '切换到 dsh' : 'Switch to dsh'}>
      <span className="t212-switch-dsh">dsh</span>
    </button>
    <button className={open ? 'active' : ''} type="button" aria-pressed={open} onClick={() => setOpen(true)} aria-label={language === 'zh' ? '切换到 Trading 212 dashboard' : 'Switch to Trading 212 dashboard'}>
      <span className="t212-switch-t212">T212</span>
    </button>
  </div>
}

function PortfolioOverlay() {
  const open = useOpen()
  const hostLanguage = useHostLanguage()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [frameFailed, setFrameFailed] = useState(false)
  const [switchPosition, setSwitchPosition] = useState<CSSProperties>()

  useLayoutEffect(() => {
    if (!open) { setSwitchPosition(undefined); return }
    const hostSwitch = document.querySelector<HTMLElement>('.t212-workspace-switch[data-placement="host"]')
    if (!hostSwitch) return
    const syncPosition = () => {
      const rect = hostSwitch.getBoundingClientRect()
      const next = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: 'auto', bottom: 'auto' } satisfies CSSProperties
      setSwitchPosition(current => current?.left === next.left && current?.top === next.top && current?.width === next.width && current?.height === next.height ? current : next)
    }
    syncPosition()
    const frame = requestAnimationFrame(syncPosition)
    window.addEventListener('resize', syncPosition)
    const resizeObserver = new ResizeObserver(syncPosition)
    let ancestor: HTMLElement | null = hostSwitch
    for (let depth = 0; ancestor && depth < 5; depth += 1) {
      resizeObserver.observe(ancestor)
      ancestor = ancestor.parentElement
    }
    const layoutRoot = hostSwitch.parentElement?.parentElement?.parentElement
    const mutationObserver = new MutationObserver(syncPosition)
    if (layoutRoot) mutationObserver.observe(layoutRoot, { childList: true, subtree: true, attributes: true, characterData: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', syncPosition)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key !== 'Tab' || dialogRef.current === null) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button, iframe, [tabindex]:not([tabindex="-1"])')]
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      previous?.focus()
      setFrameFailed(false)
    }
  }, [open])

  if (!open) return null
  return <div ref={dialogRef} className="t212-overlay" role="dialog" aria-label={hostLanguage === 'zh' ? 'Trading 212 投资组合' : 'Trading 212 portfolio'} aria-modal="true" tabIndex={-1}>
    <div className="t212-overlay-switch-wrap" style={switchPosition}><WorkspaceSwitch wide placement="overlay" /></div>
    {frameFailed
      ? <div className="t212-frame-error" role="alert"><strong>{hostLanguage === 'zh' ? '无法打开 Trading 212' : 'Unable to open Trading 212'}</strong><span>{hostLanguage === 'zh' ? '请重启 dsh 后重试。' : 'Restart dsh and try again.'}</span><button type="button" onClick={() => { setFrameFailed(false); location.reload() }}>{hostLanguage === 'zh' ? '重新加载 dsh' : 'Reload dsh'}</button></div>
      : <iframe src={`/trading212/?dshLocale=${hostLanguage}`} title="dsh Trading 212 portfolio" onError={() => setFrameFailed(true)} />}
  </div>
}

const CSS = `
.t212-workspace-switch{box-sizing:border-box!important;position:relative!important;isolation:isolate!important;width:84px!important;height:36px!important;min-width:84px!important;min-height:36px!important;max-width:84px!important;max-height:36px!important;flex:0 0 84px!important;aspect-ratio:auto!important;padding:2px!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:0!important;overflow:hidden!important;border:1px solid rgb(255 255 255 / .11)!important;border-radius:999px!important;background:rgb(255 255 255 / .055)!important;box-shadow:inset 0 1px 0 rgb(255 255 255 / .045),0 1px 2px rgb(0 0 0 / .18)!important;transition:border-color .18s ease,background .18s ease!important}.t212-workspace-switch.is-wide{width:112px!important;min-width:112px!important;max-width:112px!important;flex-basis:112px!important}.t212-workspace-switch::before{box-sizing:border-box;position:absolute;top:2px;bottom:2px;left:2px;z-index:-1;width:calc(50% - 2px);border:1px solid rgb(255 255 255 / .72);border-radius:999px;background:#f4f5f4;box-shadow:0 1px 2px rgb(0 0 0 / .3),0 0 0 .5px rgb(0 0 0 / .12);content:"";transform:translateX(0);transition:transform .2s cubic-bezier(.2,.75,.25,1)}.t212-workspace-switch.is-dashboard::before{transform:translateX(100%)}.t212-workspace-switch button{all:unset;box-sizing:border-box!important;position:relative!important;width:100%!important;height:30px!important;min-width:0!important;min-height:30px!important;max-height:30px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:999px!important;color:rgb(225 231 228 / .62)!important;font:650 10px/1 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:-.15px!important;cursor:pointer!important;transition:color .18s ease,transform .14s ease!important}.t212-workspace-switch button:hover{color:#fff!important}.t212-workspace-switch button:active{transform:scale(.96)}.t212-workspace-switch button.active{color:#161a18!important}.t212-switch-dsh,.t212-switch-t212{display:block;white-space:nowrap}.t212-switch-dsh{font-weight:750;letter-spacing:-.55px}.t212-switch-t212{font-size:9px;font-weight:750;letter-spacing:-.3px}.t212-workspace-switch:focus-within{border-color:rgb(103 226 162 / .45)!important;box-shadow:0 0 0 2px rgb(68 217 149 / .16),inset 0 1px 0 rgb(255 255 255 / .05)!important}.t212-workspace-switch button:focus-visible{outline:2px solid #21b875!important;outline-offset:-3px!important}.t212-overlay{position:fixed;inset:0;pointer-events:auto;background:#f5f7fb;z-index:9999}.t212-overlay iframe{width:100%;height:100%;border:0;display:block}.t212-overlay-switch-wrap{position:absolute;left:156px;bottom:100px;z-index:2;width:112px;height:36px;pointer-events:auto}.t212-frame-error{height:100%;display:grid;place-content:center;justify-items:center;gap:12px;color:#17201c}.t212-frame-error strong{font-size:20px}.t212-frame-error span{color:#69716d}.t212-frame-error button{border:0;border-radius:10px;background:#078d59;color:#fff;padding:10px 16px;cursor:pointer}.t212-frame-error button:focus-visible{outline:2px solid #20c77a;outline-offset:2px}@media(max-width:700px){.t212-overlay-switch-wrap{top:16px;right:16px;bottom:auto;left:auto}}
`

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const sync = () => setHostLanguage(ctx.locale.getLocale().active)
    sync()
    return ctx.locale.subscribe(sync)
  }, 'dsh-trading212: locale')
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-trading212'
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'dsh-trading212: styles')

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action', id: 'trading212', order: 20,
  }, WorkspaceSwitch))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'trading212', order: 100,
  }, PortfolioOverlay))
}
