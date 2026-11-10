import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { clipboard, dialog, ipcMain, shell, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { buildResumeArgs } from '@shared/resume'
import type {
  AgentInput,
  CreateProjectInput,
  CreateSessionInput,
  LayoutState,
  SessionRecord,
  Settings,
  UpdateProjectInput,
  WorkspaceState
} from '@shared/types'
import {
  isSafeExternalUrl,
  sanitizeSize,
  validateArgs,
  validateColor,
  validateCommand,
  validateEnv,
  validateIdlePattern,
  validateProjectName
} from '@shared/validation'
import { emptyLayout, focusSessionInLayout, normalizeLayout, removeSessionFromLayout } from '@shared/layout'
import { agentFromInput, type AppDatabase } from './database'
import { findClaudeSessionId, findCodexSessionId } from '../terminal/session-discovery'
import { addWorktree, inspectGit, listWorktrees, removeWorktree } from '../terminal/git'
import { readTail } from '../terminal/output-log'
import { PtyManager, transcriptPath } from '../terminal/pty-manager'

interface Host {
  db: AppDatabase
  pty: PtyManager
  transcripts: string
  homeDir: string
  getWindow: () => BrowserWindow | null
}

export function registerIpc(host: Host): void {
  const handle = <T>(channel: string, fn: (payload: unknown) => Promise<T> | T) => {
    ipcMain.handle(channel, async (event, payload) => {
      try {
        assertTrusted(event, host.getWindow())
        return { ok: true as const, data: await fn(payload) }
      } catch (error) {
        return { ok: false as const, error: error instanceof Error ? error.message : 'Falha inesperada.' }
      }
    })
  }

  handle('bootstrap', () => ({
    projects: host.db.listProjects().map((project) => withLayout(host, project.id)),
    sessions: host.db.listSessions(),
    agents: host.db.listAgents(),
    settings: host.db.getSettings(host.homeDir),
    workspace: cleanWorkspace(host),
    windowsBuild: host.pty.windowsBuild,
    homeDir: host.homeDir
  }))

  handle('projects:create', (payload) => {
    const input = payload as CreateProjectInput
    const project = {
      id: crypto.randomUUID(),
      name: validateProjectName(input.name),
      cwd: assertDirectory(input.cwd),
      color: validateColor(input.color),
      layout: emptyLayout('1'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    host.db.insertProject(project)
    const workspace = host.db.getWorkspace()
    workspace.openProjectIds = [...new Set([...workspace.openProjectIds, project.id])]
    workspace.activeProjectId = project.id
    host.db.saveWorkspace(workspace)
    return project
  })

  handle('projects:update', (payload) => {
    const input = payload as UpdateProjectInput
    const project = requiredProject(host, input.id)
    if (input.name != null) project.name = validateProjectName(input.name)
    if (input.cwd != null) project.cwd = assertDirectory(input.cwd)
    if (input.color != null) project.color = validateColor(input.color)
    if (input.layout) project.layout = normalizeLayout(input.layout, sessionIds(host, project.id))
    project.updatedAt = Date.now()
    host.db.updateProject(project)
    return project
  })

  handle('projects:delete', async (payload) => {
    const { id } = payload as { id: string }
    const sessions = host.db.listSessions().filter((session) => session.projectId === id)
    for (const session of sessions) {
      host.pty.shutdown(session.id, 'user')
      deleteTranscript(host, session.id)
      host.db.deleteSession(session.id)
    }
    host.db.deleteProject(id)
    const workspace = host.db.getWorkspace()
    workspace.openProjectIds = workspace.openProjectIds.filter((projectId) => projectId !== id)
    if (workspace.activeProjectId === id) workspace.activeProjectId = workspace.openProjectIds[0] ?? null
    host.db.saveWorkspace(workspace)
    return cleanWorkspace(host)
  })

  handle('workspace:save', (payload) => {
    const workspace = payload as WorkspaceState
    const projects = new Set(host.db.listProjects().map((project) => project.id))
    const next: WorkspaceState = {
      openProjectIds: workspace.openProjectIds.filter((id) => projects.has(id)),
      activeProjectId:
        workspace.activeProjectId && projects.has(workspace.activeProjectId) ? workspace.activeProjectId : null,
      focusedSessionId: workspace.focusedSessionId
    }
    host.db.saveWorkspace(next)
    return next
  })

  handle('sessions:create', async (payload) => {
    const input = payload as CreateSessionInput
    const session = buildSession(host, input)
    host.db.insertSession(session)
    place(host, session)
    const live = await host.pty.spawn(toSpawn(host, session, 120, 32))
    applyLive(host, session, live)
    watchExternalId(host, session, live.startedAt)
    return host.db.getSession(session.id)
  })

  handle('sessions:rename', (payload) => {
    const { id, name } = payload as { id: string; name: string }
    const session = requiredSession(host, id)
    session.name = validateProjectName(name)
    session.updatedAt = Date.now()
    host.db.updateSession(session)
    return session
  })

  handle('sessions:resume', async (payload) => {
    const { id, cols, rows } = payload as { id: string; cols?: number; rows?: number }
    const session = requiredSession(host, id)
    const plan = buildResumeArgs(session.resumeKind, session.args, session.externalSessionId)
    if ('error' in plan) throw new Error(plan.error)
    const size = sanitizeSize(cols ?? 120, rows ?? 32) ?? { cols: 120, rows: 32 }
    const live = await host.pty.spawn({ ...toSpawn(host, session, size.cols, size.rows), args: plan.args })
    applyLive(host, session, live)
    watchExternalId(host, session, live.startedAt)
    return { session: host.db.getSession(session.id), description: plan.description }
  })

  handle('sessions:restart', async (payload) => {
    const { id, cols, rows } = payload as { id: string; cols?: number; rows?: number }
    const session = requiredSession(host, id)
    session.updatedAt = Date.now()
    const size = sanitizeSize(cols ?? 120, rows ?? 32) ?? { cols: 120, rows: 32 }
    const live = await host.pty.spawn(toSpawn(host, session, size.cols, size.rows))
    applyLive(host, session, live)
    watchExternalId(host, session, live.startedAt)
    return host.db.getSession(session.id)
  })

  handle('sessions:close', (payload) => {
    const { id } = payload as { id: string }
    host.pty.shutdown(id, 'user')
    const session = host.db.getSession(id)
    if (session && session.status !== 'running' && session.status !== 'starting') {
      session.status = 'exited'
      session.closeReason = 'user'
      session.updatedAt = Date.now()
      host.db.updateSession(session)
    }
    return host.db.getSession(id)
  })

  handle('sessions:delete', (payload) => {
    const { id } = payload as { id: string }
    const session = requiredSession(host, id)
    host.pty.shutdown(id, 'user')
    host.db.deleteSession(id)
    deleteTranscript(host, id)
    const project = requiredProject(host, session.projectId)
    project.layout = removeSessionFromLayout(project.layout, id, sessionIds(host, project.id))
    project.updatedAt = Date.now()
    host.db.updateProject(project)
    return true
  })

  handle('sessions:duplicate', async (payload) => {
    const { id } = payload as { id: string }
    const source = requiredSession(host, id)
    const agent = source.agentId ? host.db.getAgent(source.agentId) : null
    const session: SessionRecord = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} cópia`.slice(0, 80),
      args: agent?.args ?? source.args,
      externalSessionId: null,
      status: 'starting',
      exitCode: null,
      closeReason: null,
      attention: null,
      pid: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    host.db.insertSession(session)
    place(host, session)
    const live = await host.pty.spawn(toSpawn(host, session, 120, 32))
    applyLive(host, session, live)
    watchExternalId(host, session, live.startedAt)
    return host.db.getSession(session.id)
  })

  handle('sessions:move', (payload) => {
    const { id, projectId } = payload as { id: string; projectId: string }
    const session = requiredSession(host, id)
    const from = requiredProject(host, session.projectId)
    const to = requiredProject(host, projectId)
    from.layout = removeSessionFromLayout(from.layout, id, sessionIds(host, from.id).filter((item) => item !== id))
    session.projectId = projectId
    session.updatedAt = Date.now()
    host.db.updateSession(session)
    to.layout = focusSessionInLayout(to.layout, id, sessionIds(host, to.id))
    from.updatedAt = Date.now()
    to.updatedAt = Date.now()
    host.db.updateProject(from)
    host.db.updateProject(to)
    return { from, to, session }
  })

  handle('sessions:write', (payload) => {
    const { id, data } = payload as { id: string; data: string }
    if (typeof data !== 'string') throw new Error('Entrada inválida.')
    host.pty.write(id, data)
    return true
  })

  handle('sessions:resize', (payload) => {
    const { id, cols, rows } = payload as { id: string; cols: number; rows: number }
    host.pty.resize(id, cols, rows)
    return true
  })

  handle('sessions:transcript', (payload) => {
    const { id } = payload as { id: string }
    requiredSession(host, id)
    const settings = host.db.getSettings(host.homeDir)
    const maxBytes = Math.max(1, settings.transcriptLimitMb) * 1024 * 1024
    return readTail(transcriptPath(host.transcripts, id), maxBytes)
  })

  handle('agents:save', (payload) => {
    const input = payload as AgentInput
    const existing = input.id ? host.db.getAgent(input.id) : null
    const agent = agentFromInput(
      {
        ...input,
        name: validateProjectName(input.name),
        command: validateCommand(input.command),
        args: validateArgs(input.args),
        env: validateEnv(input.env ?? {}),
        color: validateColor(input.color),
        idlePattern: validateIdlePattern(input.idlePattern ?? ''),
        cwd: input.cwd ? assertDirectory(input.cwd) : null,
        icon: (input.icon || input.name).slice(0, 3)
      },
      existing?.builtin ?? false
    )
    if (existing) agent.id = existing.id
    host.db.upsertAgent(agent)
    return agent
  })

  handle('agents:delete', (payload) => {
    const { id } = payload as { id: string }
    host.db.deleteAgent(id)
    return host.db.listAgents()
  })

  handle('agents:reset', () => {
    host.db.ensureDefaultAgents()
    return host.db.listAgents()
  })

  handle('settings:save', (payload) => {
    const settings = normalizeSettings(payload as Settings, host.homeDir)
    host.db.saveSettings(settings)
    return settings
  })

  const pickDirHandler = async () => {
    const window = host.getWindow()
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0] ?? null
  }
  handle('dialog:directory', pickDirHandler)
  handle('dialog:pick-directory', pickDirHandler)

  handle('shell:openPath', async (payload) => {
    const { target } = payload as { target: string }
    const resolved = assertDirectory(target)
    const error = await shell.openPath(resolved)
    if (error) throw new Error(error)
    return true
  })

  handle('shell:openExternal', async (payload) => {
    const { url } = payload as { url: string }
    if (!isSafeExternalUrl(url)) throw new Error('Só abro links http e https.')
    await shell.openExternal(url)
    return true
  })

  handle('clipboard:write', (payload) => {
    const { text } = payload as { text: string }
    if (typeof text !== 'string' || text.length > 20_000_000) throw new Error('Histórico grande demais para copiar.')
    clipboard.writeText(text)
    return true
  })

  handle('clipboard:read', () => {
    return clipboard.readText()
  })

  ipcMain.on('clipboard:read-sync', (event) => {
    event.returnValue = clipboard.readText()
  })

  ipcMain.on('clipboard:write-sync', (event, text) => {
    if (typeof text === 'string') {
      clipboard.writeText(text)
    }
    event.returnValue = true
  })

  handle('git:info', async (payload) => inspectGit(assertDirectory((payload as { cwd: string }).cwd)))

  handle('git:worktrees', async (payload) => listWorktrees(assertDirectory((payload as { cwd: string }).cwd)))

  handle('git:addWorktree', async (payload) => {
    const input = payload as { repoCwd: string; targetPath: string; branch: string }
    const branch = input.branch.trim()
    if (!branch || /[\u0000-\u001f\s]/.test(branch)) throw new Error('Informe um nome de branch sem espaços.')
    const repo = assertDirectory(input.repoCwd)
    const parent = path.dirname(path.resolve(input.targetPath))
    assertDirectory(parent)
    await addWorktree(repo, path.resolve(input.targetPath), branch)
    return listWorktrees(repo)
  })

  handle('git:removeWorktree', async (payload) => {
    const input = payload as { repoCwd: string; targetPath: string; force: boolean }
    const repo = assertDirectory(input.repoCwd)
    await removeWorktree(repo, input.targetPath, Boolean(input.force))
    return listWorktrees(repo)
  })
}

function resumeArgs(session: SessionRecord): string[] {
  const plan = buildResumeArgs(session.resumeKind, session.args, session.externalSessionId)
  if ('error' in plan) throw new Error(plan.error)
  return plan.args
}

function buildSession(host: Host, input: CreateSessionInput): SessionRecord {
  const project = requiredProject(host, input.projectId)
  const agent = host.db.getAgent(input.agentId)
  if (!agent) throw new Error('Agente não encontrado.')
  const cwd = assertDirectory(input.cwd || agent.cwd || project.cwd)
  const args = validateArgs(input.args ?? agent.args)
  const resumeKind = agent.resumeKind
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    projectId: project.id,
    name: validateProjectName(input.name?.trim() || agent.name),
    agentId: agent.id,
    command: validateCommand(input.command ?? agent.command),
    args,
    cwd,
    env: validateEnv(input.env ?? agent.env),
    externalSessionId: null,
    resumeKind,
    status: 'starting',
    exitCode: null,
    closeReason: null,
    attention: null,
    pid: null,
    createdAt: now,
    updatedAt: now
  }
}

function toSpawn(host: Host, session: SessionRecord, cols: number, rows: number) {
  return {
    sessionId: session.id,
    command: session.command,
    args: session.args,
    cwd: session.cwd,
    extraEnv: session.env,
    resumeKind: session.resumeKind,
    idlePattern: host.db.getAgent(session.agentId ?? '')?.idlePattern ?? '',
    cols,
    rows,
    transcriptFile: transcriptPath(host.transcripts, session.id)
  }
}

function applyLive(host: Host, session: SessionRecord, live: ReturnType<PtyManager['get']>): void {
  if (!live) return
  session.status = live.status
  session.exitCode = live.exitCode
  session.closeReason = live.closeReason
  session.pid = live.pid
  session.attention = live.attention
  session.updatedAt = Date.now()
  host.db.updateSession(session)
}

function watchExternalId(host: Host, session: SessionRecord, startedAt: number): void {
  if (session.resumeKind === 'none') return
  for (const delay of [2000, 6000, 15000, 40000]) {
    setTimeout(() => {
      const live = host.pty.get(session.id)
      if (!live || live.startedAt !== startedAt || live.externalSessionId) return
      const id =
        session.resumeKind === 'claude'
          ? findClaudeSessionId(session.cwd, startedAt, host.homeDir)
          : findCodexSessionId(startedAt, host.homeDir)
      if (!id) return
      const current = host.db.getSession(session.id)
      if (!current) return
      current.externalSessionId = id
      current.updatedAt = Date.now()
      host.db.updateSession(current)
      host.pty.noteExternalSession(session.id, id)
    }, delay)
  }
}

function place(host: Host, session: SessionRecord): void {
  const project = requiredProject(host, session.projectId)
  project.layout = focusSessionInLayout(project.layout, session.id, sessionIds(host, project.id))
  project.updatedAt = Date.now()
  host.db.updateProject(project)
}

function withLayout(host: Host, projectId: string) {
  const project = requiredProject(host, projectId)
  project.layout = normalizeLayout(project.layout, sessionIds(host, projectId))
  return project
}

function sessionIds(host: Host, projectId: string): string[] {
  return host.db.listSessions().filter((session) => session.projectId === projectId).map((session) => session.id)
}

function requiredProject(host: Host, id: string) {
  const project = host.db.getProject(id)
  if (!project) throw new Error('Projeto não encontrado.')
  return project
}

function requiredSession(host: Host, id: string): SessionRecord {
  const session = host.db.getSession(id)
  if (!session) throw new Error('Sessão não encontrada.')
  return session
}

function deleteTranscript(host: Host, id: string): void {
  fs.rmSync(transcriptPath(host.transcripts, id), { force: true })
}

function cleanWorkspace(host: Host): WorkspaceState {
  const workspace = host.db.getWorkspace()
  const projects = new Set(host.db.listProjects().map((project) => project.id))
  return {
    openProjectIds: workspace.openProjectIds.filter((id) => projects.has(id)),
    activeProjectId:
      workspace.activeProjectId && projects.has(workspace.activeProjectId) ? workspace.activeProjectId : null,
    focusedSessionId: workspace.focusedSessionId
  }
}

function assertDirectory(cwd: string): string {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) {
    throw new Error('Use um caminho absoluto do Windows.')
  }
  const resolved = path.resolve(cwd)
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`A pasta não existe: ${resolved}`)
  }
  return resolved
}

function normalizeSettings(input: Settings, homeDir: string): Settings {
  if (!input || typeof input !== 'object') throw new Error('Configuração inválida.')
  if (input.fontSize < 8 || input.fontSize > 32) throw new Error('O tamanho da fonte precisa ficar entre 8 e 32.')
  if (input.scrollback < 1_000 || input.scrollback > 500_000) {
    throw new Error('O scrollback precisa ficar entre 1.000 e 500.000 linhas.')
  }
  if (input.lineHeight < 1 || input.lineHeight > 2) throw new Error('A altura da linha é inválida.')
  if (input.letterSpacing < -1 || input.letterSpacing > 5) throw new Error('O espaçamento é inválido.')
  if (input.theme !== 'dark' && input.theme !== 'light') throw new Error('Tema inválido.')
  if (!['canvas', 'webgl', 'dom'].includes(input.renderer)) throw new Error('Renderizador inválido.')
  if (input.transcriptLimitMb < 4 || input.transcriptLimitMb > 256) {
    throw new Error('O limite do histórico precisa ficar entre 4 e 256 MB.')
  }
  const fontFamily = input.fontFamily?.trim()
  if (!fontFamily || fontFamily.length > 200) throw new Error('Informe a fonte do terminal.')
  return {
    ...input,
    fontFamily,
    defaultCwd: assertDirectory(input.defaultCwd || homeDir),
    restoreVisualHistory: Boolean(input.restoreVisualHistory),
    confirmClose: Boolean(input.confirmClose)
  }
}

function assertTrusted(event: IpcMainInvokeEvent, window: BrowserWindow | null): void {
  if (!window || event.sender !== window.webContents) {
    throw new Error('Canal IPC recusado.')
  }
}

export function taskkill(pid: number): void {
  spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
}
