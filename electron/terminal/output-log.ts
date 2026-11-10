import fs from 'node:fs'
import path from 'node:path'

export interface OutputLog {
  append(data: string): void
  read(maxBytes: number): { text: string; truncated: boolean }
  bytesWritten(): number
  close(): void
}

/**
 * Grava a saída no disco antes de devolver o controle.
 * O processo não depende do renderer estar pintando o xterm.
 */
export function createOutputLog(file: string): OutputLog {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const fd = fs.openSync(file, 'a')
  let bytes = 0
  try {
    bytes = fs.statSync(file).size
  } catch {
    bytes = 0
  }
  return {
    append(data: string) {
      const buffer = Buffer.from(data, 'utf8')
      fs.writeSync(fd, buffer)
      bytes += buffer.length
    },
    read(maxBytes: number) {
      return readTail(file, maxBytes)
    },
    bytesWritten() {
      return bytes
    },
    close() {
      fs.closeSync(fd)
    }
  }
}

export function readTail(file: string, maxBytes: number): { text: string; truncated: boolean } {
  if (!fs.existsSync(file)) return { text: '', truncated: false }
  const size = fs.statSync(file).size
  if (size === 0) return { text: '', truncated: false }
  if (size <= maxBytes) {
    return { text: fs.readFileSync(file, 'utf8'), truncated: false }
  }
  const fd = fs.openSync(file, 'r')
  try {
    const buffer = Buffer.alloc(maxBytes)
    fs.readSync(fd, buffer, 0, maxBytes, size - maxBytes)
    let text = buffer.toString('utf8')
    const newline = text.indexOf('\n')
    if (newline >= 0) text = text.slice(newline + 1)
    return {
      text: `\r\n[histórico anterior truncado no limite local de ${Math.round(maxBytes / (1024 * 1024))} MB]\r\n${text}`,
      truncated: true
    }
  } finally {
    fs.closeSync(fd)
  }
}
