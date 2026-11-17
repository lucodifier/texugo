import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { codexSessionIdFromFilename, encodeClaudeProjectKey, isUuid } from '@shared/resume'

export function findClaudeSessionId(cwd: string, startedAt: number, homeDir = os.homedir()): string | null {
  const dir = path.join(homeDir, '.claude', 'projects', encodeClaudeProjectKey(path.resolve(cwd)))
  return newestUuidFile(dir, startedAt)
}

export function findFreebuffSessionId(cwd: string, startedAt?: number, homeDir = os.homedir()): string | null {
  const baseName = path.basename(cwd)
  const candidateDirs = [
    path.join(homeDir, '.config', 'manicode', 'projects', baseName, 'chats'),
    path.join(homeDir, '.config', 'manicode', 'projects', path.resolve(cwd).replace(/[:\\/]/g, '_'), 'chats')
  ]

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue
    let best: { id: string; mtime: number } | null = null
    let entries: string[] = []
    try {
      entries = fs.readdirSync(dir)
    } catch {
      continue
    }

    for (const name of entries) {
      const full = path.join(dir, name)
      let stat: fs.Stats
      try {
        stat = fs.statSync(full)
      } catch {
        continue
      }
      if (!stat.isDirectory()) continue

      const msgFile = path.join(full, 'chat-messages.json')
      const metaFile = path.join(full, 'chat-meta.json')
      let hasContent = false
      try {
        if (fs.existsSync(msgFile) && fs.statSync(msgFile).size > 10) {
          hasContent = true
        } else if (fs.existsSync(metaFile)) {
          const raw = fs.readFileSync(metaFile, 'utf8')
          const meta = JSON.parse(raw)
          if (meta.messageCount && meta.messageCount > 0) hasContent = true
        }
      } catch {}

      const mtime = stat.mtimeMs
      if (startedAt && mtime + 3000 < startedAt) continue

      if (hasContent) {
        if (!best || mtime > best.mtime) {
          best = { id: name, mtime }
        }
      } else if (!best && !startedAt) {
        best = { id: name, mtime }
      }
    }

    if (best) return best.id
  }

  return null
}

export function findCodexSessionId(startedAt: number, homeDir = os.homedir()): string | null {
  const now = new Date()
  const days = [now, new Date(now.getTime() - 24 * 60 * 60 * 1000)]
  let best: { id: string; mtime: number } | null = null
  for (const day of days) {
    const dir = path.join(
      homeDir,
      '.codex',
      'sessions',
      String(day.getFullYear()),
      pad(day.getMonth() + 1),
      pad(day.getDate())
    )
    if (!fs.existsSync(dir)) continue
    for (const name of fs.readdirSync(dir)) {
      const id = codexSessionIdFromFilename(name)
      if (!id) continue
      const full = path.join(dir, name)
      let mtime = 0
      try {
        mtime = fs.statSync(full).mtimeMs
      } catch {
        continue
      }
      if (mtime + 1000 < startedAt) continue
      if (!best || mtime > best.mtime) best = { id, mtime }
    }
  }
  return best?.id ?? null
}

function newestUuidFile(dir: string, startedAt: number): string | null {
  if (!fs.existsSync(dir)) return null
  let best: { id: string; mtime: number } | null = null
  for (const name of fs.readdirSync(dir)) {
    const id = name.replace(/\.jsonl$/i, '')
    if (!isUuid(id)) continue
    const full = path.join(dir, name)
    let mtime = 0
    try {
      mtime = fs.statSync(full).mtimeMs
    } catch {
      continue
    }
    if (mtime + 1000 < startedAt) continue
    if (!best || mtime > best.mtime) best = { id, mtime }
  }
  return best?.id ?? null
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
