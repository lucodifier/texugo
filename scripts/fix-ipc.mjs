import fs from 'node:fs'

let ipcCode = fs.readFileSync('electron/main/ipc.ts', 'utf8')

// Replace dialog handler
const targetDialog = `  handle('dialog:directory', async () => {
    const window = host.getWindow()
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0] ?? null
  })`

const replacementDialog = `  const pickDirHandler = async () => {
    const window = host.getWindow()
    const result = window
      ? await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0] ?? null
  }
  handle('dialog:directory', pickDirHandler)
  handle('dialog:pick-directory', pickDirHandler)`

if (ipcCode.includes(targetDialog)) {
  ipcCode = ipcCode.replace(targetDialog, replacementDialog)
} else {
  // Try CRLF
  const targetCRLF = targetDialog.replace(/\n/g, '\r\n')
  const replacementCRLF = replacementDialog.replace(/\n/g, '\r\n')
  ipcCode = ipcCode.replace(targetCRLF, replacementCRLF)
}

fs.writeFileSync('electron/main/ipc.ts', ipcCode, 'utf8')
console.log('electron/main/ipc.ts patched successfully.')
