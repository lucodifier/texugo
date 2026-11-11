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

let lastPaste = {
  sessionId: '',
  normalized: '',
  time: 0
}

function normalizePaste(text: string): string {
  return text.replace(/\r\n/g, '\n').trim()
}

/**
 * Pastes text through xterm.js (handles bracketed paste mode, CRLF, and emits onData)
 * Deduplicates identical paste calls within 500ms to avoid double-pasting.
 */
function pasteToTerminal(term: Terminal, sessionId: string, text?: string) {
  let toPaste = text

  // If text is not provided, read synchronously from clipboard
  if (toPaste === undefined) {
    try {
      if (window.agentDesktop?.readClipboard) {
        toPaste = window.agentDesktop.readClipboard()
      }
    } catch {}

    if (!toPaste) {
      // Async fallback to navigator.clipboard if synchronous was empty
      navigator.clipboard
        ?.readText()
        .then((asyncText) => {
          if (asyncText) {
            pasteToTerminal(term, sessionId, asyncText)
          }
        })
        .catch(() => {})
      return
    }
  }

  if (!toPaste) return

  // Deduplication: prevent the same text from being pasted twice within 500ms to the same session
  const normalized = normalizePaste(toPaste)
  const now = Date.now()
  if (
    lastPaste.sessionId === sessionId &&
    lastPaste.normalized === normalized &&
    now - lastPaste.time < 500
  ) {
    return
  }
  lastPaste = { sessionId, normalized, time: now }

  try {
    term.paste(toPaste)
  } catch {
    // Direct PTY write fallback
    ipc.writeSession(sessionId, toPaste)
  }
}

/**
 * Copies the currently selected terminal text to the clipboard
 */
function copySelection(term: Terminal): boolean {
  if (term.hasSelection()) {
    const selected = term.getSelection()
    if (selected) {
      try {
        if (window.agentDesktop?.writeClipboard) {
          window.agentDesktop.writeClipboard(selected)
        } else {
          navigator.clipboard?.writeText(selected).catch(() => {})
        }
      } catch {
        ipc.copyToClipboard(selected)
      }
      return true
    }
  }
  return false
}

class TerminalRegistry {
  private entries = new Map<string, TerminalEntry>()
  private settings: Settings | null = null
  private resizeRafs = new Map<string, number>()

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
      fontFamily: s?.fontFamily || '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
      fontSize: s?.fontSize || 14,
      lineHeight: s?.lineHeight || 1.0,
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
      allowTransparency: false
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
    element.className = 'w-full h-full select-text'
    term.open(element)

    // Forward terminal keypresses to PTY with duplicate burst protection
    let lastDataSent = { text: '', time: 0 }
    term.onData((input) => {
      const now = Date.now()
      // Guard against identical multi-character text bursts sent within 400ms
      // (Protects against Wispr Flow or OS double-paste / double-injection)
      if (
        input.length > 2 &&
        !input.startsWith('\x1b') &&
        input === lastDataSent.text &&
        now - lastDataSent.time < 400
      ) {
        return
      }
      if (input.length > 2 && !input.startsWith('\x1b')) {
        lastDataSent = { text: input, time: now }
      }
      ipc.writeSession(sessionId, input)
    })

    // Custom Key Event Handler: Copy / Paste shortcuts
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      const isCtrlOrMeta = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      // Copy: Ctrl+C / Ctrl+Shift+C / Ctrl+Insert
      if ((isCtrlOrMeta && key === 'c') || (event.ctrlKey && event.key === 'Insert')) {
        if (term.hasSelection()) {
          if (event.type === 'keydown') {
            copySelection(term)
          }
          return false // Handled: don't send SIGINT to PTY when user wants to copy
        }
        // No selection: let Ctrl+C pass as SIGINT (\x03) to cancel process
        return true
      }

      // Paste: Ctrl+V / Ctrl+Shift+V / Shift+Insert
      if ((isCtrlOrMeta && key === 'v') || (event.shiftKey && event.key === 'Insert')) {
        if (event.type === 'keydown') {
          pasteToTerminal(term, sessionId)
        }
        return false // Handled: don't send raw control byte to PTY
      }

      return true
    })

    // Native paste handler (captures paste from OS clipboard, Wispr Flow, or Edit menu)
    const handleNativePaste = (event: ClipboardEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const text = event.clipboardData?.getData('text')
      if (text) {
        pasteToTerminal(term, sessionId, text)
      }
    }

    element.addEventListener('paste', handleNativePaste, true)
    term.textarea?.addEventListener('paste', handleNativePaste, true)

    // Right-click: Copy if selection exists, else Paste (Windows Terminal behavior)
    element.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault()
      if (term.hasSelection()) {
        copySelection(term)
        term.clearSelection()
      } else {
        pasteToTerminal(term, sessionId)
      }
    })

    // Focus terminal helper textarea on mousedown
    element.addEventListener('mousedown', () => {
      term.focus()
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

      const fitAndSync = () => {
        try {
          entry.fitAddon.fit()
          this.syncDimensions(sessionId)
          entry.term.focus()
        } catch {}
      }

      if (typeof document !== 'undefined' && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          requestAnimationFrame(fitAndSync)
        })
      } else {
        requestAnimationFrame(fitAndSync)
      }
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

    const existingRaf = this.resizeRafs.get(sessionId)
    if (existingRaf) cancelAnimationFrame(existingRaf)

    const raf = requestAnimationFrame(() => {
      this.resizeRafs.delete(sessionId)
      try {
        entry.fitAddon.fit()
        const { cols, rows } = entry.term
        if (cols > 0 && rows > 0) {
          ipc.resizeSession(sessionId, cols, rows)
        }
      } catch {}
    })
    this.resizeRafs.set(sessionId, raf)
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
