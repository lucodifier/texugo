import { describe, it, expect } from 'vitest'
import {
  emptyLayout,
  setPreset,
  focusSessionInLayout,
  removeSessionFromLayout,
  normalizeLayout
} from '@shared/layout'

describe('Layout Engine', () => {
  it('creates an empty layout for preset 1', () => {
    const layout = emptyLayout('1')
    expect(layout.preset).toBe('1')
    expect(layout.slots).toEqual([null])
    expect(layout.overflow).toEqual([])
  })

  it('changes preset from 1 to 4 and expands slots', () => {
    const initial = emptyLayout('1')
    const updated = setPreset(initial, '4', [])
    expect(updated.preset).toBe('4')
    expect(updated.slots.length).toBe(4)
  })

  it('places a session in the first empty slot', () => {
    const layout = emptyLayout('4')
    const next = focusSessionInLayout(layout, 'session-1', ['session-1'])
    expect(next.slots[0]).toBe('session-1')
    expect(next.slots[1]).toBeNull()
  })

  it('auto-expands preset when adding session to full layout', () => {
    let layout = emptyLayout('1')
    layout = focusSessionInLayout(layout, 's1', ['s1'])
    expect(layout.slots).toEqual(['s1'])

    // Adding second session auto-expands to 2h
    layout = focusSessionInLayout(layout, 's2', ['s1', 's2'])
    expect(layout.preset).toBe('2h')
    expect(layout.slots).toEqual(['s1', 's2'])
  })

  it('handles multiple sessions filling slots and overflowing gracefully', () => {
    let layout = emptyLayout('2h')
    layout = focusSessionInLayout(layout, 's1', ['s1'])
    layout = focusSessionInLayout(layout, 's2', ['s1', 's2'])
    expect(layout.slots).toEqual(['s1', 's2'])

    layout = focusSessionInLayout(layout, 's3', ['s1', 's2', 's3'])
    expect(layout.slots.includes('s3')).toBe(true)
  })

  it('removes a session from layout slots when closed', () => {
    let layout = emptyLayout('4')
    layout = focusSessionInLayout(layout, 's1', ['s1'])
    layout = focusSessionInLayout(layout, 's2', ['s1', 's2'])
    expect(layout.slots[0]).toBe('s1')

    const afterRemove = removeSessionFromLayout(layout, 's1', ['s2'])
    expect(afterRemove.slots[0]).toBe('s2')
    expect(afterRemove.slots[1]).toBeNull()
  })

  it('cleans invalid sessions on normalizeLayout', () => {
    const layout = emptyLayout('2h')
    layout.slots = ['valid-1', 'deleted-ghost']
    const normalized = normalizeLayout(layout, ['valid-1'])
    expect(normalized.slots[0]).toBe('valid-1')
    expect(normalized.slots[1]).toBeNull()
  })
})
