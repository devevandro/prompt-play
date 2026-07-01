import type {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  IpcMainInvokeEvent,
} from 'electron'

export type BrowserWindowOrNull = BrowserWindow | null

export interface WindowProps extends BrowserWindowConstructorOptions {
  id: 'main' | 'about'
}

export interface WindowCreationByIPC {
  channel: string
  window?: () => BrowserWindowOrNull
  callback?: (window: BrowserWindow, event: IpcMainInvokeEvent) => void
}

export type PlayerSourceMode = 'local' | 'radio'

export interface PlayerSource {
  mode: PlayerSourceMode
  label: string
  description: string
  locationLabel: string
  listCommand: string
  itemLabel: string
  creatorLabel: string
  contextLabel: string
  timeLabel: string
  emptyTitle: string
  emptyHint: string
  isLive: boolean
  supportsSeek: boolean
}

export interface PlayerQueueItem {
  id: string
  mode: PlayerSourceMode
  title: string
  artist: string
  album?: string
  duration: number | null
  src: string
  sourceDetail?: string
  details?: {
    label: string
    value: string
  }[]
}

export interface Track extends PlayerQueueItem {
  mode: 'local'
  album: string
  duration: number
}

export interface Radio {
  id: string
  name: string
  img?: string
  state: string
  region?: string
  city: string
  frequency: string
  url: string
  tags?: string
  homepage?: string
}

export interface RadioMetadata {
  isMusic: boolean
  radioId: string
  title: string
  subtitle?: string
}

export interface RadioHistoryEntry extends RadioMetadata {
  id: string
  radioName: string
  updatedAt: number
}

export interface MusicLibrary {
  id: string
  name: string
  path: string
  musicCount: number
  items: PlayerQueueItem[]
}

export type AppStorageKey =
  | 'prompt-play-theme'
  | 'prompt-play-music-libraries'
  | 'prompt-play-radios'
  | 'prompt-play-radio-pins'
  | 'prompt-play-settings'

export interface AppSettings {
  radioStaticEnabled: boolean
}

export interface AppStorageRequest<T = unknown> {
  key: AppStorageKey
  value?: T
}
