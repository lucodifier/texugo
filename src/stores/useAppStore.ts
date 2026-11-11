import { create } from 'zustand'
import type {
  AgentInput,
  AgentProfile,
  CreateProjectInput,
  CreateSessionInput,
  PresetId,
  Project,
  SessionRecord,
  Settings,
  StatusPacket,
  UpdateProjectInput,
  WorkspaceState
} from '@shared/types'
import {
  emptyLayout,
  setPreset,
  focusSessionInLayout,
  removeSessionFromLayout
} from '@shared/layout'
import { ipc } from '../services/ipc'
import { terminalRegistry } from '../features/terminal/terminal-registry'

interface AppState {
  initialized: boolean
  initError: string | null
  projects: Project[]
  sessions: SessionRecord[]
  agents: AgentProfile[]
  settings: Settings | null
  workspace: WorkspaceState
  windowsBuild: number
  homeDir: string
  detectedModels: Record<string, string>

  // Modals UI state
  projectModal: { open: boolean; editing: Project | null }
  agentModal: { open: boolean; editing: AgentProfile | null }
  settingsModal: boolean
  newSessionModal: { open: boolean; slotIndex: number | null }

  // Actions
  init: () => Promise<void>
  setProjectModal: (open: boolean, editing?: Project | null) => void
  setAgentModal: (open: boolean, editing?: AgentProfile | null) => void
  setSettingsModal: (open: boolean) => void
  setNewSessionModal: (open: boolean, slotIndex?: number | null) => void

  // Projects
  createProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (input: UpdateProjectInput) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  switchProject: (id: string) => Promise<void>
  closeProjectTab: (id: string) => Promise<void>

  // Layout
  setLayoutPreset: (preset: PresetId) => Promise<void>
  assignSlot: (slotIndex: number, sessionId: string | null) => Promise<void>
  maximizeSession: (sessionId: string | null) => Promise<void>
  focusSession: (sessionId: string) => Promise<void>

  // Sessions
  createSession: (input: CreateSessionInput) => Promise<SessionRecord>
  renameSession: (id: string, name: string) => Promise<void>
  resumeSession: (id: string, cols?: number, rows?: number) => Promise<void>
  restartSession: (id: string, cols?: number, rows?: number) => Promise<void>
  closeSession: (id: string) => Promise<void>
  deleteSession: (id: string) => Promise<void>
  duplicateSession: (id: string) => Promise<void>
  moveSession: (id: string, targetProjectId: string) => Promise<void>

  // Status updates from IPC listener
  handleStatusUpdate: (packet: StatusPacket) => void
  setDetectedModel: (sessionId: string, model: string) => void

  // Agents
  saveAgent: (agent: AgentInput) => Promise<void>
  deleteAgent: (id: string) => Promise<void>

  // Settings
  updateSettings: (settings: Partial<Settings>) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,
  initError: null,
  projects: [],
  sessions: [],
  agents: [],
  settings: null,
  workspace: { openProjectIds: [], activeProjectId: null, focusedSessionId: null },
  windowsBuild: 0,
  homeDir: '',
  detectedModels: {},

  setDetectedModel: (sessionId, model) => {
    set((state) => {
      if (state.detectedModels[sessionId] === model) return state
      return { detectedModels: { ...state.detectedModels, [sessionId]: model } }
    })
  },

  projectModal: { open: false, editing: null },
  agentModal: { open: false, editing: null },
  settingsModal: false,
  newSessionModal: { open: false, slotIndex: null },

  init: async () => {
    try {
      set({ initError: null })
      const data = await ipc.bootstrap()
      set({
        initialized: true,
        initError: null,
        projects: data.projects,
        sessions: data.sessions,
        agents: data.agents,
        settings: data.settings,
        workspace: data.workspace,
        windowsBuild: data.windowsBuild,
        homeDir: data.homeDir
      })

      // Register global IPC status listener
      ipc.onStatus((packet) => {
        get().handleStatusUpdate(packet)
      })

      // Global live model detection from terminal stream
      ipc.onData(({ sessionId, data }) => {
        const match = data.match(/\b(Sonnet[\s0-9.]+|Opus[\s0-9.]+|Haiku[\s0-9.]+|Claude\s+[0-9.]+\s+[A-Za-z]+|gpt-[0-9a-z.-]+|o1-[a-z]+|o3-[a-z]+|gemini-[0-9a-z.-]+)\b/i)
        if (match && match[1]) {
          get().setDetectedModel(sessionId, match[1].trim())
        }
      })

      // Scan existing transcripts for active/starting sessions
      data.sessions.forEach((s) => {
        ipc.tailTranscript(s.id, 8000).then((text) => {
          const match = text.match(/\b(Sonnet[\s0-9.]+|Opus[\s0-9.]+|Haiku[\s0-9.]+|Claude\s+[0-9.]+\s+[A-Za-z]+|gpt-[0-9a-z.-]+|o1-[a-z]+|o3-[a-z]+|gemini-[0-9a-z.-]+)\b/i)
          if (match && match[1]) {
            get().setDetectedModel(s.id, match[1].trim())
          }
        }).catch(() => {})
      })
    } catch (err: any) {
      console.error('Falha ao inicializar Agent Desktop:', err)
      set({ initError: err?.message || String(err) })
    }
  },

