import type { LayoutState, PresetId } from './types'

export interface PresetSpec {
  id: Exclude<PresetId, 'auto'>
  label: string
  cols: number
  rows: number
  count: number
}

export const PRESETS: Record<Exclude<PresetId, 'auto'>, PresetSpec> = {
  '1': { id: '1', label: '1 painel', cols: 1, rows: 1, count: 1 },
  '2h': { id: '2h', label: '2 horizontais', cols: 2, rows: 1, count: 2 },
  '2v': { id: '2v', label: '2 verticais', cols: 1, rows: 2, count: 2 },
  '3': { id: '3', label: '3 painéis (lado a lado)', cols: 3, rows: 1, count: 3 },
  '4': { id: '4', label: '4 painéis (2x2)', cols: 2, rows: 2, count: 4 },
  '6': { id: '6', label: '6 painéis (3x2)', cols: 3, rows: 2, count: 6 },
  '8': { id: '8', label: '8 painéis (4x2)', cols: 4, rows: 2, count: 8 }
}

export function autoPresetForCount(count: number): Exclude<PresetId, 'auto'> {
  if (count <= 1) return '1'
  if (count === 2) return '2h'
  if (count === 3) return '3'
  if (count === 4) return '4'
  if (count <= 6) return '6'
  return '8'
}

const NEXT_PRESET: Record<PresetId, PresetId> = {
  'auto': 'auto',
  '1': '2h',
  '2h': '3',
  '2v': '3',
  '3': '4',
  '4': '6',
  '6': '8',
  '8': '8'
}

export function emptyLayout(preset: PresetId = 'auto'): LayoutState {
  if (preset === 'auto') {
    return {
      preset: 'auto',
      slots: [],
      overflow: [],
      colSizes: [1],
      rowSizes: [1],
      maximizedSessionId: null
    }
  }
  const spec = PRESETS[preset] ?? PRESETS['1']
  return {
    preset,
    slots: Array.from({ length: spec.count }, () => null),
    overflow: [],
    colSizes: Array.from({ length: spec.cols }, () => 1),
    rowSizes: Array.from({ length: spec.rows }, () => 1),
    maximizedSessionId: null
  }
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

export function normalizeLayout(layout: LayoutState, sessionIds: string[]): LayoutState {
  const alive = new Set(sessionIds)
  const ordered = unique([
    ...layout.slots.filter((id): id is string => !!id),
    ...layout.overflow
  ]).filter((id) => alive.has(id))
  const missing = sessionIds.filter((id) => !ordered.includes(id))
  const all = [...ordered, ...missing]
  const maximized =
    layout.maximizedSessionId && alive.has(layout.maximizedSessionId)
      ? layout.maximizedSessionId
      : null

  if (layout.preset === 'auto') {
    const effective = autoPresetForCount(all.length)
    const spec = PRESETS[effective]
    return {
      preset: 'auto',
      slots: all,
      overflow: [],
      colSizes: resizeWeights(layout.colSizes, spec.cols),
      rowSizes: resizeWeights(layout.rowSizes, spec.rows),
      maximizedSessionId: maximized
    }
  }

  const spec = PRESETS[layout.preset as Exclude<PresetId, 'auto'>] ?? PRESETS['1']
  const slots: (string | null)[] = Array.from({ length: spec.count }, (_, i) => all[i] ?? null)
  const overflow = all.slice(spec.count)
  const colSizes = resizeWeights(layout.colSizes, spec.cols)
  const rowSizes = resizeWeights(layout.rowSizes, spec.rows)
  return {
    preset: spec.id,
    slots,
    overflow,
    colSizes,
    rowSizes,
    maximizedSessionId: maximized
  }
}

function resizeWeights(current: number[], length: number): number[] {
  const next = current.slice(0, length).map((n) => (Number.isFinite(n) && n > 0 ? n : 1))
  while (next.length < length) next.push(1)
  return next
}

export function setPreset(layout: LayoutState, preset: PresetId, sessionIds: string[]): LayoutState {
  return normalizeLayout({ ...layout, preset }, sessionIds)
}

export function placeSession(layout: LayoutState, sessionId: string, sessionIds: string[]): LayoutState {
  return focusSessionInLayout(layout, sessionId, sessionIds)
}

export function focusSessionInLayout(layout: LayoutState, sessionId: string, sessionIds: string[]): LayoutState {
  if (layout.preset === 'auto') {
    return normalizeLayout(layout, sessionIds)
  }
  let normalized = normalizeLayout(layout, sessionIds)
  if (normalized.slots.includes(sessionId)) {
    return { ...normalized, maximizedSessionId: null }
  }

  // If all current slots are full and we can expand, auto-expand to next preset
  const emptyInCurrent = normalized.slots.findIndex((id) => id === null)
  if (emptyInCurrent < 0 && normalized.preset !== '8') {
    const nextPreset = NEXT_PRESET[normalized.preset]
    normalized = normalizeLayout({ ...normalized, preset: nextPreset }, sessionIds)
    if (normalized.slots.includes(sessionId)) {
      return { ...normalized, maximizedSessionId: null }
    }
  }

  const slots = [...normalized.slots]
  const empty = slots.findIndex((id) => id === null)
  if (empty >= 0) {
    slots[empty] = sessionId
    return {
      ...normalized,
      slots,
      maximizedSessionId: null
    }
  }

  const displaced = slots[0]
  slots[0] = sessionId
  const overflow = unique([displaced, ...normalized.overflow].filter((id): id is string => !!id && id !== sessionId))
  return {
    ...normalized,
    slots,
    overflow,
    maximizedSessionId: null
  }
}

export function removeSessionFromLayout(layout: LayoutState, sessionId: string, sessionIds: string[]): LayoutState {
  const remaining = sessionIds.filter((id) => id !== sessionId)
  return normalizeLayout(layout, remaining)
}

export function toggleMaximize(layout: LayoutState, sessionId: string): LayoutState {
  return {
    ...layout,
    maximizedSessionId: layout.maximizedSessionId === sessionId ? null : sessionId
  }
}
