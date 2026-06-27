import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'

import { scanMusicFolder } from 'main/audio/music-scanner'
import { checkStreamUrl } from 'main/radio/check-stream'
import { searchBrazilianRadios } from 'main/radio/radio-browser'
import {
  startRadioMetadataMonitor,
  stopRadioMetadataMonitor,
} from 'main/radio/radio-metadata'
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

  ipcMain.handle('radio:search', (_event, term: string) =>
    searchBrazilianRadios(term)
  )

  ipcMain.handle('browser:open-external', (_event, url: string) =>
    shell.openExternal(url)
  )

  ipcMain.on(
    'radio:metadata:start',
    (
      event,
      request: { radioId: string; radioName: string; url: string }
    ) => {
      startRadioMetadataMonitor(
        event.sender,
        request.radioId,
        request.url,
        request.radioName
      )
    }
  )

  ipcMain.on('radio:metadata:stop', event => {
    stopRadioMetadataMonitor(event.sender.id)
  })

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
