import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

import type { MusicLibrary } from 'shared/types'

declare global {
  interface Window {
    App: typeof API
  }
}

const API = {
  checkRadioStream: (url: string) =>
    ipcRenderer.invoke('radio:check-stream', url) as Promise<boolean>,
  scanMusicFolder: (folderPath: string) =>
    ipcRenderer.invoke(
      'music:scan-folder',
      folderPath
    ) as Promise<MusicLibrary>,
  selectMusicFolder: () =>
    ipcRenderer.invoke('music:select-folder') as Promise<MusicLibrary | null>,
  quit: () => ipcRenderer.invoke('app:quit'),
  onMenuCommand: (callback: (command: string) => void) => {
    const listener = (_event: IpcRendererEvent, command: string) => {
      callback(command)
    }

    ipcRenderer.on('menu:command', listener)

    return () => {
      ipcRenderer.removeListener('menu:command', listener)
    }
  },
  username: process.env.USER,
}

contextBridge.exposeInMainWorld('App', API)
