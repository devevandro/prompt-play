import { useCallback } from 'react'
import type { NavigateFunction } from 'react-router-dom'

import { PLAYER_SOURCES } from 'renderer/lib/player-sources'
import {
  clampVolumePercent,
  getSourceCommandMode,
  normalizeCommand,
  sourceCommandLabel,
} from 'renderer/lib/player-utils'
import { THEMES, type ThemeId } from 'renderer/lib/themes'
import type {
  PlayerQueueItem,
  PlayerSource,
  PlayerSourceMode,
  Radio,
  RadioHistoryEntry,
} from 'shared/types'
import { version } from '../../../package.json'

interface PlayerTab {
  id: string
  label: string
  shortcut: string
}

type AddToHistory = (command: string) => void
type VisualizerMode = 'ascii'

export function usePlayerCommands({
  activeItems,
  activeSource,
  activeSourceMode,
  activeTab,
  activeTheme,
  addToHistory,
  addManualRadio,
  addSearchResult,
  applyTheme,
  clearAllPlayback,
  clearMusicLibraries,
  clearPlayback,
  clearRadios,
  clearConnectionTimers,
  closeHelpTab,
  closeMusicListTab,
  closeRadioHistoryTab,
  closeRadioListTab,
  currentItem,
  createManualRadioFromParts,
  editRadio,
  getPlayerDiagnostics,
  handleVolumeChange,
  isConnected,
  isLoading,
  isRepeatEnabled,
  isShuffleEnabled,
  muteVolume,
  navigate,
  nextItem,
  openHelpTab,
  openMusicListTab,
  openRadioHistoryTab,
  openRadioHistorySearch,
  openRadioListTab,
  playItem,
  prevItem,
  queueItems,
  recentRadioItems,
  radioHistory,
  removeRadio,
  scanMusicPath,
  searchRadios,
  selectMusicFolder,
  selectSource,
  setActiveTab,
  setCommandHistory,
  setIsPlaying,
  setIsThemePickerOpen,
  setSelectedThemeIndex,
  setVisualizerMode,
  showHelpTab,
  showMusicListTab,
  showRadioHistoryTab,
  showRadioListTab,
  simulateLoading,
  tabs,
  toggleRepeat,
  toggleShuffle,
  unmuteVolume,
  visibleItems,
  visualizerMode,
  volume,
  volumeRef,
}: {
  activeItems: PlayerQueueItem[]
  activeSource: PlayerSource
  activeSourceMode: PlayerSourceMode
  activeTab: string
  activeTheme: ThemeId
  addToHistory: AddToHistory
  addManualRadio: (radio: Radio) => Promise<PlayerQueueItem>
  addSearchResult: (index: number) => Promise<PlayerQueueItem | null>
  applyTheme: (themeId: string) => Promise<void>
  clearAllPlayback: () => Promise<void>
  clearMusicLibraries: () => Promise<void>
  clearPlayback: () => void
  clearRadios: () => Promise<void>
  clearConnectionTimers: () => void
  closeHelpTab: () => void
  closeMusicListTab: () => void
  closeRadioHistoryTab: () => void
  closeRadioListTab: () => void
  currentItem: PlayerQueueItem | null
  createManualRadioFromParts: (parts: string[]) => Radio | null
  editRadio: (index: number, radio: Radio) => Promise<PlayerQueueItem | null>
  getPlayerDiagnostics: () => Promise<string[]>
  handleVolumeChange: (newVolume: number) => void
  isConnected: boolean
  isLoading: boolean
  isRepeatEnabled: boolean
  isShuffleEnabled: boolean
  muteVolume: () => void
  navigate: NavigateFunction
  nextItem: () => void
  openHelpTab: () => void
  openMusicListTab: () => void
  openRadioHistoryTab: () => void
  openRadioHistorySearch: (index: number) => Promise<void>
  openRadioListTab: () => void
  playItem: (item: PlayerQueueItem) => void
  prevItem: () => void
  queueItems: PlayerQueueItem[]
  recentRadioItems: PlayerQueueItem[]
  radioHistory: RadioHistoryEntry[]
  removeRadio: (index: number) => Promise<PlayerQueueItem | null>
  scanMusicPath: (folderPath: string) => Promise<void>
  searchRadios: (term: string) => Promise<number>
  selectMusicFolder: () => Promise<void>
  selectSource: (mode: PlayerSourceMode) => void
  setActiveTab: (tab: string) => void
  setCommandHistory: (
    history: string[] | ((prev: string[]) => string[])
  ) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsThemePickerOpen: (isOpen: boolean) => void
  setSelectedThemeIndex: (index: number) => void
  setVisualizerMode: (mode: VisualizerMode) => void
  showHelpTab: boolean
  showMusicListTab: boolean
  showRadioHistoryTab: boolean
  showRadioListTab: boolean
  simulateLoading: (
    messages: { text: string; delay: number }[],
    onComplete?: () => void
  ) => Promise<void>
  tabs: PlayerTab[]
  toggleRepeat: () => void
  toggleShuffle: () => void
  unmuteVolume: () => void
  visibleItems: PlayerQueueItem[]
  visualizerMode: VisualizerMode
  volume: number
  volumeRef: { current: number }
}) {
  return useCallback(
    (command: string) => {
      const rawCommand = command.trim()
      const cmd = normalizeCommand(rawCommand)
      const pathCommandMatch = /^(music|radio)\s+--\s*path\s+(.+)$/i.exec(
        rawCommand
      )

      if (cmd === ':q') {
        if (activeTab === 'help' && showHelpTab) {
          closeHelpTab()
        } else if (activeTab === 'radio-history' && showRadioHistoryTab) {
          closeRadioHistoryTab()
        } else if (activeTab === 'radio-list' && showRadioListTab) {
          closeRadioListTab()
        } else if (activeTab === 'music-list' && showMusicListTab) {
          closeMusicListTab()
        } else if (showHelpTab) {
          closeHelpTab()
        } else if (showRadioHistoryTab) {
          closeRadioHistoryTab()
        } else if (showRadioListTab) {
          closeRadioListTab()
        } else if (showMusicListTab) {
          closeMusicListTab()
        } else {
          addToHistory('[INFO] No temporary tab is open')
        }
        return
      }

      if (isLoading) {
        addToHistory(`$ ${command}`)
        addToHistory('[ERROR] Wait for the current process to finish')
        return
      }

      addToHistory(`$ ${command}`)

      const sourceCommandMode = getSourceCommandMode(
        cmd,
        pathCommandMatch?.[1]?.toLowerCase()
      )

      if (sourceCommandMode && sourceCommandMode !== activeSourceMode) {
        addToHistory(
          `[ERROR] Current mode is ${sourceCommandLabel(activeSourceMode)}.`
        )
        addToHistory(
          `[HINT] Only ${sourceCommandLabel(
            activeSourceMode
          )} commands are supported in this mode.`
        )
        addToHistory(
          `[HINT] Use 'source ${sourceCommandMode}' to switch modes.`
        )
        return
      }

      if (cmd === 'zsh-player --init' || cmd === 'init') {
        void simulateLoading(
          [
            { text: '[INFO] Starting zsh-player...', delay: 200 },
            { text: '[INFO] Loading audio modules...', delay: 300 },
            { text: '[INFO] Connecting Web Audio API...', delay: 250 },
            { text: '[INFO] Scanning music library...', delay: 200 },
          ],
          () => {
            addToHistory('[OK] Player initialized successfully')
            addToHistory(`[INFO] Active source: ${activeSource.label}`)
            addToHistory(`[INFO] ${activeItems.length} items available`)
            addToHistory(
              "[HINT] Use 'sources' to see modes or 'list' to see items"
            )
          }
        )
        return
      }

      if (cmd === 'version') {
        addToHistory(`[INFO] Prompt Play v${version}`)
        return
      }

      if (cmd === 'doctor') {
        void getPlayerDiagnostics().then(lines => {
          for (const line of lines) {
            addToHistory(line)
          }
        })
        return
      }

      if (cmd === 'theme list' || cmd === 'ls -th') {
        setSelectedThemeIndex(
          Math.max(
            0,
            THEMES.findIndex(theme => theme.id === activeTheme)
          )
        )
        setIsThemePickerOpen(true)
      } else if (cmd.startsWith('theme use ')) {
        void applyTheme(cmd.slice(10).trim())
      } else if (cmd === 'music') {
        selectSource('local')
      } else if (pathCommandMatch?.[1].toLowerCase() === 'music') {
        selectSource('local')
        void scanMusicPath(pathCommandMatch[2])
      } else if (pathCommandMatch?.[1].toLowerCase() === 'radio') {
        addToHistory('[ERROR] Radio path configuration is not available')
        addToHistory("[HINT] Use 'radio add' or 'radio search \"CBN\"'")
      } else if (cmd === 'music config') {
        selectSource('local')
        void selectMusicFolder()
      } else if (cmd === 'music list') {
        selectSource('local')
        openMusicListTab()
      } else if (cmd === 'music clear' || cmd === 'music reset') {
        if (currentItem?.mode === 'local') {
          clearPlayback()
        }
        void clearMusicLibraries()
      } else if (cmd === 'radio' || cmd === 'fm') {
        selectSource('radio')
      } else if (cmd === 'home' || cmd === 'exit') {
        navigate('/')
      } else if (cmd === 'quit') {
        window.App.quit()
      } else if (cmd === 'clear playback') {
        clearPlayback()
      } else if (cmd === 'clear all') {
        void clearAllPlayback()
      } else if (cmd === 'clear') {
        setCommandHistory(['$ '])
      } else if (cmd === 'open now-playing') {
        setActiveTab('now-playing')
        addToHistory('[OK] Selected cat now_playing.txt tab')
      } else if (cmd === 'open visualizer') {
        setActiveTab('visualizer')
        addToHistory(`[OK] Selected ./visualizer --mode=${visualizerMode} tab`)
      } else if (cmd === 'open controls') {
        setActiveTab('controls')
        addToHistory('[OK] Selected ./player-controls tab')
      } else if (cmd === 'radio list' || cmd === 'ls -ra') {
        selectSource('radio')
        openRadioListTab()
      } else if (cmd.startsWith('radio search music ')) {
        const itemIndex = Number.parseInt(cmd.slice(19).trim(), 10)

        if (
          Number.isInteger(itemIndex) &&
          itemIndex >= 1 &&
          itemIndex <= radioHistory.length
        ) {
          void openRadioHistorySearch(itemIndex - 1)
        } else {
          addToHistory('[ERROR] Use radio search music <history-number>')
        }
      } else if (cmd.startsWith('radio search ')) {
        const term = rawCommand.slice(13).trim().replace(/^"|"$/g, '')

        if (!term) {
          addToHistory('[ERROR] Use radio search "station, city, state or tag"')
          return
        }

        selectSource('radio')
        openRadioListTab()
        addToHistory(`[INFO] Searching Radio Browser for Brazil: ${term}`)
        void searchRadios(term)
          .then(count => {
            addToHistory(`[OK] Found ${count} radios`)
            addToHistory("[HINT] Use 'radio add 1' to save a result")
          })
          .catch(error => {
            addToHistory(
              `[ERROR] Radio Browser search failed: ${
                error instanceof Error ? error.message : 'unknown error'
              }`
            )
          })
      } else if (cmd.startsWith('radio add')) {
        const input = rawCommand.slice(9).trim()
        const itemIndex = Number.parseInt(input, 10)

        if (Number.isInteger(itemIndex) && input === String(itemIndex)) {
          void addSearchResult(itemIndex - 1).then(item => {
            if (item) {
              addToHistory(`[OK] Saved radio: ${item.title}`)
            } else {
              addToHistory('[ERROR] Search result not found')
            }
          })
          return
        }

        const parts = input.split('|')
        const radio = createManualRadioFromParts(parts)

        if (!radio) {
          addToHistory(
            '[ERROR] Use radio add <search-number> or radio add Name | City | State | URL | Frequency'
          )
          return
        }

        void addManualRadio(radio).then(item => {
          addToHistory(`[OK] Saved radio: ${item.title}`)
        })
      } else if (cmd.startsWith('radio edit ')) {
        const input = rawCommand.slice(11).trim()
        const match = /^(\d+)\s+(.+)$/.exec(input)

        if (!match) {
          addToHistory(
            '[ERROR] Use radio edit <number> Name | City | State | URL | Frequency'
          )
          return
        }

        const itemIndex = Number.parseInt(match[1], 10)
        const radio = createManualRadioFromParts(match[2].split('|'))

        if (!radio) {
          addToHistory(
            '[ERROR] Use radio edit <number> Name | City | State | URL | Frequency'
          )
          return
        }

        void editRadio(itemIndex - 1, radio).then(item => {
          if (item) {
            addToHistory(`[OK] Edited radio: ${item.title}`)
          } else {
            addToHistory('[ERROR] Radio not found')
          }
        })
      } else if (cmd.startsWith('radio remove ')) {
        const itemIndex = Number.parseInt(cmd.slice(13).trim(), 10)

        if (!Number.isInteger(itemIndex) || itemIndex < 1) {
          addToHistory('[ERROR] Use radio remove <number>')
          return
        }

        void removeRadio(itemIndex - 1).then(item => {
          if (item) {
            addToHistory(`[OK] Removed radio: ${item.title}`)
          } else {
            addToHistory('[ERROR] Radio not found')
          }
        })
      } else if (cmd === 'radio clear') {
        if (currentItem?.mode === 'radio') {
          clearPlayback()
        }
        void clearRadios().then(() => {
          addToHistory('[OK] Cleared saved radios')
        })
      } else if (cmd === 'radio history') {
        openRadioHistoryTab()
      } else if (cmd.startsWith('visualizer ')) {
        const mode = cmd.slice(11).trim() as VisualizerMode

        if (mode === 'ascii') {
          setVisualizerMode(mode)
          setActiveTab('visualizer')
          addToHistory(`[OK] Visualizer set to ${mode}`)
        } else {
          addToHistory(
            '[ERROR] Use visualizer ascii'
          )
        }
      } else if (cmd === 'ls -la') {
        setActiveTab('tracks')
        addToHistory('[OK] Selected ls -la tab')
      } else if (cmd === 'sources') {
        addToHistory('[INFO] Available sources:')
        Object.values(PLAYER_SOURCES).forEach(source => {
          const prefix = source.mode === activeSourceMode ? '▶' : ' '
          addToHistory(
            `[INFO] ${prefix} ${source.mode.padEnd(5)} ${source.description}`
          )
        })
      } else if (cmd.startsWith('source ')) {
        const mode = cmd.slice(7).trim() as PlayerSourceMode

        if (mode in PLAYER_SOURCES) {
          selectSource(mode)
        } else {
          addToHistory(`[ERROR] Source not found: ${mode}`)
          addToHistory("[HINT] Use 'sources' to see available sources")
        }
      } else if (cmd === 'play' || cmd === 'resume') {
        if (currentItem) {
          setIsPlaying(true)
          addToHistory('[PLAYING] Playback resumed')
        } else if (queueItems.length > 0) {
          playItem(queueItems[0])
        }
      } else if (cmd === 'pause' || cmd === 'stop') {
        clearConnectionTimers()
        setIsPlaying(false)
        addToHistory('[PAUSED] Playback paused')
      } else if (cmd === 'next' || cmd === 'n') {
        nextItem()
      } else if (cmd === 'prev' || cmd === 'p') {
        prevItem()
      } else if (cmd === 'shuffle') {
        toggleShuffle()
      } else if (cmd === 'repeat') {
        toggleRepeat()
      } else if (cmd.startsWith('play ')) {
        const query = normalizeCommand(rawCommand.slice(5).replace(/"/g, ''))
        const itemIndex = Number.parseInt(query, 10)

        const playableItems =
          activeSourceMode === 'radio' &&
          activeTab === 'radio-list' &&
          showRadioListTab
            ? queueItems
            : visibleItems
        const found =
          Number.isInteger(itemIndex) &&
          itemIndex >= 1 &&
          itemIndex <= playableItems.length
            ? playableItems[itemIndex - 1]
            : playableItems.find(
                item =>
                  normalizeCommand(item.title).includes(query) ||
                  normalizeCommand(item.artist).includes(query)
              )

        if (found) {
          playItem(found)
        } else {
          addToHistory(
            `[ERROR] Item not found in ${activeSource.label}: ${query}`
          )
        }
      } else if (cmd === 'list' || cmd === 'ls') {
        addToHistory(`[INFO] Listing ${activeSource.label}...`)
        const listedItems =
          activeSourceMode === 'radio' ? recentRadioItems : visibleItems

        if (listedItems.length === 0 && activeSourceMode === 'radio') {
          addToHistory('[INFO] No recently played radios yet')
          addToHistory("[HINT] Use 'radio list' or 'radio search \"CBN\"'")
          return
        }

        if (listedItems.length === 0 && activeSourceMode === 'local') {
          addToHistory('[INFO] no recent musics to listen')
          addToHistory('[HINT] type music -- path pathname to config')
          return
        }

        listedItems.forEach((item, index) => {
          const prefix = currentItem?.id === item.id ? '▶' : ' '
          const context =
            item.mode === 'radio'
              ? ` - ${item.artist} - ${item.sourceDetail}`
              : ''
          addToHistory(`[INFO] ${prefix} ${index + 1}. ${item.title}${context}`)
        })
      } else if (cmd === 'help' || cmd === 'h' || cmd === '?') {
        openHelpTab()
      } else if (cmd === 'status' || cmd === 'info') {
        addToHistory(`[STATUS] Source: ${activeSource.label}`)
        if (currentItem) {
          addToHistory(`[STATUS] Playing: ${currentItem.title}`)
          addToHistory(
            `[STATUS] ${activeSource.creatorLabel}: ${currentItem.artist}`
          )
          addToHistory(`[STATUS] Volume: ${Math.round(volume * 100)}%`)
          addToHistory(`[STATUS] Shuffle: ${isShuffleEnabled ? 'on' : 'off'}`)
          addToHistory(`[STATUS] Repeat: ${isRepeatEnabled ? 'on' : 'off'}`)
          addToHistory(
            `[STATUS] Audio API: ${isConnected ? 'Connected' : 'Procedural'}`
          )
        } else {
          addToHistory('[STATUS] No item is playing')
        }
      } else if (cmd === 'mute') {
        muteVolume()
        addToHistory('[OK] Volume muted')
      } else if (cmd === 'unmute') {
        unmuteVolume()
        addToHistory(
          `[OK] Volume restored to ${Math.round(volumeRef.current * 100)}%`
        )
      } else if (cmd.startsWith('vol ')) {
        const volumeInput = cmd.slice(4).trim()
        const relativeMatch = /^([+-])\s*(\d+)$/.exec(volumeInput)
        const newVolume = relativeMatch
          ? clampVolumePercent(
              Math.round(volume * 100) +
                (relativeMatch[1] === '+' ? 1 : -1) *
                  Number.parseInt(relativeMatch[2], 10)
            )
          : Number.parseInt(volumeInput, 10)

        if (!Number.isNaN(newVolume) && newVolume >= 0 && newVolume <= 100) {
          handleVolumeChange(newVolume / 100)
          addToHistory(`[OK] Volume set to ${newVolume}%`)
        } else {
          addToHistory('[ERROR] Use vol 0-100, vol +10, or vol -10')
        }
      } else if (cmd.startsWith('tab ')) {
        const tabNumber = Number.parseInt(cmd.slice(4), 10)

        if (tabNumber >= 1 && tabNumber <= tabs.length) {
          setActiveTab(tabs[tabNumber - 1].id)
          addToHistory(`[OK] Selected tab ${tabNumber}`)
        } else {
          addToHistory(
            `[ERROR] Tab number must be between 1 and ${tabs.length}`
          )
        }
      } else if (cmd) {
        addToHistory(`[ERROR] Unknown command: ${cmd}`)
        addToHistory("[HINT] Type 'help' to see available commands")
      }
    },
    [
      activeItems,
      activeSource,
      activeSourceMode,
      activeTab,
      activeTheme,
      addToHistory,
      addManualRadio,
      addSearchResult,
      applyTheme,
      clearAllPlayback,
      clearMusicLibraries,
      clearPlayback,
      clearRadios,
      clearConnectionTimers,
      closeHelpTab,
      closeMusicListTab,
      closeRadioHistoryTab,
      closeRadioListTab,
      currentItem,
      createManualRadioFromParts,
      editRadio,
      getPlayerDiagnostics,
      handleVolumeChange,
      isConnected,
      isLoading,
      isRepeatEnabled,
      isShuffleEnabled,
      muteVolume,
      navigate,
      nextItem,
      openHelpTab,
      openMusicListTab,
      openRadioHistoryTab,
      openRadioHistorySearch,
      openRadioListTab,
      playItem,
      prevItem,
      queueItems,
      recentRadioItems,
      radioHistory.length,
      removeRadio,
      scanMusicPath,
      searchRadios,
      selectMusicFolder,
      selectSource,
      setActiveTab,
      setCommandHistory,
      setIsPlaying,
      setIsThemePickerOpen,
      setSelectedThemeIndex,
      setVisualizerMode,
      showHelpTab,
      showMusicListTab,
      showRadioHistoryTab,
      showRadioListTab,
      simulateLoading,
      tabs,
      toggleRepeat,
      toggleShuffle,
      unmuteVolume,
      visibleItems,
      visualizerMode,
      volume,
      volumeRef,
    ]
  )
}
