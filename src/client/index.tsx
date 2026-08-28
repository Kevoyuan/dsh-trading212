import { useSyncExternalStore } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client'

type HostLanguage = 'zh' | 'en'
const languageState = { active: 'zh' as HostLanguage, listeners: new Set<() => void>() }
const setHostLanguage = (active: HostLanguage) => {
  if (languageState.active !== active) {
    languageState.active = active
    languageState.listeners.forEach(listener => listener())
  }
}
const useHostLanguage = () => useSyncExternalStore(
  listener => { languageState.listeners.add(listener); return () => languageState.listeners.delete(listener) },
  () => languageState.active,
)

/**
 * Trading 212 dashboard — a native 'conversation.view' tab (next to Chat /
 * Trajectory). The app renders in an isolated iframe confined to the chat
 * panel; CSS never leaks into the host, and the host never sees the iframe
 * content's styles either.
 */
function Trading212View(_props: ConvViewProps) {
  const language = useHostLanguage()
  return (
    <div
      className="t212-view-frame"
      data-locale={language}
      data-conversation-composer-overlay
      data-trading212-view
    >
      <iframe
        src={`/trading212/?dshLocale=${language}`}
        title="dsh Trading 212 portfolio"
        tabIndex={-1}
      />
    </div>
  )
}

const CSS = `
.t212-view-frame{position:relative;width:100%;height:100%;min-height:0;overflow:hidden;background:#070a10}
.t212-view-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
/* T212 tab owns the full panel: hide the floating composer entirely.
   data-conversation-composer-overlay (on the view root) already makes the
   conversation shell give the view full height; this hides the composer seat
   (a sibling of the session slot inside the scroll body) for good. */
[data-slot="conversation.session"]:has([data-trading212-view]) ~ [data-composer-seat]{display:none!important}
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
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: 'trading212',
    order: 20,
    label: () => 'T212',
  }, Trading212View))
}
