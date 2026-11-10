import React, { useState, useEffect } from 'react'
import { X, FolderOpen } from 'lucide-react'
import { useAppStore } from '../../stores/useAppStore'
import { ipc } from '../../services/ipc'
import { PROJECT_COLORS } from '@shared/defaults'

export const ProjectModal: React.FC = () => {
  const { projectModal, setProjectModal, createProject, updateProject } = useAppStore()
  const { open, editing } = projectModal

  const [name, setName] = useState('')
  const [cwd, setCwd] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editing) {
      setName(editing.name)
      setCwd(editing.cwd)
      setColor(editing.color)
    } else {
      setName('')
      setCwd('')
      setColor(PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)])
    }
    setError('')
  }, [editing, open])

  if (!open) return null

  const handlePickDirectory = async () => {
    try {
      const selected = await ipc.pickDirectory(cwd || undefined)
      if (selected) {
        setCwd(selected)
        if (!name) {
          const folderName = selected.split(/[\\/]/).filter(Boolean).pop()
          if (folderName) setName(folderName)
        }
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao selecionar diretório.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Informe o nome do projeto.')
      return
    }
    if (!cwd.trim()) {
      setError('Informe o diretório de trabalho.')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (editing) {
        await updateProject({ id: editing.id, name, cwd, color })
      } else {
        await createProject({ name, cwd, color })
      }
      setProjectModal(false)
    } catch (e: any) {
      setError(e.message || 'Falha ao salvar projeto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-[#151922] border border-[#273144] rounded-lg shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#222a3a] mb-4">
          <h3 className="font-semibold text-sm text-white">
            {editing ? 'Editar Projeto' : 'Novo Projeto'}
          </h3>
          <button
            onClick={() => setProjectModal(false)}
            className="text-[#6e7d91] hover:text-white p-1 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8e9aa8] mb-1">Nome do Projeto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Meu Projeto"
              className="w-full px-3 py-2 rounded bg-[#0c0e12] border border-[#273144] focus:border-[#3dd6c6] text-white text-xs outline-none transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8e9aa8] mb-1">
              Diretório Local (Windows)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="C:\caminho\do\projeto"
                className="flex-1 px-3 py-2 rounded bg-[#0c0e12] border border-[#273144] focus:border-[#3dd6c6] text-white text-xs font-mono outline-none transition"
              />
              <button
                type="button"
                onClick={handlePickDirectory}
                className="px-3 py-2 rounded bg-[#1e2536] hover:bg-[#283248] border border-[#273144] text-[#8e9aa8] hover:text-white text-xs flex items-center gap-1.5 transition"
              >
                <FolderOpen size={14} />
                <span>Procurar</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8e9aa8] mb-1.5">Cor de Identificação</label>
            <div className="flex items-center gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#151922]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222a3a]">
            <button
              type="button"
              onClick={() => setProjectModal(false)}
              className="px-3 py-1.5 rounded text-xs text-[#8e9aa8] hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded bg-[#3dd6c6] hover:bg-[#34b8ab] text-[#0c0e12] font-semibold text-xs transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : editing ? 'Atualizar' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
