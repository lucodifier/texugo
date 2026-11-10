import React, { useState } from 'react'
import { X, Terminal as TerminalIcon, Sparkles } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export const NewSessionModal: React.FC = () => {
  const {
    newSessionModal,
    setNewSessionModal,
    agents,
    projects,
    workspace,
    createSession,
    assignSlot
  } = useAppStore()

  const { open, slotIndex } = newSessionModal
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [customCommand, setCustomCommand] = useState('')
  const [customArgs, setCustomArgs] = useState('')
  const [customName, setCustomName] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [error, setError] = useState('')

  const activeProject = projects.find((p) => p.id === workspace.activeProjectId)

  if (!open || !activeProject) return null

  const handleLaunchAgent = async (agentId: string) => {
    try {
      const session = await createSession({
        projectId: activeProject.id,
        agentId,
        cwd: activeProject.cwd
      })
      if (slotIndex !== null) {
        await assignSlot(slotIndex, session.id)
      }
      setNewSessionModal(false)
    } catch (e: any) {
      setError(e.message || 'Falha ao iniciar terminal.')
    }
  }

  const handleLaunchCustom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customCommand.trim()) {
      setError('Informe o comando a ser executado.')
      return
    }

    try {
      const parsedArgs = customArgs
        .split(' ')
        .map((a) => a.trim())
        .filter(Boolean)

      const session = await createSession({
        projectId: activeProject.id,
        agentId: '',
        name: customName.trim() || customCommand.trim(),
        command: customCommand.trim(),
        args: parsedArgs,
        cwd: activeProject.cwd
      })
      if (slotIndex !== null) {
        await assignSlot(slotIndex, session.id)
      }
      setNewSessionModal(false)
    } catch (e: any) {
      setError(e.message || 'Falha ao iniciar comando.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-[#151922] border border-[#273144] rounded-lg shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#222a3a] mb-4">
          <div className="flex items-center gap-2">
            <TerminalIcon size={18} className="text-[#3dd6c6]" />
            <h3 className="font-semibold text-sm text-white">Abrir Novo Terminal</h3>
          </div>
          <button onClick={() => setNewSessionModal(false)} className="text-[#6e7d91] hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="flex border-b border-[#222a3a] mb-4 text-xs">
          <button
            onClick={() => setIsCustom(false)}
            className={`pb-2 px-3 font-medium transition ${
              !isCustom ? 'border-b-2 border-[#3dd6c6] text-white' : 'text-[#6e7d91] hover:text-white'
            }`}
          >
            Escolher Agente
          </button>
          <button
            onClick={() => setIsCustom(true)}
            className={`pb-2 px-3 font-medium transition ${
              isCustom ? 'border-b-2 border-[#3dd6c6] text-white' : 'text-[#6e7d91] hover:text-white'
            }`}
          >
            Comando Customizado
          </button>
        </div>

        {!isCustom ? (
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleLaunchAgent(agent.id)}
                className="flex items-center gap-2.5 p-2.5 rounded bg-[#0c0e12] border border-[#1e2536] hover:border-[#3dd6c6] text-left transition group"
              >
                <span
                  className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-black flex-shrink-0"
                  style={{ backgroundColor: agent.color || '#3dd6c6' }}
                >
                  {agent.icon}
                </span>
                <div className="truncate">
                  <div className="text-xs font-medium text-white group-hover:text-[#3dd6c6] truncate">
                    {agent.name}
                  </div>
                  <div className="text-[10px] text-[#6e7d91] font-mono truncate">{agent.command}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleLaunchCustom} className="space-y-3">
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Nome da Sessão (Opcional)</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Meu Script"
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Comando / Executável</label>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="npm run dev, python script.py, git status..."
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs font-mono outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Argumentos (opcional)</label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="--verbose --port 3000"
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs font-mono outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#222a3a]">
              <button
                type="button"
                onClick={() => setNewSessionModal(false)}
                className="px-3 py-1.5 rounded text-xs text-[#8e9aa8]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#3dd6c6] text-[#0c0e12] font-semibold text-xs"
              >
                Executar no Terminal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
