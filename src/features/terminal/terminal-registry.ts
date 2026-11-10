import { Terminal, type ITerminalOptions } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import '@xterm/xterm/css/xterm.css'
import type { RendererMode, Settings } from '@shared/types'
import { ipc } from '../../services/ipc'

export interface TerminalEntry {
  sessionId: string
  term: Terminal
  fitAddon: FitAddon
  element: HTMLElement
  container: HTMLElement | null
  isAtBottom: boolean
  hasNewOutputWhileScrolledUp: boolean
  rendererMode: RendererMode
  dispose: () => void
  onScrollStateChange?: (isAtBottom: boolean) => void
}

class TerminalRegistry {
  private entries = new Map<string, TerminalEntry>()
  private settings: Settings | null = null

  constructor() {
    // Listen for incoming terminal data packets from Electron main
    ipc.onData(({ sessionId, data }) => {
      this.feedData(sessionId, data)
    })
  }

  setSettings(settings: Settings) {
    this.settings = settings
    // Update existing terminals with new styling/options
    for (const entry of this.entries.values()) {
      entry.term.options.fontFamily = settings.fontFamily
      entry.term.options.fontSize = settings.fontSize
      entry.term.options.lineHeight = settings.lineHeight
      entry.term.options.letterSpacing = settings.letterSpacing
      entry.term.options.scrollback = settings.scrollback
    }
  }

  get(sessionId: string): TerminalEntry | undefined {
    return this.entries.get(sessionId)
  }

  getOrCreate(sessionId: string, initialSettings?: Settings): TerminalEntry {
    const existing = this.entries.get(sessionId)
    if (existing) return existing

    const s = initialSettings || this.settings
    const termOptions: ITerminalOptions = {
      fontFamily: s?.fontFamily || '"Cascadia Mono", Consolas, monospace',
      fontSize: s?.fontSize || 14,
      lineHeight: s?.lineHeight || 1.2,
      letterSpacing: s?.letterSpacing || 0,
      scrollback: s?.scrollback || 100_000,
      cursorBlink: true,
      cursorStyle: 'block',
      theme: {
        background: '#0c0e12',
        foreground: '#e1e4ea',
        cursor: '#3dd6c6',
        cursorAccent: '#0c0e12',
        selectionBackground: 'rgba(61, 214, 198, 0.3)',
        black: '#1f242d',
        red: '#ff6b6b',
        green: '#51cf66',
        yellow: '#fcc419',
        blue: '#4dabf7',
        magenta: '#cc5de8',
        cyan: '#3dd6c6',
        white: '#e1e4ea',
        brightBlack: '#495057',
        brightRed: '#fa5252',
        brightGreen: '#40c057',
        brightYellow: '#fab005',
        brightBlue: '#339af0',
        brightMagenta: '#be4bdb',
        brightCyan: '#20c997',
        brightWhite: '#ffffff'
      },
      allowTransparency: true
    }

    const term = new Terminal(termOptions)
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon((_event, uri) => {
      ipc.openExternal(uri)
    })

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    // Renderer setup with safe fallback: WebGL -> Canvas -> DOM
    let rendererMode: RendererMode = s?.renderer || 'canvas'
    if (rendererMode === 'webgl') {
      try {
        const webgl = new WebglAddon()
        webgl.onContextLoss(() => {
          webgl.dispose()
        })
        term.loadAddon(webgl)
      } catch (e) {
        console.warn('[TerminalRegistry] WebGL fallback to Canvas:', e)
        try {
          term.loadAddon(new CanvasAddon())
          rendererMode = 'canvas'
        } catch {
          rendererMode = 'dom'
        }
      }
    } else if (rendererMode === 'canvas') {
      try {
        term.loadAddon(new CanvasAddon())
      } catch {
        rendererMode = 'dom'
      }
    }

    // Isolated wrapper element that stays alive across re-mounts
    const element = document.createElement('div')
    element.className = 'w-full h-full'
    term.open(element)

    // Key handling to PTY
    term.onData((input) => {
      ipc.writeSession(sessionId, input)
    })

    const entry: TerminalEntry = {
      sessionId,
      term,
      fitAddon,
      element,
      container: null,
      isAtBottom: true,
      hasNewOutputWhileScrolledUp: false,
      rendererMode,
      dispose: () => {
        term.dispose()
        this.entries.delete(sessionId)
      }
    }

    // Scroll tracking
    term.onScroll(() => {
      const buffer = term.buffer.active
      const isBottom = buffer.viewportY >= buffer.baseY - 1
      entry.isAtBottom = isBottom
      if (isBottom) {
        entry.hasNewOutputWhileScrolledUp = false
      }
      entry.onScrollStateChange?.(isBottom)
    })

    this.entries.set(sessionId, entry)
    return entry
  }

  attach(sessionId: string, container: HTMLElement): TerminalEntry {
    const entry = this.getOrCreate(sessionId)
    if (entry.container !== container) {
      if (entry.container && entry.container.contains(entry.element)) {
        entry.container.removeChild(entry.element)
      }
      container.appendChild(entry.element)
      entry.container = container
      requestAnimationFrame(() => {
        try {
          entry.fitAddon.fit()
          this.syncDimensions(sessionId)
        } catch {}
      })
    }
    return entry
  }

  detach(sessionId: string) {
    const entry = this.entries.get(sessionId)
    if (entry && entry.container) {
      if (entry.container.contains(entry.element)) {
        entry.container.removeChild(entry.element)
      }
      entry.container = null
    }
  }

  syncDimensions(sessionId: string) {
    const entry = this.entries.get(sessionId)
    if (!entry || !entry.container) return
    try {
      entry.fitAddon.fit()
      const { cols, rows } = entry.term
      if (cols > 0 && rows > 0) {
        ipc.resizeSession(sessionId, cols, rows)
      }
    } catch {}
  }

  feedData(sessionId: string, data: string) {
    const entry = this.entries.get(sessionId)
    if (!entry) return

    const wasAtBottom = entry.isAtBottom
    entry.term.write(data, () => {
      if (wasAtBottom) {
        entry.term.scrollToBottom()
      } else {
        entry.hasNewOutputWhileScrolledUp = true
        entry.onScrollStateChange?.(false)
      }
    })
  }

  scrollToBottom(sessionId: string) {
    const entry = this.entries.get(sessionId)
    if (entry) {
      entry.term.scrollToBottom()
      entry.isAtBottom = true
      entry.hasNewOutputWhileScrolledUp = false
      entry.onScrollStateChange?.(true)
    }
  }

  clear(sessionId: string) {
    const entry = this.entries.get(sessionId)
    if (entry) {
      entry.term.clear()
    }
  }

  remove(sessionId: string) {
    const entry = this.entries.get(sessionId)
    if (entry) {
      entry.dispose()
    }
  }
}

export const terminalRegistry = new TerminalRegistry()
