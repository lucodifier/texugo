import { createRequire } from 'node:module'
import { execSync } from 'node:child_process'
import './patch-node-pty.mjs'

const require = createRequire(import.meta.url)

try {
  require('node-pty')
  // Loaded successfully for current Node runtime
} catch (err) {
  console.log('[ensure-node-pty] node-pty not compatible with current Node. Rebuilding for Node...')
  try {
    execSync('npm run rebuild:node', { stdio: 'inherit' })
    console.log('[ensure-node-pty] Rebuilt successfully.')
  } catch (rebuildErr) {
    console.error('[ensure-node-pty] Rebuild failed:', rebuildErr)
    process.exit(1)
  }
}
