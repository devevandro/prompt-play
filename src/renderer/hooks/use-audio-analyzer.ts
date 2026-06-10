import { useCallback, useEffect, useRef, useState } from 'react'

interface AudioAnalyzerState {
  frequencyData: Uint8Array
  isConnected: boolean
}

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

export function useAudioAnalyzer(
  audioElement: HTMLAudioElement | null,
  isPlaying: boolean,
  enabled = true
) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(
    new Uint8Array(64)
  )
  const [isConnected, setIsConnected] = useState(false)

  const connect = useCallback(() => {
    if (!audioElement || sourceRef.current) {
      return
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as WindowWithWebkitAudio).webkitAudioContext

      if (!AudioContextClass) {
        return
      }

      const audioContext = new AudioContextClass()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaElementSource(audioElement)

      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.8
      source.connect(analyser)
      analyser.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source
      setIsConnected(true)
    } catch {
      setIsConnected(false)
    }
  }, [audioElement])

  const disconnect = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    sourceRef.current?.disconnect()
    analyserRef.current?.disconnect()

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
    }

    audioContextRef.current = null
    analyserRef.current = null
    sourceRef.current = null
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (!enabled || !audioElement) {
      disconnect()
      return
    }

    connect()

    return () => disconnect()
  }, [audioElement, connect, disconnect, enabled])

  useEffect(() => {
    if (!enabled || !analyserRef.current || !isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const analyser = analyserRef.current
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const updateFrequencyData = () => {
      analyser.getByteFrequencyData(dataArray)
      setFrequencyData(new Uint8Array(dataArray))
      animationRef.current = requestAnimationFrame(updateFrequencyData)
    }

    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }

    updateFrequencyData()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isPlaying])

  useEffect(() => disconnect, [disconnect])

  return {
    frequencyData,
    isConnected,
    connect,
    disconnect,
  } as AudioAnalyzerState & {
    connect: () => void
    disconnect: () => void
  }
}
