import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  useRemoveStoredValue,
  useSetStoredValue,
  useStoredValue,
} from 'renderer/hooks/use-app-storage'
import {
  createEmptyYouTubeStorage,
  fetchYouTubePlaylistItems,
  normalizeYouTubeStorage,
  parseYouTubePlaylistId,
  YOUTUBE_STORAGE_KEY,
} from 'renderer/lib/youtube'
import type { YouTubeStorage } from 'shared/types'

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
  const { data: storedYouTube, isFetched: hasFetchedStoredYouTube } =
    useStoredValue<YouTubeStorage>(YOUTUBE_STORAGE_KEY)
  const persistYouTubeStorage =
    useSetStoredValue<YouTubeStorage>(YOUTUBE_STORAGE_KEY)
  const removeStoredYouTube = useRemoveStoredValue(YOUTUBE_STORAGE_KEY)
  const [youtubeStorage, setYouTubeStorage] = useState<YouTubeStorage>(
    createEmptyYouTubeStorage
  )
  const [isAwaitingYouTubeApiKey, setIsAwaitingYouTubeApiKey] = useState(false)
  const [selectedYouTubePlaylistId, setSelectedYouTubePlaylistId] = useState<
    string | null
  >(null)
  const hasHydratedYouTubeRef = useRef(false)

  useEffect(() => {
    if (!hasFetchedStoredYouTube || hasHydratedYouTubeRef.current) {
      return
    }

    hasHydratedYouTubeRef.current = true
    const normalizedStorage = normalizeYouTubeStorage(storedYouTube)
    setYouTubeStorage(normalizedStorage)
    setSelectedYouTubePlaylistId(normalizedStorage.youtube.playlists[0] ?? null)
  }, [hasFetchedStoredYouTube, storedYouTube])

  const setYouTubeApiKey = useCallback(
    async (apiKey: string) => {
      if (!apiKey) {
        addToHistory('[ERROR] YouTube API key cannot be empty')
        return
      }

      const nextStorage = {
        youtube: {
          ...youtubeStorage.youtube,
          apiKey,
        },
      }

      try {
        await persistYouTubeStorage(nextStorage)
        setYouTubeStorage(nextStorage)
        addToHistory('[OK] YouTube API key saved')
      } catch (error) {
        addToHistory(
          `[ERROR] Could not save YouTube API key: ${
            error instanceof Error ? error.message : 'unknown error'
          }`
        )
      }
    },
    [addToHistory, persistYouTubeStorage, youtubeStorage.youtube]
  )

  const clearYouTubeApiKey = useCallback(async () => {
    setIsAwaitingYouTubeApiKey(false)
    const nextStorage = {
      youtube: {
        ...youtubeStorage.youtube,
        apiKey: '',
      },
    }

    try {
      await persistYouTubeStorage(nextStorage)
      setYouTubeStorage(nextStorage)
      addToHistory('[OK] YouTube API key removed')
    } catch (error) {
      addToHistory(
        `[ERROR] Could not remove YouTube API key: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      )
    }
  }, [addToHistory, persistYouTubeStorage, youtubeStorage.youtube])

  const cleanYouTubeConfig = useCallback(async () => {
    setIsAwaitingYouTubeApiKey(false)
    setSelectedYouTubePlaylistId(null)
    try {
      await removeStoredYouTube()
      setYouTubeStorage(createEmptyYouTubeStorage())
      addToHistory('[OK] YouTube configuration cleaned')
      addToHistory('[INFO] Removed API key, playlists, and cached videos')
    } catch (error) {
      addToHistory(
        `[ERROR] Could not clean YouTube configuration: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      )
    }
  }, [addToHistory, removeStoredYouTube])

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

        const nextStorage = {
          youtube: {
            ...youtubeStorage.youtube,
            playlists: [
              playlistId,
              ...youtubeStorage.youtube.playlists.filter(
                id => id !== playlistId
              ),
            ],
            playlistDetails: [
              {
                id: playlistId,
                title: playlist.playlistTitle,
                videoCount: playlist.videoCount,
              },
              ...youtubeStorage.youtube.playlistDetails.filter(
                item => item.id !== playlistId
              ),
            ],
            items: [
              ...youtubeStorage.youtube.items.filter(
                item => item.album !== playlistId
              ),
              ...playlist.items,
            ],
          },
        }

        await persistYouTubeStorage(nextStorage)
        setYouTubeStorage(nextStorage)
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
      persistYouTubeStorage,
      setIsLoading,
      youtubeStorage.youtube.apiKey,
      youtubeStorage.youtube.items,
      youtubeStorage.youtube.playlistDetails,
      youtubeStorage.youtube.playlists,
    ]
  )

  const resetYouTubeStorage = useCallback(async () => {
    setIsAwaitingYouTubeApiKey(false)
    setSelectedYouTubePlaylistId(null)
    await removeStoredYouTube()
    setYouTubeStorage(createEmptyYouTubeStorage())
  }, [removeStoredYouTube])

  return {
    cleanYouTubeConfig,
    clearYouTubeApiKey,
    isAwaitingYouTubeApiKey,
    saveYouTubePlaylist,
    selectedYouTubePlaylistId,
    setIsAwaitingYouTubeApiKey,
    setSelectedYouTubePlaylistId,
    setYouTubeApiKey,
    resetYouTubeStorage,
    youtubeStorage,
  }
}
