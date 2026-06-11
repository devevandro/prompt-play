import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import type { OpenDialogOptions } from 'electron'

import { scanMusicFolder } from 'main/audio/music-scanner'
import { checkStreamUrl } from 'main/radio/check-stream'
import {
  clearStoredValues,
  getStoredValue,
  removeStoredValue,
  setStoredValue,
} from 'main/storage/app-storage'
import type { AppStorageKey, AppStorageRequest } from 'shared/types'

export function registerPlayerIpc() {
  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('storage:get', (_event, key: AppStorageKey) =>
    getStoredValue(key)
  )

  ipcMain.handle('storage:set', (_event, request: AppStorageRequest) =>
    setStoredValue(request)
  )

  ipcMain.handle('storage:remove', (_event, key: AppStorageKey) =>
    removeStoredValue(key)
  )

  ipcMain.handle('storage:clear', () => clearStoredValues())

  ipcMain.handle('radio:check-stream', (_event, url: string) =>
    checkStreamUrl(url)
  )

  ipcMain.handle('music:scan-folder', (_event, folderPath: string) =>
    scanMusicFolder(folderPath)
  )

  ipcMain.handle('music:select-folder', async event => {
    const window = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const dialogOptions: OpenDialogOptions = {
      properties: ['openDirectory'],
      title: 'Select music folder',
    }
    const result = window
      ? await dialog.showOpenDialog(window, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)

    if (result.canceled || !result.filePaths[0]) {
      return null
    }

    return scanMusicFolder(result.filePaths[0])
  })
}
