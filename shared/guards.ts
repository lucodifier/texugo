import type { DataPacket, StatusPacket } from './types'

export function isDataPacket(value: unknown): value is DataPacket {
  if (!value || typeof value !== 'object') return false
  const packet = value as DataPacket
  return typeof packet.sessionId === 'string' && typeof packet.data === 'string' && Number.isInteger(packet.seq)
}

export function isStatusPacket(value: unknown): value is StatusPacket {
  if (!value || typeof value !== 'object') return false
  const packet = value as StatusPacket
  return typeof packet.sessionId === 'string' && typeof packet.status === 'string'
}
