import { useEffect, useMemo, useState } from 'react'

import type { PlayerSource } from '../../../shared/types'

const BAR_COUNT = 64
const BAR_IDS = Array.from({ length: BAR_COUNT }, (_, index) => `bar-${index}`)

interface VisualizerProps {
  isPlaying: boolean
  currentTime: number
  source: PlayerSource
  frequencyData?: Uint8Array
  isAudioConnected?: boolean
}

export function Visualizer({
  isPlaying,
  currentTime,
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
      const sourcePulse =
        source.mode === 'radio' ? 0.9 : source.mode === 'yt' ? 0.72 : 0.58
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

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">{source.locationLabel}</span>{' '}
          <span className="text-terminal-white">
            ./visualizer --mode=spectrum
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center p-4">
        <div className="flex h-32 items-end justify-center gap-0.5 px-2 md:h-40">
          {BAR_IDS.map((id, index) => {
            const height = animatedBars[index]

            return (
              <div
                className={`max-w-2 flex-1 rounded-t transition-all duration-75 ${
                  isPlaying
                    ? index % 4 === 0
                      ? 'bg-terminal-green'
                      : index % 4 === 1
                        ? 'bg-terminal-cyan'
                        : index % 4 === 2
                          ? 'bg-terminal-yellow'
                          : 'bg-terminal-magenta'
                    : 'bg-terminal-gray/30'
                }`}
                key={id}
                style={{
                  height: `${height}%`,
                  opacity: isPlaying ? 0.9 : 0.3,
                }}
              />
            )
          })}
        </div>

        <div className="mt-2 flex justify-between px-2 font-mono text-[8px] text-terminal-gray">
          <span>20Hz</span>
          <span>100Hz</span>
          <span>1kHz</span>
          <span>5kHz</span>
          <span>10kHz</span>
          <span>20kHz</span>
        </div>
        <div className="mt-3 text-center font-mono text-[10px] text-terminal-gray">
          {isAudioConnected ? 'fft input' : `${source.mode} synthetic spectrum`}
        </div>
      </div>
    </div>
  )
}
