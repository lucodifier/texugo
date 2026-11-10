import type { LayoutState, PresetId } from './types'

export interface PresetSpec {
  id: PresetId
  label: string
  cols: number
  rows: number
  count: number
}

export const PRESETS: Record<PresetId, PresetSpec> = {
  '1': { id: '1', label: '1 painel', cols: 1, rows: 1, count: 1 },
  '2h': { id: '2h', label: '2 horizontais', cols: 1, rows: 2, count: 2 },
  '2v': { id: '2v', label: '2 verticais', cols: 2, rows: 1, count: 2 },
  '4': { id: '4', label: '4 painéis', cols: 2, rows: 2, count: 4 },
  '6': { id: '6', label: '6 painéis', cols: 3, rows: 2, count: 6 },
  '8': { id: '8', label: '8 painéis', cols: 4, rows: 2, count: 8 }
}

export function emptyLayout(preset: PresetId = '1'): LayoutState {
  const spec = PRESETS[preset]
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
  const spec = PRESETS[layout.preset] ?? PRESETS['1']
  const alive = new Set(sessionIds)
  const ordered = unique([
    ...layout.slots.filter((id): id is string => !!id),
    ...layout.overflow
  ]).filter((id) => alive.has(id))
  const missing = sessionIds.filter((id) => !ordered.includes(id))
  const all = [...ordered, ...missing]
  const slots: (string | null)[] = Array.from({ length: spec.count }, (_, i) => all[i] ?? null)
  const overflow = all.slice(spec.count)
  const colSizes = resizeWeights(layout.colSizes, spec.cols)
  const rowSizes = resizeWeights(layout.rowSizes, spec.rows)
  const maximized =
    layout.maximizedSessionId && alive.has(layout.maximizedSessionId)
      ? layout.maximizedSessionId
      : null
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
  const base = normalizeLayout(layout, sessionIds.filter((id) => id !== sessionId).concat(sessionId))
  const without = unique(
    [...base.slots.filter((id): id is string => !!id && id !== sessionId), ...base.overflow.filter((id) => id !== sessionId)]
  )
  const emptyIndex = base.slots.findIndex((id) => id === null || id === sessionId)
  const slots = base.slots.map((id) => (id === sessionId ? null : id))
  if (emptyIndex >= 0) slots[emptyIndex] = sessionId
  const overflow = unique([...slots.filter((id): id is string => !!id), sessionId, ...without]).filter(
    (id) => !slots.includes(id)
  )
  const placed = slots.includes(sessionId)
  return normalizeLayout(
    {
      ...base,
      slots: placed ? slots : base.slots,
      overflow: placed ? overflow : [sessionId, ...base.overflow.filter((id) => id !== sessionId)]
    },
    sessionIds.includes(sessionId) ? sessionIds : [...sessionIds, sessionId]
  )
}

export function focusSessionInLayout(layout: LayoutState, sessionId: string, sessionIds: string[]): LayoutState {
  const normalized = normalizeLayout(layout, sessionIds)
  if (normalized.slots.includes(sessionId)) {
    return { ...normalized, maximizedSessionId: normalized.maximizedSessionId }
  }
  const slots = [...normalized.slots]
  const empty = slots.findIndex((id) => id === null)
  if (empty >= 0) {
    slots[empty] = sessionId
  } else if (slots.length > 0) {
    const displaced = slots[0]
    slots[0] = sessionId
    const overflow = unique([displaced, ...normalized.overflow].filter((id): id is string => !!id && id !== sessionId))
    return normalizeLayout({ ...normalized, slots, overflow }, sessionIds)
  }
  return normalizeLayout({ ...normalized, slots }, sessionIds)
}

export function removeSessionFromLayout(layout: LayoutState, sessionId: string, sessionIds: string[]): LayoutState {
  return normalizeLayout(layout, sessionIds.filter((id) => id !== sessionId))
}

export function toggleMaximize(layout: LayoutState, sessionId: string): LayoutState {
  return {
    ...layout,
    maximizedSessionId: layout.maximizedSessionId === sessionId ? null : sessionId
  }
}
