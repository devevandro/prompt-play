import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

import {
  formatRadioMetadata,
  formatRelativeTime,
} from 'renderer/lib/radio-metadata'
import type { RadioHistoryEntry } from 'shared/types'

export function RadioHistoryTab({
  entries,
  scrollContainerRef,
}: {
  entries: RadioHistoryEntry[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">~/radio</span>{' '}
          <span className="text-terminal-white">cat radio_history.txt</span>
        </div>
      </div>

      <div
        className="custom-scrollbar flex-1 overflow-y-auto px-4 pb-4 font-mono"
        ref={scrollContainerRef}
      >
        {entries.length === 0 ? (
          <div className="py-4 text-terminal-gray text-xs">
            no songs heard in this session
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div className="text-xs" key={entry.id}>
                <div className="text-terminal-gray">
                  {String(index + 1).padStart(2, '0')} · {entry.radioName}
                </div>
                <div className="mt-1 text-terminal-white">
                  {formatRadioMetadata(entry.title, entry.subtitle)}
                </div>
                <div className="mt-1 text-terminal-yellow">
                  updated: {formatRelativeTime(entry.updatedAt, now)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-muted/30 px-4 py-2 text-center font-mono text-[10px] text-terminal-gray">
        <kbd className="text-terminal-cyan">↑/↓</kbd> scroll
      </div>
    </div>
  )
}
