import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PlayerQueueItem, PlayerSourceMode } from 'shared/types'

export function useYouTubeIframePlayer({
  currentItem,
  isPlaying,
  onEnded,
  sourceMode,
  volume,
}: {
  currentItem: PlayerQueueItem | null
  isPlaying: boolean
  onEnded?: () => void
  sourceMode: PlayerSourceMode
  volume: number
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFrameReady, setIsFrameReady] = useState(false)
  const embedUrl = useMemo(() => {
    const videoId = currentItem?.videoId ?? currentItem?.src

    if (sourceMode !== 'yt' || !videoId) {
      return ''
    }

    const params = new URLSearchParams({
      autoplay: '1',
      controls: '0',
      disablekb: '1',
      enablejsapi: '1',
      modestbranding: '1',
      playsinline: '1',
      rel: '0',
    })

    if (window.location.origin.startsWith('http')) {
      params.set('origin', window.location.origin)
    }

    if (window.location.href.startsWith('http')) {
      params.set('widget_referrer', window.location.href)
    }

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
  }, [currentItem?.src, currentItem?.videoId, sourceMode])

  const sendCommand = useCallback(
    (func: string, args: unknown[] = []) => {
      if (!isFrameReady) {
        return
      }

      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      )
    },
    [isFrameReady]
  )

  useEffect(() => {
    setIsFrameReady(false)
  }, [embedUrl])

  useEffect(() => {
    if (sourceMode !== 'yt' || !iframeRef.current || !isFrameReady) {
      return
    }

    sendCommand('addEventListener', ['onStateChange'])
    sendCommand(isPlaying ? 'playVideo' : 'pauseVideo')
  }, [isFrameReady, isPlaying, sendCommand, sourceMode])

  useEffect(() => {
    if (sourceMode !== 'yt') {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes('youtube.com')) {
        return
      }

      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data

        const playerState =
          data?.event === 'onStateChange'
            ? data.info
            : data?.event === 'infoDelivery'
              ? data.info?.playerState
              : undefined

        if (playerState === 0 && isPlaying) {
          onEnded?.()
        }
      } catch {
        // Ignore non-JSON messages from the embedded player.
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [isPlaying, onEnded, sourceMode])

  useEffect(() => {
    if (sourceMode !== 'yt' || !isFrameReady) {
      return
    }

    const volumePercent = Math.round(volume * 100)
    sendCommand('setVolume', [volumePercent])
    sendCommand(volumePercent === 0 ? 'mute' : 'unMute')
  }, [isFrameReady, sendCommand, sourceMode, volume])

  const seekTo = useCallback(
    (time: number) => {
      sendCommand('seekTo', [time, true])
    },
    [sendCommand]
  )

  return {
    embedUrl,
    iframeRef,
    markFrameReady: () => setIsFrameReady(true),
    seekTo,
  }
}
