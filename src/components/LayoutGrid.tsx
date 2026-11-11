import React from 'react'
import { Plus, Terminal as TerminalIcon } from 'lucide-react'
import { useAppStore } from '../stores/useAppStore'
import { TerminalPane } from '../features/terminal/TerminalPane'
import { TexugoIcon } from './TexugoIcon'
import { emptyLayout, PRESETS, autoPresetForCount } from '@shared/layout'
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

  // Empty state: no project created yet
  if (projects.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0c0e12] p-8 text-center select-none">
        <TexugoIcon size={64} className="w-16 h-16 mb-4 drop-shadow-[0_0_20px_rgba(61,214,198,0.25)]" />
        <h2 className="text-xl font-bold text-white mb-2">Bem-vindo ao Texugo</h2>
        <p className="text-sm text-[#6e7d91] max-w-md mb-6">
          Gerenciador profissional para múltiplos agentes de programação e projetos lado a lado no Windows.
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

  const activeProject = workspace.activeProjectId
    ? projects.find((p) => p.id === workspace.activeProjectId)
    : null

  // Target sessions in the current view
  const targetSessions = activeProject
    ? sessions.filter((s) => s.projectId === activeProject.id)
    : sessions

  const layout = activeProject
    ? activeProject.layout
    : workspace.layout || emptyLayout('auto')

  const isAuto = layout.preset === 'auto'
  // Quando há apenas 1 terminal aberto (ou nenhum), ele SEMPRE ocupa 100% da janela (tela toda)
  const isSingle = targetSessions.length <= 1

  const effectivePreset: Exclude<PresetId, 'auto'> = isSingle
    ? '1'
    : isAuto
    ? autoPresetForCount(targetSessions.length)
    : (layout.preset as Exclude<PresetId, 'auto'>)

  const { slots } = layout

  const getGridClasses = (p: Exclude<PresetId, 'auto'>) => {
    switch (p) {
      case '1':
        return 'grid-cols-1 grid-rows-1'
      case '2h':
        return 'grid-cols-2 grid-rows-1'
      case '2v':
        return 'grid-cols-1 grid-rows-2'
      case '3':
        return 'grid-cols-3 grid-rows-1'
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

  const slotCount = PRESETS[effectivePreset]?.count || 1

  // Quando há apenas 1 sessão ou em modo auto, exibe apenas os terminais ativos preenchendo a tela inteira!
  const activeSlots = (isSingle || isAuto)
    ? targetSessions.map((s) => s.id)
    : Array.from({ length: slotCount }, (_, i) => slots[i] ?? targetSessions[i]?.id ?? null)

  // If no sessions exist in current view
  if (activeSlots.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0c0e12] p-8 text-center select-none">
        <div
          onClick={() => setNewSessionModal(true)}
          className="flex flex-col items-center p-8 border border-dashed border-[#222a3a] hover:border-[#3dd6c6]/50 rounded-lg bg-[#11151f] hover:bg-[#151a26] transition cursor-pointer max-w-sm"
        >
          <div className="p-3.5 rounded-full bg-[#1b2230] text-[#3dd6c6] mb-3">
            <Plus size={24} />
          </div>
          <span className="text-sm font-semibold text-white mb-1">Abrir Primeiro Terminal</span>
          <span className="text-xs text-[#6e7d91]">Clique para iniciar um agente neste projeto</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex-1 p-2 bg-[#0c0e12] grid gap-2 overflow-hidden ${getGridClasses(effectivePreset)}`}>
      {activeSlots.map((sessionId, index) => {
        const session = sessionId ? sessions.find((s) => s.id === sessionId) : null

        if (session) {
          return (
            <TerminalPane
              key={session.id}
              session={session}
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
