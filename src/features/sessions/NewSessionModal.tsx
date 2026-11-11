import React, { useState, useEffect } from 'react'
import { X, Terminal as TerminalIcon, FolderPlus, Folder } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'

export const NewSessionModal: React.FC = () => {
  const {
    newSessionModal,
    setNewSessionModal,
    agents,
    projects,
    workspace,
    createSession,
    assignSlot,
    setProjectModal
  } = useAppStore()

  const { open, slotIndex } = newSessionModal
  const [targetProjectId, setTargetProjectId] = useState<string>('')
  const [customCommand, setCustomCommand] = useState('')
  const [customArgs, setCustomArgs] = useState('')
  const [customName, setCustomName] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      const initialId = workspace.activeProjectId || projects[0]?.id || ''
      setTargetProjectId(initialId)
    }
  }, [open, workspace.activeProjectId, projects])

  if (!open) return null

  // If no projects exist yet
  if (projects.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
        <div className="w-full max-w-md bg-[#151922] border border-[#273144] rounded-lg shadow-2xl p-6 text-center">
          <Folder className="w-12 h-12 text-[#3dd6c6] mx-auto mb-3 opacity-80" />
          <h3 className="font-semibold text-base text-white mb-2">Nenhum projeto cadastrado</h3>
          <p className="text-xs text-[#8e9aa8] mb-5">
            Para iniciar terminais de agentes, crie primeiro um projeto apontando para a pasta onde o agente irá trabalhar.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setNewSessionModal(false)}
              className="px-3.5 py-1.5 rounded text-xs text-[#8e9aa8] hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setNewSessionModal(false)
                setProjectModal(true)
              }}
              className="px-4 py-2 rounded bg-[#3dd6c6] hover:bg-[#34b8ab] text-[#0c0e12] font-semibold text-xs shadow transition"
            >
              Criar Projeto Agora
            </button>
          </div>
        </div>
      </div>
    )
  }

  const targetProject = projects.find((p) => p.id === targetProjectId) || projects[0]

  const handleLaunchAgent = async (agentId: string) => {
    if (!targetProject) {
      setError('Selecione um projeto para o terminal.')
      return
    }

    try {
      const session = await createSession({
        projectId: targetProject.id,
        agentId,
        cwd: targetProject.cwd
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
    if (!targetProject) {
      setError('Selecione um projeto para o terminal.')
      return
    }
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
        projectId: targetProject.id,
        agentId: '',
        name: customName.trim() || customCommand.trim(),
        command: customCommand.trim(),
        args: parsedArgs,
        cwd: targetProject.cwd
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
            <h3 className="font-semibold text-sm text-white">
              Abrir Novo Terminal {slotIndex !== null ? `(Painel ${slotIndex + 1})` : ''}
            </h3>
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

        {/* Project Selector */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#8e9aa8] uppercase tracking-wider">
              1. Selecione o Projeto / Pasta de Trabalho
            </label>
            <button
              type="button"
              onClick={() => {
                setNewSessionModal(false)
                setProjectModal(true)
              }}
              className="text-[11px] text-[#3dd6c6] hover:underline flex items-center gap-1"
            >
              <FolderPlus size={12} />
              <span>+ Novo Projeto</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 bg-[#0c0e12] rounded border border-[#1e2330]">
            {projects.map((p) => {
              const isSelected = targetProject?.id === p.id
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setTargetProjectId(p.id)}
                  className={`flex items-center gap-2 p-2 rounded text-left transition ${
                    isSelected
                      ? 'bg-[#1e2536] border border-[#3dd6c6] text-white shadow-sm ring-1 ring-[#3dd6c6]/20'
                      : 'bg-[#131720] border border-[#1e2330] text-[#8e9aa8] hover:text-white hover:border-[#3dd6c6]/40'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color || '#3dd6c6' }}
                  />
                  <div className="truncate flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-[#6e7d91] font-mono truncate" title={p.cwd}>
                      {p.cwd.split(/[\\/]/).pop()}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          {targetProject && (
            <div className="text-[10px] text-[#6e7d91] font-mono mt-1 px-1 truncate">
              Pasta: <span className="text-[#8e9aa8]">{targetProject.cwd}</span>
            </div>
          )}
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-[#222a3a] mb-4 text-xs">
          <button
            onClick={() => setIsCustom(false)}
            className={`pb-2 px-3 font-semibold uppercase tracking-wider transition ${
              !isCustom ? 'border-b-2 border-[#3dd6c6] text-white' : 'text-[#6e7d91] hover:text-white'
            }`}
          >
            2. Escolher Agente CLI
          </button>
          <button
            onClick={() => setIsCustom(true)}
            className={`pb-2 px-3 font-semibold uppercase tracking-wider transition ${
              isCustom ? 'border-b-2 border-[#3dd6c6] text-white' : 'text-[#6e7d91] hover:text-white'
            }`}
          >
            Comando Customizado
          </button>
        </div>

        {!isCustom ? (
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {agents
              .filter((a) => a.enabled !== false)
              .map((agent) => (
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
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Comando / Executável</label>
              <input
                type="text"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="ex: python, node, npx ts-node"
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Argumentos (separados por espaço)</label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="ex: -m unittest, index.js"
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewSessionModal(false)}
                className="px-3 py-1.5 rounded text-xs text-[#8e9aa8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#3dd6c6] hover:bg-[#34b8ab] text-[#0c0e12] font-semibold text-xs shadow transition"
              >
                Iniciar no Projeto
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
