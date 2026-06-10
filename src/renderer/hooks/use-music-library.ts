import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { MusicLibrary, PlayerQueueItem } from 'shared/types'

export const MUSIC_LIBRARY_STORAGE_KEY = 'prompt-play-music-libraries'

type AddToHistory = (command: string) => void

function readStoredMusicLibraries(): MusicLibrary[] {
  try {
    const storedValue = localStorage.getItem(MUSIC_LIBRARY_STORAGE_KEY)

    if (!storedValue) {
      return []
    }

    const libraries = JSON.parse(storedValue) as MusicLibrary[]

    if (!Array.isArray(libraries)) {
      return []
    }

    return libraries.filter(
      library =>
        typeof library.id === 'string' &&
        typeof library.name === 'string' &&
        typeof library.path === 'string' &&
        typeof library.musicCount === 'number' &&
        Array.isArray(library.items)
    )
  } catch {
    return []
  }
}

export function getDefaultMusicLocations() {
  const username = window.App.username
  const homePath = username ? `/Users/${username}` : '~'

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
  const [musicLibraries, setMusicLibraries] = useState<MusicLibrary[]>(
    readStoredMusicLibraries
  )

  useEffect(() => {
    localStorage.setItem(
      MUSIC_LIBRARY_STORAGE_KEY,
      JSON.stringify(musicLibraries)
    )
  }, [musicLibraries])

  useEffect(() => {
    const storedLibraries = readStoredMusicLibraries()

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
        }
      })
      .catch(() => {
        // Keep the stored library if a path is temporarily unavailable.
      })

    return () => {
      isMounted = false
    }
  }, [])

  const storeMusicLibrary = useCallback(
    (library: MusicLibrary) => {
      setMusicLibraries(prev => [
        library,
        ...prev.filter(item => item.path !== library.path),
      ])
      addToHistory(`[OK] Configured music folder: ${library.name}`)
      addToHistory(`[INFO] Path: ${library.path}`)
      addToHistory(`[INFO] ${library.musicCount} musics found`)
    },
    [addToHistory]
  )

  const updateLocalItemDuration = useCallback(
    (item: PlayerQueueItem, nextDuration: number) => {
      if (item.mode !== 'local' || nextDuration <= 0) {
        return
      }

      setCurrentItem(prev =>
        prev?.id === item.id ? { ...prev, duration: nextDuration } : prev
      )
      setMusicLibraries(prev =>
        prev.map(library => ({
          ...library,
          items: library.items.map(libraryItem =>
            libraryItem.id === item.id
              ? { ...libraryItem, duration: nextDuration }
              : libraryItem
          ),
        }))
      )
    },
    [setCurrentItem]
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

  return {
    musicLibraries,
    scanMusicPath,
    selectMusicFolder,
    updateLocalItemDuration,
  }
}
