import type { ResumeKind } from './types'

export interface ResumePlan {
  args: string[]
  description: string
}

/**
 * Monta somente flags documentadas pelas CLIs.
 * Sem ID oficial, Claude usa --continue e Codex usa `resume --last`.
 * Não inventa identificador.
 */
export function buildResumeArgs(
  kind: ResumeKind,
  baseArgs: string[],
  externalSessionId: string | null
): ResumePlan | { error: string } {
  if (kind === 'claude') {
    if (externalSessionId) {
      return {
        args: [...baseArgs, '--resume', externalSessionId],
        description: 'claude --resume com o ID oficial observado nos arquivos de sessão locais'
      }
    }
    return {
      args: [...baseArgs, '--continue'],
      description: 'claude --continue: a conversa mais recente deste diretório, segundo a CLI'
    }
  }
  if (kind === 'codex') {
    if (externalSessionId) {
      return {
        args: [...baseArgs, 'resume', externalSessionId],
        description: 'codex resume com o ID oficial do arquivo rollout'
      }
    }
    return {
      args: [...baseArgs, 'resume', '--last'],
      description: 'codex resume --last: a sessão mais recente filtrada pela CLI'
    }
  }
  if (kind === 'freebuff') {
    if (externalSessionId) {
      return {
        args: [...baseArgs, '--continue', externalSessionId],
        description: 'freebuff --continue com o ID da conversa'
      }
    }
    return {
      args: [...baseArgs, '--continue'],
      description: 'freebuff --continue: a conversa mais recente deste diretório'
    }
  }
  return {
    error:
      'Este agente não tem retomada oficial configurada. O histórico visual continua disponível. Abra um novo terminal se quiser outra sessão.'
  }
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Espelha o diretório em ~/.claude/projects observado nesta máquina:
 * C:\codes\agents -> C--codes-agents
 * um segmento .claude vira --claude porque "\" e "." viram hífen.
 */
export function encodeClaudeProjectKey(absolutePath: string): string {
  let path = absolutePath.replace(/\//g, '\\')
  if (/^[a-zA-Z]:/.test(path)) path = path[0].toUpperCase() + path.slice(1)
  return path.replace(/:/g, '-').replace(/\\/g, '-').replace(/\./g, '-')
}

export function codexSessionIdFromFilename(filename: string): string | null {
  const match = /^rollout-.+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i.exec(
    filename
  )
  return match ? match[1] : null
}
