import React, { useEffect } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { LayoutGrid } from './components/LayoutGrid'
import { ProjectModal } from './features/projects/ProjectModal'
import { AgentModal } from './features/agents/AgentModal'
import { SettingsModal } from './features/settings/SettingsModal'
import { NewSessionModal } from './features/sessions/NewSessionModal'
import { useAppStore } from './stores/useAppStore'
import { terminalRegistry } from './features/terminal/terminal-registry'

export const App: React.FC = () => {
  const { initialized, initError, init, settings } = useAppStore()

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (settings) {
      terminalRegistry.setSettings(settings)
    }
  }, [settings])

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#0c0e12] text-white p-6 select-none">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-base font-semibold text-white mb-2">Erro ao inicializar Agent Desktop</h2>
        <p className="text-xs text-red-400/90 font-mono bg-[#161b24] p-3 rounded border border-red-500/20 max-w-lg text-center mb-4">
          {initError}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => init()}
            className="flex items-center gap-2 px-4 py-2 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#273144] text-white text-xs font-medium transition"
          >
            <RotateCcw size={14} />
            <span>Tentar Novamente</span>
          </button>
        </div>
        <span className="text-[11px] text-[#6e7d91] mt-6">Pressione F12 para abrir as Ferramentas de Desenvolvedor.</span>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#0c0e12] text-white select-none">
        <div className="w-8 h-8 border-2 border-[#3dd6c6] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-[#8e9aa8] font-mono">Inicializando Agent Desktop...</span>
        <span className="text-[10px] text-[#556377] mt-3">Pressione F12 para ver o console se demorar</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-[#0c0e12] text-[#e1e4ea] overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Header />
        <LayoutGrid />
      </div>

      {/* Global Modals */}
      <ProjectModal />
      <AgentModal />
      <SettingsModal />
      <NewSessionModal />
    </div>
  )
}
export default App
