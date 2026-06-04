import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from 'renderer/components/Header'

import { NowPlaying } from 'renderer/components/music-player/now-playing'
import { PlayerControls } from 'renderer/components/music-player/player-controls'
import { StatusFooter } from 'renderer/components/music-player/status-footer'
import { TerminalPrompt } from 'renderer/components/music-player/terminal-prompt'
import { TerminalTabs } from 'renderer/components/music-player/terminal-tabs'
import { TrackList } from 'renderer/components/music-player/track-list'
import type { Track } from 'renderer/components/music-player/types'
import { Visualizer } from 'renderer/components/music-player/visualizer'
import { getThemeById, THEMES, type ThemeId } from 'renderer/lib/themes'
import { useAudioAnalyzer } from 'renderer/hooks/use-audio-analyzer'

const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'midnight_protocol.mp3',
    artist: 'Cyber_Punk',
    album: '~/music/synthwave',
    duration: 245,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '2',
    title: 'neon_dreams.wav',
    artist: 'Terminal_Echo',
    album: '~/music/ambient',
    duration: 312,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '3',
    title: 'binary_sunset.flac',
    artist: 'Root_Access',
    album: '~/music/electronic',
    duration: 198,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '4',
    title: 'kernel_panic.ogg',
    artist: 'Sudo_Beats',
    album: '~/music/techno',
    duration: 276,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '5',
    title: 'recursive_loop.mp3',
    artist: 'Bash_Master',
    album: '~/music/lofi',
    duration: 223,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '6',
    title: 'chmod_777.wav',
    artist: 'Permission_Denied',
    album: '~/music/dnb',
    duration: 189,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '7',
    title: 'pipe_dreams.mp3',
    artist: 'Grep_Life',
    album: '~/music/chillwave',
    duration: 267,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
  {
    id: '8',
    title: 'fork_bomb.flac',
    artist: ':(){ :|:& };:',
    album: '~/music/hardcore',
    duration: 156,
    src: '/Users/evandro.carvalho/Downloads/aeo.mp3',
  },
]

