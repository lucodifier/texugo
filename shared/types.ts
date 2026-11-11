export type SessionStatus = 'starting' | 'running' | 'exited' | 'error'

export type CloseReason = 'user' | 'exit' | 'app-quit' | 'spawn-failed' | null

export type Attention = 'idle' | null

export type ResumeKind = 'none' | 'claude' | 'codex'

export type PresetId = 'auto' | '1' | '2h' | '2v' | '3' | '4' | '6' | '8'

export type RendererMode = 'canvas' | 'webgl' | 'dom'

export type ThemeName = 'dark' | 'light'

export interface LayoutState {
  preset: PresetId
  slots: (string | null)[]
  overflow: string[]
  colSizes: number[]
  rowSizes: number[]
  maximizedSessionId: string | null
}

export interface Project {
  id: string
  name: string
  cwd: string
  color: string
  layout: LayoutState
  createdAt: number
  updatedAt: number
}

export interface AgentProfile {
  id: string
  name: string
  command: string
  args: string[]
  cwd: string | null
  env: Record<string, string>
  icon: string
  color: string
  resumeKind: ResumeKind
  idlePattern: string
  builtin: boolean
}

export interface SessionRecord {
  id: string
  projectId: string
  name: string
  agentId: string | null
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
  externalSessionId: string | null
  resumeKind: ResumeKind
  status: SessionStatus
  exitCode: number | null
  closeReason: CloseReason
  attention: Attention
  createdAt: number
  updatedAt: number
  pid: number | null
}

export interface Settings {
  theme: ThemeName
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  scrollback: number
  defaultAgentId: string
  defaultCwd: string
  restoreVisualHistory: boolean
  confirmClose: boolean
  renderer: RendererMode
  transcriptLimitMb: number
}

export interface WorkspaceState {
  openProjectIds: string[]
  activeProjectId: string | null
  focusedSessionId: string | null
  layout?: LayoutState
}

export interface DataPacket {
  sessionId: string
  seq: number
  data: string
}

export interface StatusPacket {
  sessionId: string
  status: SessionStatus
  exitCode: number | null
  closeReason: CloseReason
  attention: Attention
  pid: number | null
  externalSessionId: string | null
}

export interface GitWorktree {
  path: string
  branch: string | null
  head: string | null
}

export interface GitInfo {
  available: boolean
  isRepo: boolean
  branch: string | null
  dirty: number
  error?: string
}

export interface TranscriptSlice {
  text: string
  truncated: boolean
}

export interface Bootstrap {
  projects: Project[]
  sessions: SessionRecord[]
  agents: AgentProfile[]
  settings: Settings
  workspace: WorkspaceState
  windowsBuild: number
  homeDir: string
}

export interface CreateProjectInput {
  name: string
  cwd: string
  color: string
}

export interface UpdateProjectInput {
  id: string
  name?: string
  cwd?: string
  color?: string
  layout?: LayoutState
}

export interface CreateSessionInput {
  projectId: string
  agentId: string
  name?: string
  cwd?: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  resume?: boolean
}

export interface AgentInput {
  id?: string
  name: string
  command: string
  args: string[]
  cwd: string | null
  env: Record<string, string>
  icon: string
  color: string
  resumeKind: ResumeKind
  idlePattern: string
}
