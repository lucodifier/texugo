import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import './patch-node-pty.mjs'

const ptyRelease = path.resolve('node_modules/node-pty/build/Release/conpty.node')

if (!fs.existsSync(ptyRelease)) {
  console.log('[ensure-electron-pty] Building node-pty for Electron...')
  try {
    execSync('npx electron-rebuild -f -w node-pty', { stdio: 'inherit' })
  } catch (err) {
    console.error('[ensure-electron-pty] Rebuild failed:', err)
  }
} else {
  console.log('[ensure-electron-pty] node-pty binary already exists.')
}
