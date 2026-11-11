import React, { useEffect, useRef, useState } from 'react'
import {
  Play,
  RotateCcw,
  Copy,
  X,
  Folder,
  ArrowDown,
  Terminal as TerminalIcon,
  Check,
  Bot
} from 'lucide-react'
import type { SessionRecord } from '@shared/types'
import { useAppStore } from '../../stores/useAppStore'
import { terminalRegistry } from './terminal-registry'
import { ipc } from '../../services/ipc'

interface TerminalPaneProps {
  session: SessionRecord
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({ session }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    projects,
    agents,
    closeSession,
    deleteSession,
    restartSession,
    restartWithDefaultTerminal,
    resumeSession,
    focusSession,
    workspace
  } = useAppStore()

  const [isAtBottom, setIsAtBottom] = useState(true)
  const [copied, setCopied] = useState(false)
  const [detectedModel, setDetectedModel] = useState<string | null>(null)
  const project = projects.find((p) => p.id === session.projectId)

  const agent = agents.find((a) => a.id === session.agentId)
  const isFocused = workspace.focusedSessionId === session.id

  const extractModel = (text: string) => {
    if (!text) return
    const match = text.match(/\b(Sonnet[\s0-9.]+|Opus[\s0-9.]+|Haiku[\s0-9.]+|Claude\s+[0-9.]+\s+[A-Za-z]+|gpt-[0-9a-z.-]+|o1-[a-z]+|o3-[a-z]+|gemini-[0-9a-z.-]+)\b/i)
    if (match && match[1]) {
      const m = match[1].trim()
      setDetectedModel(m)
      useAppStore.getState().setDetectedModel(session.id, m)
    }
  }

  useEffect(() => {
    // Initial check from transcript
    ipc.tailTranscript(session.id, 8000).then((text) => {
      extractModel(text)
    }).catch(() => {})

    // Stream listener
    const unsub = ipc.onData(({ sessionId, data }) => {
      if (sessionId === session.id) {
        extractModel(data)
      }
    })
    return () => unsub()
  }, [session.id])

