import { contextBridge, ipcRenderer, clipboard } from 'electron'

type Unsubscribe = () => void

const api = {
  invoke(channel: string, payload?: unknown) {
    return ipcRenderer.invoke(channel, payload)
  },
  on(channel: string, callback: (payload: unknown) => void): Unsubscribe {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },
  readClipboard(): string {
    try {
      if (typeof clipboard !== 'undefined' && clipboard.readText) {
        return clipboard.readText()
      }
    } catch {}
    try {
      return ipcRenderer.sendSync('clipboard:read-sync') ?? ''
    } catch {
      return ''
    }
  },
  writeClipboard(text: string): boolean {
    try {
      if (typeof clipboard !== 'undefined' && clipboard.writeText) {
        clipboard.writeText(text)
        return true
      }
    } catch {}
    try {
      return ipcRenderer.sendSync('clipboard:write-sync', text) ?? false
    } catch {
      return false
    }
  }
}

contextBridge.exposeInMainWorld('agentDesktop', api)
