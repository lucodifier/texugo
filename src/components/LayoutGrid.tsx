import React from 'react'
import { Plus, Terminal as TerminalIcon } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { TerminalPane } from '../features/terminal/TerminalPane'
import { TexugoIcon } from './TexugoIcon'
import type { PresetId } from '@shared/types'

export const LayoutGrid: React.FC = () => {
  const {
    projects,
    workspace,
    sessions,
    maximizeSession,
    setNewSessionModal,
    setProjectModal
  } = useAppStore()

  const activeProject = projects.find((p) => p.id === workspace.activeProjectId)

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0c0e12] p-8 text-center select-none">
        <TexugoIcon size={64} className="w-16 h-16 mb-4 drop-shadow-[0_0_20px_rgba(61,214,198,0.25)]" />
        <h2 className="text-xl font-bold text-white mb-2">Bem-vindo ao Texugo</h2>
        <p className="text-sm text-[#6e7d91] max-w-md mb-6">
          Gerenciador profissional para múltiplos agentes de programação e terminais reais no Windows.
        </p>
        <button
          onClick={() => setProjectModal(true)}
          className="px-4 py-2 rounded-md bg-[#3dd6c6] hover:bg-[#34b8ab] text-[#0c0e12] font-semibold text-xs shadow transition"
        >
          Criar Primeiro Projeto
        </button>
      </div>
    )
  }

  const { layout } = activeProject
  const { preset, slots, maximizedSessionId } = layout

  // Maximized terminal mode
  if (maximizedSessionId) {
    const session = sessions.find((s) => s.id === maximizedSessionId)
    if (session) {
      return (
        <div className="flex-1 p-2 bg-[#0c0e12] overflow-hidden">
          <TerminalPane
            session={session}
            isMaximized={true}
            onToggleMaximize={() => maximizeSession(null)}
          />
        </div>
      )
    }
  }

  const getGridClasses = (p: PresetId) => {
    switch (p) {
      case '1':
        return 'grid-cols-1 grid-rows-1'
      case '2h':
        return 'grid-cols-2 grid-rows-1'
      case '2v':
        return 'grid-cols-1 grid-rows-2'
      case '4':
        return 'grid-cols-2 grid-rows-2'
      case '6':
        return 'grid-cols-3 grid-rows-2'
      case '8':
        return 'grid-cols-4 grid-rows-2'
      default:
        return 'grid-cols-1 grid-rows-1'
    }
  }

  const slotCount = {
    '1': 1,
    '2h': 2,
    '2v': 2,
    '4': 4,
    '6': 6,
    '8': 8
  }[preset] || 1

  const activeSlots = slots.slice(0, slotCount)

  return (
    <div className={`flex-1 p-2 bg-[#0c0e12] grid gap-2 overflow-hidden ${getGridClasses(preset)}`}>
      {activeSlots.map((sessionId, index) => {
        const session = sessionId ? sessions.find((s) => s.id === sessionId) : null

        if (session) {
          return (
            <TerminalPane
              key={session.id}
              session={session}
              isMaximized={false}
              onToggleMaximize={() => maximizeSession(session.id)}
            />
          )
        }

        return (
          <div
            key={`empty-slot-${index}`}
            onClick={() => setNewSessionModal(true, index)}
            className="flex flex-col items-center justify-center border border-dashed border-[#1e2536] hover:border-[#3dd6c6]/50 rounded bg-[#0f121a]/50 hover:bg-[#121622] transition-colors cursor-pointer group"
          >
            <div className="p-3 rounded-full bg-[#181d29] group-hover:bg-[#1e2536] text-[#6e7d91] group-hover:text-[#3dd6c6] transition mb-2">
              <Plus size={20} />
            </div>
            <span className="text-xs text-[#6e7d91] group-hover:text-[#cfd6e0] font-medium">
              Abrir terminal neste painel
            </span>
          </div>
        )
      })}
    </div>
  )
}
