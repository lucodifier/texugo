import React, { useState, useEffect } from 'react'
import {
  X,
  Settings as SettingsIcon,
  Bot,
  Terminal,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { terminalRegistry } from '../terminal/terminal-registry'
import { PROJECT_COLORS } from '@shared/defaults'
import type { AgentProfile, RendererMode, ResumeKind, Settings } from '@shared/types'

export const SettingsModal: React.FC = () => {
  const {
    settingsModal,
    setSettingsModal,
    settings,
    updateSettings,
    agents,
    saveAgent,
    deleteAgent
  } = useAppStore()

  const [activeTab, setActiveTab] = useState<'general' | 'agents'>('general')
  const [form, setForm] = useState<Settings | null>(null)
  const [savedMessage, setSavedMessage] = useState(false)

  // Agent editing state
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const [isAgentFormOpen, setIsAgentFormOpen] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [agentCommand, setAgentCommand] = useState('')
  const [agentArgs, setAgentArgs] = useState('')
  const [agentIcon, setAgentIcon] = useState('')
  const [agentColor, setAgentColor] = useState(PROJECT_COLORS[0])
  const [agentResumeKind, setAgentResumeKind] = useState<ResumeKind>('none')
  const [agentEnabled, setAgentEnabled] = useState(true)
  const [agentError, setAgentError] = useState('')

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings, settingsModal])

  if (!settingsModal || !form) return null

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings(form)
    terminalRegistry.setSettings(form)
    setSavedMessage(true)
    setTimeout(() => {
      setSavedMessage(false)
      setSettingsModal(false)
    }, 800)
  }

  const handleToggleAgent = async (agent: AgentProfile) => {
    const nextEnabled = agent.enabled === false ? true : false
    await saveAgent({
      ...agent,
      enabled: nextEnabled
    })
  }

  const handleStartCreateAgent = () => {
    setEditingAgentId(null)
    setAgentName('')
    setAgentCommand('')
    setAgentArgs('')
    setAgentIcon('')
    setAgentColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
    setAgentResumeKind('none')
    setAgentEnabled(true)
    setAgentError('')
    setIsAgentFormOpen(true)
  }

  const handleStartEditAgent = (agent: AgentProfile) => {
    setEditingAgentId(agent.id)
    setAgentName(agent.name)
    setAgentCommand(agent.command)
    setAgentArgs(agent.args.join(' '))
    setAgentIcon(agent.icon)
    setAgentColor(agent.color)
    setAgentResumeKind(agent.resumeKind)
    setAgentEnabled(agent.enabled !== false)
    setAgentError('')
    setIsAgentFormOpen(true)
  }

  const handleDeleteAgent = async (agent: AgentProfile) => {
    if (agent.builtin) {
      alert('Perfis integrados do sistema não podem ser excluídos. Você pode desabilitá-los se preferir não utilizá-los.')
      return
    }
    if (confirm(`Excluir perfil "${agent.name}"?`)) {
      await deleteAgent(agent.id)
    }
  }

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentName.trim()) return setAgentError('Informe o nome do agente ou terminal.')
    if (!agentCommand.trim()) return setAgentError('Informe o comando de execução.')

    const parsedArgs = agentArgs
      .split(' ')
      .map((a) => a.trim())
      .filter(Boolean)

    try {
      await saveAgent({
        id: editingAgentId || undefined,
        name: agentName.trim(),
        command: agentCommand.trim(),
        args: parsedArgs,
        cwd: null,
        env: {},
        icon: agentIcon.trim() || agentName.trim().slice(0, 2).toUpperCase(),
        color: agentColor,
        resumeKind: agentResumeKind,
        idlePattern: '',
        enabled: agentEnabled
      })
      setIsAgentFormOpen(false)
    } catch (err: any) {
      setAgentError(err.message || 'Erro ao salvar agente.')
    }
  }

  const enabledAgents = agents.filter((a) => a.enabled !== false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-2xl bg-[#151922] border border-[#273144] rounded-lg shadow-2xl p-5 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222a3a]">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-[#3dd6c6]" />
            <h3 className="font-semibold text-sm text-white">Configurações</h3>
          </div>
          <button
            onClick={() => setSettingsModal(false)}
            className="text-[#6e7d91] hover:text-white p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[#222a3a] pt-2 mb-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'general'
                ? 'border-[#3dd6c6] text-white font-semibold'
                : 'border-transparent text-[#6e7d91] hover:text-white'
            }`}
          >
            <Terminal size={14} />
            <span>Geral & Terminal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'agents'
                ? 'border-[#3dd6c6] text-white font-semibold'
                : 'border-transparent text-[#6e7d91] hover:text-white'
            }`}
          >
            <Bot size={14} />
            <span>Agentes & Terminais ({enabledAgents.length}/{agents.length} ativos)</span>
          </button>
        </div>

        {/* Tab 1: General */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveGeneral} className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Fonte do Terminal</label>
              <input
                type="text"
                value={form.fontFamily}
                onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#8e9aa8] mb-1">Tamanho da Fonte</label>
                <input
                  type="number"
                  min={10}
                  max={28}
                  value={form.fontSize}
                  onChange={(e) => setForm({ ...form, fontSize: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8e9aa8] mb-1">Altura de Linha</label>
                <input
                  type="number"
                  step={0.1}
                  min={1.0}
                  max={2.0}
                  value={form.lineHeight}
                  onChange={(e) => setForm({ ...form, lineHeight: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8e9aa8] mb-1">Scrollback (Linhas)</label>
                <input
                  type="number"
                  step={10000}
                  min={10000}
                  max={200000}
                  value={form.scrollback}
                  onChange={(e) => setForm({ ...form, scrollback: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8e9aa8] mb-1">Modo de Renderização</label>
                <select
                  value={form.renderer}
                  onChange={(e) => setForm({ ...form, renderer: e.target.value as RendererMode })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                >
                  <option value="canvas">Canvas (Recomendado, nítido e estável)</option>
                  <option value="webgl">WebGL (Aceleração por GPU)</option>
                  <option value="dom">DOM (Fallback padrão)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#8e9aa8] mb-1">Shell Padrão ao Criar Terminal</label>
                <select
                  value={form.defaultAgentId}
                  onChange={(e) => setForm({ ...form, defaultAgentId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                >
                  {enabledAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.command})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#cfd6e0]">
                <input
                  type="checkbox"
                  checked={form.confirmClose}
                  onChange={(e) => setForm({ ...form, confirmClose: e.target.checked })}
                  className="rounded border-[#273144] text-[#3dd6c6]"
                />
                <span>Confirmar antes de fechar quando houver processos em execução</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#222a3a]">
              {savedMessage && <span className="text-xs text-emerald-400 mr-2">Configurações salvas!</span>}
              <button
                type="button"
                onClick={() => setSettingsModal(false)}
                className="px-3 py-1.5 rounded text-xs text-[#8e9aa8] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-[#3dd6c6] text-[#0c0e12] font-semibold text-xs hover:bg-[#34b8ab] transition"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Agents & Terminals */}
        {activeTab === 'agents' && (
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col">
            {isAgentFormOpen ? (
              /* Agent Form */
              <form onSubmit={handleSaveAgent} className="space-y-3 bg-[#0c0e12] p-4 rounded-lg border border-[#222a3a]">
                <div className="flex items-center justify-between pb-2 border-b border-[#1e2536]">
                  <h4 className="text-xs font-semibold text-white">
                    {editingAgentId ? 'Editar Perfil de Terminal / Agente' : 'Novo Terminal / Agente'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAgentFormOpen(false)}
                    className="text-[#6e7d91] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>

                {agentError && (
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {agentError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#8e9aa8] mb-1">Nome do Terminal ou Agente</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Ex: Windows Terminal, Git Bash, Claude Code"
                      className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8e9aa8] mb-1">Comando Executável</label>
                    <input
                      type="text"
                      value={agentCommand}
                      onChange={(e) => setAgentCommand(e.target.value)}
                      placeholder="Ex: wt.exe, bash.exe, codex, freebuff"
                      className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#8e9aa8] mb-1">Argumentos (separados por espaço)</label>
                    <input
                      type="text"
                      value={agentArgs}
                      onChange={(e) => setAgentArgs(e.target.value)}
                      placeholder='Ex: -p "Git Bash" ou --login -i'
                      className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs font-mono outline-none focus:border-[#3dd6c6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#8e9aa8] mb-1">Tipo de Retomada (Resume)</label>
                    <select
                      value={agentResumeKind}
                      onChange={(e) => setAgentResumeKind(e.target.value as ResumeKind)}
                      className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                    >
                      <option value="none">Nenhum (terminal padrão ou processo)</option>
                      <option value="claude">Claude Code (--resume / --continue)</option>
                      <option value="codex">Codex CLI (resume por ID de sessão)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-xs text-[#8e9aa8] mb-1">Sigla / Ícone (2 letras)</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={agentIcon}
                      onChange={(e) => setAgentIcon(e.target.value)}
                      placeholder="WT, Cl, Fb, Cx, Ba"
                      className="w-full px-2.5 py-1.5 rounded bg-[#151922] border border-[#273144] text-white text-xs outline-none focus:border-[#3dd6c6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#8e9aa8] mb-1">Cor de Destaque</label>
                    <div className="flex gap-1.5 pt-0.5">
                      {PROJECT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setAgentColor(c)}
                          className={`w-5 h-5 rounded-full ${
                            agentColor === c ? 'ring-2 ring-white scale-110' : ''
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Enabled Toggle in Form */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#cfd6e0]">
                    <input
                      type="checkbox"
                      checked={agentEnabled}
                      onChange={(e) => setAgentEnabled(e.target.checked)}
                      className="rounded border-[#273144] text-[#3dd6c6]"
                    />
                    <span>Habilitado (visível no header, sidebar e seleção de terminais)</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#1e2536]">
                  <button
                    type="button"
                    onClick={() => setIsAgentFormOpen(false)}
                    className="px-3 py-1 rounded text-xs text-[#8e9aa8] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1 rounded bg-[#3dd6c6] text-[#0c0e12] font-semibold text-xs hover:bg-[#34b8ab] transition"
                  >
                    Salvar Perfil
                  </button>
                </div>
              </form>
            ) : (
              /* Agent List */
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-[#8e9aa8]">
                    Habilite ou desabilite os terminais e agentes que deseja usar no Texugo:
                  </span>
                  <button
                    type="button"
                    onClick={handleStartCreateAgent}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e2536] hover:bg-[#283248] text-[#3dd6c6] text-xs font-semibold transition"
                  >
                    <Plus size={13} />
                    <span>Novo Terminal / Agente</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {agents.map((agent) => {
                    const isEnabled = agent.enabled !== false
                    return (
                      <div
                        key={agent.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                          isEnabled
                            ? 'bg-[#0c0e12] border-[#222a3a] hover:border-[#3dd6c6]/50'
                            : 'bg-[#0c0e12]/50 border-[#181d29] opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 mr-2">
                          <span
                            className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs text-black flex-shrink-0"
                            style={{ backgroundColor: agent.color || '#3dd6c6' }}
                          >
                            {agent.icon}
                          </span>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium text-white truncate">{agent.name}</span>
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

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleAgent(agent)}
                            title={isEnabled ? 'Clique para desativar este terminal' : 'Clique para ativar este terminal'}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                              isEnabled ? 'bg-[#3dd6c6]' : 'bg-[#273144]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleStartEditAgent(agent)}
                            className="p-1 text-[#6e7d91] hover:text-white"
                            title="Editar comando e parâmetros"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete button (only custom) */}
                          {!agent.builtin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAgent(agent)}
                              className="p-1 text-[#6e7d91] hover:text-red-400"
                              title="Excluir perfil"
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
        )}
      </div>
    </div>
  )
}
