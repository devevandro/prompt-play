import { contextBridge, ipcRenderer } from 'electron'

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
  sayHelloFromBridge: () => console.log('\nHello from bridgeAPI! 👋\n\n'),
  username: process.env.USER,
}

contextBridge.exposeInMainWorld('App', API)
