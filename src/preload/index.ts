import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

import type {
  AppStorageKey,
  AppStorageRequest,
  MusicLibrary,
} from 'shared/types'

declare global {
  interface Window {
    App: typeof API
  }
}

function getUsername() {
  return process.env.USER || process.env.USERNAME || null
}

function getHomePath() {
  const username = getUsername()

  if (process.env.HOME) {
    return process.env.HOME
  }

  if (process.env.USERPROFILE) {
    return process.env.USERPROFILE
  }

  if (username && process.platform === 'win32') {
    return `C:\\Users\\${username}`
  }

  if (username) {
    return `/Users/${username}`
  }

  return '~'
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
  getStorageValue: <T>(key: AppStorageKey) =>
    ipcRenderer.invoke('storage:get', key) as Promise<T | null>,
  setStorageValue: <T>(key: AppStorageKey, value: T) =>
    ipcRenderer.invoke('storage:set', {
      key,
      value,
    } satisfies AppStorageRequest<T>) as Promise<void>,
  removeStorageValue: (key: AppStorageKey) =>
    ipcRenderer.invoke('storage:remove', key) as Promise<void>,
  clearStorage: () => ipcRenderer.invoke('storage:clear') as Promise<void>,
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
  homePath: getHomePath(),
  username: getUsername(),
}

contextBridge.exposeInMainWorld('App', API)
