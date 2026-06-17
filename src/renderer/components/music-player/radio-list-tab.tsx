import { useEffect } from 'react'
import type { RefObject } from 'react'

import type { RadioStreamStatus } from 'renderer/hooks/use-radio-source'
import type { PlayerQueueItem } from 'shared/types'

export function RadioListTab({
  currentItem,
  isPlaying,
  items,
  onSelectItem,
  radioStatuses,
  scrollContainerRef,
}: {
  currentItem: PlayerQueueItem | null
  isPlaying: boolean
  items: PlayerQueueItem[]
  onSelectItem: (item: PlayerQueueItem) => void
  radioStatuses: Record<string, RadioStreamStatus>
  scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  useEffect(() => {
    const container = scrollContainerRef.current

    if (!container || !currentItem) {
      return
    }

    const activeElement = container.querySelector('[data-player-active="true"]')

    activeElement?.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [currentItem, scrollContainerRef])

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">~/radio</span>{' '}
          <span className="text-terminal-white">radio list</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        <span className="col-span-1">#</span>
        <span className="col-span-2">freq</span>
        <span className="col-span-4">station</span>
        <span className="col-span-3">city</span>
        <span className="col-span-2 text-right">status</span>
      </div>

      <div
        className="custom-scrollbar flex-1 overflow-y-auto"
        ref={scrollContainerRef}
      >
        {items.map((item, index) => {
          const isActive = currentItem?.id === item.id
          const isCurrentlyPlaying = isActive && isPlaying
          const status = radioStatuses[item.id] ?? 'checking'

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
              <span className="col-span-2 truncate text-[10px] text-terminal-gray">
                {item.sourceDetail}
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
              <span
                className={`col-span-2 text-right ${
                  status === 'live'
                    ? 'text-terminal-yellow'
                    : status === 'checking'
                      ? 'text-terminal-gray'
                      : 'text-terminal-red'
                }`}
              >
                {status}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
