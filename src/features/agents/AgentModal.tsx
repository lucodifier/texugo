import React, { useState } from 'react'
import { X, Plus, Edit2, Trash2, Bot } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { PROJECT_COLORS } from '@shared/defaults'
import type { AgentProfile, ResumeKind } from '@shared/types'

export const AgentModal: React.FC = () => {
  const { agentModal, setAgentModal, agents, saveAgent, deleteAgent } = useAppStore()
  const { open } = agentModal

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [resumeKind, setResumeKind] = useState<ResumeKind>('none')
  const [idlePattern, setIdlePattern] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)

  if (!open) return null

  const handleStartCreate = () => {
    setEditingId(null)
    setName('')
    setCommand('')
    setArgs('')
    setIcon('')
    setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
    setResumeKind('none')
    setIdlePattern('')
    setEnabled(true)
    setError('')
    setIsFormOpen(true)
  }

  const handleStartEdit = (agent: AgentProfile) => {
    setEditingId(agent.id)
    setName(agent.name)
    setCommand(agent.command)
    setArgs(agent.args.join(' '))
    setIcon(agent.icon)
    setColor(agent.color)
    setResumeKind(agent.resumeKind)
    setIdlePattern(agent.idlePattern || '')
    setEnabled(agent.enabled !== false)
    setError('')
    setIsFormOpen(true)
  }

  const handleToggle = async (agent: AgentProfile) => {
    await saveAgent({
      ...agent,
      enabled: agent.enabled === false ? true : false
    })
  }

  const handleDelete = async (agent: AgentProfile) => {
    if (agent.builtin) {
      alert('Perfis padrão do sistema não podem ser excluídos. Você pode desabilitá-los se preferir não utilizá-los.')
      return
    }
    if (confirm(`Excluir perfil "${agent.name}"?`)) {
      await deleteAgent(agent.id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Informe o nome do agente.')
    if (!command.trim()) return setError('Informe o comando de execução.')

    const parsedArgs = args
      .split(' ')
      .map((a) => a.trim())
      .filter(Boolean)

    try {
      await saveAgent({
        id: editingId || undefined,
        name: name.trim(),
        command: command.trim(),
        args: parsedArgs,
        cwd: null,
        env: {},
        icon: icon.trim() || name.trim().slice(0, 2).toUpperCase(),
        color,
        resumeKind,
        idlePattern,
        enabled
      })
      setIsFormOpen(false)
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar agente.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#151922] border border-[#273144] rounded-lg shadow-2xl p-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-[#222a3a]">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-[#3dd6c6]" />
            <h3 className="font-semibold text-sm text-white">Gerenciar Perfis de Agentes e CLIs</h3>
          </div>
          <button onClick={() => setAgentModal(false)} className="text-[#6e7d91] hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3">
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="space-y-3 bg-[#0c0e12] p-4 rounded-lg border border-[#222a3a]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8e9aa8] mb-1">Nome</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Claude Code, Codex, etc."
                    className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8e9aa8] mb-1">Comando (Executável)</label>
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    placeholder="claude, codex, wt.exe, bash.exe"
                    className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8e9aa8] mb-1">Argumentos (separados por espaço)</label>
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder="--dangerously-skip-permissions"
                    className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8e9aa8] mb-1">Tipo de Retomada (Resume)</label>
                  <select
                    value={resumeKind}
                    onChange={(e) => setResumeKind(e.target.value as ResumeKind)}
                    className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                  >
                    <option value="none">Nenhum (processo padrão)</option>
                    <option value="claude">Claude Code (--resume / --continue)</option>
                    <option value="codex">Codex CLI (resume por ID)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs text-[#8e9aa8] mb-1">Sigla / Ícone (2 letras)</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="Cl"
                    className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8e9aa8] mb-1.5">Cor</label>
                  <div className="flex gap-1.5 pt-0.5">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full ${
                          color === c ? 'ring-2 ring-white scale-110' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#cfd6e0]">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="rounded border-[#273144] text-[#3dd6c6]"
                  />
                  <span>Habilitado (visível no aplicativo)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#222a3a]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-3 py-1 rounded text-xs text-[#8e9aa8]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-[#3dd6c6] text-[#0c0e12] font-semibold text-xs"
                >
                  Salvar Perfil
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-[#6e7d91]">Perfis cadastrados ({agents.length})</span>
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2536] hover:bg-[#283248] text-[#3dd6c6] text-xs font-medium transition"
                >
                  <Plus size={13} />
                  <span>Novo Agente</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {agents.map((agent) => {
                  const isEnabled = agent.enabled !== false
                  return (
                    <div
                      key={agent.id}
                      className={`flex items-center justify-between p-2.5 rounded border transition ${
                        isEnabled
                          ? 'bg-[#0c0e12] border-[#1e2536] hover:border-[#283248]'
                          : 'bg-[#0c0e12]/40 border-[#181d29] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 mr-2">
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs text-black flex-shrink-0"
                          style={{ backgroundColor: agent.color || '#3dd6c6' }}
                        >
                          {agent.icon}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-medium text-white truncate flex items-center gap-1.5">
                            <span>{agent.name}</span>
                            {!isEnabled && (
                              <span className="text-[9px] px-1 rounded bg-[#273144] text-[#8e9aa8]">
                                Desativado
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#6e7d91] font-mono truncate">
                            {agent.command} {agent.args.join(' ')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Toggle button */}
                        <button
                          type="button"
                          onClick={() => handleToggle(agent)}
                          title={isEnabled ? 'Desativar perfil' : 'Ativar perfil'}
                          className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                            isEnabled ? 'bg-[#3dd6c6]' : 'bg-[#273144]'
                          }`}
                        >
                          <div
                            className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform ${
                              isEnabled ? 'translate-x-3' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => handleStartEdit(agent)}
                          className="p-1 text-[#6e7d91] hover:text-white"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        {!agent.builtin && (
                          <button
                            onClick={() => handleDelete(agent)}
                            className="p-1 text-[#6e7d91] hover:text-red-400"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