const TABS = [
  { id: 'tracks', label: 'ls -la ~/music', shortcut: '⌘1' },
  { id: 'now-playing', label: 'cat now_playing.txt', shortcut: '⌘2' },
  { id: 'visualizer', label: './visualizer --mode=spectrum', shortcut: '⌘3' },
  { id: 'controls', label: './player-controls', shortcut: '⌘4' },
]

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
  const [tracks] = useState<Track[]>(SAMPLE_TRACKS)
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default')
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false)
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [activeTab, setActiveTab] = useState('tracks')
  const [commandHistory, setCommandHistory] = useState<string[]>([
    '[INFO] prompt play v1.0.0',
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

  const playTrack = useCallback(
    (track: Track) => {
      setCurrentTrack(track)
      setIsPlaying(true)
      addToHistory(`$ play "${track.title}"`)
      addToHistory(`[PLAYING] ${track.artist} - ${track.title}`)
    },
    [addToHistory]
  )

  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      if (tracks.length > 0) {
        playTrack(tracks[0])
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
  }, [currentTrack, tracks, playTrack, addToHistory])

  const nextTrack = useCallback(() => {
    if (!currentTrack) {
      return
    }

    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id)
    const nextIndex = (currentIndex + 1) % tracks.length
    addToHistory('$ next')
    playTrack(tracks[nextIndex])
  }, [currentTrack, tracks, playTrack, addToHistory])

  const prevTrack = useCallback(() => {
    if (!currentTrack) {
      return
    }

    const currentIndex = tracks.findIndex(track => track.id === currentTrack.id)
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1
    addToHistory('$ prev')
    playTrack(tracks[prevIndex])
  }, [currentTrack, tracks, playTrack, addToHistory])

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
            addToHistory(`[INFO] ${tracks.length} faixas encontradas`)
            addToHistory(
              "[HINT] Use 'play' para começar ou 'list' para ver faixas"
            )
          }
        )
        return
      }

      if (cmd === 'pp version') {
        addToHistory('[INFO] Prompt Play v0.1.0')
        addToHistory('[INFO] Audio Engine: Web Audio API')
        addToHistory('[INFO] Visualizer: FFT 48-band Spectrum')
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
      } else if (cmd === 'play' || cmd === 'resume') {
        if (currentTrack) {
          setIsPlaying(true)
          addToHistory('[PLAYING] Reprodução retomada')
        } else if (tracks.length > 0) {
          playTrack(tracks[0])
        }
      } else if (cmd === 'pause' || cmd === 'stop') {
        setIsPlaying(false)
        addToHistory('[PAUSED] Reprodução pausada')
      } else if (cmd === 'next' || cmd === 'n') {
        nextTrack()
      } else if (cmd === 'prev' || cmd === 'p') {
        prevTrack()
      } else if (cmd.startsWith('play ')) {
        const query = cmd.slice(5).replace(/"/g, '')
        const found = tracks.find(
          track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
        )

        if (found) {
          playTrack(found)
        } else {
          addToHistory(`[ERROR] Faixa não encontrada: ${query}`)
        }
      } else if (cmd === 'list' || cmd === 'ls') {
        addToHistory('[INFO] Listando faixas...')
        tracks.forEach((track, index) => {
          const prefix = currentTrack?.id === track.id ? '▶' : ' '
          addToHistory(`  ${prefix} ${index + 1}. ${track.title}`)
        })
      } else if (cmd === 'help' || cmd === 'h' || cmd === '?') {
        addToHistory('[HELP] Comandos disponíveis:')
        addToHistory('  zsh-player --init  Inicializar player')
        addToHistory('  play [nome]        Tocar faixa')
        addToHistory('  pause/stop         Pausar reprodução')
        addToHistory('  next/n             Próxima faixa')
        addToHistory('  prev/p             Faixa anterior')
        addToHistory('  list/ls            Listar faixas')
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
        if (currentTrack) {
          addToHistory(`[STATUS] Tocando: ${currentTrack.title}`)
          addToHistory(`[STATUS] Artista: ${currentTrack.artist}`)
          addToHistory(`[STATUS] Volume: ${Math.round(volume * 100)}%`)
          addToHistory(
            `[STATUS] Audio API: ${isConnected ? 'Conectada' : 'Procedural'}`
          )
        } else {
          addToHistory('[STATUS] Nenhuma faixa em reprodução')
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
      currentTrack,
      activeTheme,
      applyTheme,
      navigate,
      tracks,
      playTrack,
      nextTrack,
      prevTrack,
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
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      addToHistory('[INFO] Faixa finalizada')
      nextTrack()
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [nextTrack, addToHistory])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentTrack) {
      return
    }

    audio.src = normalizeAudioSrc(currentTrack.src)
    audio.volume = volume
    audio.load()
  }, [currentTrack, volume])

  useEffect(() => {
    const audio = audioRef.current

    if (!audio || !currentTrack) {
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
  }, [currentTrack, addToHistory, isPlaying])

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracks':
        return (
          <TrackList
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onSelectTrack={playTrack}
            tracks={tracks}
          />
        )
      case 'now-playing':
        return <NowPlaying isPlaying={isPlaying} track={currentTrack} />
      case 'visualizer':
        return (
          <Visualizer
            currentTime={currentTime}
            frequencyData={frequencyData}
            isAudioConnected={isConnected}
            isPlaying={isPlaying}
          />
        )
      case 'controls':
        return (
          <PlayerControls
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            onNext={nextTrack}
            onPrev={prevTrack}
            onSeek={handleSeek}
            onTogglePlay={togglePlay}
            onVolumeChange={handleVolumeChange}
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
              tabs={TABS}
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
              currentTrack={currentTrack}
              tracks={tracks}
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
