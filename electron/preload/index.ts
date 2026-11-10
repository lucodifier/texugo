import { contextBridge, ipcRenderer } from 'electron'

type Unsubscribe = () => void

const api = {
  invoke(channel: string, payload?: unknown) {
    return ipcRenderer.invoke(channel, payload)
  },
  on(channel: string, callback: (payload: unknown) => void): Unsubscribe {
    const listener = (_event: unknown, payload: unknown) => callback(payload)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('agentDesktop', api)
