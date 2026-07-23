import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

import type {
  AppStorageKey,
  AppStorageRequest,
  MusicLibrary,
  NowPlayingSnapshot,
  Radio,
  RadioMetadata,
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
  searchRadios: (term: string) =>
    ipcRenderer.invoke('radio:search', term) as Promise<Radio[]>,
  searchRadiosByCountry: (country: string, term: string) =>
    ipcRenderer.invoke('radio:search-country', {
      country,
      term,
    }) as Promise<Radio[]>,
  resolveRadioStreamUrl: (url: string) =>
    ipcRenderer.invoke('radio:resolve-stream-url', url) as Promise<string>,
  exportRadios: (radios: Radio[]) =>
    ipcRenderer.invoke('radio:export', radios) as Promise<string | null>,
  importRadios: () =>
    ipcRenderer.invoke('radio:import') as Promise<Radio[] | null>,
  openExternal: (url: string) =>
    ipcRenderer.invoke('browser:open-external', url) as Promise<void>,
  writeNowPlaying: (snapshot: NowPlayingSnapshot) =>
    ipcRenderer.invoke(
      'player:write-now-playing',
      snapshot
    ) as Promise<string>,
  startRadioMetadata: (radioId: string, url: string, radioName: string) => {
    ipcRenderer.send('radio:metadata:start', { radioId, radioName, url })
  },
  stopRadioMetadata: () => {
    ipcRenderer.send('radio:metadata:stop')
  },
  onRadioMetadata: (callback: (metadata: RadioMetadata) => void) => {
    const listener = (_event: IpcRendererEvent, metadata: RadioMetadata) => {
      callback(metadata)
    }

    ipcRenderer.on('radio:metadata', listener)

    return () => {
      ipcRenderer.removeListener('radio:metadata', listener)
    }
  },
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
