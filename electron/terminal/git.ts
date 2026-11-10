import { execFile } from 'node:child_process'
import path from 'node:path'
import type { GitInfo, GitWorktree } from '@shared/types'

function runGit(cwd: string, args: string[], timeout = 8000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout, windowsHide: true, maxBuffer: 2_000_000 }, (error, stdout, stderr) => {
      const code = typeof error?.code === 'number' ? error.code : error ? 1 : 0
      resolve({
        code,
        stdout: stdout.toString(),
        stderr: stderr.toString()
      })
    })
  })
}

export async function inspectGit(cwd: string): Promise<GitInfo> {
  const inside = await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])
  if (inside.code !== 0) {
    const missing = /not recognized|não é reconhecido|ENOENT/i.test(inside.stderr)
    return {
      available: !missing,
      isRepo: false,
      branch: null,
      dirty: 0,
      error: missing ? 'git não está instalado ou não está no PATH.' : undefined
    }
  }
  if (inside.stdout.trim() !== 'true') {
    return { available: true, isRepo: false, branch: null, dirty: 0 }
  }
  const branch = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
  let name = branch.stdout.trim() || null
  if (name === 'HEAD') {
    const short = await runGit(cwd, ['rev-parse', '--short', 'HEAD'])
    name = short.stdout.trim() ? `detached ${short.stdout.trim()}` : 'detached'
  }
  const status = await runGit(cwd, ['status', '--porcelain'])
  const dirty = status.stdout.split(/\r?\n/).filter((line) => line.trim()).length
  return { available: true, isRepo: true, branch: name, dirty }
}

export async function listWorktrees(cwd: string): Promise<GitWorktree[]> {
  const result = await runGit(cwd, ['worktree', 'list', '--porcelain'])
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || 'Não foi possível listar as worktrees.')
  }
  const items: GitWorktree[] = []
  let current: GitWorktree | null = null
  for (const line of result.stdout.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      if (current) items.push(current)
      current = { path: line.slice('worktree '.length).trim(), branch: null, head: null }
    } else if (current && line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length).trim()
    } else if (current && line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '')
    }
  }
  if (current) items.push(current)
  return items
}

export async function addWorktree(repoCwd: string, targetPath: string, branch: string): Promise<void> {
  const absolute = path.resolve(targetPath)
  const verify = await runGit(repoCwd, ['rev-parse', '--verify', '--quiet', branch])
  const args =
    verify.code === 0
      ? ['worktree', 'add', absolute, branch]
      : ['worktree', 'add', '-b', branch, absolute]
  const result = await runGit(repoCwd, args, 30_000)
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'git worktree add falhou.')
  }
}

export async function removeWorktree(repoCwd: string, targetPath: string, force: boolean): Promise<void> {
  const args = ['worktree', 'remove', path.resolve(targetPath)]
  if (force) args.push('--force')
  const result = await runGit(repoCwd, args, 30_000)
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'git worktree remove falhou.')
  }
}
