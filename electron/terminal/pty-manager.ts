import { spawn as spawnProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import type { IPty } from 'node-pty'
import { attentionFromPattern, lastPlainLine } from '@shared/terminal'
import { sanitizeSize } from '@shared/validation'
import type { Attention, CloseReason, ResumeKind, SessionStatus } from '@shared/types'
import { enrichPath, resolveLaunch } from './command-resolve'
import { createOutputLog, type OutputLog } from './output-log'

const require = createRequire(import.meta.url)
const pty = require('node-pty') as typeof import('node-pty')

export interface SpawnRequest {
  sessionId: string
  command: string
  args: string[]
  cwd: string
  extraEnv: Record<string, string>
  resumeKind: ResumeKind
  idlePattern: string
  cols: number
  rows: number
  transcriptFile: string
}

export interface LiveSession {
  id: string
  status: SessionStatus
  exitCode: number | null
  closeReason: CloseReason
  attention: Attention
  pid: number | null
  externalSessionId: string | null
  resumeKind: ResumeKind
  idlePattern: string
  startedAt: number
  cwd: string
}

interface Runtime extends LiveSession {
  pty: IPty | null
  log: OutputLog
  seq: number
  lastLine: string
  cols: number
  rows: number
  killRequested: boolean
}

export class PtyManager {
  private sessions = new Map<string, Runtime>()
  private isShuttingDown = false
  readonly windowsBuild: number

  constructor(
    private readonly emitData: (sessionId: string, seq: number, data: string) => void,
    private readonly emitStatus: (session: LiveSession) => void,
    private readonly homeDir = os.homedir()
  ) {
    const build = Number(os.release().split('.')[2] || 0)
    this.windowsBuild = Number.isFinite(build) ? build : 0
  }

  hasRunning(): boolean {
    return [...this.sessions.values()].some((session) => session.status === 'running' || session.status === 'starting')
  }

  runningIds(): string[] {
    return [...this.sessions.values()]
      .filter((session) => session.status === 'running' || session.status === 'starting')
      .map((session) => session.id)
  }

  get(sessionId: string): LiveSession | null {
    const session = this.sessions.get(sessionId)
    return session ? publicView(session) : null
  }

  noteExternalSession(sessionId: string, externalSessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session || session.externalSessionId === externalSessionId) return
    session.externalSessionId = externalSessionId
    this.emitStatus(publicView(session))
  }

  async spawn(request: SpawnRequest): Promise<LiveSession> {
    this.shutdown(request.sessionId, 'user', false)
    const size = sanitizeSize(request.cols, request.rows) ?? { cols: 80, rows: 24 }
    const log = createOutputLog(request.transcriptFile)
    const runtime: Runtime = {
      id: request.sessionId,
      status: 'starting',
      exitCode: null,
      closeReason: null,
      attention: null,
      pid: null,
      externalSessionId: null,
      resumeKind: request.resumeKind,
      idlePattern: request.idlePattern,
      startedAt: Date.now(),
      cwd: request.cwd,
      pty: null,
      log,
      seq: 0,
      lastLine: '',
      cols: size.cols,
      rows: size.rows,
      killRequested: false
    }
    this.sessions.set(request.sessionId, runtime)
    this.emitStatus(publicView(runtime))

    let launch
    try {
      const env = enrichPath({ ...process.env, ...request.extraEnv } as Record<string, string>, this.homeDir)
      for (const key of Object.keys(env)) {
        if (env[key] === undefined) delete env[key]
      }
      launch = resolveLaunch(request.command, request.args, env, this.homeDir)
      runtime.pty = this.spawnPty(launch.file, launch.args, {
        cols: size.cols,
        rows: size.rows,
        cwd: request.cwd,
        env
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao iniciar o processo.'
      this.push(runtime, `\r\n${message}\r\n`)
      runtime.status = 'error'
      runtime.closeReason = 'spawn-failed'
      runtime.log.close()
      runtime.pty = null
      this.emitStatus(publicView(runtime))
      return publicView(runtime)
    }

    const term = runtime.pty
    runtime.pid = term.pid
    runtime.status = 'running'
    this.emitStatus(publicView(runtime))
    term.onData((data) => {
      this.push(runtime, data)
    })
    term.onExit(({ exitCode }) => {
      runtime.exitCode = exitCode
      runtime.pid = null
      runtime.pty = null
      if (runtime.killRequested) {
        runtime.status = 'exited'
        runtime.closeReason = 'user'
      } else if (exitCode === 0) {
        runtime.status = 'exited'
        runtime.closeReason = 'exit'
      } else {
        runtime.status = 'error'
        runtime.closeReason = 'exit'
      }
      this.push(runtime, `\r\n[processo encerrado com código ${exitCode}]\r\n`)
      runtime.log.close()
      if (!this.isShuttingDown && this.sessions.has(runtime.id)) {
        this.emitStatus(publicView(runtime))
      }
    })
    return publicView(runtime)
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (!session?.pty) return
    if (typeof data !== 'string' || data.length > 1_000_000) return
    session.pty.write(data)
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    const size = sanitizeSize(cols, rows)
    if (!session?.pty || !size) return
    if (session.cols === size.cols && session.rows === size.rows) return
    session.cols = size.cols
    session.rows = size.rows
    session.pty.resize(size.cols, size.rows)
  }

  delete(sessionId: string): void {
    this.shutdown(sessionId, 'user', false)
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.log.close()
      } catch {}
      this.sessions.delete(sessionId)
    }
  }

  shutdown(sessionId: string, reason: CloseReason, notifyIfAbsent = true): void {
    const session = this.sessions.get(sessionId)
    if (!session?.pty) {
      if (session && notifyIfAbsent) this.emitStatus(publicView(session))
      return
    }
    session.killRequested = true
    session.closeReason = reason
    const pid = session.pty.pid
    try {
      if (process.platform === 'win32' && pid) {
        spawnProcess('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
      }
      session.pty.kill()
    } catch (error) {
      this.push(session, `\r\n${error instanceof Error ? error.message : 'Falha ao encerrar.'}\r\n`)
    }
  }

  shutdownAll(): void {
    this.isShuttingDown = true
    for (const id of this.runningIds()) this.shutdown(id, 'app-quit')
  }

  private spawnPty(
    file: string,
    args: string[],
    options: { cols: number; rows: number; cwd: string; env: Record<string, string> }
  ): IPty {
    const base = {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: options.env,
      conptyInheritCursor: false
    }
    const tryDll = process.platform === 'win32'
    if (tryDll) {
      try {
        return pty.spawn(file, args, { ...base, useConptyDll: true })
      } catch (err) {
        console.warn('[PtyManager] useConptyDll failed, fallback to system ConPTY:', err)
        return pty.spawn(file, args, base)
      }
    }
    return pty.spawn(file, args, base)
  }

  private push(session: Runtime, data: string): void {
    if (!this.sessions.has(session.id)) return
    session.log.append(data)
    session.seq += 1
    session.lastLine = lastPlainLine(data, session.lastLine).slice(-500)
    const attention = attentionFromPattern(session.idlePattern, session.lastLine)
    if (attention !== session.attention) {
      session.attention = attention
      this.emitStatus(publicView(session))
    }
    if (!this.isShuttingDown) this.emitData(session.id, session.seq, data)
  }
}

function publicView(session: Runtime): LiveSession {
  return {
    id: session.id,
    status: session.status,
    exitCode: session.exitCode,
    closeReason: session.closeReason,
    attention: session.attention,
    pid: session.pid,
    externalSessionId: session.externalSessionId,
    resumeKind: session.resumeKind,
    idlePattern: session.idlePattern,
    startedAt: session.startedAt,
    cwd: session.cwd
  }
}

export function transcriptPath(root: string, sessionId: string): string {
  return path.join(root, `${sessionId}.log`)
}
