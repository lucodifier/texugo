import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { defaultAgents, defaultProjectLayout, defaultSettings } from '@shared/defaults'
import type {
  AgentInput,
  AgentProfile,
  CloseReason,
  LayoutState,
  Project,
  SessionRecord,
  SessionStatus,
  Settings,
  WorkspaceState
} from '@shared/types'

const require = createRequire(import.meta.url)
type SqlJsStatic = {
  Database: new (data?: ArrayLike<number>) => SqlDatabase
}
type SqlDatabase = {
  run(sql: string, params?: unknown[]): void
  exec(sql: string): { columns: string[]; values: unknown[][] }[]
  export(): Uint8Array
  close(): void
}
type InitSqlJs = (config?: { wasmBinary?: ArrayBuffer }) => Promise<SqlJsStatic>

const initSqlJs = require('sql.js') as InitSqlJs

let sqlPromise: Promise<SqlJsStatic> | null = null

function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
    const wasm = fs.readFileSync(wasmPath)
    sqlPromise = initSqlJs({ wasmBinary: wasm })
  }
  return sqlPromise
}

export class AppDatabase {
  private constructor(
    private readonly db: SqlDatabase,
    private readonly file: string
  ) {}

  static async open(file: string): Promise<AppDatabase> {
    const SQL = await loadSql()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    const existing = readExisting(file)
    const db = existing ? new SQL.Database(existing) : new SQL.Database()
    const store = new AppDatabase(db, file)
    store.migrate()
    return store
  }

