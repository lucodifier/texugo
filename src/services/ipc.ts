import type {
  AgentInput,
  AgentProfile,
  Bootstrap,
  CreateProjectInput,
  CreateSessionInput,
  DataPacket,
  GitInfo,
  GitWorktree,
  Project,
  SessionRecord,
  Settings,
  StatusPacket,
  UpdateProjectInput,
  WorkspaceState
} from '@shared/types'

type IpcResponse<T> = { ok: true; data: T } | { ok: false; error: string }

interface WindowAgentDesktop {
  invoke: (channel: string, payload?: unknown) => Promise<IpcResponse<unknown>>
  on: (channel: string, callback: (payload: unknown) => void) => () => void
}

declare global {
  interface Window {
    agentDesktop?: WindowAgentDesktop
  }
}

async function call<T>(channel: string, payload?: unknown): Promise<T> {
  if (!window.agentDesktop) {
    throw new Error('agentDesktop bridge não disponível no renderer.')
  }
  const res = (await window.agentDesktop.invoke(channel, payload)) as IpcResponse<T>
  if (!res.ok) {
    throw new Error(res.error)
  }
  return res.data
}

export const ipc = {
  bootstrap: () => call<Bootstrap>('bootstrap'),

  // Projects
  createProject: (input: CreateProjectInput) => call<Project>('projects:create', input),
  updateProject: (input: UpdateProjectInput) => call<Project>('projects:update', input),
  deleteProject: (id: string) => call<WorkspaceState>('projects:delete', { id }),

  // Workspace
  saveWorkspace: (state: WorkspaceState) => call<WorkspaceState>('workspace:save', state),

  // Sessions
  createSession: (input: CreateSessionInput) => call<SessionRecord>('sessions:create', input),
  renameSession: (id: string, name: string) => call<SessionRecord>('sessions:rename', { id, name }),
  resumeSession: (id: string, cols?: number, rows?: number) =>
    call<{ session: SessionRecord; description: string }>('sessions:resume', { id, cols, rows }),
  restartSession: (id: string, cols?: number, rows?: number) =>
    call<SessionRecord>('sessions:restart', { id, cols, rows }),
  closeSession: (id: string) => call<SessionRecord>('sessions:close', { id }),
  deleteSession: (id: string) => call<boolean>('sessions:delete', { id }),
  duplicateSession: (id: string) => call<SessionRecord>('sessions:duplicate', { id }),
  moveSession: (id: string, projectId: string) =>
    call<{ from: Project; to: Project; session: SessionRecord }>('sessions:move', { id, projectId }),
  writeSession: (id: string, data: string) => call<boolean>('sessions:write', { id, data }),
  resizeSession: (id: string, cols: number, rows: number) =>
    call<boolean>('sessions:resize', { id, cols, rows }),
  getTranscript: (id: string) => call<string>('sessions:transcript', { id }),
  tailTranscript: (id: string, maxBytes?: number) => call<string>('sessions:tail', { id, maxBytes }),

  // Agents
  listAgents: () => call<AgentProfile[]>('agents:list'),
  saveAgent: (agent: AgentInput) => call<AgentProfile>('agents:save', agent),
  deleteAgent: (id: string) => call<boolean>('agents:delete', { id }),

  // Settings
  getSettings: () => call<Settings>('settings:get'),
  updateSettings: (settings: Partial<Settings>) => call<Settings>('settings:update', settings),

  // Git
  inspectGit: (cwd: string) => call<GitInfo>('git:info', { cwd }),
  listWorktrees: (cwd: string) => call<GitWorktree[]>('git:worktrees', { cwd }),
  addWorktree: (cwd: string, branch: string, path: string) =>
    call<boolean>('git:addWorktree', { repoCwd: cwd, branch, targetPath: path }),
  removeWorktree: (cwd: string, worktreePath: string) =>
    call<boolean>('git:removeWorktree', { repoCwd: cwd, targetPath: worktreePath, force: false }),

  // System
  pickDirectory: () => call<string | null>('dialog:directory'),
  openPath: (target: string) => call<boolean>('shell:openPath', { target }),
  openExternal: (url: string) => call<boolean>('shell:openExternal', { url }),
  copyToClipboard: (text: string) => call<boolean>('clipboard:write', { text }),

  // Listeners
  onData: (cb: (packet: DataPacket) => void) => {
    if (!window.agentDesktop) return () => {}
    return window.agentDesktop.on('terminal:data', (p) => cb(p as DataPacket))
  },
  onStatus: (cb: (packet: StatusPacket) => void) => {
    if (!window.agentDesktop) return () => {}
    return window.agentDesktop.on('terminal:status', (p) => cb(p as StatusPacket))
  }
}
