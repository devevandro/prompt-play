import { useEffect, useMemo, useState } from 'react'

import type { PlayerSource } from '../../../shared/types'

const BAR_COUNT = 48
const ROW_COUNT = 12
const BAR_IDS = Array.from({ length: BAR_COUNT }, (_, index) => `bar-${index}`)
const ROW_IDS = Array.from({ length: ROW_COUNT }, (_, index) => `row-${index}`)
const LEVEL_CHARACTERS = ['░', '▒', '▓', '█'] as const

type VisualizerMode = 'ascii'

interface VisualizerProps {
  isPlaying: boolean
  currentTime: number
  mode: VisualizerMode
  source: PlayerSource
  frequencyData?: Uint8Array
  isAudioConnected?: boolean
}

export function Visualizer({
  isPlaying,
  currentTime,
  mode,
  source,
  frequencyData,
  isAudioConnected = false,
}: VisualizerProps) {
  const [animatedBars, setAnimatedBars] = useState<number[]>(
    Array(BAR_COUNT).fill(5)
  )
  const [visualTime, setVisualTime] = useState(0)

  useEffect(() => {
    if (!isPlaying) {
      setVisualTime(0)
      return
    }

    let frameId = 0
    const startTime = performance.now()

    const tick = (timestamp: number) => {
      setVisualTime((timestamp - startTime) / 1000)
      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => window.cancelAnimationFrame(frameId)
  }, [isPlaying])

  const bars = useMemo(() => {
    const hasFrequencySignal = frequencyData?.some(value => value > 0)

    if (frequencyData && hasFrequencySignal && isAudioConnected) {
      const step = Math.max(1, Math.floor(frequencyData.length / BAR_COUNT))

      return Array.from({ length: BAR_COUNT }, (_, index) => {
        const frequencyIndex = Math.min(index * step, frequencyData.length - 1)
        const value = frequencyData[frequencyIndex] || 0

        return Math.max(5, (value / 255) * 100)
      })
    }

    return Array.from({ length: BAR_COUNT }, (_, index) => {
      if (!isPlaying) {
        return 5
      }

      const time = visualTime * 5.2 + currentTime * 0.18
      const normalizedIndex = index / BAR_COUNT
      const sourcePulse = source.mode === 'radio' ? 0.9 : 0.58
      const bassEnvelope = Math.max(0, 1 - normalizedIndex * 2.5)
      const midEnvelope = Math.sin(normalizedIndex * Math.PI)
      const trebleEnvelope = Math.max(0, normalizedIndex - 0.58)
      const kick = Math.max(0, Math.sin(time * sourcePulse)) * bassEnvelope
      const wave1 = Math.sin(time * 1.7 + index * 0.28) * 0.28
      const wave2 = Math.sin(time * 2.9 + index * 0.61) * 0.18
      const wave3 = Math.cos(time * 1.1 + index * 0.17) * 0.16
      const shimmer =
        Math.max(0, Math.sin(time * 4.4 + index * 0.73)) * trebleEnvelope
      const combined =
        0.16 +
        kick * 0.58 +
        midEnvelope * 0.24 +
        shimmer * 0.52 +
        wave1 +
        wave2 +
        wave3

      return Math.max(6, Math.min(100, combined * 92))
    })
  }, [
    frequencyData,
    isAudioConnected,
    isPlaying,
    currentTime,
    source.mode,
    visualTime,
  ])

  useEffect(() => {
    if (!isPlaying) {
      setAnimatedBars(Array(BAR_COUNT).fill(5))
      return
    }

    let frameId = 0

    const animate = () => {
      setAnimatedBars(prev =>
        prev.map((bar, index) => {
          const target = bars[index]
          const diff = target - bar

          return bar + diff * 0.62
        })
      )
      frameId = window.requestAnimationFrame(animate)
    }

    frameId = window.requestAnimationFrame(animate)

    return () => window.cancelAnimationFrame(frameId)
  }, [bars, isPlaying])

  const asciiRows = useMemo(
    () =>
      ROW_IDS.map((rowId, rowIndex) => {
        const threshold = ROW_COUNT - rowIndex

        return {
          id: rowId,
          cells: BAR_IDS.map((id, columnIndex) => {
            const level = (animatedBars[columnIndex] / 100) * ROW_COUNT
            const distance = level - threshold
            const characterIndex =
              distance >= 0
                ? 3
                : distance >= -0.25
                  ? 2
                  : distance >= -0.5
                    ? 1
                    : 0

            return {
              character:
                level >= threshold - 0.75
                  ? LEVEL_CHARACTERS[characterIndex]
                  : '·',
              id: `${rowId}-${id}`,
              isActive: level >= threshold - 0.75,
            }
          }),
        }
      }),
    [animatedBars]
  )
  const peak = Math.round(Math.max(...animatedBars))
  const average = Math.round(
    animatedBars.reduce((total, value) => total + value, 0) /
      animatedBars.length
  )
  const inputLabel = isAudioConnected
    ? 'FFT/AUDIO'
    : `${source.mode.toUpperCase()}/SYNTHETIC`

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-green/80">
            {source.locationLabel}
          </span>{' '}
          <span className="text-terminal-green">
            ./visualizer --mode={mode}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4 font-mono">
        <div className="w-full max-w-3xl text-[10px] sm:text-xs">
          <div className="flex justify-between text-terminal-green/60">
            <span>┌─ SPECTRUM://48-BAND</span>
            <span>INPUT:{inputLabel} ─┐</span>
          </div>

          <div className="border-terminal-green/30 border-x px-2 py-2">
            <div className="mb-2 flex flex-wrap justify-between gap-x-4 text-[9px] text-terminal-green/60">
              <span>
                STATE:{' '}
                <span className="text-terminal-green">
                  {isPlaying ? 'RUNNING' : 'IDLE'}
                </span>
              </span>
              <span>
                PEAK:<span className="text-terminal-green">{peak}%</span>
              </span>
              <span>
                AVG:<span className="text-terminal-green/90">{average}%</span>
              </span>
              <span>
                SRC:
                <span className="text-terminal-green/80">
                  {source.mode.toUpperCase()}
                </span>
              </span>
            </div>

            <div
              aria-label={`ASCII spectrum visualizer, peak ${peak} percent`}
              className="space-y-0 overflow-hidden leading-[0.72rem] sm:leading-[0.9rem]"
              role="img"
            >
              {asciiRows.map(row => (
                <div
                  className="grid grid-cols-[repeat(48,minmax(0,1fr))] text-center"
                  key={row.id}
                >
                  {row.cells.map(cell => (
                    <span
                      aria-hidden="true"
                      className={
                        cell.isActive
                          ? 'text-terminal-green'
                          : 'text-terminal-green/10'
                      }
                      key={cell.id}
                    >
                      {cell.character}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-6 text-[8px] text-terminal-green/50">
              <span>20Hz</span>
              <span className="text-center">100Hz</span>
              <span className="text-center">1kHz</span>
              <span className="text-center">5kHz</span>
              <span className="text-center">10kHz</span>
              <span className="text-right">20kHz</span>
            </div>
          </div>

          <div className="flex justify-between text-terminal-green/60">
            <span>└─ ░ LOW ▒ MID ▓ HIGH █ PEAK</span>
            <span>{isPlaying ? 'LIVE' : 'STANDBY'} ─┘</span>
          </div>

          <div className="mt-3 text-center text-[9px] text-terminal-green/40">
            rendering textual amplitude map · no graphics pipeline
          </div>
        </div>
      </div>
    </div>
  );
}
