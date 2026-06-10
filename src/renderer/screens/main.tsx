import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from 'renderer/components/header'

import { HelpTab } from 'renderer/components/music-player/help-tab'
import { MusicListTab } from 'renderer/components/music-player/music-list-tab'
import { NowPlaying } from 'renderer/components/music-player/now-playing'
import { PlayerControls } from 'renderer/components/music-player/player-controls'
import { RadioListTab } from 'renderer/components/music-player/radio-list-tab'
import { StatusFooter } from 'renderer/components/music-player/status-footer'
import { TerminalPrompt } from 'renderer/components/music-player/terminal-prompt'
import { TerminalTabs } from 'renderer/components/music-player/terminal-tabs'
import { TrackList } from 'renderer/components/music-player/track-list'
import { Visualizer } from 'renderer/components/music-player/visualizer'
import { YouTubeListTab } from 'renderer/components/music-player/youtube-list-tab'
import { useAudioAnalyzer } from 'renderer/hooks/use-audio-analyzer'
import { useMusicLibrary } from 'renderer/hooks/use-music-library'
import { usePlayerCommands } from 'renderer/hooks/use-player-commands'
import { useRadioSource } from 'renderer/hooks/use-radio-source'
import { useYouTubeLibrary } from 'renderer/hooks/use-youtube-library'
import { PLAYER_SOURCES } from 'renderer/lib/player-sources'
import {
  generateProgressBar,
  getPlaybackErrorMessage,
  getRandomQueueIndex,
  isExpectedPlaybackAbort,
  normalizeAudioSrc,
} from 'renderer/lib/player-utils'
import { getThemeById, THEMES, type ThemeId } from 'renderer/lib/themes'
import type {
  PlayerQueueItem,
  PlayerSource,
  PlayerSourceMode,
} from 'shared/types'
import { version } from '../../../package.json'

function getTabs(
  source: PlayerSource,
  showHelpTab: boolean,
  showRadioListTab: boolean,
  showMusicListTab: boolean,
  showYouTubeListTab: boolean
) {
  const tabs = [
    { id: 'tracks', label: source.listCommand, shortcut: '⌘1' },
    { id: 'now-playing', label: 'cat now_playing.txt', shortcut: '⌘2' },
    { id: 'visualizer', label: './visualizer --mode=spectrum', shortcut: '⌘3' },
    { id: 'controls', label: './player-controls', shortcut: '⌘4' },
  ]

  if (showRadioListTab) {
    tabs.push({ id: 'radio-list', label: 'radio list', shortcut: ':q' })
  }

  if (showMusicListTab) {
    tabs.push({ id: 'music-list', label: 'music lists', shortcut: ':q' })
  }

  if (showYouTubeListTab) {
    tabs.push({ id: 'youtube-list', label: 'yt playlists', shortcut: ':q' })
  }

  if (showHelpTab) {
    tabs.push({ id: 'help', label: 'Prompt Play Help', shortcut: ':q' })
  }

  return tabs
}

