import React, { useState, useEffect } from 'react'
import { X, Settings as SettingsIcon } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { terminalRegistry } from '../terminal/terminal-registry'
import type { RendererMode, Settings } from '@shared/types'

export const SettingsModal: React.FC = () => {
  const { settingsModal, setSettingsModal, settings, updateSettings, agents } = useAppStore()

  const [form, setForm] = useState<Settings | null>(null)
  const [savedMessage, setSavedMessage] = useState(false)

  useEffect(() => {
    if (settings) {
      setForm(settings)
    }
  }, [settings, settingsModal])

  if (!settingsModal || !form) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings(form)
    terminalRegistry.setSettings(form)
    setSavedMessage(true)
    setTimeout(() => {
      setSavedMessage(false)
      setSettingsModal(false)
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-[#151922] border border-[#273144] rounded-lg shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#222a3a] mb-4">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-[#3dd6c6]" />
            <h3 className="font-semibold text-sm text-white">Configurações do Terminal</h3>
          </div>
          <button onClick={() => setSettingsModal(false)} className="text-[#6e7d91] hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs text-[#8e9aa8] mb-1">Fonte do Terminal</label>
            <input
              type="text"
              value={form.fontFamily}
              onChange={(e) => setForm({ ...form, fontFamily: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs font-mono outline-none"
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
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none"
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
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none"
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
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Modo de Renderização</label>
              <select
                value={form.renderer}
                onChange={(e) => setForm({ ...form, renderer: e.target.value as RendererMode })}
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none"
              >
                <option value="canvas">Canvas (Recomendado, estável)</option>
                <option value="webgl">WebGL (Aceleração por GPU)</option>
                <option value="dom">DOM (Fallback leve)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8e9aa8] mb-1">Agente / Shell Padrão</label>
              <select
                value={form.defaultAgentId}
                onChange={(e) => setForm({ ...form, defaultAgentId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-[#0c0e12] border border-[#273144] text-white text-xs outline-none"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222a3a]">
            {savedMessage && <span className="text-xs text-emerald-400 mr-2">Configurações salvas!</span>}
            <button
              type="button"
              onClick={() => setSettingsModal(false)}
              className="px-3 py-1.5 rounded text-xs text-[#8e9aa8]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-[#3dd6c6] text-[#0c0e12] font-semibold text-xs"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
