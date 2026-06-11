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
  const { mutate: persistYouTubeStorage } =
    useSetStoredValue<YouTubeStorage>(YOUTUBE_STORAGE_KEY)
  const { mutate: removeStoredYouTube } =
    useRemoveStoredValue(YOUTUBE_STORAGE_KEY)
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
    (apiKey: string) => {
      if (!apiKey) {
        addToHistory('[ERROR] YouTube API key cannot be empty')
        return
      }

      setYouTubeStorage(prev => {
        const nextStorage = {
          youtube: {
            ...prev.youtube,
            apiKey,
          },
        }

        persistYouTubeStorage(nextStorage)
        return nextStorage
      })
      addToHistory('[OK] YouTube API key saved')
    },
    [addToHistory, persistYouTubeStorage]
  )

  const clearYouTubeApiKey = useCallback(() => {
    setIsAwaitingYouTubeApiKey(false)
    setYouTubeStorage(prev => {
      const nextStorage = {
        youtube: {
          ...prev.youtube,
          apiKey: '',
        },
      }

      persistYouTubeStorage(nextStorage)
      return nextStorage
    })
    addToHistory('[OK] YouTube API key removed')
  }, [addToHistory, persistYouTubeStorage])

  const cleanYouTubeConfig = useCallback(() => {
    setIsAwaitingYouTubeApiKey(false)
    setSelectedYouTubePlaylistId(null)
    setYouTubeStorage(createEmptyYouTubeStorage())
    removeStoredYouTube()
    addToHistory('[OK] YouTube configuration cleaned')
    addToHistory('[INFO] Removed API key, playlists, and cached videos')
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

        setYouTubeStorage(prev => {
          const nextStorage = {
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
          }

          persistYouTubeStorage(nextStorage)
          return nextStorage
        })
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
    ]
  )

  const resetYouTubeStorage = useCallback(() => {
    setIsAwaitingYouTubeApiKey(false)
    setSelectedYouTubePlaylistId(null)
    setYouTubeStorage(createEmptyYouTubeStorage())
    removeStoredYouTube()
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
