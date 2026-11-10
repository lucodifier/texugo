import { describe, it, expect } from 'vitest'
import { buildResumeArgs } from '@shared/resume'

describe('Resume Logic (Claude & Codex)', () => {
  it('returns an error when resume is called for unsupported agent', () => {
    const result = buildResumeArgs('none', ['--flag'], null)
    expect('error' in result).toBe(true)
  })

  it('builds resume args for Claude Code with external session ID', () => {
    const result = buildResumeArgs('claude', [], 'test-session-uuid')
    expect('args' in result).toBe(true)
    if ('args' in result) {
      expect(result.args).toContain('--resume')
      expect(result.args).toContain('test-session-uuid')
    }
  })

  it('builds resume args for Claude Code without external session ID using --continue', () => {
    const result = buildResumeArgs('claude', [], null)
    expect('args' in result).toBe(true)
    if ('args' in result) {
      expect(result.args).toContain('--continue')
    }
  })

  it('builds resume args for Codex CLI with external session ID', () => {
    const result = buildResumeArgs('codex', [], 'codex-uuid-123')
    expect('args' in result).toBe(true)
    if ('args' in result) {
      expect(result.args).toContain('resume')
      expect(result.args).toContain('codex-uuid-123')
    }
  })

  it('builds resume args for Codex CLI without external session ID using resume --last', () => {
    const result = buildResumeArgs('codex', [], null)
    expect('args' in result).toBe(true)
    if ('args' in result) {
      expect(result.args).toEqual(['resume', '--last'])
    }
  })
})
