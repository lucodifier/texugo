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
    path.join(homeDir, '.config', 'manicode'),
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
  const ext = path.extname(command).toLowerCase()

  if (['.exe', '.cmd', '.bat', '.ps1'].includes(ext)) {
    const bases = hasDir ? [command] : searchDirs.map((dir) => path.join(dir, command))
    for (const base of bases) {
      const file = existingFile(base)
      if (file) {
        const kind = ext === '.cmd' || ext === '.bat' ? 'cmd' : ext === '.ps1' ? 'ps1' : 'exe'
        return { file, kind }
      }
    }
  }

  // Windows priority order: .exe, .cmd, .bat, .ps1
  // Never pick extensionless shell scripts on Windows
  const extensions = ['.exe', '.cmd', '.bat', '.ps1']
  const bases = hasDir ? [command] : searchDirs.map((dir) => path.join(dir, command))

  for (const extCandidate of extensions) {
    for (const base of bases) {
      const candidate = base + extCandidate
      const file = existingFile(candidate)
      if (file) {
        const kind = extCandidate === '.cmd' || extCandidate === '.bat' ? 'cmd' : extCandidate === '.ps1' ? 'ps1' : 'exe'
        return { file, kind }
      }
    }
  }

  if (hasDir) {
    const file = existingFile(command)
    if (file) return { file, kind: 'exe' }
  }

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
