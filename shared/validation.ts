const HEX = /^#[0-9a-fA-F]{6}$/
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/

export function validateProjectName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new Error('O nome do projeto precisa ter entre 1 e 80 caracteres.')
  }
  if (/[\u0000-\u001f]/.test(trimmed)) {
    throw new Error('O nome do projeto contém caracteres de controle.')
  }
  return trimmed
}

export function validateColor(color: string): string {
  if (!HEX.test(color)) throw new Error('A cor precisa estar no formato #RRGGBB.')
  return color.toLowerCase()
}

export function validateCommand(command: string): string {
  const trimmed = command.trim()
  if (!trimmed) throw new Error('Informe o comando do agente.')
  if (trimmed.length > 1024) throw new Error('O comando é longo demais.')
  if (/[\u0000-\u001f]/.test(trimmed)) throw new Error('O comando contém caracteres de controle.')
  return trimmed
}

export function validateArgs(args: string[]): string[] {
  if (!Array.isArray(args)) throw new Error('Os argumentos precisam ser uma lista.')
  if (args.length > 64) throw new Error('No máximo 64 argumentos.')
  return args.map((arg) => {
    if (typeof arg !== 'string') throw new Error('Argumento inválido.')
    if (arg.length > 8192) throw new Error('Argumento longo demais.')
    if (/[\u0000-\u001f]/.test(arg)) throw new Error('Argumento contém caracteres de controle.')
    return arg
  })
}

export function validateEnv(env: Record<string, string>): Record<string, string> {
  const entries = Object.entries(env)
  if (entries.length > 50) throw new Error('No máximo 50 variáveis de ambiente.')
  const out: Record<string, string> = {}
  for (const [key, value] of entries) {
    if (!ENV_KEY.test(key)) throw new Error(`Nome de variável inválido: ${key}`)
    if (typeof value !== 'string' || value.length > 32768) {
      throw new Error(`Valor inválido para ${key}.`)
    }
    if (value.includes('\u0000')) throw new Error(`Valor inválido para ${key}.`)
    out[key] = value
  }
  return out
}

export function validateIdlePattern(pattern: string): string {
  if (!pattern) return ''
  if (pattern.length > 200) throw new Error('O padrão de estado é longo demais.')
  try {
    // Compila só para recusar regex inválida. A busca acontece depois, por linha.
    new RegExp(pattern)
  } catch {
    throw new Error('A expressão do indicador de espera é inválida.')
  }
  return pattern
}

export function tokenizeArgs(input: string): string[] {
  const args: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === ' ' || ch === '\t') {
      if (current) {
        args.push(current)
        current = ''
      }
      continue
    }
    if (ch === '\n' || ch === '\r' || ch === '\u0000') {
      throw new Error('Os argumentos não podem ter quebras de linha.')
    }
    current += ch
  }
  if (quote) throw new Error('Aspas não fechadas nos argumentos.')
  if (current) args.push(current)
  return validateArgs(args)
}

export function parseEnvLines(input: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const index = line.indexOf('=')
    if (index <= 0) throw new Error(`Variável inválida: ${line}`)
    const key = line.slice(0, index).trim()
    const value = line.slice(index + 1)
    env[key] = value
  }
  return validateEnv(env)
}

export function formatEnv(env: Record<string, string>): string {
  return Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function sanitizeSize(cols: number, rows: number): { cols: number; rows: number } | null {
  if (!Number.isFinite(cols) || !Number.isFinite(rows)) return null
  const nextCols = Math.floor(cols)
  const nextRows = Math.floor(rows)
  if (nextCols < 2 || nextRows < 2 || nextCols > 500 || nextRows > 500) return null
  return { cols: nextCols, rows: nextRows }
}
