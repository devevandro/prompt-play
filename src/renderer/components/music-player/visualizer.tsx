import { useEffect, useMemo, useState } from 'react'

const BAR_IDS = Array.from({ length: 48 }, (_, index) => `bar-${index}`)

interface VisualizerProps {
  isPlaying: boolean
  currentTime: number
  frequencyData?: Uint8Array
  isAudioConnected?: boolean
}

export function Visualizer({
  isPlaying,
  currentTime,
  frequencyData,
  isAudioConnected = false,
}: VisualizerProps) {
  const [animatedBars, setAnimatedBars] = useState<number[]>(Array(48).fill(5))

  const bars = useMemo(() => {
    if (frequencyData && frequencyData.length > 0 && isAudioConnected) {
      const barCount = 48
      const step = Math.floor(frequencyData.length / barCount)

      return Array.from({ length: barCount }, (_, index) => {
        const frequencyIndex = Math.min(index * step, frequencyData.length - 1)
        const value = frequencyData[frequencyIndex] || 0

        return Math.max(5, (value / 255) * 100)
      })
    }

    return Array.from({ length: 48 }, (_, index) => {
      if (!isPlaying) {
        return 5
      }

      const time = currentTime * 2
      const wave1 = Math.sin(time + index * 0.3) * 0.3
      const wave2 = Math.sin(time * 1.5 + index * 0.5) * 0.2
      const wave3 = Math.sin(time * 0.7 + index * 0.15) * 0.25
      const wave4 = Math.cos(time * 2.1 + index * 0.4) * 0.15
      const bassBoost = index < 8 ? 0.2 : 0
      const trebleBoost = index > 36 ? 0.1 : 0
      const combined =
        wave1 + wave2 + wave3 + wave4 + bassBoost + trebleBoost + 0.5

      return Math.max(5, Math.min(100, combined * 100))
    })
  }, [frequencyData, isAudioConnected, isPlaying, currentTime])

  useEffect(() => {
    if (!isPlaying) {
      setAnimatedBars(Array(48).fill(5))
      return
    }

    const interval = window.setInterval(() => {
      setAnimatedBars(prev =>
        prev.map((bar, index) => {
          const target = bars[index]
          const diff = target - bar

          return bar + diff * 0.3
        })
      )
    }, 50)

    return () => window.clearInterval(interval)
  }, [bars, isPlaying])

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">~/music</span>{' '}
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
      </div>
    </div>
  )
}
