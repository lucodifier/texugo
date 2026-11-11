import type { AgentProfile, Settings } from './types'
import { emptyLayout } from './layout'

export const PROJECT_COLORS = [
  '#3dd6c6',
  '#d4a574',
  '#7c9cff',
  '#e08aa8',
  '#8fd18a',
  '#f0c674',
  '#c4b5fd',
  '#7ec8ff'
]

export function defaultAgents(): AgentProfile[] {
  return [
    agent('claude', 'Claude Code', 'claude', 'Cl', '#d4a574', 'claude'),
    agent('freebuff', 'Freebuff', 'freebuff', 'Fb', '#00e599', 'none'),
    agent('codex', 'Codex', 'codex', 'Cx', '#10a37f', 'codex'),
    agent('git-bash', 'Bash', 'bash.exe', 'Ba', '#4cc2ff', 'none', ['--login', '-i'], true, { MSYSTEM: 'MINGW64' }),
    agent('cmd', 'CMD', 'cmd.exe', 'CM', '#c8c8c8', 'none'),
    agent('powershell', 'PowerShell', 'powershell.exe', 'PS', '#4fc1ff', 'none', ['-NoLogo']),
    agent('windows-terminal', 'Windows Terminal (Bash)', 'bash.exe', 'WT', '#4cc2ff', 'none', ['--login', '-i'], true, { MSYSTEM: 'MINGW64' }),
    agent('opencode', 'OpenCode', 'opencode', 'Oc', '#7c9cff', 'none'),
    agent('cursor', 'Cursor', 'cursor-agent', 'Cu', '#c4b5fd', 'none'),
    agent('gemini', 'Gemini CLI', 'gemini', 'Ge', '#7ec8ff', 'none')
  ]
}

function agent(
  id: string,
  name: string,
  command: string,
  icon: string,
  color: string,
  resumeKind: AgentProfile['resumeKind'],
  args: string[] = [],
  enabled: boolean = true,
  env: Record<string, string> = {}
): AgentProfile {
  return {
    id,
    name,
    command,
    args,
    cwd: null,
    env,
    icon,
    color,
    resumeKind,
    idlePattern: '',
    builtin: true,
    enabled
  }
}

export function defaultSettings(homeDir: string): Settings {
  return {
    theme: 'dark',
    fontFamily: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
    fontSize: 14,
    lineHeight: 1.0,
    letterSpacing: 0,
    scrollback: 100_000,
    defaultAgentId: 'powershell',
    defaultCwd: homeDir,
    restoreVisualHistory: true,
    confirmClose: true,
    renderer: 'canvas',
    transcriptLimitMb: 64
  }
}

export function defaultProjectLayout() {
  return emptyLayout('auto')
}

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl+Shift+T', action: 'Novo terminal no projeto ativo' },
  { keys: 'Ctrl+Shift+N', action: 'Novo projeto' },
  { keys: 'Ctrl+Shift+W', action: 'Encerrar a sessão em foco' },
  { keys: 'Ctrl+,', action: 'Configurações' },
  { keys: 'Ctrl+Shift+1', action: 'Layout de 1 painel' },
  { keys: 'Ctrl+Shift+2', action: 'Dois painéis verticais' },
  { keys: 'Ctrl+Shift+3', action: 'Dois painéis horizontais' },
  { keys: 'Ctrl+Shift+4', action: 'Quatro painéis' },
  { keys: 'Ctrl+Shift+6', action: 'Seis painéis' },
  { keys: 'Ctrl+Shift+8', action: 'Oito painéis' },
  { keys: 'Ctrl+Shift+M', action: 'Maximizar ou restaurar a sessão em foco' },
  { keys: 'Ctrl+Shift+End', action: 'Ir para o fim do terminal em foco' }
]
