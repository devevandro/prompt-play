import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PlayerQueueItem, PlayerSourceMode } from 'shared/types'

interface YouTubePlayer {
  cueVideoById: (videoId: string) => void
  destroy: () => void
  loadVideoById: (videoId: string) => void
  mute: () => void
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setVolume: (volume: number) => void
  unMute: () => void
}

interface YouTubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      events: {
        onReady: () => void
        onStateChange: (event: { data: number }) => void
      }
      playerVars: Record<string, string>
      videoId: string
    }
  ) => YouTubePlayer
}

declare global {
  interface Window {
    YT?: YouTubeApi
    onYouTubeIframeAPIReady?: () => void
  }
}

let youTubeApiPromise: Promise<YouTubeApi> | null = null

function loadYouTubeIframeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (youTubeApiPromise) {
    return youTubeApiPromise
  }

  youTubeApiPromise = new Promise(resolve => {
    const previousReadyCallback = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      previousReadyCallback?.()

      if (window.YT) {
        resolve(window.YT)
      }
    }

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      )
    ) {
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    }
  })

  return youTubeApiPromise
}

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
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const lastVideoIdRef = useRef('')
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const videoId = currentItem?.videoId ?? currentItem?.src ?? ''
  const playerVars = useMemo(() => {
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

    return Object.fromEntries(params.entries())
  }, [])

  const setPlayerVolume = useCallback(
    (player: YouTubePlayer = playerRef.current as YouTubePlayer) => {
      const volumePercent = Math.round(volume * 100)
      player.setVolume(volumePercent)

      if (volumePercent === 0) {
        player.mute()
      } else {
        player.unMute()
      }
    },
    [volume]
  )

  useEffect(() => {
    if (sourceMode !== 'yt' || !videoId || !containerRef.current) {
      playerRef.current?.destroy()
      playerRef.current = null
      lastVideoIdRef.current = ''
      setIsPlayerReady(false)
      return
    }

    let isCancelled = false

    if (!playerRef.current) {
      setIsPlayerReady(false)
      containerRef.current.replaceChildren(document.createElement('div'))

      void loadYouTubeIframeApi().then(api => {
        if (isCancelled || !containerRef.current) {
          return
        }

        const playerTarget = containerRef.current.firstElementChild

        if (!(playerTarget instanceof HTMLElement)) {
          return
        }

        playerRef.current = new api.Player(playerTarget, {
          videoId,
          playerVars,
          events: {
            onReady: () => {
              if (isCancelled || !playerRef.current) {
                return
              }

              lastVideoIdRef.current = videoId
              setIsPlayerReady(true)
              setPlayerVolume(playerRef.current)

              if (isPlaying) {
                playerRef.current.playVideo()
              }
            },
            onStateChange: event => {
              if (event.data === 0) {
                onEnded?.()
              }
            },
          },
        })
      })

      return () => {
        isCancelled = true
      }
    }

    if (isPlayerReady && lastVideoIdRef.current !== videoId) {
      if (isPlaying) {
        playerRef.current.loadVideoById(videoId)
      } else {
        playerRef.current.cueVideoById(videoId)
      }
      lastVideoIdRef.current = videoId
    }

    return () => {
      isCancelled = true
    }
  }, [
    isPlayerReady,
    isPlaying,
    onEnded,
    playerVars,
    setPlayerVolume,
    sourceMode,
    videoId,
  ])

  useEffect(() => {
    if (sourceMode !== 'yt' || !isPlayerReady || !playerRef.current) {
      return
    }

    if (isPlaying) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [isPlayerReady, isPlaying, sourceMode])

  useEffect(() => {
    if (sourceMode !== 'yt' || !isPlayerReady || !playerRef.current) {
      return
    }

    setPlayerVolume(playerRef.current)
  }, [isPlayerReady, setPlayerVolume, sourceMode])

  useEffect(
    () => () => {
      playerRef.current?.destroy()
      playerRef.current = null
    },
    []
  )

  const seekTo = useCallback((time: number) => {
    playerRef.current?.seekTo(time, true)
  }, [])

  return {
    containerRef,
    hasVideo: sourceMode === 'yt' && Boolean(videoId),
    seekTo,
  }
}
