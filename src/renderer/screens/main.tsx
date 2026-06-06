import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from 'renderer/components/header'

import { NowPlaying } from 'renderer/components/music-player/now-playing'
import { PlayerControls } from 'renderer/components/music-player/player-controls'
import { StatusFooter } from 'renderer/components/music-player/status-footer'
import { TerminalPrompt } from 'renderer/components/music-player/terminal-prompt'
import { TerminalTabs } from 'renderer/components/music-player/terminal-tabs'
import { TrackList } from 'renderer/components/music-player/track-list'
import { radios } from 'shared/data/radios'
import type {
  PlayerQueueItem,
  PlayerSource,
  PlayerSourceMode,
  Track,
} from 'shared/types'
import { Visualizer } from 'renderer/components/music-player/visualizer'
import { getThemeById, THEMES, type ThemeId } from 'renderer/lib/themes'
import { useAudioAnalyzer } from 'renderer/hooks/use-audio-analyzer'
import { version } from '../../../package.json'

const PLAYER_SOURCES: Record<PlayerSourceMode, PlayerSource> = {
  local: {
    mode: 'local',
    label: 'local files',
    description: 'Músicas presentes no computador',
    locationLabel: '~/music',
    listCommand: 'ls -la *.mp3 *.wav *.flac *.ogg',
    itemLabel: 'arquivo',
    creatorLabel: 'artista',
    contextLabel: 'perm',
    timeLabel: 'duração',
    emptyTitle: 'Nenhuma faixa local selecionada',
    emptyHint: "Selecione uma faixa local ou digite 'play' no terminal",
    isLive: false,
    supportsSeek: true,
  },
  radio: {
    mode: 'radio',
    label: 'radio',
    description: 'Rádios FM e web rádios',
    locationLabel: '~/radio',
    listCommand: 'scan --fm --web',
    itemLabel: 'estação',
    creatorLabel: 'cidade',
    contextLabel: 'freq',
    timeLabel: 'status',
    emptyTitle: 'Nenhuma rádio selecionada',
    emptyHint: "Selecione uma rádio ou use 'source radio' e 'play'",
    isLive: true,
    supportsSeek: false,
  },
  yt: {
    mode: 'yt',
    label: 'youtube',
    description: 'Playlists do YouTube',
    locationLabel: '~/youtube',
    listCommand: 'yt playlists',
    itemLabel: 'playlist',
    creatorLabel: 'canal',
    contextLabel: 'origem',
    timeLabel: 'duração',
    emptyTitle: 'Nenhuma playlist selecionada',
    emptyHint: "Selecione uma playlist ou use 'source yt' e 'play'",
    isLive: false,
    supportsSeek: true,
  },
}

const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    mode: 'local',
    title: 'midnight_protocol.mp3',
    artist: 'Cyber_Punk',
    album: '~/music/synthwave',
    sourceDetail: '-rw-r--r--',
    duration: 245,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '2',
    mode: 'local',
    title: 'neon_dreams.wav',
    artist: 'Terminal_Echo',
    album: '~/music/ambient',
    sourceDetail: '-rwxr-xr-x',
    duration: 312,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '3',
    mode: 'local',
    title: 'binary_sunset.flac',
    artist: 'Root_Access',
    album: '~/music/electronic',
    sourceDetail: '-rw-rw-r--',
    duration: 198,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '4',
    mode: 'local',
    title: 'kernel_panic.ogg',
    artist: 'Sudo_Beats',
    album: '~/music/techno',
    sourceDetail: '-rw-r--r--',
    duration: 276,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '5',
    mode: 'local',
    title: 'recursive_loop.mp3',
    artist: 'Bash_Master',
    album: '~/music/lofi',
    sourceDetail: '-rwxr-xr-x',
    duration: 223,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '6',
    mode: 'local',
    title: 'chmod_777.wav',
    artist: 'Permission_Denied',
    album: '~/music/dnb',
    sourceDetail: '-rw-rw-r--',
    duration: 189,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '7',
    mode: 'local',
    title: 'pipe_dreams.mp3',
    artist: 'Grep_Life',
    album: '~/music/chillwave',
    sourceDetail: '-rw-r--r--',
    duration: 267,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '8',
    mode: 'local',
    title: 'fork_bomb.flac',
    artist: ':(){ :|:& };:',
    album: '~/music/hardcore',
    sourceDetail: '-rwxr-xr-x',
    duration: 156,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
]

