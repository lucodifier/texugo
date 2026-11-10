import React, { useEffect, useRef, useState } from 'react'
import {
  Play,
  RotateCcw,
  Copy,
  Maximize2,
  Minimize2,
  X,
  Folder,
  ArrowDown,
  Terminal as TerminalIcon,
  Check
} from 'lucide-react'
import type { SessionRecord } from '@shared/types'
import { useAppStore } from '../../stores/useAppStore'
import { terminalRegistry } from './terminal-registry'
import { ipc } from '../../services/ipc'

interface TerminalPaneProps {
  session: SessionRecord
  isMaximized: boolean
  onToggleMaximize: () => void
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  session,
  isMaximized,
  onToggleMaximize
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    agents,
    closeSession,
    deleteSession,
    restartSession,
    resumeSession,
    duplicateSession,
    focusSession,
    workspace
  } = useAppStore()

  const [isAtBottom, setIsAtBottom] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const agent = agents.find((a) => a.id === session.agentId)
  const isFocused = workspace.focusedSessionId === session.id

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
    if (session.status === 'running' || session.status === 'starting') {
      if (confirm(`O processo da sessão "${session.name}" ainda está em execução. Encerrar?`)) {
        closeSession(session.id)
      }
    } else {
      deleteSession(session.id)
    }
  }

  const getStatusBadge = () => {
    switch (session.status) {
      case 'running':
        return (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            executando
          </span>
        )
      case 'starting':
        return (
          <span className="flex items-center gap-1 text-[11px] text-sky-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            iniciando
          </span>
        )
      case 'exited':
        return (
          <span className="text-[11px] text-[#6e7d91] font-mono">
            encerrado {session.exitCode !== null ? `(${session.exitCode})` : ''}
          </span>
        )
      case 'error':
        return <span className="text-[11px] text-red-400 font-mono">erro</span>
      default:
        return null
    }
  }

  return (
    <div
      onClick={() => focusSession(session.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-col h-full w-full bg-[#0c0e12] border rounded overflow-hidden relative transition-colors ${
        isFocused ? 'border-[#3dd6c6]/50 shadow-md' : 'border-[#1e2330]'
      }`}
    >
      {/* Session Titlebar */}
      <div className="h-8 bg-[#151922] border-b border-[#1e2330] flex items-center justify-between px-2 text-xs select-none">
        <div className="flex items-center gap-2 truncate flex-1 min-w-0 mr-2">
          {/* Agent Badge */}
          <span
            className="w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] text-black flex-shrink-0"
            style={{ backgroundColor: agent?.color || '#3dd6c6' }}
            title={agent?.name || 'Comando'}
          >
            {agent?.icon || session.command.slice(0, 2).toUpperCase()}
          </span>

          {/* Session Name */}
          <span className="font-medium text-white truncate text-xs">{session.name}</span>

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
        <div className="flex items-center gap-1">
          {/* Resume (if exited & supported) */}
          {session.status === 'exited' && session.resumeKind !== 'none' && (
            <button
              onClick={() => resumeSession(session.id)}
              className="p-1 rounded text-[#3dd6c6] hover:bg-[#222a3a]"
              title={`Retomar sessão (${session.resumeKind})`}
            >
              <Play size={12} />
            </button>
          )}

          {/* Restart */}
          <button
            onClick={() => restartSession(session.id)}
            className="p-1 rounded text-[#8e9aa8] hover:text-white hover:bg-[#222a3a]"
            title="Reiniciar processo"
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

          {/* Maximize / Restore */}
          <button
            onClick={onToggleMaximize}
            className="p-1 rounded text-[#8e9aa8] hover:text-white hover:bg-[#222a3a]"
            title={isMaximized ? 'Restaurar grade' : 'Maximizar terminal'}
          >
            {isMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
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
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0c0e12]">
        <div ref={containerRef} className="w-full h-full" />

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
