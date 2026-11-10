import fs from 'node:fs'
import path from 'node:path'
import { app, BrowserWindow, dialog, shell } from 'electron'
import { registerIpc } from './ipc'
import { AppDatabase } from './database'
import { PtyManager } from '../terminal/pty-manager'

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()

let mainWindow: BrowserWindow | null = null
let allowQuit = false

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)

async function createWindow(database: AppDatabase, terminals: PtyManager): Promise<void> {
  const preloadCandidateMjs = path.join(__dirname, '../preload/index.mjs')
  const preloadCandidateJs = path.join(__dirname, '../preload/index.js')
  const preloadPath = fs.existsSync(preloadCandidateMjs) ? preloadCandidateMjs : preloadCandidateJs

  const iconPng = path.join(app.getAppPath(), 'build/icon.png')
  const icon = fs.existsSync(iconPng) ? iconPng : undefined

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Texugo',
    icon,
    backgroundColor: '#0c0e12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  })
  mainWindow.webContents.setBackgroundThrottling(false)

  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'clipboard-read' || permission === 'clipboard-sanitized-write') {
      return callback(true)
    }
    callback(true)
  })

  // DevTools shortcut: F12
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? ''
    if (url !== current) event.preventDefault()
  })

  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self'"
          ]
        }
      })
    })
  }

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  mainWindow.on('close', (event) => {
    if (allowQuit) return
    const settings = database.getSettings(app.getPath('home'))
    if (!settings.confirmClose || !terminals.hasRunning()) {
      allowQuit = true
      terminals.shutdownAll()
      return
    }
    event.preventDefault()
    dialog
      .showMessageBox(mainWindow!, {
        type: 'warning',
        buttons: ['Cancelar', 'Encerrar processos e sair'],
        defaultId: 0,
        cancelId: 0,
        title: 'Texugo',
        message: 'Há sessões em execução.',
        detail:
          'Sair encerra os processos destes terminais. O histórico visual fica salvo neste computador. Um processo preso ao ConPTY não continua depois que o aplicativo fecha; agentes compatíveis podem ser retomados pela CLI.'
      })
      .then(({ response }) => {
        if (response !== 1) return
        allowQuit = true
        terminals.shutdownAll()
        mainWindow?.destroy()
        mainWindow = null
        app.quit()
      })
  })

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  const userData = app.getPath('userData')
  const database = await AppDatabase.open(path.join(userData, 'agent-desktop.sqlite'))
  database.ensureDefaultAgents()
  database.markOrphansExited()
  const terminals = new PtyManager(
    (sessionId, seq, data) => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) return
        const contents = mainWindow.webContents
        if (!contents || contents.isDestroyed()) return
        contents.send('terminal:data', { sessionId, seq, data })
      } catch {}
    },
    (live) => {
      const session = database.getSession(live.id)
      if (session) {
        session.status = live.status
        session.exitCode = live.exitCode
        session.closeReason = live.closeReason
        session.externalSessionId = live.externalSessionId ?? session.externalSessionId
        session.attention = live.attention
        session.pid = live.pid
        session.updatedAt = Date.now()
        database.updateSession(session)
      }
      try {
        if (!mainWindow || mainWindow.isDestroyed()) return
        const contents = mainWindow.webContents
        if (!contents || contents.isDestroyed()) return
        contents.send('terminal:status', {
          sessionId: live.id,
          status: live.status,
          exitCode: live.exitCode,
          closeReason: live.closeReason,
          attention: live.attention,
          pid: live.pid,
          externalSessionId: live.externalSessionId
        })
      } catch {}
    }
  )
  registerIpc({
    db: database,
    pty: terminals,
    transcripts: path.join(userData, 'transcripts'),
    homeDir: app.getPath('home'),
    getWindow: () => mainWindow
  })
  await createWindow(database, terminals)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow(database, terminals)
  })
  app.on('before-quit', () => {
    if (!allowQuit) terminals.shutdownAll()
  })
})

app.on('second-instance', () => {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.focus()
})

app.on('window-all-closed', () => {
  app.quit()
})