const YOUTUBE_PLAYLISTS: PlayerQueueItem[] = [
  {
    id: 'yt-1',
    mode: 'yt',
    title: 'Synthwave Coding Session',
    artist: 'Prompt Play',
    album: 'YouTube playlists',
    duration: 3600,
    sourceDetail: 'playlist',
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: 'yt-2',
    mode: 'yt',
    title: 'Lo-fi Terminal Focus',
    artist: 'Prompt Play',
    album: 'YouTube playlists',
    duration: 5400,
    sourceDetail: 'playlist',
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
]

const RADIO_ITEMS: PlayerQueueItem[] = radios.slice(0, 8).map(radio => ({
  id: radio.id,
  mode: 'radio',
  title: radio.name,
  artist: radio.city,
  album: radio.region,
  duration: null,
  sourceDetail: radio.frequency,
  src: radio.url,
}))

const PLAYER_ITEMS: PlayerQueueItem[] = [
  ...SAMPLE_TRACKS,
  ...RADIO_ITEMS,
  ...YOUTUBE_PLAYLISTS,
]

function getTabs(source: PlayerSource) {
  return [
    { id: 'tracks', label: source.listCommand, shortcut: '⌘1' },
    { id: 'now-playing', label: 'cat now_playing.txt', shortcut: '⌘2' },
    { id: 'visualizer', label: './visualizer --mode=spectrum', shortcut: '⌘3' },
    { id: 'controls', label: './player-controls', shortcut: '⌘4' },
  ]
}

function generateProgressBar(progress: number, width = 30): string {
  const filled = Math.floor((progress / 100) * width)
  const empty = width - filled

  return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}] ${progress}%`
}

function normalizeAudioSrc(src: string): string {
  if (
    /^(file|https?|local-audio):\/\//.test(src) ||
    src.startsWith('/assets/')
  ) {
    return src
  }

  if (src.startsWith('/')) {
    return `local-audio://${src
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/')}`
  }

  return src
}

