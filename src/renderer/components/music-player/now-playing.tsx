import type { PlayerQueueItem, PlayerSource } from '../../../shared/types'

interface NowPlayingProps {
  item: PlayerQueueItem | null
  isPlaying: boolean
  source: PlayerSource
}

function formatDuration(seconds: number | null, source: PlayerSource): string {
  if (source.isLive) {
    return 'live'
  }

  if (seconds === null) {
    return '--:--'
  }

  return `${Math.floor(seconds / 60)}:${(seconds % 60)
    .toString()
    .padStart(2, '0')}`
}

export function NowPlaying({ item, isPlaying, source }: NowPlayingProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">{source.locationLabel}</span>{' '}
          <span className="text-terminal-white">cat now_playing.txt</span>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 font-mono">
        {!item ? (
          <div className="space-y-2">
            <div className="text-sm text-terminal-red">
              cat: now_playing.txt: {source.emptyTitle}
            </div>
            <div className="mt-4 text-terminal-gray text-xs">
              <span className="text-terminal-cyan"># DICA:</span>{' '}
              {source.emptyHint}
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="text-terminal-gray">---</div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">status:</span>
              <span
                className={
                  isPlaying ? 'text-terminal-green' : 'text-terminal-yellow'
                }
              >
                {isPlaying ? '▶ PLAYING' : '▐▐ PAUSED'}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">
                {source.itemLabel}:
              </span>
              <span className="text-terminal-white">{item.title}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">
                {source.creatorLabel}:
              </span>
              <span className="text-terminal-magenta">{item.artist}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">
                {source.contextLabel}:
              </span>
              <span className="text-terminal-blue">
                {item.sourceDetail ?? item.album ?? source.label}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">
                {source.timeLabel}:
              </span>
              <span className="text-terminal-yellow">
                {formatDuration(item.duration, source)}
              </span>
            </div>
            {item.details?.map(detail => (
              <div className="flex gap-2" key={detail.label}>
                <span className="w-24 text-terminal-cyan">{detail.label}:</span>
                <span className="text-terminal-white">{detail.value}</span>
              </div>
            ))}
            <div className="text-terminal-gray">---</div>
          </div>
        )}
      </div>
    </div>
  )
}
