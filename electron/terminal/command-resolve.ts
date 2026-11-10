import fs from 'node:fs'
import path from 'node:path'

export interface ResolvedLaunch {
  file: string
  args: string[]
  viaCmd: boolean
  display: string
}

export function commandSearchDirs(env: Record<string, string>, homeDir: string): string[] {
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path')
  const pathValue = pathKey ? env[pathKey] : ''
  const extras = [
    path.join(homeDir, '.local', 'bin'),
    env.APPDATA ? path.join(env.APPDATA, 'npm') : '',
    path.join(homeDir, 'AppData', 'Roaming', 'npm'),
    'C:\\Program Files\\Git\\bin',
    'C:\\Program Files\\Git\\cmd',
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
    'C:\\Windows\\System32'
  ]
  const dirs = [...extras, ...pathValue.split(';')]
  const seen = new Set<string>()
  const out: string[] = []
  for (const dir of dirs) {
    const trimmed = dir.trim().replace(/^"(.*)"$/, '$1')
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

export function enrichPath(env: Record<string, string>, homeDir: string): Record<string, string> {
  const next = { ...env }
  const dirs = commandSearchDirs(next, homeDir).filter((dir) => {
    try {
      return fs.existsSync(dir)
    } catch {
      return false
    }
  })
  const key = Object.keys(next).find((item) => item.toLowerCase() === 'path') ?? 'Path'
  next[key] = dirs.join(';')
  if (!next.TERM) next.TERM = 'xterm-256color'
  if (!next.COLORTERM) next.COLORTERM = 'truecolor'
  delete next.ELECTRON_RUN_AS_NODE
  return next
}

function existingFile(candidate: string): string | null {
  try {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  } catch {
    return null
  }
  return null
}

export function resolveExecutable(command: string, searchDirs: string[]): { file: string; kind: 'exe' | 'cmd' | 'ps1' } {
  const hasDir = /[\\/]/.test(command)
  const extensions = ['', '.exe', '.cmd', '.bat', '.ps1']
  const bases = hasDir ? [command] : searchDirs.map((dir) => path.join(dir, command))
  const preferred: { file: string; kind: 'exe' | 'cmd' | 'ps1' }[] = []
  for (const base of bases) {
    const ext = path.extname(base).toLowerCase()
    const candidates = ext ? [base] : extensions.map((item) => (item ? base + item : base))
    for (const candidate of candidates) {
      const file = existingFile(candidate)
      if (!file) continue
      const foundExt = path.extname(file).toLowerCase()
      const kind = foundExt === '.cmd' || foundExt === '.bat' ? 'cmd' : foundExt === '.ps1' ? 'ps1' : 'exe'
      preferred.push({ file, kind })
    }
  }
  const exe = preferred.find((item) => item.kind === 'exe')
  if (exe) return exe
  const cmd = preferred.find((item) => item.kind === 'cmd')
  if (cmd) return cmd
  const ps1 = preferred.find((item) => item.kind === 'ps1')
  if (ps1) return ps1
  throw new Error(
    `Não encontrei o executável "${command}". Confira se ele está instalado e visível no PATH do Windows.`
  )
}

export function quoteForCmd(arg: string): string {
  if (arg.length === 0) return '""'
  if (!/[\s"&|<>^%]/.test(arg)) return arg
  return `"${arg.replace(/"/g, '""')}"`
}

export function resolveLaunch(
  command: string,
  args: string[],
  env: Record<string, string>,
  homeDir: string
): ResolvedLaunch {
  const resolved = resolveExecutable(command, commandSearchDirs(env, homeDir))
  if (resolved.kind === 'exe') {
    return { file: resolved.file, args, viaCmd: false, display: resolved.file }
  }
  if (resolved.kind === 'ps1') {
    const powershell = resolveExecutable('powershell.exe', commandSearchDirs(env, homeDir))
    return {
      file: powershell.file,
      args: ['-NoLogo', '-File', resolved.file, ...args],
      viaCmd: false,
      display: resolved.file
    }
  }
  const comspec = existingFile(env.ComSpec || '') ?? existingFile('C:\\Windows\\System32\\cmd.exe')
  if (!comspec) throw new Error('cmd.exe não foi encontrado para iniciar o atalho .cmd.')
  const line = [resolved.file, ...args].map(quoteForCmd).join(' ')
  return {
    file: comspec,
    args: ['/d', '/s', '/c', line],
    viaCmd: true,
    display: resolved.file
  }
}
