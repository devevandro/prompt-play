import type { PlayerSourceMode } from 'shared/types'

export function generateProgressBar(progress: number, width = 30): string {
  const filled = Math.floor((progress / 100) * width)
  const empty = width - filled

  return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}] ${progress}%`
}

export function normalizeAudioSrc(src: string): string {
  if (
    /^(file|https?|local-audio):\/\//.test(src) ||
    src.startsWith('/assets/')
  ) {
    return src
  }

  if (src.startsWith('/')) {
    const encodedPath = src.split('/').map(encodeURIComponent).join('/')

    return `local-audio://file${encodedPath}`
  }

  return src
}

export function getPlaybackErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    return error.name
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'unknown error'
}

export function isExpectedPlaybackAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function clampVolumePercent(volumePercent: number): number {
  return Math.max(0, Math.min(100, volumePercent))
}

export function getRandomQueueIndex(
  itemCount: number,
  currentIndex: number
): number {
  if (itemCount <= 1) {
    return 0
  }

  let nextIndex = currentIndex

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * itemCount)
  }

  return nextIndex
}

export function normalizeCommand(command: string): string {
  return command
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getSourceCommandMode(
  cmd: string,
  pathCommandSource: string | undefined
): PlayerSourceMode | null {
  if (
    cmd === 'music' ||
    cmd === 'music config' ||
    cmd === 'music list' ||
    pathCommandSource === 'music'
  ) {
    return 'local'
  }

  if (
    cmd === 'radio' ||
    cmd === 'fm' ||
    cmd === 'radio list' ||
    cmd === 'ls -ra' ||
    pathCommandSource === 'radio'
  ) {
    return 'radio'
  }

  if (
    cmd === 'yt list' ||
    cmd === 'yt auth' ||
    cmd === 'yt auth clear' ||
    cmd.startsWith('yt add ')
  ) {
    return 'yt'
  }

  return null
}

export function sourceCommandLabel(mode: PlayerSourceMode): string {
  if (mode === 'local') {
    return 'music'
  }

  return mode
}