export function MainScreen() {
  const navigate = useNavigate()
  const [activeSourceMode, setActiveSourceMode] =
    useState<PlayerSourceMode>('local')
  const [items] = useState<PlayerQueueItem[]>(PLAYER_ITEMS)
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default')
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false)
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0)
  const [currentItem, setCurrentItem] = useState<PlayerQueueItem | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [activeTab, setActiveTab] = useState('tracks')
  const [commandHistory, setCommandHistory] = useState<string[]>([
    `[INFO] prompt play v${version}`,
    "[HINT] Digite 'prompt play --init' para iniciar ou 'help' para ajuda",
    '$ ',
  ])
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  )
  const { frequencyData, isConnected } = useAudioAnalyzer(
    audioElement,
    isPlaying
  )
  const activeSource = PLAYER_SOURCES[activeSourceMode]
  const activeItems = useMemo(
    () => items.filter(item => item.mode === activeSourceMode),
    [activeSourceMode, items]
  )
  const tabs = useMemo(() => getTabs(activeSource), [activeSource])

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current)
    }
  }, [])

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

  const addToHistory = useCallback((command: string) => {
    setCommandHistory(prev => [...prev.slice(-30), command])
  }, [])

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
      const nextSource = PLAYER_SOURCES[mode]

      setActiveSourceMode(mode)
      setCurrentItem(null)
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      addToHistory(`[INFO] Fonte ativa: ${nextSource.label}`)
      addToHistory(`[INFO] ${nextSource.description}`)
    },
    [addToHistory]
  )

  const playItem = useCallback(
    (item: PlayerQueueItem) => {
      if (item.mode !== activeSourceMode) {
        setActiveSourceMode(item.mode)
      }

      const itemSource = PLAYER_SOURCES[item.mode]
      setCurrentItem(item)
      setCurrentTime(0)
      setDuration(item.duration ?? 0)
      setIsPlaying(true)
      addToHistory(`$ play "${item.title}"`)
      addToHistory(
        `[PLAYING] ${itemSource.label}: ${item.artist} - ${item.title}`
      )
    },
    [activeSourceMode, addToHistory]
  )

  const togglePlay = useCallback(() => {
    if (!currentItem) {
      if (activeItems.length > 0) {
        playItem(activeItems[0])
      }
      return
    }

    setIsPlaying(prev => {
      const nextState = !prev
      addToHistory(nextState ? '$ resume' : '$ pause')
      addToHistory(
        nextState
          ? '[PLAYING] Reprodução retomada'
          : '[PAUSED] Reprodução pausada'
      )
      return nextState
    })
  }, [activeItems, currentItem, playItem, addToHistory])

  const nextItem = useCallback(() => {
    if (!currentItem || activeItems.length === 0) {
      return
    }

    const currentIndex = activeItems.findIndex(
      item => item.id === currentItem.id
    )
    const nextIndex = (currentIndex + 1) % activeItems.length
    addToHistory('$ next')
    playItem(activeItems[nextIndex])
  }, [activeItems, currentItem, playItem, addToHistory])

  const prevItem = useCallback(() => {
    if (!currentItem || activeItems.length === 0) {
      return
    }

    const currentIndex = activeItems.findIndex(
      item => item.id === currentItem.id
    )
    const prevIndex =
      currentIndex <= 0 ? activeItems.length - 1 : currentIndex - 1
    addToHistory('$ prev')
    playItem(activeItems[prevIndex])
  }, [activeItems, currentItem, playItem, addToHistory])

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)

    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }, [])

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

  const handleCommand = useCallback(
    (command: string) => {
      if (isLoading) {
        addToHistory(`$ ${command}`)
        addToHistory('[ERROR] Aguarde o processo atual terminar...')
        return
      }

      addToHistory(`$ ${command}`)

      const cmd = command.toLowerCase().trim()

      if (cmd === 'zsh-player --init' || cmd === 'init') {
        simulateLoading(
          [
            { text: '[INFO] Iniciando zsh-player...', delay: 200 },
            { text: '[INFO] Carregando módulos de áudio...', delay: 300 },
            { text: '[INFO] Conectando Web Audio API...', delay: 250 },
            { text: '[INFO] Escaneando biblioteca de música...', delay: 200 },
          ],
          () => {
            addToHistory('[OK] Player inicializado com sucesso!')
            addToHistory(`[INFO] Fonte ativa: ${activeSource.label}`)
            addToHistory(`[INFO] ${activeItems.length} itens disponíveis`)
            addToHistory(
              "[HINT] Use 'sources' para ver modos ou 'list' para ver itens"
            )
          }
        )
        return
      }

      if (cmd === 'pp version') {
        addToHistory(`[INFO] Prompt Play v${version}`)
        return
      }

      if (cmd === 'theme list') {
        setSelectedThemeIndex(
          Math.max(
            0,
            THEMES.findIndex(theme => theme.id === activeTheme)
          )
        )
        setIsThemePickerOpen(true)
      } else if (cmd.startsWith('theme use ')) {
        const themeId = cmd.slice(10).trim()
        applyTheme(themeId)
      } else if (cmd === 'pp home' || cmd === 'pp exit') {
        navigate('/')
      } else if (cmd === 'pp quit') {
        window.App.quit()
      } else if (cmd === 'pp clear') {
        setCommandHistory(['$ '])
      } else if (cmd === 'pp open now-playing') {
        setActiveTab('now-playing')
        addToHistory('[OK] Aba cat now_playing.txt selecionada')
      } else if (cmd === 'pp open visualizer') {
        setActiveTab('visualizer')
        addToHistory('[OK] Aba ./visualizer --mode=spectrum selecionada')
      } else if (cmd === 'pp open controls') {
        setActiveTab('controls')
        addToHistory('[OK] Aba ./player-controls selecionada')
      } else if (cmd === 'sources') {
        addToHistory('[INFO] Available sources:')
        Object.values(PLAYER_SOURCES).forEach(source => {
          const prefix = source.mode === activeSourceMode ? '▶' : ' '
          addToHistory(
            `  ${prefix} ${source.mode.padEnd(5)} ${source.description}`
          )
        })
      } else if (cmd.startsWith('source ')) {
        const mode = cmd.slice(7).trim() as PlayerSourceMode

        if (mode in PLAYER_SOURCES) {
          selectSource(mode)
        } else {
          addToHistory(`[ERROR] Fonte não encontrada: ${mode}`)
          addToHistory("[HINT] Use 'sources' para ver fontes disponíveis")
        }
      } else if (cmd === 'play' || cmd === 'resume') {
        if (currentItem) {
          setIsPlaying(true)
          addToHistory('[PLAYING] Reprodução retomada')
        } else if (activeItems.length > 0) {
          playItem(activeItems[0])
        }
      } else if (cmd === 'pause' || cmd === 'stop') {
        setIsPlaying(false)
        addToHistory('[PAUSED] Reprodução pausada')
      } else if (cmd === 'next' || cmd === 'n') {
        nextItem()
      } else if (cmd === 'prev' || cmd === 'p') {
        prevItem()
      } else if (cmd.startsWith('play ')) {
        const query = cmd.slice(5).replace(/"/g, '')
        const found = activeItems.find(
          item =>
            item.title.toLowerCase().includes(query) ||
            item.artist.toLowerCase().includes(query)
        )

        if (found) {
          playItem(found)
        } else {
          addToHistory(
            `[ERROR] Item não encontrado em ${activeSource.label}: ${query}`
          )
        }
      } else if (cmd === 'list' || cmd === 'ls') {
        addToHistory(`[INFO] Listando ${activeSource.label}...`)
        activeItems.forEach((item, index) => {
          const prefix = currentItem?.id === item.id ? '▶' : ' '
          addToHistory(`  ${prefix} ${index + 1}. ${item.title}`)
        })
      } else if (cmd === 'help' || cmd === 'h' || cmd === '?') {
        addToHistory('[HELP] Comandos disponíveis:')
        addToHistory('  zsh-player --init  Inicializar player')
        addToHistory('  sources            Listar modos do player')
        addToHistory('  source [modo]      Usar local, radio ou yt')
        addToHistory('  play [nome]        Tocar item da fonte ativa')
        addToHistory('  pause/stop         Pausar reprodução')
        addToHistory('  next/n             Próximo item')
        addToHistory('  prev/p             Item anterior')
        addToHistory('  list/ls            Listar fonte ativa')
        addToHistory('  status             Status atual')
        addToHistory('  vol [0-100]        Ajustar volume')
        addToHistory('  pp home            Abrir primeiro acesso')
        addToHistory('  pp exit            Voltar para janela inicial')
        addToHistory('  pp quit            Fechar aplicação')
        addToHistory('  pp clear           Limpar terminal')
        addToHistory('  pp version         Versão do projeto')
        addToHistory('  pp open now-playing Abrir now playing')
        addToHistory('  pp open visualizer Abrir visualizer')
        addToHistory('  pp open controls   Abrir controles')
        addToHistory('  theme list         Listar temas')
        addToHistory('  theme use [nome]   Aplicar tema')
        addToHistory('[HINT] Use Tab para autocomplete, ↑↓ para histórico')
      } else if (cmd === 'status' || cmd === 'info') {
        addToHistory(`[STATUS] Fonte: ${activeSource.label}`)
        if (currentItem) {
          addToHistory(`[STATUS] Tocando: ${currentItem.title}`)
          addToHistory(
            `[STATUS] ${activeSource.creatorLabel}: ${currentItem.artist}`
          )
          addToHistory(`[STATUS] Volume: ${Math.round(volume * 100)}%`)
          addToHistory(
            `[STATUS] Audio API: ${isConnected ? 'Conectada' : 'Procedural'}`
          )
        } else {
          addToHistory('[STATUS] Nenhum item em reprodução')
        }
      } else if (cmd.startsWith('vol ')) {
        const newVolume = Number.parseInt(cmd.slice(4), 10)

        if (!Number.isNaN(newVolume) && newVolume >= 0 && newVolume <= 100) {
          handleVolumeChange(newVolume / 100)
          addToHistory(`[OK] Volume ajustado para ${newVolume}%`)
        } else {
          addToHistory('[ERROR] Volume deve estar entre 0 e 100')
        }
      } else if (cmd.startsWith('tab ')) {
        const tabNumber = Number.parseInt(cmd.slice(4), 10)

        if (tabNumber >= 1 && tabNumber <= 4) {
          const tabIds = ['tracks', 'now-playing', 'visualizer', 'controls']
          setActiveTab(tabIds[tabNumber - 1])
          addToHistory(`[OK] Aba ${tabNumber} selecionada`)
        } else {
          addToHistory('[ERROR] Número da aba deve estar entre 1 e 4')
        }
      } else if (cmd) {
        addToHistory(`[ERROR] Comando não reconhecido: ${cmd}`)
        addToHistory("[HINT] Digite 'help' para ver comandos disponíveis")
      }
    },
    [
      activeItems,
      activeSource,
      activeSourceMode,
      activeTheme,
      applyTheme,
      currentItem,
      navigate,
      playItem,
      nextItem,
      prevItem,
      selectSource,
      volume,
      addToHistory,
      simulateLoading,
      isLoading,
      handleVolumeChange,
      isConnected,
    ]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, [])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    const handleEnded = () => {
      addToHistory('[INFO] Item finalizado')
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
  }, [nextItem, addToHistory])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentItem) {
      return
    }

    audio.src = normalizeAudioSrc(currentItem.src)
    audio.volume = volume
    audio.load()
  }, [currentItem, volume])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentItem) {
      return
    }

    if (isPlaying) {
      audio.play().catch((error: unknown) => {
        console.error('[audio] playback failed:', error)
        setIsPlaying(false)
        addToHistory('[ERROR] Falha ao reproduzir áudio')
      })
    } else {
      audio.pause()
    }
  }, [currentItem, addToHistory, isPlaying])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracks':
        return (
          <TrackList
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={activeItems}
            onSelectItem={playItem}
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
        return (
          <PlayerControls
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onNext={nextItem}
            onPrev={prevItem}
            onSeek={handleSeek}
            onTogglePlay={togglePlay}
            onVolumeChange={handleVolumeChange}
            source={activeSource}
            volume={volume}
          />
        )
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
              onTabChange={setActiveTab}
              tabs={tabs}
            />
            <div className="min-h-0 flex-1 overflow-hidden bg-background">
              {renderTabContent()}
            </div>
            <TerminalPrompt
              history={commandHistory}
              onCommand={handleCommand}
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
              items={activeItems}
              source={activeSource}
              volume={volume}
            />
          </div>

          <audio preload="metadata" ref={audioRef}>
            <track kind="captions" />
          </audio>
        </div>
      </main>
    </>
  )
}
