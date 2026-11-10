import React from 'react'
import {
  FolderPlus,
  Settings as SettingsIcon,
  Bot,
  Folder,
  Terminal as TerminalIcon,
  Trash2,
  Edit2,
  FolderOpen
} from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { ipc } from '../services/ipc'
import { TexugoIcon } from './TexugoIcon'

export const Sidebar: React.FC = () => {
  const {
    projects,
    sessions,
    workspace,
    switchProject,
    setProjectModal,
    setAgentModal,
    setSettingsModal,
    deleteProject
  } = useAppStore()

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
    <aside className="w-64 bg-[#12161f] border-r border-[#1e2330] flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-12 border-b border-[#1e2330] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
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
        <div className="px-2 py-1 text-[11px] font-semibold text-[#657385] uppercase tracking-wider">
          Projetos ({projects.length})
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
            const runningCount = projectSessions.filter(
              (s) => s.status === 'running' || s.status === 'starting'
            ).length

            return (
              <div
                key={project.id}
                onClick={() => switchProject(project.id)}
                className={`group flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition text-xs ${
                  isActive
                    ? 'bg-[#1e2536] text-white font-medium border-l-2 border-[#3dd6c6]'
                    : 'text-[#9ba7b6] hover:bg-[#181d29] hover:text-[#d0d7de]'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color || '#3dd6c6' }}
                  />
                  <span className="truncate">{project.name}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {runningCount > 0 ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#3dd6c6]/10 text-[#3dd6c6] font-mono text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3dd6c6] animate-pulse" />
                      {runningCount}
                    </span>
                  ) : projectSessions.length > 0 ? (
                    <span className="text-[10px] text-[#657385] font-mono">
                      {projectSessions.length}
                    </span>
                  ) : null}

                  {/* Actions visible on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                    <button
                      onClick={(e) => handleOpenFolder(e, project.cwd)}
                      title="Abrir no Explorer"
                      className="p-1 hover:text-white"
                    >
                      <FolderOpen size={12} />
                    </button>
                    <button
                      onClick={(e) => handleEditProject(e, project)}
                      title="Editar Projeto"
                      className="p-1 hover:text-white"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                      title="Excluir Projeto"
                      className="p-1 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Navigation */}
      <div className="border-t border-[#1e2330] p-2 space-y-1">
        <button
          onClick={() => setAgentModal(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[#8e9aa8] hover:text-white hover:bg-[#181d29] transition"
        >
          <Bot size={15} />
          <span>Perfis de Agentes</span>
        </button>
        <button
          onClick={() => setSettingsModal(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-[#8e9aa8] hover:text-white hover:bg-[#181d29] transition"
        >
          <SettingsIcon size={15} />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  )
}
