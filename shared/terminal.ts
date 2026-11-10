/** O viewport está grudado no fim do buffer (xterm: viewportY acompanha baseY). */
export function isAtBottom(viewportY: number, baseY: number): boolean {
  return viewportY >= baseY
}

export function viewportAfterOutput(wasAtBottom: boolean, viewportY: number, baseY: number): number {
  if (wasAtBottom) return baseY
  return Math.min(viewportY, baseY)
}

export function stripAnsi(input: string): string {
  return input
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\u001b[@-_]/g, '')
}

export function lastPlainLine(chunk: string, previous = ''): string {
  const text = stripAnsi(previous + chunk).replace(/\r/g, '')
  const lines = text.split('\n').map((line) => line.trimEnd())
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim()) return lines[i]
  }
  return previous
}

export function attentionFromPattern(pattern: string, line: string): 'idle' | null {
  if (!pattern || !line) return null
  try {
    return new RegExp(pattern).test(line) ? 'idle' : null
  } catch {
    return null
  }
}
