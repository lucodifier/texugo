import React, { useState, useEffect } from 'react'
import {
  FolderPlus,
  Settings as SettingsIcon,
  Bot,
  Folder,
  Terminal as TerminalIcon,
  Trash2,
  Edit2,
  FolderOpen,
  Plus,
  GitBranch
} from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { ipc } from '../services/ipc'
import { TexugoIcon } from './TexugoIcon'

export const Sidebar: React.FC = () => {
  const {
    projects,
    sessions,
    agents,
    workspace,
    detectedModels,
    switchProject,
    setProjectModal,
    setAgentModal,
    setSettingsModal,
    setNewSessionModal,
    createSession,
    deleteProject
  } = useAppStore()

  const [gitBranches, setGitBranches] = useState<Record<string, string>>({})

  // Resizable sidebar width (persisted in localStorage)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('texugo:sidebarWidth')
      if (saved) {
        const val = Number(saved)
        if (val >= 200 && val <= 600) return val
      }
    } catch {}
    return 290 // Default mais largo e espaçoso para acomodar nomes de projetos
  })
  const [isResizing, setIsResizing] = useState(false)

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startW = sidebarWidth

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.min(600, Math.max(200, startW + (moveEvent.clientX - startX)))
      setSidebarWidth(newWidth)
    }

    const onMouseUp = (upEvent: MouseEvent) => {
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      const finalWidth = Math.min(600, Math.max(200, startW + (upEvent.clientX - startX)))
      try {
        localStorage.setItem('texugo:sidebarWidth', String(finalWidth))
      } catch {}
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Periodically inspect Git branch for open projects
  useEffect(() => {
    const fetchBranches = () => {
      projects.forEach((p) => {
        if (p.cwd) {
          ipc.inspectGit(p.cwd).then((info) => {
            if (info?.isRepo && info?.branch) {
              setGitBranches((prev) => (prev[p.id] === info.branch ? prev : { ...prev, [p.id]: info.branch }))
            }
          }).catch(() => {})
        }
      })
    }

    fetchBranches()
    const timer = setInterval(fetchBranches, 8000)
    window.addEventListener('focus', fetchBranches)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', fetchBranches)
    }
  }, [projects])

  const handleDeleteProject = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Tem certeza que deseja remover o projeto "${name}"? Os processos ativos serão encerrados.`)) {
      deleteProject(id)
    }
  }

  const handleEditProject = (e: React.MouseEvent, project: any) => {
    e.stopPropagation()
    setProjectModal(true, project)
  }

  const handleOpenFolder = (e: React.MouseEvent, cwd: string) => {
    e.stopPropagation()
    ipc.openPath(cwd)
  }

  return (
    <aside
      style={{ width: `${sidebarWidth}px` }}
      className="relative bg-[#12161f] border-r border-[#1e2330] flex flex-col h-full select-none flex-shrink-0"
    >
      {/* Resizer Handle na borda direita */}
      <div
        onMouseDown={startResizing}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#3dd6c6]/50 active:bg-[#3dd6c6] transition-colors z-30"
        title="Arraste para redimensionar a barra lateral"
      />

      {/* Brand Header */}
      <div className="h-12 border-b border-[#1e2330] flex items-center justify-between px-4">
        <div
          onClick={() => switchProject('')}
          className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition"
          title="Ver grade com todos os projetos"
        >
          <TexugoIcon size={24} className="w-6 h-6 flex-shrink-0" />
          <span className="font-semibold text-sm tracking-wide text-white">Texugo</span>
        </div>
        <button
          onClick={() => setProjectModal(true)}
          title="Novo Projeto"
          className="p-1 rounded hover:bg-[#1e2433] text-[#8e9aa8] hover:text-[#3dd6c6] transition-colors"
        >
          <FolderPlus size={18} />
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        <div className="px-2 py-1 text-[11px] font-semibold text-[#657385] uppercase tracking-wider flex items-center justify-between">
          <span>Projetos ({projects.length})</span>
          <span className="text-[10px] text-[#3dd6c6] font-normal lowercase">multijanelas</span>
        </div>

        {projects.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-[#657385]">
            Nenhum projeto aberto.
            <button
              onClick={() => setProjectModal(true)}
              className="mt-2 block w-full py-1.5 px-3 rounded bg-[#1e2433] hover:bg-[#283044] text-[#3dd6c6] text-xs font-medium transition"
            >
              Criar Projeto
            </button>
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === workspace.activeProjectId
            const projectSessions = sessions.filter((s) => s.projectId === project.id)
            const runningSessions = projectSessions.filter(
              (s) => s.status === 'running' || s.status === 'starting'
            )

            // Active models or agents running in this project
            const activeModels = runningSessions.map((s) => {
              const model = detectedModels[s.id]
              if (model) return model
              const agent = agents.find((a) => a.id === s.agentId)
              return agent?.name || s.command
            })
            const uniqueModels = [...new Set(activeModels)]

            const branch = gitBranches[project.id]

            return (
              <div
                key={project.id}
                onClick={() => switchProject(project.id)}
                className={`group relative flex flex-col px-2.5 py-2 rounded-md cursor-pointer transition text-xs ${
                  isActive
                    ? 'bg-[#1e2536] text-white font-medium border-l-2 border-[#3dd6c6]'
                    : 'text-[#9ba7b6] hover:bg-[#181d29] hover:text-[#d0d7de]'
                }`}
                title={`Projeto: ${project.name}\nPasta: ${project.cwd}${branch ? `\nBranch: ${branch}` : ''}${uniqueModels.length > 0 ? `\nModelos: ${uniqueModels.join(', ')}` : ''}`}
              >
                {/* Top Line: Dot, Project Name, Actions overlay on hover */}
                <div className="flex items-center justify-between w-full relative min-h-[22px]">
                  {/* Project Name: usa todo o espaço livre */}
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-1">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color || '#3dd6c6' }}
                    />
                    <span className="truncate font-semibold text-white/95 text-xs" title={project.name}>
                      {project.name}
                    </span>
                  </div>

                  {/* Actions overlay on hover: não ocupa espaço enquanto o mouse estiver fora */}
                  <div className={`hidden group-hover:flex items-center gap-0.5 absolute right-0 top-0 bottom-0 pl-2 rounded-r shadow-md z-10 transition-all ${
                    isActive ? 'bg-[#1e2536]' : 'bg-[#181d29]'
                  }`}>
                    {/* Quick Launch: Claude Code */}
                    {(() => {
                      const claudeAgent = agents.find((a) => (a.command.includes('claude') || a.id === 'claude') && a.enabled !== false)
                      if (!claudeAgent) return null
                      return (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await createSession({
                              projectId: project.id,
                              agentId: claudeAgent.id,
                              cwd: project.cwd
                            })
                          }}
                          title="Abrir terminal Claude Code nesta pasta"
                          className="px-1 py-0.5 rounded text-[10px] font-bold text-[#d4a574] hover:bg-[#d4a574]/20 transition"
                        >
                          Cl
                        </button>
                      )
                    })()}

                    {/* Quick Launch: Freebuff */}
                    {(() => {
                      const fbAgent = agents.find((a) => (a.command.includes('freebuff') || a.id === 'freebuff') && a.enabled !== false)
                      if (!fbAgent) return null
                      return (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await createSession({
                              projectId: project.id,
                              agentId: fbAgent.id,
                              cwd: project.cwd
                            })
                          }}
                          title="Abrir terminal Freebuff nesta pasta"
                          className="px-1 py-0.5 rounded text-[10px] font-bold text-[#00e599] hover:bg-[#00e599]/20 transition"
                        >
                          Fb
                        </button>
                      )
                    })()}

                    {/* Quick Launch: Codex */}
                    {(() => {
                      const codexAgent = agents.find((a) => (a.command.includes('codex') || a.id === 'codex') && a.enabled !== false)
                      if (!codexAgent) return null
                      return (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await createSession({
                              projectId: project.id,
                              agentId: codexAgent.id,
                              cwd: project.cwd
                            })
                          }}
                          title="Abrir terminal Codex nesta pasta"
                          className="px-1 py-0.5 rounded text-[10px] font-bold text-[#10a37f] hover:bg-[#10a37f]/20 transition"
                        >
                          Cx
                        </button>
                      )
                    })()}

                    {/* Quick Launch: Windows Terminal / Bash */}
                    {(() => {
                      const wtAgent = agents.find((a) => (a.id === 'windows-terminal' || a.command === 'wt.exe') && a.enabled !== false)
                      if (!wtAgent) return null
                      return (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            await createSession({
                              projectId: project.id,
                              agentId: wtAgent.id,
                              cwd: project.cwd
                            })
                          }}
                          title="Abrir Windows Terminal (Bash) nesta pasta"
                          className="px-1 py-0.5 rounded text-[10px] font-bold text-[#4cc2ff] hover:bg-[#4cc2ff]/20 transition"
                        >
                          WT
                        </button>
                      )
                    })()}

                    {/* Pick another agent / custom */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        switchProject(project.id)
                        setNewSessionModal(true)
                      }}
                      title="Abrir outro agente ou terminal customizado"
                      className="p-1 hover:text-[#3dd6c6] text-[#8e9aa8]"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={(e) => handleOpenFolder(e, project.cwd)}
                      title="Abrir no Explorer"
                      className="p-1 hover:text-white text-[#8e9aa8]"
                    >
                      <FolderOpen size={12} />
                    </button>
                    <button
                      onClick={(e) => handleEditProject(e, project)}
                      title="Editar Projeto"
                      className="p-1 hover:text-[#3dd6c6] text-[#8e9aa8]"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                      title="Excluir Projeto"
                      className="p-1 hover:text-red-400 text-[#8e9aa8]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Sub-line: Branch + Model */}
                {(branch || uniqueModels.length > 0) && (
                  <div className="flex items-center gap-1.5 mt-1 pl-[18px] text-[10px] font-mono truncate">
                    {/* Git Branch */}
                    {branch && (
                      <span className="flex items-center gap-1 text-[#8e9aa8] truncate" title={`Branch git: ${branch}`}>
                        <GitBranch size={11} className="text-[#3dd6c6] flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{branch}</span>
                      </span>
                    )}

                    {/* Separator if both exist */}
                    {branch && uniqueModels.length > 0 && (
                      <span className="text-[#3d485c] flex-shrink-0">•</span>
                    )}

                    {/* Active Model(s) */}
                    {uniqueModels.length > 0 && (
                      <span
                        className="flex items-center gap-1 text-emerald-400 truncate"
                        title={`Modelo(s) ativo(s): ${uniqueModels.join(', ')}`}
                      >
                        <Bot size={11} className="text-emerald-400 flex-shrink-0" />
                        <span className="truncate font-medium">{uniqueModels.join(', ')}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[#1e2330] space-y-1">
        <button
          onClick={() => setAgentModal(true)}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded text-xs text-[#8e9aa8] hover:text-white hover:bg-[#181d29] transition"
        >
          <Bot size={15} className="text-[#3dd6c6]" />
          <span>Perfis de Agentes</span>
        </button>
        <button
          onClick={() => setSettingsModal(true)}
          className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded text-xs text-[#8e9aa8] hover:text-white hover:bg-[#181d29] transition"
        >
          <SettingsIcon size={15} className="text-[#8e9aa8]" />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  )
}
