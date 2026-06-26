import type { PlayerSource, PlayerSourceMode } from 'shared/types'

export const PLAYER_SOURCES: Record<PlayerSourceMode, PlayerSource> = {
  local: {
    mode: 'local',
    label: 'local files',
    description: 'Music files on this computer',
    locationLabel: '~/music',
    listCommand: 'ls -la audio/aac *.mp3 *.aac *.wav *.flac *.ogg',
    itemLabel: 'file',
    creatorLabel: 'artist',
    contextLabel: 'perm',
    timeLabel: 'duration',
    emptyTitle: 'no recent musics to listen',
    emptyHint: 'type music -- path pathname to config',
    isLive: false,
    supportsSeek: true,
  },
  radio: {
    mode: 'radio',
    label: 'radio',
    description: 'FM and web radio streams',
    locationLabel: '~/radio',
    listCommand: 'ls -la audio/aac *.mp3 *.aac *.m3u *.pls stream',
    itemLabel: 'station',
    creatorLabel: 'city',
    contextLabel: 'freq',
    timeLabel: 'status',
    emptyTitle: 'No radio selected',
    emptyHint: "Select a radio or use 'source radio' and 'play'",
    isLive: true,
    supportsSeek: false,
  },
}