export function MainScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeSourceMode, setActiveSourceMode] = useState<PlayerSourceMode>(
    () => {
      const source = searchParams.get('source')

      if (source === 'radio' || source === 'yt') {
        return source
      }

      return 'local'
    }
  )
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default')
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false)
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0)
  const [currentItem, setCurrentItem] = useState<PlayerQueueItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false)
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState('tracks')
  const [showHelpTab, setShowHelpTab] = useState(false)
  const [showRadioListTab, setShowRadioListTab] = useState(false)
  const [showMusicListTab, setShowMusicListTab] = useState(false)
  const [showYouTubeListTab, setShowYouTubeListTab] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([
    `[INFO] prompt play v${version}`,
    "[HINT] Type 'prompt play --init' to start or 'help' for help",
    '$ ',
  ])
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const connectionTimersRef = useRef<number[]>([])
  const previousTabRef = useRef('tracks')
  const trackListScrollRef = useRef<HTMLDivElement>(null)
  const radioListScrollRef = useRef<HTMLDivElement>(null)
  const youtubeListScrollRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef(volume)
  const previousVolumeRef = useRef(volume)
  const didHandleEndedRef = useRef(false)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  )

  const addToHistory = useCallback((command: string) => {
    setCommandHistory(prev => [...prev.slice(-30), command])
  }, [])

  const clearConnectionTimers = useCallback(() => {
    connectionTimersRef.current.forEach(timerId => {
      window.clearTimeout(timerId)
    })
    connectionTimersRef.current = []
  }, [])

  useEffect(() => {
    return () => clearConnectionTimers()
  }, [clearConnectionTimers])

  const closeHelpTab = useCallback(() => {
    setShowHelpTab(false)
    setActiveTab(previousTabRef.current)
    addToHistory('[OK] Help tab closed')
  }, [addToHistory])

  const closeRadioListTab = useCallback(() => {
    setShowRadioListTab(false)
    setActiveTab(previousTabRef.current)
    addToHistory('[OK] Radio list tab closed')
  }, [addToHistory])

  const closeMusicListTab = useCallback(() => {
    setShowMusicListTab(false)
    setActiveTab(previousTabRef.current)
    addToHistory('[OK] Music lists tab closed')
  }, [addToHistory])

  const closeYouTubeListTab = useCallback(() => {
    setShowYouTubeListTab(false)
    setActiveTab(previousTabRef.current)
    addToHistory('[OK] YouTube playlists tab closed')
  }, [addToHistory])

  const openHelpTab = useCallback(() => {
    previousTabRef.current =
      activeTab === 'help' ? previousTabRef.current : activeTab
    setShowHelpTab(true)
    setActiveTab('help')
    addToHistory('[HELP] Opened Prompt Play Help')
  }, [activeTab, addToHistory])

  const openRadioListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === 'radio-list' ? previousTabRef.current : activeTab
    setShowRadioListTab(true)
    setActiveTab('radio-list')
    addToHistory('[INFO] Opened radio list')
  }, [activeTab, addToHistory])

  const openMusicListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === 'music-list' ? previousTabRef.current : activeTab
    setShowMusicListTab(true)
    setActiveTab('music-list')
    addToHistory('[INFO] Opened music lists')
  }, [activeTab, addToHistory])

  const openYouTubeListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === 'youtube-list' ? previousTabRef.current : activeTab
    setShowYouTubeListTab(true)
    setActiveTab('youtube-list')
    addToHistory('[INFO] Opened YouTube playlists')
  }, [activeTab, addToHistory])

  const {
    musicLibraries,
    scanMusicPath,
    selectMusicFolder,
    updateLocalItemDuration,
  } = useMusicLibrary({
    addToHistory,
    openMusicListTab,
    setCurrentItem,
    setIsLoading,
  })
  const { radioItems, radioStatuses, recentRadioItems, setRecentRadioIds } =
    useRadioSource({ activeTab, showRadioListTab })
  const {
    cleanYouTubeConfig,
    clearYouTubeApiKey,
    isAwaitingYouTubeApiKey,
    saveYouTubePlaylist,
    selectedYouTubePlaylistId,
    setIsAwaitingYouTubeApiKey,
    setSelectedYouTubePlaylistId,
    setYouTubeApiKey,
    youtubeStorage,
  } = useYouTubeLibrary({
    addToHistory,
    openYouTubeListTab,
    setIsLoading,
  })

  const items = useMemo(
    () => [
      ...musicLibraries.flatMap(library => library.items),
      ...radioItems,
      ...youtubeStorage.youtube.items,
    ],
    [musicLibraries, radioItems, youtubeStorage.youtube.items]
  )
  const activeSource = useMemo(() => {
    const source = PLAYER_SOURCES[activeSourceMode]

    if (activeSourceMode === 'yt' && !youtubeStorage.youtube.apiKey) {
      return {
        ...source,
        emptyTitle: 'You need to register a YouTube API key',
        emptyHint: 'yt auth',
      }
    }

    if (activeSourceMode === 'yt') {
      return {
        ...source,
        emptyHint: 'yt add https://youtube.com/playlist?list=PL...',
      }
    }

    if (activeSourceMode !== 'local' || musicLibraries.length === 0) {
      return source
    }

    return {
      ...source,
      locationLabel: musicLibraries[0].path,
      emptyHint: 'type music -- path pathname to config',
    }
  }, [activeSourceMode, musicLibraries, youtubeStorage.youtube.apiKey])
  const canAnalyzeAudio =
    activeSource.supportsSeek && activeSource.mode !== 'yt'
  const { frequencyData, isConnected } = useAudioAnalyzer(
    audioElement,
    isPlaying,
    canAnalyzeAudio
  )
  const activeItems = useMemo(
    () => items.filter(item => item.mode === activeSourceMode),
    [activeSourceMode, items]
  )
  const selectedYouTubeItems = useMemo(
    () =>
      youtubeStorage.youtube.items.filter(
        item => item.album === selectedYouTubePlaylistId
      ),
    [selectedYouTubePlaylistId, youtubeStorage.youtube.items]
  )
  const visibleItems =
    activeSourceMode === 'radio'
      ? recentRadioItems
      : activeSourceMode === 'yt' && selectedYouTubePlaylistId
        ? selectedYouTubeItems
        : activeItems
  const queueItems =
    activeSourceMode === 'yt' && selectedYouTubePlaylistId
      ? selectedYouTubeItems
      : activeItems
  const tabs = useMemo(
    () =>
      getTabs(
        activeSource,
        showHelpTab,
        showRadioListTab,
        showMusicListTab,
        showYouTubeListTab
      ),
    [
      activeSource,
      showHelpTab,
      showRadioListTab,
      showMusicListTab,
      showYouTubeListTab,
    ]
  )

  const cycleTab = useCallback(() => {
    setActiveTab(currentTab => {
      const currentIndex = tabs.findIndex(tab => tab.id === currentTab)
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % tabs.length

      return tabs[nextIndex]?.id ?? 'tracks'
    })
  }, [tabs])

  const scrollRadioList = useCallback((direction: 'down' | 'up') => {
    radioListScrollRef.current?.scrollBy({
      top: direction === 'down' ? 48 : -48,
      behavior: 'smooth',
    })
  }, [])

  const scrollTrackList = useCallback((direction: 'down' | 'up') => {
    trackListScrollRef.current?.scrollBy({
      top: direction === 'down' ? 48 : -48,
      behavior: 'smooth',
    })
  }, [])

  const scrollYouTubeList = useCallback((direction: 'down' | 'up') => {
    youtubeListScrollRef.current?.scrollBy({
      top: direction === 'down' ? 48 : -48,
      behavior: 'smooth',
    })
  }, [])

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
    }
  }, [activeSourceMode, currentItem])

  useEffect(() => {
    const storedTheme = localStorage.getItem('prompt-play-theme')
    const theme = storedTheme ? getThemeById(storedTheme) : undefined

    if (theme) {
      setActiveTheme(theme.id)
      setSelectedThemeIndex(THEMES.findIndex(item => item.id === theme.id))
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme
    localStorage.setItem('prompt-play-theme', activeTheme)
  }, [activeTheme])

  const simulateLoading = useCallback(
    async (
      messages: { text: string; delay: number }[],
      onComplete?: () => void
    ) => {
      setIsLoading(true)

      for (const message of messages) {
        addToHistory(message.text)
        await new Promise(resolve => setTimeout(resolve, message.delay))
      }

      for (let progress = 0; progress <= 100; progress += 10) {
        setCommandHistory(prev => {
          const newHistory = [...prev]

          if (newHistory[newHistory.length - 1]?.includes('[')) {
            newHistory[newHistory.length - 1] =
              `[LOADING] ${generateProgressBar(progress)}`
          } else {
            newHistory.push(`[LOADING] ${generateProgressBar(progress)}`)
          }

          return newHistory.slice(-30)
        })
        await new Promise(resolve => setTimeout(resolve, 80))
      }

      setIsLoading(false)
      onComplete?.()
    },
    [addToHistory]
  )

  const selectSource = useCallback(
    (mode: PlayerSourceMode) => {
      clearConnectionTimers()
      const nextSource = PLAYER_SOURCES[mode]

      setActiveSourceMode(mode)
      setCurrentItem(null)
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      addToHistory(`[INFO] Active source: ${nextSource.label}`)
      addToHistory(`[INFO] ${nextSource.description}`)
    },
    [addToHistory, clearConnectionTimers]
  )

  const playItem = useCallback(
    (item: PlayerQueueItem) => {
      clearConnectionTimers()

      if (item.mode !== activeSourceMode) {
        setActiveSourceMode(item.mode)
      }

      didHandleEndedRef.current = false
      setCurrentItem(item)
      setCurrentTime(0)
      setDuration(item.duration ?? 0)
      setIsPlaying(false)
      addToHistory(`$ play "${item.title}"`)
      addToHistory(`[LOADING] Connecting to ${item.title}...`)

      const startPlaybackAfterConnected = () => {
        addToHistory(`[PLAYING] Connected to ${item.title}`)
        window.requestAnimationFrame(() => {
          setIsPlaying(true)
        })
      }

      if (item.mode === 'radio') {
        setRecentRadioIds(prev =>
          [item.id, ...prev.filter(radioId => radioId !== item.id)].slice(0, 5)
        )
        connectionTimersRef.current = [
          window.setTimeout(() => {
            addToHistory('[LOADING] Buffering...')
          }, 1800),
          window.setTimeout(startPlaybackAfterConnected, 4000),
        ]
        return
      }

      startPlaybackAfterConnected()
    },
    [activeSourceMode, addToHistory, clearConnectionTimers]
  )

  const playYouTubePlaylist = useCallback(
    (playlistId: string) => {
      const playlist = youtubeStorage.youtube.playlistDetails.find(
        item => item.id === playlistId
      )
      const playlistItems = youtubeStorage.youtube.items.filter(
        item => item.album === playlistId
      )

      setSelectedYouTubePlaylistId(playlistId)

      if (playlistItems.length === 0) {
        addToHistory(
          `[ERROR] No videos cached for ${playlist?.title ?? playlistId}`
        )
        addToHistory('[HINT] Run yt add playlist-url-or-id again')
        return
      }

      addToHistory(
        `[INFO] Selected YouTube playlist: ${playlist?.title ?? playlistId}`
      )
      playItem(playlistItems[0])
    },
    [
      addToHistory,
      playItem,
      youtubeStorage.youtube.items,
      youtubeStorage.youtube.playlistDetails,
    ]
  )

  const togglePlay = useCallback(() => {
    if (!currentItem) {
      if (queueItems.length > 0) {
        playItem(queueItems[0])
      }
      return
    }

    setIsPlaying(prev => {
      const nextState = !prev
      addToHistory(nextState ? '$ resume' : '$ pause')
      if (!nextState) {
        clearConnectionTimers()
      }
      addToHistory(
        nextState ? '[PLAYING] Playback resumed' : '[PAUSED] Playback paused'
      )
      return nextState
    })
  }, [queueItems, currentItem, playItem, addToHistory, clearConnectionTimers])

  const nextItem = useCallback(() => {
    if (!currentItem || queueItems.length === 0) {
      return
    }

    const currentIndex = queueItems.findIndex(
      item => item.id === currentItem.id
    )
    const nextIndex =
      isShuffleEnabled && queueItems.length > 1
        ? getRandomQueueIndex(queueItems.length, currentIndex)
        : (currentIndex + 1) % queueItems.length
    addToHistory('$ next')
    playItem(queueItems[nextIndex])
  }, [queueItems, currentItem, isShuffleEnabled, playItem, addToHistory])

  const prevItem = useCallback(() => {
    if (!currentItem || queueItems.length === 0) {
      return
    }

    const currentIndex = queueItems.findIndex(
      item => item.id === currentItem.id
    )
    const prevIndex =
      currentIndex <= 0 ? queueItems.length - 1 : currentIndex - 1
    addToHistory('$ prev')
    playItem(queueItems[prevIndex])
  }, [queueItems, currentItem, playItem, addToHistory])

  const handleSeek = useCallback(
    (time: number) => {
      if (activeSourceMode === 'yt') {
        setCurrentTime(time)
        return
      }

      if (audioRef.current) {
        audioRef.current.currentTime = time
        setCurrentTime(time)
      }
    },
    [activeSourceMode]
  )

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume
    }

    volumeRef.current = newVolume
    setVolume(newVolume)

    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }, [])

  const muteVolume = useCallback(() => {
    if (volumeRef.current > 0) {
      previousVolumeRef.current = volumeRef.current
    }

    handleVolumeChange(0)
  }, [handleVolumeChange])

  const unmuteVolume = useCallback(() => {
    handleVolumeChange(previousVolumeRef.current || 0.7)
  }, [handleVolumeChange])

  const toggleShuffle = useCallback(() => {
    setIsShuffleEnabled(prev => {
      const nextValue = !prev
      addToHistory(`[OK] Shuffle ${nextValue ? 'enabled' : 'disabled'}`)
      return nextValue
    })
  }, [addToHistory])

  const toggleRepeat = useCallback(() => {
    setIsRepeatEnabled(prev => {
      const nextValue = !prev
      addToHistory(`[OK] Repeat ${nextValue ? 'enabled' : 'disabled'}`)
      return nextValue
    })
  }, [addToHistory])

  const applyTheme = useCallback(
    (themeId: string) => {
      const theme = getThemeById(themeId)

      if (!theme) {
        addToHistory(`[ERROR] Theme not found: ${themeId}`)
        addToHistory("[HINT] Use 'theme list' to see available themes")
        return
      }

      setActiveTheme(theme.id)
      setSelectedThemeIndex(THEMES.findIndex(item => item.id === theme.id))
      setIsThemePickerOpen(false)
      addToHistory(`[INFO] Theme changed to ${theme.name}.`)
    },
    [addToHistory]
  )

  const moveThemeSelection = useCallback((direction: 'next' | 'prev') => {
    setSelectedThemeIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % THEMES.length
      }

      return prev === 0 ? THEMES.length - 1 : prev - 1
    })
  }, [])

  const selectTheme = useCallback(
    (index = selectedThemeIndex) => {
      applyTheme(THEMES[index]?.id ?? activeTheme)
    },
    [activeTheme, applyTheme, selectedThemeIndex]
  )

  const handleCommand = usePlayerCommands({
    activeItems,
    activeSource,
    activeSourceMode,
    activeTab,
    activeTheme,
    addToHistory,
    applyTheme,
    cleanYouTubeConfig,
    clearConnectionTimers,
    clearYouTubeApiKey,
    closeHelpTab,
    closeMusicListTab,
    closeRadioListTab,
    closeYouTubeListTab,
    currentItem,
    handleVolumeChange,
    isAwaitingYouTubeApiKey,
    isConnected,
    isLoading,
    isRepeatEnabled,
    isShuffleEnabled,
    muteVolume,
    navigate,
    nextItem,
    openHelpTab,
    openMusicListTab,
    openRadioListTab,
    openYouTubeListTab,
    playItem,
    playYouTubePlaylist,
    prevItem,
    queueItems,
    recentRadioItems,
    saveYouTubePlaylist,
    scanMusicPath,
    selectMusicFolder,
    selectSource,
    setActiveTab,
    setCommandHistory,
    setIsAwaitingYouTubeApiKey,
    setIsPlaying,
    setIsThemePickerOpen,
    setSelectedThemeIndex,
    setYouTubeApiKey,
    showHelpTab,
    showMusicListTab,
    showRadioListTab,
    showYouTubeListTab,
    simulateLoading,
    tabs,
    toggleRepeat,
    toggleShuffle,
    unmuteVolume,
    visibleItems,
    volume,
    volumeRef,
    youtubeStorage,
  })

  useEffect(() => {
    return window.App.onMenuCommand(handleCommand)
  }, [handleCommand])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      if (
        (activeTab === 'radio-list' ||
          activeTab === 'tracks' ||
          activeTab === 'youtube-list') &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 'down' : 'up'

        if (activeTab === 'radio-list' && showRadioListTab) {
          scrollRadioList(direction)
          return
        }

        if (activeTab === 'youtube-list' && showYouTubeListTab) {
          scrollYouTubeList(direction)
          return
        }

        if (activeTab === 'tracks') {
          scrollTrackList(direction)
          return
        }

        return
      }

      if (event.key === 'Tab' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        cycleTab()
        return
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return
      }

      const tabMap: Record<string, string> = {
        '1': 'tracks',
        '2': 'now-playing',
        '3': 'visualizer',
        '4': 'controls',
      }

      if (tabMap[event.key]) {
        event.preventDefault()
        setActiveTab(tabMap[event.key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    activeTab,
    cycleTab,
    scrollRadioList,
    scrollTrackList,
    scrollYouTubeList,
    showRadioListTab,
    showYouTubeListTab,
  ])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      const nextDuration = Number.isFinite(audio.duration)
        ? Math.round(audio.duration)
        : 0

      setDuration(nextDuration)

      if (currentItem) {
        updateLocalItemDuration(currentItem, nextDuration)
      }
    }
    const handleEnded = () => {
      addToHistory('[INFO] Item ended')
      if (isRepeatEnabled && currentItem) {
        addToHistory('[INFO] Repeating current item')
        playItem(currentItem)
        return
      }

      nextItem()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [
    currentItem,
    isRepeatEnabled,
    nextItem,
    playItem,
    addToHistory,
    updateLocalItemDuration,
  ])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentItem || currentItem.mode === 'yt') {
      return
    }

    const nextSrc = normalizeAudioSrc(currentItem.src)
    audio.volume = volumeRef.current

    if (audio.src !== nextSrc && audio.currentSrc !== nextSrc) {
      audio.src = nextSrc
      audio.load()
    }
  }, [currentItem])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    audio.volume = volume
    volumeRef.current = volume
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentItem || currentItem.mode === 'yt') {
      return
    }

    if (isPlaying) {
      audio.play().catch((error: unknown) => {
        if (isExpectedPlaybackAbort(error)) {
          return
        }

        const errorMessage = getPlaybackErrorMessage(error)

        console.error('[audio] playback failed:', error)
        clearConnectionTimers()
        setIsPlaying(false)
        addToHistory(`[ERROR] Failed to play audio: ${errorMessage}`)
        addToHistory(`[ERROR] Source: ${audio.currentSrc || audio.src}`)
      })
    } else {
      audio.pause()
    }
  }, [currentItem, addToHistory, clearConnectionTimers, isPlaying])

  const handlePlayerEnded = useCallback(() => {
    if (didHandleEndedRef.current) {
      return
    }

    didHandleEndedRef.current = true
    addToHistory('[INFO] Item ended')

    if (isRepeatEnabled && currentItem) {
      addToHistory('[INFO] Repeating current item')
      playItem(currentItem)
      return
    }

    nextItem()
  }, [addToHistory, currentItem, isRepeatEnabled, nextItem, playItem])

  useEffect(() => {
    if (currentItem?.mode !== 'yt' || !isPlaying || duration <= 0) {
      return
    }

    const timerId = window.setInterval(() => {
      setCurrentTime(prev => {
        const nextTime = Math.min(prev + 1, duration)

        if (nextTime >= duration) {
          window.setTimeout(handlePlayerEnded, 0)
        }

        return nextTime
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [currentItem?.mode, duration, handlePlayerEnded, isPlaying])

  const renderPlayerControls = () => (
    <PlayerControls
      currentItem={currentItem}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      isRepeatEnabled={isRepeatEnabled}
      isShuffleEnabled={isShuffleEnabled}
      onEnded={handlePlayerEnded}
      onNext={nextItem}
      onPrev={prevItem}
      onSeek={handleSeek}
      onToggleMute={volume > 0 ? muteVolume : unmuteVolume}
      onTogglePlay={togglePlay}
      onToggleRepeat={toggleRepeat}
      onToggleShuffle={toggleShuffle}
      onVolumeChange={handleVolumeChange}
      source={activeSource}
      volume={volume}
    />
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracks':
        return (
          <TrackList
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={visibleItems}
            onSelectItem={playItem}
            scrollContainerRef={trackListScrollRef}
            source={activeSource}
          />
        )
      case 'now-playing':
        return (
          <NowPlaying
            isPlaying={isPlaying}
            item={currentItem}
            source={activeSource}
          />
        )
      case 'visualizer':
        return (
          <Visualizer
            currentTime={currentTime}
            frequencyData={frequencyData}
            isAudioConnected={isConnected}
            isPlaying={isPlaying}
            source={activeSource}
          />
        )
      case 'controls':
        return renderPlayerControls()
      case 'radio-list':
        return (
          <RadioListTab
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={radioItems}
            onSelectItem={playItem}
            radioStatuses={radioStatuses}
            scrollContainerRef={radioListScrollRef}
          />
        )
      case 'music-list':
        return <MusicListTab libraries={musicLibraries} />
      case 'youtube-list':
        return (
          <YouTubeListTab
            currentPlaylistId={selectedYouTubePlaylistId}
            onSelectPlaylist={playYouTubePlaylist}
            scrollContainerRef={youtubeListScrollRef}
            youtube={youtubeStorage.youtube}
          />
        )
      case 'help':
        return <HelpTab source={activeSource} />
      default:
        return null
    }
  }

  return (
    <>
      <Header />
      <main className="flex items-center justify-center bg-background">
        <div className="min-h-0 w-full max-w-4xl">
          <div className="flex h-[calc(100vh-2rem)] max-h-130 min-h-125 flex-col overflow-hidden rounded-lg bg-background shadow-2xl md:h-[calc(100vh-4rem)]">
            <TerminalTabs
              activeTab={activeTab}
              mouseEnabled={activeTab === 'controls'}
              onTabChange={setActiveTab}
              tabs={tabs}
            />
            <div
              className={`relative min-h-0 flex-1 overflow-hidden bg-background ${
                activeTab === 'controls' ? '' : 'pointer-events-none'
              }`}
            >
              {activeSourceMode === 'yt' ? (
                <>
                  <div
                    className={
                      activeTab === 'controls'
                        ? 'h-full'
                        : 'pointer-events-none absolute h-px w-px overflow-hidden opacity-0'
                    }
                  >
                    {renderPlayerControls()}
                  </div>
                  {activeTab === 'controls' ? null : renderTabContent()}
                </>
              ) : (
                renderTabContent()
              )}
            </div>
            <TerminalPrompt
              history={commandHistory}
              onArrowNavigation={
                activeTab === 'radio-list' && showRadioListTab
                  ? scrollRadioList
                  : undefined
              }
              onCommand={handleCommand}
              onCycleTab={cycleTab}
              promptContext={
                activeSourceMode === 'local' ? 'music' : activeSourceMode
              }
              promptLabel={
                isAwaitingYouTubeApiKey ? 'YouTube API Key:' : undefined
              }
              themePicker={
                isThemePickerOpen
                  ? {
                      activeThemeId: activeTheme,
                      options: THEMES,
                      selectedIndex: selectedThemeIndex,
                      onCancel: () => setIsThemePickerOpen(false),
                      onMove: moveThemeSelection,
                      onSelect: selectTheme,
                    }
                  : undefined
              }
            />
            <StatusFooter
              activeTab={activeTab}
              currentItem={currentItem}
              isPlaying={isPlaying}
              items={activeItems}
              source={activeSource}
              volume={volume}
            />
          </div>

          <audio
            crossOrigin="anonymous"
            key={activeSourceMode}
            preload="metadata"
            ref={audioRef}
          >
            <track kind="captions" />
          </audio>
        </div>
      </main>
    </>
  )
}