  setProjectModal: (open, editing = null) => set({ projectModal: { open, editing } }),
  setAgentModal: (open, editing = null) => set({ agentModal: { open, editing } }),
  setSettingsModal: (open) => set({ settingsModal: open }),
  setNewSessionModal: (open, slotIndex = null) => set({ newSessionModal: { open, slotIndex } }),

  createProject: async (input) => {
    const project = await ipc.createProject(input)
    const { projects, workspace } = get()
    const updatedProjects = [...projects, project]
    const updatedWorkspace: WorkspaceState = {
      ...workspace,
      openProjectIds: [...new Set([...workspace.openProjectIds, project.id])],
      activeProjectId: project.id
    }
    set({ projects: updatedProjects, workspace: updatedWorkspace })
    return project
  },

  updateProject: async (input) => {
    const updated = await ipc.updateProject(input)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p))
    }))
    return updated
  },

  deleteProject: async (id) => {
    const workspace = await ipc.deleteProject(id)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      sessions: state.sessions.filter((s) => s.projectId !== id),
      workspace
    }))
  },

  switchProject: async (id) => {
    const { workspace } = get()
    // if id is empty, switch to multi-project / all windows view
    const targetId = id ? id : null
    const openProjectIds = targetId
      ? [...new Set([...workspace.openProjectIds, targetId])]
      : workspace.openProjectIds

    const nextWorkspace: WorkspaceState = {
      ...workspace,
      openProjectIds,
      activeProjectId: targetId
    }
    set({ workspace: nextWorkspace })
    await ipc.saveWorkspace(nextWorkspace)
  },

  closeProjectTab: async (id) => {
    const { workspace } = get()
    const openProjectIds = workspace.openProjectIds.filter((pId) => pId !== id)
    const activeProjectId =
      workspace.activeProjectId === id ? (openProjectIds[0] ?? null) : workspace.activeProjectId
    const nextWorkspace: WorkspaceState = {
      ...workspace,
      openProjectIds,
      activeProjectId
    }
    set({ workspace: nextWorkspace })
    await ipc.saveWorkspace(nextWorkspace)
  },

  setLayoutPreset: async (preset) => {
    const { projects, workspace, sessions } = get()
    const activeProject = workspace.activeProjectId
      ? projects.find((p) => p.id === workspace.activeProjectId)
      : null

    if (activeProject) {
      const projectSessions = sessions.filter((s) => s.projectId === activeProject.id).map((s) => s.id)
      const updatedLayout = setPreset(activeProject.layout, preset, projectSessions)
      const updatedProject = { ...activeProject, layout: updatedLayout }

      set({
        projects: projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      })
      await ipc.updateProject({ id: updatedProject.id, layout: updatedLayout })
    } else {
      // Global multi-project workspace layout
      const allSessionIds = sessions.map((s) => s.id)
      const baseLayout = workspace.layout || emptyLayout('auto')
      const updatedLayout = setPreset(baseLayout, preset, allSessionIds)
      const nextWorkspace = { ...workspace, layout: updatedLayout }
      set({ workspace: nextWorkspace })
      await ipc.saveWorkspace(nextWorkspace)
    }
  },

  assignSlot: async (slotIndex, sessionId) => {
    const { projects, workspace, sessions } = get()
    const activeProject = workspace.activeProjectId
      ? projects.find((p) => p.id === workspace.activeProjectId)
      : null

    if (activeProject) {
      const slots = [...activeProject.layout.slots]
      slots[slotIndex] = sessionId
      const updatedLayout = { ...activeProject.layout, slots }
      const updatedProject = { ...activeProject, layout: updatedLayout }

      set({
        projects: projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      })
      await ipc.updateProject({ id: updatedProject.id, layout: updatedLayout })
    } else {
      const allSessionIds = sessions.map((s) => s.id)
      const baseLayout = workspace.layout || emptyLayout('auto')
      const slots = [...baseLayout.slots]
      slots[slotIndex] = sessionId
      const updatedLayout = { ...baseLayout, slots }
      const nextWorkspace = { ...workspace, layout: updatedLayout }
      set({ workspace: nextWorkspace })
      await ipc.saveWorkspace(nextWorkspace)
    }
  },

  maximizeSession: async (sessionId) => {
    const { projects, workspace, sessions } = get()
    const activeProject = workspace.activeProjectId
      ? projects.find((p) => p.id === workspace.activeProjectId)
      : null

    if (activeProject) {
      const currentMax = activeProject.layout.maximizedSessionId
      const nextMax = currentMax === sessionId ? null : sessionId
      const updatedLayout = { ...activeProject.layout, maximizedSessionId: nextMax }
      const updatedProject = { ...activeProject, layout: updatedLayout }

      set({
        projects: projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      })
      await ipc.updateProject({ id: updatedProject.id, layout: updatedLayout })
    } else {
      const allSessionIds = sessions.map((s) => s.id)
      const baseLayout = workspace.layout || emptyLayout('auto')
      const currentMax = baseLayout.maximizedSessionId
      const nextMax = currentMax === sessionId ? null : sessionId
      const updatedLayout = { ...baseLayout, maximizedSessionId: nextMax }
      const nextWorkspace = { ...workspace, layout: updatedLayout }
      set({ workspace: nextWorkspace })
      await ipc.saveWorkspace(nextWorkspace)
    }
  },

  focusSession: async (sessionId) => {
    const { workspace } = get()
    const nextWorkspace = { ...workspace, focusedSessionId: sessionId }
    set({ workspace: nextWorkspace })
    await ipc.saveWorkspace(nextWorkspace)
  },

  createSession: async (input) => {
    const session = await ipc.createSession(input)
    const { sessions, projects, workspace } = get()
    const targetProject = projects.find((p) => p.id === session.projectId)

    let updatedProjects = projects
    if (targetProject) {
      const projectSessionIds = [...sessions.filter((s) => s.projectId === targetProject.id).map((s) => s.id), session.id]
      const layout = focusSessionInLayout(targetProject.layout, session.id, projectSessionIds)
      updatedProjects = projects.map((p) => (p.id === targetProject.id ? { ...p, layout } : p))
    }

    // Always place into the multi-project workspace layout as well
    const allSessionIds = [...sessions.map((s) => s.id), session.id]
    const baseWLayout = workspace.layout || emptyLayout('auto')
    const updatedWLayout = focusSessionInLayout(baseWLayout, session.id, allSessionIds)

    set({
      sessions: [...sessions, session],
      projects: updatedProjects,
      workspace: {
        ...workspace,
        layout: updatedWLayout,
        focusedSessionId: session.id
      }
    })
    return session
  },

  renameSession: async (id, name) => {
    const updated = await ipc.renameSession(id, name)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s))
    }))
  },

  resumeSession: async (id, cols, rows) => {
    const { session } = await ipc.resumeSession(id, cols, rows)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? session : s))
    }))
  },

  restartSession: async (id, cols, rows) => {
    const updated = await ipc.restartSession(id, cols, rows)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s))
    }))
  },

  closeSession: async (id) => {
    const updated = await ipc.closeSession(id)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? updated : s))
    }))
  },

  deleteSession: async (id) => {
    const { sessions, projects, workspace } = get()
    const session = sessions.find((s) => s.id === id)

    // Remove from terminal registry immediately to clean up DOM and xterm
    terminalRegistry.remove(id)

    let updatedProjects = projects
    if (session) {
      const project = projects.find((p) => p.id === session.projectId)
      if (project) {
        const remainingIds = sessions.filter((s) => s.projectId === project.id && s.id !== id).map((s) => s.id)
        const layout = removeSessionFromLayout(project.layout, id, remainingIds)
        updatedProjects = projects.map((p) => (p.id === project.id ? { ...p, layout } : p))
      }
    }

    const remainingAll = sessions.filter((s) => s.id !== id).map((s) => s.id)
    const updatedWLayout = workspace.layout
      ? removeSessionFromLayout(workspace.layout, id, remainingAll)
      : workspace.layout

    set({
      sessions: sessions.filter((s) => s.id !== id),
      projects: updatedProjects,
      workspace: {
        ...workspace,
        layout: updatedWLayout,
        focusedSessionId: workspace.focusedSessionId === id ? null : workspace.focusedSessionId
      }
    })

    try {
      await ipc.deleteSession(id)
    } catch (err) {
      console.error('Falha ao deletar sessão no backend:', err)
    }
  },

  duplicateSession: async (id) => {
    const newSession = await ipc.duplicateSession(id)
    set((state) => ({
      sessions: [...state.sessions, newSession]
    }))
  },

  moveSession: async (id, targetProjectId) => {
    const { from, to, session } = await ipc.moveSession(id, targetProjectId)
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? session : s)),
      projects: state.projects.map((p) => (p.id === from.id ? from : p.id === to.id ? to : p))
    }))
  },

  handleStatusUpdate: (packet) => {
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === packet.sessionId
          ? {
              ...s,
              status: packet.status,
              exitCode: packet.exitCode,
              closeReason: packet.closeReason,
              attention: packet.attention,
              pid: packet.pid,
              externalSessionId: packet.externalSessionId ?? s.externalSessionId
            }
          : s
      )
    }))
  },

  saveAgent: async (input) => {
    const saved = await ipc.saveAgent(input)
    set((state) => {
      const exists = state.agents.some((a) => a.id === saved.id)
      return {
        agents: exists ? state.agents.map((a) => (a.id === saved.id ? saved : a)) : [...state.agents, saved]
      }
    })
  },

  deleteAgent: async (id) => {
    await ipc.deleteAgent(id)
    set((state) => ({
      agents: state.agents.filter((a) => a.id !== id)
    }))
  },

  updateSettings: async (settings) => {
    const updated = await ipc.updateSettings(settings)
    set({ settings: updated })
  }
}))
