import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import {
  useRemoveStoredValue,
  useSetStoredValue,
  useStoredValue,
} from 'renderer/hooks/use-app-storage'
import type { MusicLibrary, PlayerQueueItem } from 'shared/types'

export const MUSIC_LIBRARY_STORAGE_KEY = 'prompt-play-music-libraries'

type AddToHistory = (command: string) => void

function normalizeMusicLibraries(
  storedValue: MusicLibrary[] | null | undefined
): MusicLibrary[] {
  if (!Array.isArray(storedValue)) {
    return []
  }

  return storedValue.filter(
    library =>
      typeof library.id === 'string' &&
      typeof library.name === 'string' &&
      typeof library.path === 'string' &&
      typeof library.musicCount === 'number' &&
      Array.isArray(library.items)
  )
}

export function getDefaultMusicLocations() {
  const homePath = window.App.homePath

  return [
    { name: 'Music', path: `${homePath}/Music` },
    { name: 'Downloads', path: `${homePath}/Downloads` },
  ]
}

export function useMusicLibrary({
  addToHistory,
  openMusicListTab,
  setCurrentItem,
  setIsLoading,
}: {
  addToHistory: AddToHistory
  openMusicListTab: () => void
  setCurrentItem: Dispatch<SetStateAction<PlayerQueueItem | null>>
  setIsLoading: Dispatch<SetStateAction<boolean>>
}) {
  const { data: storedMusicLibraries, isFetched: hasFetchedStoredLibraries } =
    useStoredValue<MusicLibrary[]>(MUSIC_LIBRARY_STORAGE_KEY)
  const { mutate: persistMusicLibraries } = useSetStoredValue<MusicLibrary[]>(
    MUSIC_LIBRARY_STORAGE_KEY
  )
  const { mutate: removeStoredMusicLibraries } = useRemoveStoredValue(
    MUSIC_LIBRARY_STORAGE_KEY
  )
  const [musicLibraries, setMusicLibraries] = useState<MusicLibrary[]>([])
  const hasHydratedMusicLibrariesRef = useRef(false)

  useEffect(() => {
    if (!hasFetchedStoredLibraries || hasHydratedMusicLibrariesRef.current) {
      return
    }

    hasHydratedMusicLibrariesRef.current = true
    const storedLibraries = normalizeMusicLibraries(storedMusicLibraries)
    setMusicLibraries(storedLibraries)

    if (storedLibraries.length === 0) {
      return
    }

    let isMounted = true

    Promise.all(
      storedLibraries.map(library => window.App.scanMusicFolder(library.path))
    )
      .then(libraries => {
        if (isMounted) {
          setMusicLibraries(libraries)
          persistMusicLibraries(libraries)
        }
      })
      .catch(() => {
        // Keep the stored library if a path is temporarily unavailable.
      })

    return () => {
      isMounted = false
    }
  }, [hasFetchedStoredLibraries, persistMusicLibraries, storedMusicLibraries])

  const storeMusicLibrary = useCallback(
    (library: MusicLibrary) => {
      setMusicLibraries(prev => {
        const nextLibraries = [
          library,
          ...prev.filter(item => item.path !== library.path),
        ]

        persistMusicLibraries(nextLibraries)
        return nextLibraries
      })
      addToHistory(`[OK] Configured music folder: ${library.name}`)
      addToHistory(`[INFO] Path: ${library.path}`)
      addToHistory(`[INFO] ${library.musicCount} musics found`)
    },
    [addToHistory, persistMusicLibraries]
  )

  const updateLocalItemDuration = useCallback(
    (item: PlayerQueueItem, nextDuration: number) => {
      if (item.mode !== 'local' || nextDuration <= 0) {
        return
      }

      setCurrentItem(prev =>
        prev?.id === item.id ? { ...prev, duration: nextDuration } : prev
      )
      setMusicLibraries(prev => {
        const nextLibraries = prev.map(library => ({
          ...library,
          items: library.items.map(libraryItem =>
            libraryItem.id === item.id
              ? { ...libraryItem, duration: nextDuration }
              : libraryItem
          ),
        }))

        persistMusicLibraries(nextLibraries)
        return nextLibraries
      })
    },
    [persistMusicLibraries, setCurrentItem]
  )

  const scanMusicPath = useCallback(
    async (folderPath: string) => {
      const path = folderPath.trim()

      if (!path) {
        addToHistory('[ERROR] Use music -- path pathname')
        return
      }

      setIsLoading(true)
      addToHistory(`[INFO] Scanning music folder: ${path}`)

      try {
        const library = await window.App.scanMusicFolder(path)
        storeMusicLibrary(library)
        openMusicListTab()
      } catch {
        addToHistory(`[ERROR] Could not access music folder: ${path}`)
      } finally {
        setIsLoading(false)
      }
    },
    [addToHistory, openMusicListTab, setIsLoading, storeMusicLibrary]
  )

  const selectMusicFolder = useCallback(async () => {
    setIsLoading(true)
    addToHistory('[INFO] Select a folder to scan for musics')

    try {
      const library = await window.App.selectMusicFolder()

      if (!library) {
        addToHistory('[INFO] Music folder selection canceled')
        return
      }

      storeMusicLibrary(library)
      openMusicListTab()
    } catch {
      addToHistory('[ERROR] Could not select music folder')
    } finally {
      setIsLoading(false)
    }
  }, [addToHistory, openMusicListTab, setIsLoading, storeMusicLibrary])

  const resetMusicLibraries = useCallback(() => {
    setMusicLibraries([])
    removeStoredMusicLibraries()
  }, [removeStoredMusicLibraries])

  return {
    musicLibraries,
    resetMusicLibraries,
    scanMusicPath,
    selectMusicFolder,
    updateLocalItemDuration,
  }
}
