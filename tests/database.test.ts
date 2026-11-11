import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { AppDatabase } from '../electron/main/database'
import { emptyLayout } from '@shared/layout'

describe('AppDatabase (SQLite with sql.js)', () => {
  let tempDir: string
  let dbFile: string
  let db: AppDatabase

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-desktop-test-'))
    dbFile = path.join(tempDir, 'test.sqlite')
    db = await AppDatabase.open(dbFile)
  })

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  it('initializes tables and defaults', () => {
    db.ensureDefaultAgents()
    const agents = db.listAgents()
    expect(agents.length).toBeGreaterThan(0)
    expect(agents.some((a) => a.id === 'powershell')).toBe(true)
    expect(agents.some((a) => a.id === 'claude')).toBe(true)
    expect(agents.some((a) => a.id === 'freebuff')).toBe(true)
    expect(agents.some((a) => a.id === 'codex')).toBe(true)
    expect(agents.some((a) => a.id === 'windows-terminal')).toBe(true)
  })

  it('manages agents enabled status persistence', () => {
    db.ensureDefaultAgents()
    const claude = db.getAgent('claude')
    expect(claude).not.toBeNull()
    expect(claude?.enabled).toBe(true)

    // Disable claude
    if (claude) {
      db.upsertAgent({ ...claude, enabled: false })
      expect(db.getAgent('claude')?.enabled).toBe(false)

      // Re-enable claude
      db.upsertAgent({ ...claude, enabled: true })
      expect(db.getAgent('claude')?.enabled).toBe(true)
    }
  })

  it('inserts and retrieves projects', () => {
    const project = {
      id: 'proj-1',
      name: 'Projeto Teste',
      cwd: 'C:\\test',
      color: '#3dd6c6',
      layout: emptyLayout('1'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    db.insertProject(project)

    const retrieved = db.getProject('proj-1')
    expect(retrieved).not.toBeNull()
    expect(retrieved?.name).toBe('Projeto Teste')
    expect(retrieved?.color).toBe('#3dd6c6')

    const list = db.listProjects()
    expect(list.length).toBe(1)
  })

  it('updates and deletes projects', () => {
    const project = {
      id: 'proj-2',
      name: 'Projeto Antes',
      cwd: 'C:\\test',
      color: '#3dd6c6',
      layout: emptyLayout('1'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    db.insertProject(project)

    project.name = 'Projeto Depois'
    db.updateProject(project)

    expect(db.getProject('proj-2')?.name).toBe('Projeto Depois')

    db.deleteProject('proj-2')
    expect(db.getProject('proj-2')).toBeNull()
  })

  it('manages sessions persistence', () => {
    const session = {
      id: 'sess-1',
      projectId: 'proj-1',
      name: 'Claude Sessão 1',
      agentId: 'claude',
      command: 'claude',
      args: ['--dangerously-skip-permissions'],
      cwd: 'C:\\test',
      env: {},
      externalSessionId: 'claude-uuid-123',
      resumeKind: 'claude' as const,
      status: 'running' as const,
      exitCode: null,
      closeReason: null,
      attention: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pid: 1234
    }

    db.insertSession(session)
    const retrieved = db.getSession('sess-1')
    expect(retrieved?.name).toBe('Claude Sessão 1')
    expect(retrieved?.externalSessionId).toBe('claude-uuid-123')

    session.status = 'exited'
    session.exitCode = 0
    db.updateSession(session)
    expect(db.getSession('sess-1')?.status).toBe('exited')
  })
})
