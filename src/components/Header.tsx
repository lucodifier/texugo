import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  GitBranch,
  Grid,
  ChevronDown,
  Bot
} from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { ipc } from '../services/ipc'
import type { AgentProfile, GitInfo, PresetId } from '@shared/types'

export const Header: React.FC = () => {
  const {
    projects,
    workspace,
    agents,
    sessions,
    switchProject,
    closeProjectTab,
    setLayoutPreset,
    createSession,
    setNewSessionModal
  } = useAppStore()

  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false)

  const activeProject = workspace.activeProjectId
    ? projects.find((p) => p.id === workspace.activeProjectId)
    : null
  const openProjects = projects.filter((p) => workspace.openProjectIds.includes(p.id))

  useEffect(() => {
    if (!activeProject?.cwd) {
      setGitInfo(null)
      return
    }
    ipc.inspectGit(activeProject.cwd).then(setGitInfo).catch(() => setGitInfo(null))
  }, [activeProject?.cwd])

  const presets: { id: PresetId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'auto',
      label: 'Automático (Adapta à quantidade de terminais)',
      icon: <span className="text-[9px] font-bold px-1 font-mono tracking-tighter">AUTO</span>
    },
    { id: '1', label: '1 Painel', icon: <div className="w-3.5 h-3.5 border border-current rounded-sm" /> },
    {
      id: '2h',
      label: '2 Horizontais (Lado a Lado)',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm flex">
          <div className="w-1/2 border-r border-current" />
        </div>
      )
    },
    {
      id: '2v',
      label: '2 Verticais (Cima/Baixo)',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm flex flex-col">
          <div className="h-1/2 border-b border-current" />
        </div>
      )
    },
    {
      id: '3',
      label: '3 Painéis (Lado a Lado)',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm flex">
          <div className="w-1/3 border-r border-current" />
          <div className="w-1/3 border-r border-current" />
        </div>
      )
    },
    {
      id: '4',
      label: '4 Painéis (Grade 2x2)',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-current" />
          <div className="border-b border-current" />
          <div className="border-r border-current" />
          <div />
        </div>
      )
    },
    {
      id: '6',
      label: '6 Painéis (Grade 3x2)',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm grid grid-cols-3 grid-rows-2">
          <div className="border-r border-b border-current" />
          <div className="border-r border-b border-current" />
          <div className="border-b border-current" />
          <div className="border-r border-current" />
          <div className="border-r border-current" />
          <div />
        </div>
      )
    },
    {
      id: '8',
      label: '8 Painéis (Grade 4x2)',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm grid grid-cols-4 grid-rows-2">
          <div className="border-r border-b border-current" />
          <div className="border-r border-b border-current" />
          <div className="border-r border-b border-current" />
          <div className="border-b border-current" />
          <div className="border-r border-current" />
          <div className="border-r border-current" />
          <div className="border-r border-current" />
          <div />
        </div>
      )
    }
  ]

  const currentPreset = activeProject
    ? activeProject.layout.preset
    : workspace.layout?.preset || 'auto'

  return (
    <header className="h-11 bg-[#12161f] border-b border-[#1e2330] flex items-center justify-between px-3 select-none">
      {/* Project Tabs / Multi-Project View */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[55%] h-full pt-1">
        {/* Multi-Project All Windows Tab */}
        <div
          onClick={() => switchProject('')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition ${
            workspace.activeProjectId === null
              ? 'bg-[#0c0e12] text-[#3dd6c6] border-[#3dd6c6] font-semibold'
              : 'text-[#8e9aa8] hover:text-white border-transparent hover:bg-[#181d29]'
          }`}
          title="Ver todos os projetos e terminais divididos lado a lado na mesma tela"
        >
          <Grid size={13} className="text-[#3dd6c6]" />
          <span>Todas as Janelas</span>
          {sessions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#1e2536] text-[10px] text-[#8e9aa8] font-mono">
              {sessions.filter((s) => s.status === 'running' || s.status === 'starting').length}
            </span>
          )}
        </div>

        {/* Individual Project Tabs */}
        {openProjects.map((project) => {
          const isActive = project.id === workspace.activeProjectId
          return (
            <div
              key={project.id}
              onClick={() => switchProject(project.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition ${
                isActive
                  ? 'bg-[#0c0e12] text-white border-[#3dd6c6] font-medium'
                  : 'text-[#8e9aa8] hover:text-white border-transparent hover:bg-[#181d29]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color || '#3dd6c6' }}
              />
              <span className="truncate max-w-[120px]">{project.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeProjectTab(project.id)
                }}
                className="hover:text-red-400 p-0.5 rounded text-[#6e7d91]"
              >
                <X size={12} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Middle & Right Controls */}
      <div className="flex items-center gap-3">
        {/* Git Branch Badge */}
        {gitInfo?.isRepo && gitInfo.branch && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181d29] border border-[#222a3a] text-[11px] text-[#8e9aa8]"
            title={`Branch: ${gitInfo.branch} (${gitInfo.dirty} arquivos modificados)`}
          >
            <GitBranch size={13} className="text-[#3dd6c6]" />
            <span className="font-mono text-white">{gitInfo.branch}</span>
            {gitInfo.dirty > 0 && (
              <span className="px-1 rounded bg-amber-500/20 text-amber-400 text-[10px]">
                +{gitInfo.dirty}
              </span>
            )}
          </div>
        )}

        {/* Active Models / Agents in Project */}
        {activeProject && (() => {
          const projectSessions = sessions.filter(
            (s) => s.projectId === activeProject.id && (s.status === 'running' || s.status === 'starting')
          )
          const activeAgentIds = [...new Set(projectSessions.map((s) => s.agentId).filter(Boolean))]
          const activeList = activeAgentIds.map((id) => agents.find((a) => a.id === id)).filter(Boolean) as AgentProfile[]

          if (activeList.length === 0) return null

          return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181d29] border border-[#222a3a] text-[11px]" title="Modelos/Agentes em execução neste projeto">
              <Bot size={13} className="text-[#3dd6c6]" />
              <div className="flex items-center gap-1">
                {activeList.map((ag) => (
                  <span
                    key={ag.id}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{ backgroundColor: `${ag.color}25`, color: ag.color }}
                  >
                    {ag.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Layout Presets (Always visible!) */}
        {projects.length > 0 && (
          <div className="flex items-center bg-[#181d29] border border-[#222a3a] rounded p-0.5 gap-0.5">
            {presets.map((preset) => {
              const isSelected = currentPreset === preset.id
              return (
                <button
                  key={preset.id}
                  onClick={() => setLayoutPreset(preset.id)}
                  title={preset.label}
                  className={`p-1.5 rounded transition ${
                    isSelected
                      ? 'bg-[#283248] text-[#3dd6c6]'
                      : 'text-[#6e7d91] hover:text-white hover:bg-[#1e2536]'
                  }`}
                >
                  {preset.icon}
                </button>
              )
            })}
          </div>
        )}

        {/* Quick Launch Buttons for Active Project */}
        {activeProject && (() => {
          const claudeAgent = agents.find((a) => (a.command.includes('claude') || a.id === 'claude') && a.enabled !== false)
          const fbAgent = agents.find((a) => (a.command.includes('freebuff') || a.id === 'freebuff') && a.enabled !== false)
          const codexAgent = agents.find((a) => (a.command.includes('codex') || a.id === 'codex') && a.enabled !== false)
          const bashAgent = agents.find((a) => (a.id === 'git-bash' || a.id === 'bash' || a.command === 'bash.exe' || a.id === 'windows-terminal') && a.enabled !== false)
          const cmdAgent = agents.find((a) => (a.id === 'cmd' || a.command === 'cmd.exe') && a.enabled !== false)

          return (
            <div className="flex items-center gap-1">
              {claudeAgent && (
                <button
                  onClick={async () => {
                    await createSession({
                      projectId: activeProject.id,
                      agentId: claudeAgent.id,
                      cwd: activeProject.cwd
                    })
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#d4a574]/40 text-[#d4a574] text-xs font-semibold transition"
                  title={`Iniciar Claude Code em ${activeProject.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a574]" />
                  <span>Claude</span>
                </button>
              )}

              {fbAgent && (
                <button
                  onClick={async () => {
                    await createSession({
                      projectId: activeProject.id,
                      agentId: fbAgent.id,
                      cwd: activeProject.cwd
                    })
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#00e599]/40 text-[#00e599] text-xs font-semibold transition"
                  title={`Iniciar Freebuff em ${activeProject.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e599]" />
                  <span>Freebuff</span>
                </button>
              )}

              {codexAgent && (
                <button
                  onClick={async () => {
                    await createSession({
                      projectId: activeProject.id,
                      agentId: codexAgent.id,
                      cwd: activeProject.cwd
                    })
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#10a37f]/40 text-[#10a37f] text-xs font-semibold transition"
                  title={`Iniciar Codex em ${activeProject.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10a37f]" />
                  <span>Codex</span>
                </button>
              )}

              {bashAgent && (
                <button
                  onClick={async () => {
                    await createSession({
                      projectId: activeProject.id,
                      agentId: bashAgent.id,
                      cwd: activeProject.cwd
                    })
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#4cc2ff]/40 text-[#4cc2ff] text-xs font-semibold transition"
                  title={`Abrir Bash (MINGW64) em ${activeProject.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4cc2ff]" />
                  <span>Bash</span>
                </button>
              )}

              {cmdAgent && (
                <button
                  onClick={async () => {
                    await createSession({
                      projectId: activeProject.id,
                      agentId: cmdAgent.id,
                      cwd: activeProject.cwd
                    })
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#c8c8c8]/40 text-[#c8c8c8] text-xs font-semibold transition"
                  title={`Abrir Prompt de Comando (CMD) em ${activeProject.name}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c8c8c8]" />
                  <span>CMD</span>
                </button>
              )}
            </div>
          )
        })()}

        {/* Add Terminal Dropdown */}
        {projects.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#3dd6c6] hover:bg-[#34b8ab] text-[#0c0e12] text-xs font-semibold shadow-sm transition"
            >
              <Plus size={14} />
              <span>Novo Terminal</span>
              <ChevronDown size={12} />
            </button>

            {isAgentMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsAgentMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-64 bg-[#181d29] border border-[#273144] rounded-md shadow-2xl py-1 z-50 max-h-96 overflow-y-auto">
                  <div className="px-3 py-1 text-[10px] font-semibold text-[#6e7d91] uppercase tracking-wider">
                    Iniciar no Projeto
                  </div>

                  {projects.map((proj) => {
                    const enabledList = agents.filter((a) => a.enabled !== false)
                    return (
                      <div key={proj.id} className="border-b border-[#222a3a]/60 last:border-b-0 py-1">
                        <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-white bg-[#131720]">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: proj.color || '#3dd6c6' }}
                          />
                          <span className="truncate flex-1">{proj.name}</span>
                          <span className="text-[9px] text-[#6e7d91] font-mono truncate max-w-[80px]">
                            {proj.cwd.split(/[\\/]/).pop()}
                          </span>
                        </div>

                        {/* Enabled Agents */}
                        {enabledList.map((agent) => (
                          <button
                            key={`${proj.id}-${agent.id}`}
                            onClick={async () => {
                              setIsAgentMenuOpen(false)
                              await createSession({
                                projectId: proj.id,
                                agentId: agent.id,
                                cwd: proj.cwd
                              })
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-[#cfd6e0] hover:bg-[#222a3a] hover:text-white text-left transition"
                          >
                            <span
                              className="w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] text-black"
                              style={{ backgroundColor: agent.color || '#3dd6c6' }}
                            >
                              {agent.icon || agent.name.slice(0, 2)}
                            </span>
                            <span className="text-xs truncate flex-1">{agent.name}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })}

                  <div className="border-t border-[#273144] my-1" />
                  <button
                    onClick={() => {
                      setIsAgentMenuOpen(false)
                      setNewSessionModal(true)
                    }}
                    className="w-full px-3 py-2 text-xs text-[#3dd6c6] font-medium hover:bg-[#222a3a] text-left flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Escolher Agente / Projeto completo...</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
