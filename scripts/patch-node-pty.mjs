import fs from 'node:fs'
import path from 'node:path'

const files = [
  path.resolve('node_modules/node-pty/binding.gyp'),
  path.resolve('node_modules/node-pty/deps/winpty/src/winpty.gyp')
]

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8')
    if (content.includes("'SpectreMitigation': 'Spectre'")) {
      content = content.replace(/'SpectreMitigation': 'Spectre'/g, "'SpectreMitigation': 'false'")
      fs.writeFileSync(file, content, 'utf8')
      console.log(`[patch-node-pty] Patched SpectreMitigation in ${file}`)
    }
  }
}

// Copy modern conpty binaries to build/Release/conpty so useConptyDll: true works out of the box
try {
  const prebuildConpty = path.resolve('node_modules/node-pty/prebuilds/win32-x64/conpty')
  const releaseConpty = path.resolve('node_modules/node-pty/build/Release/conpty')
  if (fs.existsSync(prebuildConpty)) {
    if (!fs.existsSync(releaseConpty)) {
      fs.mkdirSync(releaseConpty, { recursive: true })
    }
    for (const item of fs.readdirSync(prebuildConpty)) {
      const srcFile = path.join(prebuildConpty, item)
      const dstFile = path.join(releaseConpty, item)
      if (!fs.existsSync(dstFile)) {
        fs.copyFileSync(srcFile, dstFile)
        console.log(`[patch-node-pty] Copied ${item} to ${releaseConpty}`)
      }
    }
  }
} catch (e) {
  console.warn('[patch-node-pty] Failed to copy conpty prebuilds:', e)
}
