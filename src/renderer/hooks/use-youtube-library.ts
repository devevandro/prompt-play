import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  createEmptyYouTubeStorage,
  fetchYouTubePlaylistItems,
  parseYouTubePlaylistId,
  readStoredYouTube,
  YOUTUBE_STORAGE_KEY,
  type YouTubeStorage,
} from 'renderer/lib/youtube'

type AddToHistory = (command: string) => void

export function useYouTubeLibrary({
  addToHistory,
  openYouTubeListTab,
  setIsLoading,
}: {
  addToHistory: AddToHistory
  openYouTubeListTab: () => void
  setIsLoading: Dispatch<SetStateAction<boolean>>
}) {
  const [youtubeStorage, setYouTubeStorage] =
    useState<YouTubeStorage>(readStoredYouTube)
  const [isAwaitingYouTubeApiKey, setIsAwaitingYouTubeApiKey] = useState(false)
  const [selectedYouTubePlaylistId, setSelectedYouTubePlaylistId] = useState<
    string | null
  >(() => readStoredYouTube().youtube.playlists[0] ?? null)
  const shouldSkipNextPersistRef = useRef(false)

  useEffect(() => {
    if (shouldSkipNextPersistRef.current) {
      shouldSkipNextPersistRef.current = false
      localStorage.removeItem(YOUTUBE_STORAGE_KEY)
      return
    }

    localStorage.setItem(YOUTUBE_STORAGE_KEY, JSON.stringify(youtubeStorage))
  }, [youtubeStorage])

  const setYouTubeApiKey = useCallback(
    (apiKey: string) => {
      if (!apiKey) {
        addToHistory('[ERROR] YouTube API key cannot be empty')
        return
      }

      setYouTubeStorage(prev => ({
        youtube: {
          ...prev.youtube,
          apiKey,
        },
      }))
      addToHistory('[OK] YouTube API key saved')
    },
    [addToHistory]
  )

  const clearYouTubeApiKey = useCallback(() => {
    setIsAwaitingYouTubeApiKey(false)
    setYouTubeStorage(prev => ({
      youtube: {
        ...prev.youtube,
        apiKey: '',
      },
    }))
    addToHistory('[OK] YouTube API key removed')
  }, [addToHistory])

  const cleanYouTubeConfig = useCallback(() => {
    setIsAwaitingYouTubeApiKey(false)
    setSelectedYouTubePlaylistId(null)
    shouldSkipNextPersistRef.current = true
    setYouTubeStorage(createEmptyYouTubeStorage())
    localStorage.removeItem(YOUTUBE_STORAGE_KEY)
    addToHistory('[OK] YouTube configuration cleaned')
    addToHistory('[INFO] Removed API key, playlists, and cached videos')
  }, [addToHistory])

  const saveYouTubePlaylist = useCallback(
    async (playlistInput: string) => {
      const playlistId = parseYouTubePlaylistId(playlistInput)
      const apiKey = youtubeStorage.youtube.apiKey

      if (!apiKey) {
        addToHistory('[ERROR] You need to register a YouTube API key')
        addToHistory('[HINT] yt auth')
        return
      }

      if (!playlistId) {
        addToHistory(
          '[ERROR] Use yt add https://youtube.com/playlist?list=PL...'
        )
        return
      }

      setIsLoading(true)
      addToHistory(`[INFO] Loading YouTube playlist: ${playlistId}`)

      try {
        const playlist = await fetchYouTubePlaylistItems(apiKey, playlistId)

        setYouTubeStorage(prev => ({
          youtube: {
            ...prev.youtube,
            playlists: [
              playlistId,
              ...prev.youtube.playlists.filter(id => id !== playlistId),
            ],
            playlistDetails: [
              {
                id: playlistId,
                title: playlist.playlistTitle,
                videoCount: playlist.videoCount,
              },
              ...prev.youtube.playlistDetails.filter(
                item => item.id !== playlistId
              ),
            ],
            items: [
              ...prev.youtube.items.filter(item => item.album !== playlistId),
              ...playlist.items,
            ],
          },
        }))
        setSelectedYouTubePlaylistId(playlistId)
        addToHistory(`[OK] Saved YouTube playlist: ${playlist.playlistTitle}`)
        addToHistory(`[INFO] ${playlist.items.length} videos found`)
        openYouTubeListTab()
      } catch (error) {
        addToHistory(
          `[ERROR] Could not load YouTube playlist: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        )
      } finally {
        setIsLoading(false)
      }
    },
    [
      addToHistory,
      openYouTubeListTab,
      setIsLoading,
      youtubeStorage.youtube.apiKey,
    ]
  )

  return {
    cleanYouTubeConfig,
    clearYouTubeApiKey,
    isAwaitingYouTubeApiKey,
    saveYouTubePlaylist,
    selectedYouTubePlaylistId,
    setIsAwaitingYouTubeApiKey,
    setSelectedYouTubePlaylistId,
    setYouTubeApiKey,
    youtubeStorage,
  }
}
