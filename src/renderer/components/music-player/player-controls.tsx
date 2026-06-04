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

interface PlayerControlsProps {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (time: number) => void
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
  isPlaying,
  currentTime,
  duration,
  volume,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
}: PlayerControlsProps) {
  const progress = duration ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const percentage = (event.clientX - rect.left) / rect.width

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
          <span className="text-terminal-cyan">~/music</span>{' '}
          <span className="text-terminal-white">./player-controls</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center space-y-8 p-6">
        <div className="flex items-center justify-center gap-4">
          <button
            aria-label="Shuffle"
            className="p-2 text-terminal-gray transition-colors hover:text-terminal-cyan"
            type="button"
          >
            <Shuffle className="h-5 w-5" />
          </button>

          <button
            aria-label="Faixa anterior"
            className="rounded bg-muted/50 p-3 text-terminal-white transition-colors hover:bg-terminal-cyan/10 hover:text-terminal-cyan"
            onClick={onPrev}
            type="button"
          >
            <SkipBack className="h-6 w-6" />
          </button>

          <button
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            className="rounded-full bg-terminal-green p-5 text-background transition-colors hover:bg-terminal-cyan"
            onClick={onTogglePlay}
            type="button"
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8" />
            )}
          </button>

          <button
            aria-label="Próxima faixa"
            className="rounded bg-muted/50 p-3 text-terminal-white transition-colors hover:bg-terminal-cyan/10 hover:text-terminal-cyan"
            onClick={onNext}
            type="button"
          >
            <SkipForward className="h-6 w-6" />
          </button>

          <button
            aria-label="Repetir"
            className="p-2 text-terminal-gray transition-colors hover:text-terminal-cyan"
            type="button"
          >
            <Repeat className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 px-4">
          <button
            aria-label="Ajustar progresso"
            className="group h-2 w-full cursor-pointer rounded bg-muted"
            onClick={handleProgressClick}
            type="button"
          >
            <div
              className="h-full rounded bg-terminal-green transition-all group-hover:bg-terminal-cyan"
              style={{ width: `${progress}%` }}
            />
          </button>

          <div className="flex justify-between font-mono text-terminal-gray text-xs">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="text-center font-mono text-[11px] text-terminal-gray">
            [{'\u2588'.repeat(Math.floor(progress / 5))}
            {'\u2591'.repeat(20 - Math.floor(progress / 5))}]{' '}
            {Math.floor(progress)}%
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-4">
          <button
            aria-label={volume > 0 ? 'Silenciar' : 'Ativar som'}
            className="p-1 text-terminal-gray transition-colors hover:text-terminal-white"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.7)}
            type="button"
          >
            {volume > 0 ? (
              <Volume2 className="h-5 w-5" />
            ) : (
              <VolumeX className="h-5 w-5" />
            )}
          </button>

          <button
            aria-label="Ajustar volume"
            className="group h-2 w-32 cursor-pointer rounded bg-muted"
            onClick={handleVolumeClick}
            type="button"
          >
            <div
              className="h-full rounded bg-terminal-yellow transition-all group-hover:bg-terminal-cyan"
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
          <kbd className="text-terminal-cyan">←/→</kbd> seek
        </span>
        <span>
          <kbd className="text-terminal-cyan">↑/↓</kbd> volume
        </span>
        <span>
          <kbd className="text-terminal-cyan">n/p</kbd> next/prev
        </span>
      </div>
    </div>
  )
}