  useEffect(() => {
    if (!containerRef.current) return
    const entry = terminalRegistry.attach(session.id, containerRef.current)
    entry.onScrollStateChange = (bottom) => {
      setIsAtBottom(bottom)
    }

    // Resize observer to keep cols and rows in sync with ConPTY
    const observer = new ResizeObserver(() => {
      terminalRegistry.syncDimensions(session.id)
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      terminalRegistry.detach(session.id)
    }
  }, [session.id])

  // Quando o processo estiver encerrado, pressionar Enter no painel reinicia com o terminal padrão
  useEffect(() => {
    if (session.status !== 'exited') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        restartWithDefaultTerminal(session.id)
      }
    }

    const container = containerRef.current
    container?.addEventListener('keydown', handleKeyDown)
    return () => {
      container?.removeEventListener('keydown', handleKeyDown)
    }
  }, [session.status, session.id, restartWithDefaultTerminal])

  const handleCopyTranscript = async () => {
    try {
      const text = await ipc.getTranscript(session.id)
      await ipc.copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Falha ao copiar transcript:', e)
    }
  }

  const handleOpenCwd = () => {
    ipc.openPath(session.cwd)
  }

  const handleClose = () => {
    deleteSession(session.id)
  }

  const getStatusBadge = () => {
    switch (session.status) {
      case 'running':
        return null // Removido o texto redundante "executando"
      case 'starting':
        return (
          <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            {session.closeReason === 'app-quit' ? 'reconectando...' : 'iniciando'}
          </span>
        )
      case 'exited':
        return (
          <span className="text-[10px] text-[#8e9aa8] font-mono bg-[#1a202c] px-1.5 py-0.5 rounded border border-[#2d3748]">
            encerrado {session.exitCode !== null ? `(${session.exitCode})` : ''}
          </span>
        )
      case 'error':
        return (
          <span className="text-[10px] text-red-400 font-mono font-medium bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/30">
            erro
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div
      onClick={() => {
        focusSession(session.id)
        terminalRegistry.get(session.id)?.term.focus()
      }}
      className={`flex flex-col h-full w-full bg-[#0c0e12] border rounded overflow-hidden relative transition-colors ${
        isFocused ? 'border-[#3dd6c6]/50 shadow-md ring-1 ring-[#3dd6c6]/20' : 'border-[#1e2330]'
      }`}
    >
      {/* Session Titlebar */}
      <div className="h-8 bg-[#151922] border-b border-[#1e2330] flex items-center justify-between px-2 text-xs select-none gap-2">
        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
          {/* Project Pill */}
          {project && (
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0"
              style={{
                backgroundColor: `${project.color || '#3dd6c6'}20`,
                borderColor: `${project.color || '#3dd6c6'}50`,
                color: project.color || '#3dd6c6'
              }}
              title={`Projeto: ${project.name}\nPasta: ${session.cwd}`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color || '#3dd6c6' }} />
              <span className="truncate max-w-[110px]">{project.name}</span>
            </span>
          )}

          {/* Agent Pill */}
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0"
            style={{
              backgroundColor: `${agent?.color || '#3dd6c6'}15`,
              borderColor: `${agent?.color || '#3dd6c6'}40`,
              color: agent?.color || '#3dd6c6'
            }}
            title={agent?.command}
          >
            <span className="font-bold">{agent?.icon || session.command.slice(0, 2).toUpperCase()}</span>
            <span>{agent?.name || session.command}</span>
          </span>

          {/* Model Tag if detected */}
          {detectedModel && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono flex items-center gap-1 flex-shrink-0" title="Modelo ativo detectado">
              <Bot size={11} />
              <span>{detectedModel}</span>
            </span>
          )}

          {/* Session Name (shown if distinct from agent name) */}
          {session.name && session.name !== agent?.name && (
            <span className="font-medium text-white truncate text-xs">{session.name}</span>
          )}

          {/* CWD */}
          <span
            onClick={handleOpenCwd}
            className="text-[10px] text-[#6e7d91] font-mono truncate hover:text-[#3dd6c6] cursor-pointer"
            title={`Abrir diretório: ${session.cwd}`}
          >
            {session.cwd.split(/[\\/]/).pop()}
          </span>

          {/* Status */}
          <div className="ml-1">{getStatusBadge()}</div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Action buttons if exited */}
          {session.status === 'exited' && (
            <>
              <button
                onClick={() => restartWithDefaultTerminal(session.id)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3dd6c6]/20 border border-[#3dd6c6]/40 text-[#3dd6c6] text-[11px] font-semibold hover:bg-[#3dd6c6]/30 transition"
                title="Abrir o terminal padrão nesta pasta"
              >
                <TerminalIcon size={12} />
                <span>Terminal Padrão</span>
              </button>

              {session.resumeKind !== 'none' && (
                <button
                  onClick={() => resumeSession(session.id)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#d4a574]/20 border border-[#d4a574]/40 text-[#d4a574] text-[11px] font-semibold hover:bg-[#d4a574]/30 transition"
                  title={`Retomar conversa (${session.resumeKind})`}
                >
                  <Play size={12} />
                  <span>Retomar</span>
                </button>
              )}
            </>
          )}

          {/* Restart */}
          <button
            onClick={() => restartSession(session.id)}
            className="p-1 rounded text-[#8e9aa8] hover:text-white hover:bg-[#222a3a]"
            title="Reiniciar processo original"
          >
            <RotateCcw size={12} />
          </button>

          {/* Copy Transcript */}
          <button
            onClick={handleCopyTranscript}
            className="p-1 rounded text-[#8e9aa8] hover:text-white hover:bg-[#222a3a]"
            title="Copiar histórico de saída"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            className="p-1 rounded text-[#8e9aa8] hover:text-red-400 hover:bg-[#222a3a]"
            title="Fechar terminal"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Terminal Canvas Container */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0c0e12] p-2">
        <div ref={containerRef} className="w-full h-full" />

        {/* Floating Actions when Exited */}
        {session.status === 'exited' && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151922]/95 border border-[#273144] shadow-2xl backdrop-blur-sm text-xs select-none z-10">
            <span className="text-[#8e9aa8] text-[11px]">Processo encerrado. Pressione <strong className="text-white font-mono">Enter</strong> ou:</span>
            <button
              onClick={() => restartWithDefaultTerminal(session.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#3dd6c6] text-[#0c0e12] font-semibold hover:bg-[#34b8ab] transition text-xs shadow"
            >
              <TerminalIcon size={13} />
              <span>Abrir Terminal Padrão</span>
            </button>
            {session.resumeKind !== 'none' && (
              <button
                onClick={() => resumeSession(session.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e2536] text-[#d4a574] border border-[#d4a574]/40 hover:bg-[#283248] transition text-xs font-medium"
              >
                <Play size={13} />
                <span>Retomar {agent?.name || ''}</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="px-2 py-1 rounded text-[#8e9aa8] hover:text-red-400 hover:bg-[#1e2536] transition text-xs"
              title="Fechar esta janela"
            >
              Fechar Janela
            </button>
          </div>
        )}

        {/* Floating Scroll to Bottom Button */}
        {!isAtBottom && (
          <button
            onClick={() => terminalRegistry.scrollToBottom(session.id)}
            className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e2536] border border-[#3dd6c6]/40 text-[#3dd6c6] text-xs shadow-lg hover:bg-[#283248] transition animate-bounce z-10"
          >
            <ArrowDown size={13} />
            <span>Voltar ao final</span>
          </button>
        )}
      </div>
    </div>
  )
}
