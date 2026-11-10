import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  GitBranch,
  Layout,
  Maximize2,
  Columns,
  Rows,
  Grid,
  ChevronDown
} from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { ipc } from '../services/ipc'
import type { GitInfo, PresetId } from '@shared/types'

export const Header: React.FC = () => {
  const {
    projects,
    workspace,
    agents,
    switchProject,
    closeProjectTab,
    setLayoutPreset,
    createSession,
    setNewSessionModal
  } = useAppStore()

  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null)
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === workspace.activeProjectId)
  const openProjects = projects.filter((p) => workspace.openProjectIds.includes(p.id))

  useEffect(() => {
    if (!activeProject?.cwd) {
      setGitInfo(null)
      return
    }
    ipc.inspectGit(activeProject.cwd).then(setGitInfo).catch(() => setGitInfo(null))
  }, [activeProject?.cwd])

  const handleCreateAgentTerminal = async (agentId: string) => {
    setIsAgentMenuOpen(false)
    if (!activeProject) return
    await createSession({
      projectId: activeProject.id,
      agentId,
      cwd: activeProject.cwd
    })
  }

  const presets: { id: PresetId; label: string; icon: React.ReactNode }[] = [
    { id: '1', label: '1 Painel', icon: <div className="w-3.5 h-3.5 border border-current rounded-sm" /> },
    {
      id: '2h',
      label: '2 Horizontais',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm flex">
          <div className="w-1/2 border-r border-current" />
        </div>
      )
    },
    {
      id: '2v',
      label: '2 Verticais',
      icon: (
        <div className="w-3.5 h-3.5 border border-current rounded-sm flex flex-col">
          <div className="h-1/2 border-b border-current" />
        </div>
      )
    },
    {
      id: '4',
      label: '4 Painéis',
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
      label: '6 Painéis',
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
      label: '8 Painéis',
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

  return (
    <header className="h-11 bg-[#12161f] border-b border-[#1e2330] flex items-center justify-between px-3 select-none">
      {/* Project Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto max-w-[50%] h-full pt-1">
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
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: project.color || '#3dd6c6' }}
              />
              <span className="truncate max-w-[120px]">{project.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeProjectTab(project.id)
                }}
                className="hover:text-red-400 p-0.5 rounded"
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

        {/* Layout Presets */}
        {activeProject && (
          <div className="flex items-center bg-[#181d29] border border-[#222a3a] rounded p-0.5 gap-0.5">
            {presets.map((preset) => {
              const isSelected = activeProject.layout.preset === preset.id
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

        {/* Add Terminal Dropdown */}
        {activeProject && (
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
                <div className="absolute right-0 mt-1 w-52 bg-[#181d29] border border-[#273144] rounded-md shadow-xl py-1 z-50">
                  <div className="px-3 py-1 text-[10px] font-semibold text-[#6e7d91] uppercase">
                    Agentes e Comandos
                  </div>
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleCreateAgentTerminal(agent.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#cfd6e0] hover:bg-[#222a3a] hover:text-white text-left transition"
                    >
                      <span
                        className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] text-black"
                        style={{ backgroundColor: agent.color || '#3dd6c6' }}
                      >
                        {agent.icon || agent.name.slice(0, 2)}
                      </span>
                      <div className="truncate flex-1">
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-[10px] text-[#6e7d91] font-mono truncate">
                          {agent.command}
                        </div>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-[#273144] my-1" />
                  <button
                    onClick={() => {
                      setIsAgentMenuOpen(false)
                      setNewSessionModal(true)
                    }}
                    className="w-full px-3 py-1.5 text-xs text-[#3dd6c6] hover:bg-[#222a3a] text-left"
                  >
                    + Comando customizado...
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
