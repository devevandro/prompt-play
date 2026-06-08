import { Terminal } from 'lucide-react'

import type { PlayerQueueItem, PlayerSource } from '../../../shared/types'

interface StatusFooterProps {
  activeTab: string
  currentItem: PlayerQueueItem | null
  isPlaying: boolean
  items: PlayerQueueItem[]
  source: PlayerSource
  volume: number
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function StatusFooter({
  activeTab,
  currentItem,
  isPlaying,
  items,
  source,
  volume,
}: StatusFooterProps) {
  const totalDuration = items.reduce(
    (acc, item) => acc + (item.duration ?? 0),
    0
  )
  const sourceStatus = `${source.label} ${items.length} items`

  const statusByTab: Record<string, string> = {
    tracks: source.isLive
      ? `${sourceStatus} live streaming`
      : `${sourceStatus} total duration ${formatDuration(totalDuration)}`,
    'now-playing': currentItem
      ? `${source.itemLabel}: ${isPlaying ? 'playing' : 'paused'}`
      : `${source.itemLabel}: waiting for selection`,
    visualizer: `${source.label} fft: 48 bands sr: 44.1khz 16bit`,
    controls: 'player-controls ready',
    'radio-list': 'radio list open, press :q to close',
    'music-list': 'music lists open, press :q to close',
    help: 'help open, press :q to close',
  }

  return (
    <footer className="flex h-5 shrink-0 items-center justify-between bg-[#1b3a24] px-3 font-mono text-[11px] text-terminal-cyan">
      <div className="flex min-w-0 items-center gap-2">
        <Terminal className="h-3 w-3 shrink-0" />
        <span className="truncate">{statusByTab[activeTab]}</span>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span>{source.mode}</span>
        <span>vol: {Math.round(volume * 100)}%</span>
      </div>
    </footer>
  )
}
