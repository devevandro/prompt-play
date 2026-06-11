import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { useYouTubeIframePlayer } from 'renderer/hooks/use-youtube-iframe-player'
import type { PlayerQueueItem, PlayerSource } from '../../../shared/types'

interface PlayerControlsProps {
  currentItem: PlayerQueueItem | null
  isPlaying: boolean
  currentTime: number
  duration: number
  isRepeatEnabled: boolean
  isShuffleEnabled: boolean
  volume: number
  source: PlayerSource
  onTogglePlay: () => void
  onNext: () => void
  onEnded?: () => void
  onPrev: () => void
  onToggleRepeat: () => void
  onToggleShuffle: () => void
  onSeek: (time: number) => void
  onToggleMute: () => void
  onVolumeChange: (volume: number) => void
}

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds)) {
    return '0:00'
  }

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlayerControls({
  currentItem,
  isPlaying,
  currentTime,
  duration,
  isRepeatEnabled,
  isShuffleEnabled,
  volume,
  source,
  onTogglePlay,
  onNext,
  onEnded,
  onPrev,
  onToggleRepeat,
  onToggleShuffle,
  onSeek,
  onToggleMute,
  onVolumeChange,
}: PlayerControlsProps) {
  const canSkip = source.mode !== 'yt'
  const canSeek = source.supportsSeek && duration > 0
  const progress = canSeek ? (currentTime / duration) * 100 : 0
  const { containerRef, hasVideo, seekTo } = useYouTubeIframePlayer({
    currentItem,
    isPlaying,
    onEnded,
    sourceMode: source.mode,
    volume,
  })

  const handleProgressClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!canSeek) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const percentage = (event.clientX - rect.left) / rect.width

    if (source.mode === 'yt') {
      seekTo(percentage * duration)
    }

    onSeek(percentage * duration)
  }

  const handleVolumeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const percentage = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    )

    onVolumeChange(percentage)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">{source.locationLabel}</span>{' '}
          <span className="text-terminal-white">./player-controls</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center space-y-6 p-6">
        {source.mode === 'yt' && (
          <div className="mx-auto aspect-video w-full max-w-xl overflow-hidden rounded bg-muted">
            {hasVideo ? (
              <div
                className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full"
                ref={containerRef}
              />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-terminal-gray text-xs">
                {source.emptyHint}
              </div>
            )}
          </div>
        )}

        <div className="mx-auto w-full max-w-xl text-center font-mono">
          <div className="truncate text-terminal-cyan text-sm">
            {currentItem?.title ?? source.emptyTitle}
          </div>
          <div className="mt-1 truncate text-terminal-gray text-xs">
            {currentItem
              ? `${source.creatorLabel}: ${currentItem.artist}`
              : source.emptyHint}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            aria-label="Shuffle playback"
            aria-pressed={isShuffleEnabled}
            className={`p-2 transition-colors hover:text-terminal-cyan ${
              isShuffleEnabled ? 'text-terminal-cyan' : 'text-terminal-gray'
            } cursor-pointer`}
            onClick={onToggleShuffle}
            type="button"
          >
            <Shuffle className="h-5 w-5" />
          </button>

          {canSkip && (
            <button
              aria-label="Previous item"
              className="rounded bg-muted/50 p-3 text-terminal-white transition-colors hover:bg-terminal-cyan/10 hover:text-terminal-cyan cursor-pointer"
              onClick={onPrev}
              type="button"
            >
              <SkipBack className="h-6 w-6" />
            </button>
          )}

          <button
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="rounded-full bg-terminal-green p-5 text-background transition-colors hover:bg-terminal-cyan cursor-pointer"
            onClick={onTogglePlay}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </button>

          {canSkip && (
            <button
              aria-label="Next item"
              className="rounded bg-muted/50 p-3 text-terminal-white transition-colors hover:bg-terminal-cyan/10 hover:text-terminal-cyan cursor-pointer"
              onClick={onNext}
              type="button"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          )}

          <button
            aria-label="Repeat current item"
            aria-pressed={isRepeatEnabled}
            className={`p-2 transition-colors hover:text-terminal-cyan ${
              isRepeatEnabled ? 'text-terminal-cyan' : 'text-terminal-gray'
            } cursor-pointer`}
            onClick={onToggleRepeat}
            type="button"
          >
            <Repeat className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-4">
          <button
            aria-disabled={!canSeek}
            aria-label="Adjust progress"
            className={`group h-2 w-full rounded bg-muted ${
              canSeek ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={handleProgressClick}
            type="button"
          >
            <div
              className="h-full rounded bg-terminal-green transition-all group-hover:bg-terminal-cyan"
              style={{ width: `${progress}%` }}
            />
          </button>

          <div className="flex justify-between font-mono text-terminal-gray text-xs">
            <span>{canSeek ? formatTime(currentTime) : 'live'}</span>
            <span>{canSeek ? formatTime(duration) : source.label}</span>
          </div>

          <div className="text-center font-mono text-[11px] text-terminal-gray">
            {canSeek
              ? `[${'\u2588'.repeat(Math.floor(progress / 5))}${'\u2591'.repeat(
                  20 - Math.floor(progress / 5)
                )}] ${Math.floor(progress)}%`
              : `[${'\u2588'.repeat(20)}] streaming`}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-4">
          <button
            aria-label={volume > 0 ? 'Mute' : 'Unmute'}
            className="p-1 text-terminal-gray transition-colors hover:text-terminal-white cursor-pointer"
            onClick={onToggleMute}
            type="button"
          >
            {volume > 0 ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          <button
            aria-label="Adjust volume"
            className="group h-2 w-32 cursor-pointer rounded bg-muted"
            onClick={handleVolumeClick}
            type="button"
          >
            <div
              className="h-full rounded bg-terminal-yellow transition-all group-hover:bg-terminal-cyan cursor-pointer"
              style={{ width: `${volume * 100}%` }}
            />
          </button>

          <span className="w-10 font-mono text-terminal-gray text-xs">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 bg-muted/30 px-4 py-2 font-mono text-[10px] text-terminal-gray">
        <span>
          <kbd className="text-terminal-cyan">space</kbd> play/pause
        </span>
        <span>
          <kbd className="text-terminal-cyan">←/→</kbd>{' '}
          {source.supportsSeek ? 'seek' : 'stream'}
        </span>
        <span>
          <kbd className="text-terminal-cyan">↑/↓</kbd> volume
        </span>
        {canSkip ? (
          <span>
            <kbd className="text-terminal-cyan">n/p</kbd> next/prev
          </span>
        ) : (
          <span>
            <kbd className="text-terminal-cyan">play #</kbd> select video
          </span>
        )}
      </div>
    </div>
  )
}
