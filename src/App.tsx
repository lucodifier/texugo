import React, { useEffect } from 'react'
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
  const { initialized, init, settings } = useAppStore()

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (settings) {
      terminalRegistry.setSettings(settings)
    }
  }, [settings])

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#0c0e12] text-white">
        <div className="w-8 h-8 border-2 border-[#3dd6c6] border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-[#8e9aa8] font-mono">Inicializando Agent Desktop...</span>
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
