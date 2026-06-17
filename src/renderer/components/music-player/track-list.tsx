import { useEffect } from 'react'
import type { RefObject } from 'react'

import type { PlayerQueueItem, PlayerSource } from '../../../shared/types'

interface TrackListProps {
  currentItem: PlayerQueueItem | null
  isPlaying: boolean
  items: PlayerQueueItem[]
  onSelectItem: (item: PlayerQueueItem) => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  source: PlayerSource
}

function formatDuration(seconds: number | null, source: PlayerSource): string {
  if (source.isLive) {
    return 'live'
  }

  if (seconds === null) {
    return '--:--'
  }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getFilePermissions(index: number): string {
  const permissions = ['-rw-r--r--', '-rwxr-xr-x', '-rw-rw-r--']

  return permissions[index % permissions.length]
}

export function TrackList({
  currentItem,
  isPlaying,
  items,
  onSelectItem,
  scrollContainerRef,
  source,
}: TrackListProps) {
  useEffect(() => {
    const container = scrollContainerRef?.current

    if (!container || !currentItem) {
      return
    }

    const activeElement = container.querySelector('[data-player-active="true"]')

    activeElement?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [currentItem, items, scrollContainerRef])

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">{source.locationLabel}</span>{' '}
          <span className="text-terminal-yellow">{source.label}</span>{' '}
          <span className="text-terminal-white">{source.listCommand}</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        <span className="col-span-1">#</span>
        <span className="col-span-2">{source.contextLabel}</span>
        <span className="col-span-4">{source.itemLabel}</span>
        <span className="col-span-3">{source.creatorLabel}</span>
        <span className="col-span-2 text-right">{source.timeLabel}</span>
      </div>

      <div
        className="custom-scrollbar flex-1 overflow-y-auto"
        ref={scrollContainerRef}
      >
        {items.length === 0 && (
          <div className="space-y-2 px-4 py-6 font-mono text-xs">
            <div className="text-terminal-yellow">{source.emptyTitle}</div>
            <div className="text-terminal-gray">{source.emptyHint}</div>
          </div>
        )}

        {items.map((item, index) => {
          const isActive = currentItem?.id === item.id
          const isCurrentlyPlaying = isActive && isPlaying

          return (
            <button
              className={`grid w-full grid-cols-12 items-center gap-2 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-terminal-green/10 text-terminal-green'
                  : 'text-terminal-white hover:bg-muted/50'
              }`}
              data-player-active={isActive ? 'true' : undefined}
              key={item.id}
              onClick={() => onSelectItem(item)}
              type="button"
            >
              <span className="col-span-1 text-terminal-gray">
                {isCurrentlyPlaying ? (
                  <span className="animate-pulse text-terminal-green">▶</span>
                ) : isActive ? (
                  <span className="text-terminal-yellow">▐▐</span>
                ) : (
                  index + 1
                )}
              </span>
              <span className="col-span-2 text-[10px] text-terminal-gray">
                {item.sourceDetail ?? getFilePermissions(index)}
              </span>
              <span
                className={`col-span-4 truncate ${
                  isActive ? 'text-terminal-cyan' : 'text-terminal-white'
                }`}
              >
                {item.title}
              </span>
              <span className="col-span-3 truncate text-terminal-magenta">
                {item.artist}
              </span>
              <span className="col-span-2 text-right text-terminal-yellow">
                {formatDuration(item.duration, source)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