  private migrate(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cwd TEXT NOT NULL,
        color TEXT NOT NULL,
        layout_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        args_json TEXT NOT NULL,
        cwd TEXT,
        env_json TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        resume_kind TEXT NOT NULL,
        idle_pattern TEXT NOT NULL DEFAULT '',
        builtin INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        agent_id TEXT,
        command TEXT NOT NULL,
        args_json TEXT NOT NULL,
        cwd TEXT NOT NULL,
        env_json TEXT NOT NULL,
        external_session_id TEXT,
        resume_kind TEXT NOT NULL,
        status TEXT NOT NULL,
        exit_code INTEGER,
        close_reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
      );
    `)
    this.persist()
  }

  listProjects(): Project[] {
    return this.rows(
      'SELECT * FROM projects ORDER BY name COLLATE NOCASE'
    ).map((row) => this.toProject(row))
  }

  getProject(id: string): Project | null {
    return this.rows('SELECT * FROM projects WHERE id = ?', [id]).map((row) => this.toProject(row))[0] ?? null
  }

  insertProject(project: Project): void {
    this.db.run(
      `INSERT INTO projects (id, name, cwd, color, layout_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project.id, project.name, project.cwd, project.color, JSON.stringify(project.layout), project.createdAt, project.updatedAt]
    )
    this.persist()
  }

  updateProject(project: Project): void {
    this.db.run(
      `UPDATE projects SET name = ?, cwd = ?, color = ?, layout_json = ?, updated_at = ? WHERE id = ?`,
      [project.name, project.cwd, project.color, JSON.stringify(project.layout), project.updatedAt, project.id]
    )
    this.persist()
  }

  deleteProject(id: string): void {
    this.db.run('DELETE FROM sessions WHERE project_id = ?', [id])
    this.db.run('DELETE FROM projects WHERE id = ?', [id])
    this.persist()
  }

  listAgents(): AgentProfile[] {
    return this.rows('SELECT * FROM agents ORDER BY builtin DESC, name COLLATE NOCASE').map((row) => this.toAgent(row))
  }

  getAgent(id: string): AgentProfile | null {
    return this.rows('SELECT * FROM agents WHERE id = ?', [id]).map((row) => this.toAgent(row))[0] ?? null
  }

  upsertAgent(agent: AgentProfile): void {
    this.db.run(
      `INSERT INTO agents (id, name, command, args_json, cwd, env_json, icon, color, resume_kind, idle_pattern, builtin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         command = excluded.command,
         args_json = excluded.args_json,
         cwd = excluded.cwd,
         env_json = excluded.env_json,
         icon = excluded.icon,
         color = excluded.color,
         resume_kind = excluded.resume_kind,
         idle_pattern = excluded.idle_pattern,
         builtin = excluded.builtin`,
      [
        agent.id,
        agent.name,
        agent.command,
        JSON.stringify(agent.args),
        agent.cwd,
        JSON.stringify(agent.env),
        agent.icon,
        agent.color,
        agent.resumeKind,
        agent.idlePattern,
        agent.builtin ? 1 : 0
      ]
    )
    this.persist()
  }

  deleteAgent(id: string): void {
    this.db.run('DELETE FROM agents WHERE id = ?', [id])
    this.persist()
  }

  ensureDefaultAgents(): void {
    for (const agent of defaultAgents()) {
      if (!this.getAgent(agent.id)) this.upsertAgent(agent)
    }
  }

  listSessions(): SessionRecord[] {
    return this.rows('SELECT * FROM sessions ORDER BY created_at').map((row) => this.toSession(row))
  }

  getSession(id: string): SessionRecord | null {
    return this.rows('SELECT * FROM sessions WHERE id = ?', [id]).map((row) => this.toSession(row))[0] ?? null
  }

  insertSession(session: SessionRecord): void {
    this.db.run(
      `INSERT INTO sessions (
        id, project_id, name, agent_id, command, args_json, cwd, env_json, external_session_id,
        resume_kind, status, exit_code, close_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionParams(session)
    )
    this.persist()
  }

  updateSession(session: SessionRecord): void {
    this.db.run(
      `UPDATE sessions SET
        project_id = ?, name = ?, agent_id = ?, command = ?, args_json = ?, cwd = ?, env_json = ?,
        external_session_id = ?, resume_kind = ?, status = ?, exit_code = ?, close_reason = ?, updated_at = ?
       WHERE id = ?`,
      [
        session.projectId,
        session.name,
        session.agentId,
        session.command,
        JSON.stringify(session.args),
        session.cwd,
        JSON.stringify(session.env),
        session.externalSessionId,
        session.resumeKind,
        session.status,
        session.exitCode,
        session.closeReason,
        session.updatedAt,
        session.id
      ]
    )
    this.persist()
  }

  deleteSession(id: string): void {
    this.db.run('DELETE FROM sessions WHERE id = ?', [id])
    this.persist()
  }

  markOrphansExited(): void {
    const now = Date.now()
    this.db.run(
      `UPDATE sessions
       SET status = 'exited', close_reason = 'app-quit', exit_code = NULL, updated_at = ?
       WHERE status IN ('starting', 'running')`,
      [now]
    )
    this.persist()
  }

  getSettings(homeDir: string): Settings {
    const row = this.rows("SELECT value_json FROM settings WHERE key = 'app'")[0]
    const stored = row ? (JSON.parse(String(row.value_json)) as Partial<Settings>) : {}
    const merged = { ...defaultSettings(homeDir), ...stored, defaultCwd: stored.defaultCwd || homeDir }
    if (merged.lineHeight === 1.2) merged.lineHeight = 1.0
    return merged
  }

  saveSettings(settings: Settings): void {
    this.db.run(
      `INSERT INTO settings (key, value_json) VALUES ('app', ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      [JSON.stringify(settings)]
    )
    this.persist()
  }

  getWorkspace(): WorkspaceState {
    const row = this.rows("SELECT value_json FROM settings WHERE key = 'workspace'")[0]
    if (!row) return { openProjectIds: [], activeProjectId: null, focusedSessionId: null }
    const value = JSON.parse(String(row.value_json)) as Partial<WorkspaceState>
    return {
      openProjectIds: Array.isArray(value.openProjectIds) ? value.openProjectIds.filter((id) => typeof id === 'string') : [],
      activeProjectId: typeof value.activeProjectId === 'string' ? value.activeProjectId : null,
      focusedSessionId: typeof value.focusedSessionId === 'string' ? value.focusedSessionId : null,
      layout: value.layout
    }
  }

  saveWorkspace(workspace: WorkspaceState): void {
    this.db.run(
      `INSERT INTO settings (key, value_json) VALUES ('workspace', ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      [JSON.stringify(workspace)]
    )
    this.persist()
  }

  close(): void {
    this.persist()
    this.db.close()
  }

  private toProject(row: Record<string, unknown>): Project {
    const layout = JSON.parse(String(row.layout_json)) as LayoutState
    return {
      id: String(row.id),
      name: String(row.name),
      cwd: String(row.cwd),
      color: String(row.color),
      layout,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at)
    }
  }

  private toAgent(row: Record<string, unknown>): AgentProfile {
    return {
      id: String(row.id),
      name: String(row.name),
      command: String(row.command),
      args: JSON.parse(String(row.args_json)) as string[],
      cwd: row.cwd == null ? null : String(row.cwd),
      env: JSON.parse(String(row.env_json)) as Record<string, string>,
      icon: String(row.icon),
      color: String(row.color),
      resumeKind: row.resume_kind as AgentProfile['resumeKind'],
      idlePattern: String(row.idle_pattern ?? ''),
      builtin: Number(row.builtin) === 1
    }
  }

  private toSession(row: Record<string, unknown>): SessionRecord {
    return {
      id: String(row.id),
      projectId: String(row.project_id),
      name: String(row.name),
      agentId: row.agent_id == null ? null : String(row.agent_id),
      command: String(row.command),
      args: JSON.parse(String(row.args_json)) as string[],
      cwd: String(row.cwd),
      env: JSON.parse(String(row.env_json)) as Record<string, string>,
      externalSessionId: row.external_session_id == null ? null : String(row.external_session_id),
      resumeKind: row.resume_kind as SessionRecord['resumeKind'],
      status: row.status as SessionStatus,
      exitCode: row.exit_code == null ? null : Number(row.exit_code),
      closeReason: (row.close_reason as CloseReason) ?? null,
      attention: null,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      pid: null
    }
  }

  private rows(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const result = this.db.exec(params.length ? bind(sql, params) : sql)
    if (!result[0]) return []
    return result[0].values.map((value) => {
      const row: Record<string, unknown> = {}
      result[0].columns.forEach((column, index) => {
        row[column] = value[index]
      })
      return row
    })
  }

  private persist(): void {
    const data = this.db.export()
    const tmp = `${this.file}.tmp`
    fs.writeFileSync(tmp, Buffer.from(data))
    fs.rmSync(this.file, { force: true })
    fs.renameSync(tmp, this.file)
  }
}

function sessionParams(session: SessionRecord): unknown[] {
  return [
    session.id,
    session.projectId,
    session.name,
    session.agentId,
    session.command,
    JSON.stringify(session.args),
    session.cwd,
    JSON.stringify(session.env),
    session.externalSessionId,
    session.resumeKind,
    session.status,
    session.exitCode,
    session.closeReason,
    session.createdAt,
    session.updatedAt
  ]
}

function bind(sql: string, params: unknown[]): string {
  let index = 0
  return sql.replace(/\?/g, () => literal(params[index++]))
}

function literal(value: unknown): string {
  if (value == null) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'bigint') return value.toString()
  return `'${String(value).replace(/'/g, "''")}'`
}

function readExisting(file: string): Buffer | null {
  if (fs.existsSync(file)) return fs.readFileSync(file)
  const tmp = `${file}.tmp`
  if (fs.existsSync(tmp)) return fs.readFileSync(tmp)
  return null
}

export function projectFromInput(input: { id: string; name: string; cwd: string; color: string }): Project {
  const now = Date.now()
  return {
    ...input,
    layout: defaultProjectLayout(),
    createdAt: now,
    updatedAt: now
  }
}

export function agentFromInput(input: AgentInput, builtin = false): AgentProfile {
  return {
    id: input.id || crypto.randomUUID(),
    name: input.name,
    command: input.command,
    args: input.args,
    cwd: input.cwd,
    env: input.env,
    icon: input.icon || input.name.slice(0, 2),
    color: input.color,
    resumeKind: input.resumeKind,
    idlePattern: input.idlePattern,
    builtin
  }
}
