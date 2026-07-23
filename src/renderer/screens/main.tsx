import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "renderer/components/Header";

import { HelpTab } from "renderer/components/music-player/help-tab";
import { MusicListTab } from "renderer/components/music-player/music-list-tab";
import { NowPlaying } from "renderer/components/music-player/now-playing";
import { NowPlayingJsonTab } from "renderer/components/music-player/now-playing-json-tab";
import { PlayerControls } from "renderer/components/music-player/player-controls";
import { RadioHistoryTab } from "renderer/components/music-player/radio-history-tab";
import { RadioListTab } from "renderer/components/music-player/radio-list-tab";
import { StatusFooter } from "renderer/components/music-player/status-footer";
import { TerminalPrompt } from "renderer/components/music-player/terminal-prompt";
import { TerminalTabs } from "renderer/components/music-player/terminal-tabs";
import { TrackList } from "renderer/components/music-player/track-list";
import {
  Visualizer,
  type VisualizerMode,
} from "renderer/components/music-player/visualizer";
import tuningInSoundUrl from "shared/sounds/tuning-in.mp3";
import {
  useClearStoredValues,
  useSetStoredValue,
  useStoredValue,
} from "renderer/hooks/use-app-storage";
import { useAudioAnalyzer } from "renderer/hooks/use-audio-analyzer";
import { useMusicLibrary } from "renderer/hooks/use-music-library";
import { usePlayerCommands } from "renderer/hooks/use-player-commands";
import {
  createManualRadioFromParts,
  useRadioSource,
} from "renderer/hooks/use-radio-source";
import { PLAYER_SOURCES } from "renderer/lib/player-sources";
import {
  getPlaybackErrorMessage,
  getRandomQueueIndex,
  isExpectedPlaybackAbort,
  normalizeAudioSrc,
} from "renderer/lib/player-utils";
import { getThemeById, THEMES, type ThemeId } from "renderer/lib/themes";
import type {
  AppSettings,
  NowPlayingSnapshot,
  PlayerQueueItem,
  PlayerSource,
  PlayerSourceMode,
  RadioHistoryEntry,
  RadioMetadata,
} from "shared/types";
import { version } from "../../../package.json";

function getTabs(
  source: PlayerSource,
  visualizerMode: VisualizerMode,
  showHelpTab: boolean,
  showRadioListTab: boolean,
  showRadioHistoryTab: boolean,
  showMusicListTab: boolean,
  showNowPlayingJsonTab: boolean,
) {
  const tabs = [
    { id: "tracks", label: source.listCommand, shortcut: "⌘1" },
    {
      id: "now-playing",
      label: showNowPlayingJsonTab
        ? "cat now_playing.json"
        : "cat now_playing.txt",
      shortcut: "⌘2",
    },
    {
      id: "visualizer",
      label: `./visualizer --mode=${visualizerMode}`,
      shortcut: "⌘3",
    },
    { id: "controls", label: "./player-controls", shortcut: "⌘4" },
  ];

  if (showRadioListTab) {
    tabs.push({ id: "radio-list", label: "radio list", shortcut: ":q" });
  }

  if (showRadioHistoryTab) {
    tabs.push({
      id: "radio-history",
      label: "cat radio_history.txt",
      shortcut: ":q",
    });
  }

  if (showMusicListTab) {
    tabs.push({ id: "music-list", label: "music lists", shortcut: ":q" });
  }

  if (showHelpTab) {
    tabs.push({ id: "help", label: "Prompt Play Help", shortcut: ":q" });
  }

  return tabs;
}

export function MainScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSourceMode, setActiveSourceMode] = useState<PlayerSourceMode>(
    () => {
      const source = searchParams.get("source");

      if (source === "radio") {
        return source;
      }

      return "local";
    },
  );
  const [activeTheme, setActiveTheme] = useState<ThemeId>("default");
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<PlayerQueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(false);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [artistQueueFilter, setArtistQueueFilter] = useState<string | null>(
    null,
  );
  const [visualizerMode, setVisualizerMode] =
    useState<VisualizerMode>("ascii");
  const [radioMetadata, setRadioMetadata] = useState<RadioMetadata | null>(
    null,
  );
  const [radioMetadataUpdatedAt, setRadioMetadataUpdatedAt] = useState<
    number | null
  >(null);
  const [radioHistory, setRadioHistory] = useState<RadioHistoryEntry[]>([]);
  const [relativeTimeNow, setRelativeTimeNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("tracks");
  const [showHelpTab, setShowHelpTab] = useState(false);
  const [showRadioListTab, setShowRadioListTab] = useState(false);
  const [showRadioHistoryTab, setShowRadioHistoryTab] = useState(false);
  const [showMusicListTab, setShowMusicListTab] = useState(false);
  const [showNowPlayingJsonTab, setShowNowPlayingJsonTab] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([
    `[INFO] prompt play v${version}`,
    "[HINT] Type 'music', 'radio', or 'help'",
    "$ ",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [radioStaticEnabled, setRadioStaticEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const radioStaticAudioRef = useRef<HTMLAudioElement>(null);
  const connectionTimersRef = useRef<number[]>([]);
  const radioStaticTimerRef = useRef<number | null>(null);
  const radioFallbackTimerRef = useRef<number | null>(null);
  const radioFallbackItemIdRef = useRef<string | null>(null);
  const connectedRadioItemIdRef = useRef<string | null>(null);
  const previousTabRef = useRef("tracks");
  const trackListScrollRef = useRef<HTMLDivElement>(null);
  const radioListScrollRef = useRef<HTMLDivElement>(null);
  const radioHistoryScrollRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);
  const previousVolumeRef = useRef(volume);
  const currentRadioIdRef = useRef<string | null>(null);
  const currentRadioNameRef = useRef("");
  const lastRadioMetadataRef = useRef("");
  const lastErrorRef = useRef<string | null>(null);
  const playbackSnapshotRef = useRef({
    currentTime: 0,
    duration: 0,
    volume,
  });
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const { data: storedTheme, isFetched: hasFetchedStoredTheme } =
    useStoredValue<ThemeId>("prompt-play-theme");
  const { data: storedSettings, isFetched: hasFetchedStoredSettings } =
    useStoredValue<AppSettings>("prompt-play-settings");
  const persistTheme = useSetStoredValue<ThemeId>("prompt-play-theme");
  const persistSettings = useSetStoredValue<AppSettings>(
    "prompt-play-settings",
  );
  const { mutateAsync: clearStoredValues } = useClearStoredValues();

  const addToHistory = useCallback((command: string) => {
    setCommandHistory((prev) => [...prev.slice(-30), command]);
  }, []);

  const stopRadioStatic = useCallback(() => {
    if (radioStaticTimerRef.current !== null) {
      window.clearTimeout(radioStaticTimerRef.current);
      radioStaticTimerRef.current = null;
    }

    const staticAudio = radioStaticAudioRef.current;

    if (staticAudio) {
      staticAudio.pause();
      staticAudio.currentTime = 0;
    }
  }, []);

  const clearConnectionTimers = useCallback(() => {
    connectionTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    connectionTimersRef.current = [];
    if (radioFallbackTimerRef.current !== null) {
      window.clearTimeout(radioFallbackTimerRef.current);
      radioFallbackTimerRef.current = null;
    }
    radioFallbackItemIdRef.current = null;
    stopRadioStatic();
  }, [stopRadioStatic]);

  useEffect(() => {
    return () => clearConnectionTimers();
  }, [clearConnectionTimers]);

  useEffect(() => {
    playbackSnapshotRef.current = {
      currentTime,
      duration,
      volume,
    };
  }, [currentTime, duration, volume]);

  const createNowPlayingSnapshot = useCallback(
    (playback = playbackSnapshotRef.current): NowPlayingSnapshot => ({
      updateAt: new Date().toISOString(),
      source: activeSourceMode,
      isPlaying,
      item: currentItem
        ? {
            id: currentItem.id,
            mode: currentItem.mode,
            title: currentItem.title,
            sourceDetail: currentItem.sourceDetail,
            src: currentItem.src,
          }
        : null,
      radioMetadata:
        currentItem?.mode === "radio" && radioMetadata ? radioMetadata : {},
      playback: {
        currentTime: Math.round(playback.currentTime),
        duration:
          Number.isFinite(playback.duration) && playback.duration > 0
            ? Math.round(playback.duration)
            : null,
        volume: Math.round(playback.volume * 100),
      },
    }),
    [activeSourceMode, currentItem, isPlaying, radioMetadata],
  );

  const nowPlayingJsonSnapshot = useMemo(
    () =>
      createNowPlayingSnapshot({
        currentTime,
        duration,
        volume,
      }),
    [createNowPlayingSnapshot, currentTime, duration, volume],
  );

  const writeNowPlayingSnapshot = useCallback(() => {
    const snapshot = createNowPlayingSnapshot();

    void window.App.writeNowPlaying(snapshot).catch((error: unknown) => {
      console.warn("[now-playing] Could not write now_playing.json:", error);
    });
  }, [createNowPlayingSnapshot]);

  useEffect(() => {
    writeNowPlayingSnapshot();
  }, [writeNowPlayingSnapshot]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const interval = window.setInterval(writeNowPlayingSnapshot, 5000);

    return () => window.clearInterval(interval);
  }, [isPlaying, writeNowPlayingSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(
      () => setRelativeTimeNow(Date.now()),
      30_000,
    );

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return window.App.onRadioMetadata((metadata) => {
      if (metadata.radioId !== currentRadioIdRef.current) {
        return;
      }

      const metadataKey = `${metadata.radioId}\u0000${metadata.title}\u0000${
        metadata.subtitle ?? ""
      }`;

      if (metadataKey === lastRadioMetadataRef.current) {
        return;
      }

      const updatedAt = Date.now();
      lastRadioMetadataRef.current = metadataKey;
      setRadioMetadata(metadata);
      setRadioMetadataUpdatedAt(updatedAt);
      setRelativeTimeNow(updatedAt);
      if (
        metadata.isMusic &&
        metadata.title.trim() &&
        metadata.title.toLowerCase() !== "unavailable"
      ) {
        setRadioHistory((prev) =>
          [
            {
              ...metadata,
              id: `${updatedAt}-${metadata.radioId}-${metadata.title}`,
              radioName: currentRadioNameRef.current,
              updatedAt,
            },
            ...prev,
          ].slice(0, 10),
        );
      }
      addToHistory(`  ♫ now playing: ${metadata.title}`);

      if (metadata.subtitle) {
        addToHistory(`  artist: ${metadata.subtitle}`);
      }
    });
  }, [addToHistory]);

  useEffect(() => {
    const isPlayingRadio = currentItem?.mode === "radio" && isPlaying;

    currentRadioIdRef.current = isPlayingRadio ? currentItem.id : null;
    currentRadioNameRef.current = isPlayingRadio ? currentItem.title : "";

    if (!isPlayingRadio) {
      window.App.stopRadioMetadata();
      return;
    }

    window.App.startRadioMetadata(
      currentItem.id,
      currentItem.src,
      currentItem.title,
    );

    return () => {
      window.App.stopRadioMetadata();
    };
  }, [currentItem, isPlaying]);

  const normalizeArtistFilter = useCallback(
    (artist: string) =>
      artist
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    [],
  );

  const closeHelpTab = useCallback(() => {
    setShowHelpTab(false);
    setActiveTab(previousTabRef.current);
    addToHistory("[OK] Help tab closed");
  }, [addToHistory]);

  const closeRadioListTab = useCallback(() => {
    setShowRadioListTab(false);
    setActiveTab(previousTabRef.current);
    addToHistory("[OK] Radio list tab closed");
  }, [addToHistory]);

  const closeRadioHistoryTab = useCallback(() => {
    setShowRadioHistoryTab(false);
    setActiveTab(previousTabRef.current);
    addToHistory("[OK] Radio history tab closed");
  }, [addToHistory]);

  const closeMusicListTab = useCallback(() => {
    setShowMusicListTab(false);
    setActiveTab(previousTabRef.current);
    addToHistory("[OK] Music lists tab closed");
  }, [addToHistory]);

  const closeNowPlayingJsonTab = useCallback(() => {
    setShowNowPlayingJsonTab(false);
    setActiveTab("now-playing");
    addToHistory("[OK] Returned to cat now_playing.txt");
  }, [addToHistory]);

  const openHelpTab = useCallback(() => {
    previousTabRef.current =
      activeTab === "help" ? previousTabRef.current : activeTab;
    setShowHelpTab(true);
    setActiveTab("help");
    addToHistory("[HELP] Opened Prompt Play Help");
  }, [activeTab, addToHistory]);

  const openRadioListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === "radio-list" ? previousTabRef.current : activeTab;
    setShowRadioListTab(true);
    setActiveTab("radio-list");
    addToHistory("[INFO] Opened radio list");
  }, [activeTab, addToHistory]);

  const openRadioHistoryTab = useCallback(() => {
    previousTabRef.current =
      activeTab === "radio-history" ? previousTabRef.current : activeTab;
    setShowRadioHistoryTab(true);
    setActiveTab("radio-history");
    addToHistory("[INFO] Opened radio history");
  }, [activeTab, addToHistory]);

  const openMusicListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === "music-list" ? previousTabRef.current : activeTab;
    setShowMusicListTab(true);
    setActiveTab("music-list");
    addToHistory("[INFO] Opened music lists");
  }, [activeTab, addToHistory]);

  const openNowPlayingJsonTab = useCallback(() => {
    setShowNowPlayingJsonTab(true);
    setActiveTab("now-playing");
    addToHistory("[INFO] Selected cat now_playing.json");
  }, [addToHistory]);

  const {
    clearMusicLibraries,
    musicLibraries,
    resetMusicLibraries,
    scanMusicPath,
    selectMusicFolder,
    updateLocalItemDuration,
  } = useMusicLibrary({
    addToHistory,
    openMusicListTab,
    setCurrentItem,
    setIsLoading,
  });
  const {
    addManualRadio,
    addSearchResult,
    clearRadios,
    editRadio,
    exportRadios,
    importRadios,
    pinRadio,
    pinRadioItem,
    pinnedRadioItems,
    radioItems,
    radioListItems,
    radioListMode,
    radioSearchTerm,
    radioStatuses,
    recentRadioItems,
    rememberRecentRadio,
    removeRadio,
    searchRadios,
    showSavedRadios,
    unpinRadio,
  } = useRadioSource({ activeTab, showRadioListTab });
  const openSavedRadioListTab = useCallback(() => {
    showSavedRadios();
    openRadioListTab();
  }, [openRadioListTab, showSavedRadios]);
  const localItems = useMemo(
    () => musicLibraries[0]?.items ?? [],
    [musicLibraries],
  );
  const items = useMemo(
    () => [...localItems, ...radioItems],
    [localItems, radioItems],
  );
  const activeSource = useMemo(() => {
    const source = PLAYER_SOURCES[activeSourceMode];

    if (activeSourceMode !== "local" || musicLibraries.length === 0) {
      return source;
    }

    return {
      ...source,
      locationLabel: musicLibraries[0].path,
      emptyHint: "type music -- path pathname to config",
    };
  }, [activeSourceMode, musicLibraries]);
  const canAnalyzeAudio = activeSource.supportsSeek;
  const { frequencyData, isConnected } = useAudioAnalyzer(
    audioElement,
    isPlaying,
    canAnalyzeAudio,
  );
  const activeItems = useMemo(
    () => items.filter((item) => item.mode === activeSourceMode),
    [activeSourceMode, items],
  );
  const artistQueueItems = useMemo(() => {
    if (!artistQueueFilter || activeSourceMode !== "local") {
      return activeItems;
    }

    return activeItems.filter((item) =>
      normalizeArtistFilter(item.artist).includes(artistQueueFilter),
    );
  }, [
    activeItems,
    activeSourceMode,
    artistQueueFilter,
    normalizeArtistFilter,
  ]);
  const visibleRadioItems =
    pinnedRadioItems.length > 0 ? pinnedRadioItems : recentRadioItems;
  const visibleItems =
    activeSourceMode === "radio" ? visibleRadioItems : activeItems;
  const queueItems =
    activeSourceMode === "radio"
      ? activeTab === "radio-list" && showRadioListTab
        ? radioListItems
        : visibleRadioItems
      : artistQueueItems;
  const tabs = useMemo(
    () =>
      getTabs(
        activeSource,
        visualizerMode,
        showHelpTab,
        showRadioListTab,
        showRadioHistoryTab,
        showMusicListTab,
        showNowPlayingJsonTab,
      ),
    [
      activeSource,
      visualizerMode,
      showHelpTab,
      showRadioListTab,
      showRadioHistoryTab,
      showMusicListTab,
      showNowPlayingJsonTab,
    ],
  );

  const cycleTab = useCallback(() => {
    setActiveTab((currentTab) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % tabs.length;

      return tabs[nextIndex]?.id ?? "tracks";
    });
  }, [tabs]);

  const scrollRadioList = useCallback((direction: "down" | "up") => {
    radioListScrollRef.current?.scrollBy({
      top: direction === "down" ? 48 : -48,
      behavior: "smooth",
    });
  }, []);

  const scrollRadioHistory = useCallback((direction: "down" | "up") => {
    radioHistoryScrollRef.current?.scrollBy({
      top: direction === "down" ? 72 : -72,
      behavior: "smooth",
    });
  }, []);

  const scrollTrackList = useCallback((direction: "down" | "up") => {
    trackListScrollRef.current?.scrollBy({
      top: direction === "down" ? 48 : -48,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }
  }, [activeSourceMode, currentItem]);

  useEffect(() => {
    if (!hasFetchedStoredTheme) {
      return;
    }

    const theme = storedTheme ? getThemeById(storedTheme) : undefined;

    if (theme) {
      setActiveTheme(theme.id);
      setSelectedThemeIndex(THEMES.findIndex((item) => item.id === theme.id));
    }
  }, [hasFetchedStoredTheme, storedTheme]);

  useEffect(() => {
    if (!hasFetchedStoredSettings) {
      return;
    }

    setRadioStaticEnabled(storedSettings?.radioStaticEnabled ?? true);
  }, [hasFetchedStoredSettings, storedSettings]);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
  }, [activeTheme]);

  const selectSource = useCallback(
    (mode: PlayerSourceMode) => {
      clearConnectionTimers();
      const nextSource = PLAYER_SOURCES[mode];

      setActiveSourceMode(mode);
      setCurrentItem(null);
      setArtistQueueFilter(null);
      setRadioMetadata(null);
      setRadioMetadataUpdatedAt(null);
      lastRadioMetadataRef.current = "";
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      connectedRadioItemIdRef.current = null;
      addToHistory(`[INFO] Active source: ${nextSource.label}`);
      addToHistory(`[INFO] ${nextSource.description}`);
    },
    [addToHistory, clearConnectionTimers],
  );

  const clearPlayback = useCallback(() => {
    clearConnectionTimers();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    setCurrentItem(null);
    setArtistQueueFilter(null);
    setRadioMetadata(null);
    setRadioMetadataUpdatedAt(null);
    lastRadioMetadataRef.current = "";
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    connectedRadioItemIdRef.current = null;
    addToHistory("[OK] Cleared playback for radio and music");
  }, [addToHistory, clearConnectionTimers]);

  const clearAllPlayback = useCallback(async () => {
    clearPlayback();

    try {
      await clearStoredValues();
      setActiveTheme("default");
      setRadioStaticEnabled(true);
      setSelectedThemeIndex(THEMES.findIndex((item) => item.id === "default"));
      await resetMusicLibraries();
      addToHistory("[OK] Removed saved Electron Storage data");
    } catch (error) {
      addToHistory(
        `[ERROR] Could not remove saved Electron Storage data: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }, [addToHistory, clearPlayback, clearStoredValues, resetMusicLibraries]);

  const applyRadioStaticSetting = useCallback(
    async (enabled: boolean) => {
      const nextSettings = {
        ...(storedSettings ?? {}),
        radioStaticEnabled: enabled,
      };

      try {
        await persistSettings(nextSettings);
        setRadioStaticEnabled(enabled);
        if (!enabled) {
          stopRadioStatic();
        }
        addToHistory(`[OK] Radio static ${enabled ? "enabled" : "disabled"}`);
      } catch (error) {
        addToHistory(
          `[ERROR] Could not save radio static setting: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    },
    [addToHistory, persistSettings, stopRadioStatic, storedSettings],
  );

  const getPlayerDiagnostics = useCallback(async () => {
    const lines = ["Prompt Play Diagnostic", ""];
    const addStatus = (label: string, isOk: boolean, detail?: string) => {
      lines.push(
        `${label}: ${isOk ? "OK" : "ERROR"}${detail ? ` (${detail})` : ""}`,
      );
    };

    addStatus("Renderer", typeof window !== "undefined" && Boolean(window.App));
    addStatus("Audio Engine", Boolean(audioRef.current));
    addStatus("Radio Streams", radioItems.length > 0);
    try {
      await window.App.getStorageValue("prompt-play-theme");
      addStatus("Storage", true);
    } catch (error) {
      addStatus(
        "Storage",
        false,
        error instanceof Error ? error.message : "unknown error",
      );
    }

    lines.push("");
    lines.push(`Version: ${version}`);

    return lines;
  }, [radioItems.length]);

  const openRadioHistorySearch = useCallback(
    async (index: number) => {
      const entry = radioHistory[index];

      if (!entry) {
        addToHistory(`[ERROR] Radio history item not found: ${index + 1}`);
        return;
      }

      const query = [entry.subtitle, entry.title].filter(Boolean).join(" ");
      const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(
        query,
      )}`;

      await window.App.openExternal(url);
      addToHistory(`[OK] Opened YouTube search for ${query}`);
    },
    [addToHistory, radioHistory],
  );

  const copyLastError = useCallback(async () => {
    if (!lastErrorRef.current) {
      addToHistory("[INFO] No playback error to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(lastErrorRef.current);
      addToHistory("[OK] Copied last error to clipboard");
    } catch (error) {
      addToHistory(
        `[ERROR] Could not copy error: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    }
  }, [addToHistory]);

  const playItem = useCallback(
    (item: PlayerQueueItem) => {
      clearConnectionTimers();

      if (item.mode !== activeSourceMode) {
        setActiveSourceMode(item.mode);
      }

      setCurrentItem(item);
      setRadioMetadata(null);
      setRadioMetadataUpdatedAt(null);
      lastRadioMetadataRef.current = "";
      connectedRadioItemIdRef.current = null;
      setCurrentTime(0);
      setDuration(item.duration ?? 0);
      setIsPlaying(false);
      addToHistory(`$ play "${item.title}"`);
      addToHistory(`[LOADING] Connecting to ${item.title}...`);

      const startPlaybackAfterConnected = () => {
        addToHistory(`[PLAYING] Connected to ${item.title}`);
        if (item.mode === "radio") {
          addToHistory("  ♫ now playing: unavailable");
        }
        window.requestAnimationFrame(() => {
          setIsPlaying(true);
        });
      };

      if (item.mode === "radio") {
        rememberRecentRadio(item);
        connectionTimersRef.current = [
          window.setTimeout(() => {
            addToHistory("[LOADING] Buffering...");
          }, 1000),
        ];
        window.requestAnimationFrame(() => {
          setIsPlaying(true);
        });
        return;
      }

      startPlaybackAfterConnected();
    },
    [activeSourceMode, addToHistory, clearConnectionTimers, rememberRecentRadio],
  );

  const playArtist = useCallback(
    (artist: string) => {
      const artistFilter = normalizeArtistFilter(artist);

      if (!artistFilter) {
        addToHistory("[ERROR] Use artist <name>");
        return;
      }

      const matchingItems = activeItems.filter(
        (item) =>
          item.mode === "local" &&
          normalizeArtistFilter(item.artist).includes(artistFilter),
      );

      if (matchingItems.length === 0) {
        addToHistory(`[ERROR] Artist not found: ${artist}`);
        return;
      }

      setArtistQueueFilter(artistFilter);
      addToHistory(
        `[OK] Artist queue: ${matchingItems[0].artist} (${matchingItems.length} items)`,
      );
      playItem(matchingItems[0]);
    },
    [activeItems, addToHistory, normalizeArtistFilter, playItem],
  );

  const clearArtistQueue = useCallback(() => {
    if (!artistQueueFilter) {
      addToHistory("[INFO] Artist queue is not active");
      return;
    }

    setArtistQueueFilter(null);
    addToHistory("[OK] Artist queue cleared");
  }, [addToHistory, artistQueueFilter]);

  const togglePlay = useCallback(() => {
    if (!currentItem) {
      if (queueItems.length > 0) {
        playItem(queueItems[0]);
      }
      return;
    }

    setIsPlaying((prev) => {
      const nextState = !prev;
      addToHistory(nextState ? "$ resume" : "$ pause");
      if (!nextState) {
        clearConnectionTimers();
      }
      addToHistory(
        nextState ? "[PLAYING] Playback resumed" : "[PAUSED] Playback paused",
      );
      return nextState;
    });
  }, [queueItems, currentItem, playItem, addToHistory, clearConnectionTimers]);

  const nextItem = useCallback(() => {
    if (!currentItem || queueItems.length === 0) {
      return;
    }

    const currentIndex = queueItems.findIndex(
      (item) => item.id === currentItem.id,
    );
    const nextIndex =
      isShuffleEnabled && queueItems.length > 1
        ? getRandomQueueIndex(queueItems.length, currentIndex)
        : (currentIndex + 1) % queueItems.length;
    addToHistory("$ next");
    playItem(queueItems[nextIndex]);
  }, [queueItems, currentItem, isShuffleEnabled, playItem, addToHistory]);

  const prevItem = useCallback(() => {
    if (!currentItem || queueItems.length === 0) {
      return;
    }

    const currentIndex = queueItems.findIndex(
      (item) => item.id === currentItem.id,
    );
    const prevIndex =
      currentIndex <= 0 ? queueItems.length - 1 : currentIndex - 1;
    addToHistory("$ prev");
    playItem(queueItems[prevIndex]);
  }, [queueItems, currentItem, playItem, addToHistory]);

  const startRadioFallback = useCallback(
    (
      item: PlayerQueueItem,
      reason: "buffering" | "playback failed",
      staticDelay = 1000,
    ) => {
      if (item.mode !== "radio") {
        return;
      }

      if (
        radioFallbackTimerRef.current === null ||
        radioFallbackItemIdRef.current !== item.id
      ) {
        if (radioFallbackTimerRef.current !== null) {
          window.clearTimeout(radioFallbackTimerRef.current);
        }

        radioFallbackItemIdRef.current = item.id;
        addToHistory(`[LOADING] Searching radio signal (${reason})...`);
        radioFallbackTimerRef.current = window.setTimeout(() => {
          radioFallbackTimerRef.current = null;
          radioFallbackItemIdRef.current = null;

          if (
            currentRadioIdRef.current !== item.id ||
            connectedRadioItemIdRef.current === item.id
          ) {
            return;
          }

          addToHistory(
            "[WARN] Radio not found after 30s, trying next station",
          );
          nextItem();
        }, 30_000);
      }

      if (!radioStaticEnabled || radioStaticTimerRef.current !== null) {
        return;
      }

      radioStaticTimerRef.current = window.setTimeout(() => {
        radioStaticTimerRef.current = null;

        if (
          currentRadioIdRef.current !== item.id ||
          connectedRadioItemIdRef.current === item.id ||
          !radioStaticEnabled
        ) {
          return;
        }

        const staticAudio = radioStaticAudioRef.current;

        if (!staticAudio) {
          return;
        }

        staticAudio.volume = Math.min(volumeRef.current, 1) * 0.45;
        staticAudio.currentTime = 0;
        staticAudio.play().catch(() => {
          // The effect is optional; autoplay policy or decode failures should
          // never block the radio stream.
        });
      }, staticDelay);
    },
    [addToHistory, nextItem, radioStaticEnabled],
  );

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume;
    }

    volumeRef.current = newVolume;
    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const adjustVolumeByPercent = useCallback(
    (delta: number) => {
      const nextVolume = Math.max(
        0,
        Math.min(100, Math.round(volumeRef.current * 100) + delta),
      );

      handleVolumeChange(nextVolume / 100);
      addToHistory(`[OK] Volume set to ${nextVolume}%`);
    },
    [addToHistory, handleVolumeChange],
  );

  const muteVolume = useCallback(() => {
    if (volumeRef.current > 0) {
      previousVolumeRef.current = volumeRef.current;
    }

    handleVolumeChange(0);
  }, [handleVolumeChange]);

  const unmuteVolume = useCallback(() => {
    handleVolumeChange(previousVolumeRef.current || 0.7);
  }, [handleVolumeChange]);

  const toggleShuffle = useCallback(() => {
    setIsShuffleEnabled((prev) => {
      const nextValue = !prev;
      addToHistory(`[OK] Shuffle ${nextValue ? "enabled" : "disabled"}`);
      return nextValue;
    });
  }, [addToHistory]);

  const toggleRepeat = useCallback(() => {
    setIsRepeatEnabled((prev) => {
      const nextValue = !prev;
      addToHistory(`[OK] Repeat ${nextValue ? "enabled" : "disabled"}`);
      return nextValue;
    });
  }, [addToHistory]);

  const applyTheme = useCallback(
    async (themeId: string) => {
      const theme = getThemeById(themeId);

      if (!theme) {
        addToHistory(`[ERROR] Theme not found: ${themeId}`);
        addToHistory("[HINT] Use 'theme list' to see available themes");
        return;
      }

      try {
        await persistTheme(theme.id);
        setActiveTheme(theme.id);
        setSelectedThemeIndex(THEMES.findIndex((item) => item.id === theme.id));
        setIsThemePickerOpen(false);
        addToHistory(`[INFO] Theme changed to ${theme.name}.`);
      } catch (error) {
        addToHistory(
          `[ERROR] Could not save theme: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    },
    [addToHistory, persistTheme],
  );

  const moveThemeSelection = useCallback((direction: "next" | "prev") => {
    setSelectedThemeIndex((prev) => {
      if (direction === "next") {
        return (prev + 1) % THEMES.length;
      }

      return prev === 0 ? THEMES.length - 1 : prev - 1;
    });
  }, []);

  const selectTheme = useCallback(
    (index = selectedThemeIndex) => {
      void applyTheme(THEMES[index]?.id ?? activeTheme);
    },
    [activeTheme, applyTheme, selectedThemeIndex],
  );

  const handleCommand = usePlayerCommands({
    activeSource,
    activeSourceMode,
    activeTab,
    activeTheme,
    addToHistory,
    applyTheme,
    applyRadioStaticSetting,
    addManualRadio,
    addSearchResult,
    clearAllPlayback,
    clearArtistQueue,
    clearMusicLibraries,
    clearPlayback,
    clearRadios,
    clearConnectionTimers,
    closeHelpTab,
    closeMusicListTab,
    closeNowPlayingJsonTab,
    closeRadioHistoryTab,
    closeRadioListTab,
    copyLastError,
    currentItem,
    createManualRadioFromParts,
    editRadio,
    exportRadios,
    getPlayerDiagnostics,
    handleVolumeChange,
    importRadios,
    isConnected,
    isLoading,
    isRepeatEnabled,
    isShuffleEnabled,
    muteVolume,
    navigate,
    nextItem,
    openHelpTab,
    openMusicListTab,
    openNowPlayingJsonTab,
    openRadioHistoryTab,
    openRadioHistorySearch,
    openRadioListTab: openSavedRadioListTab,
    pinRadio,
    pinRadioItem,
    pinnedRadioItems,
    playArtist,
    playItem,
    prevItem,
    queueItems,
    recentRadioItems,
    rememberRecentRadio,
    radioStaticEnabled,
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
    showNowPlayingJsonTab,
    showRadioHistoryTab,
    showRadioListTab,
    tabs,
    toggleRepeat,
    toggleShuffle,
    unmuteVolume,
    unpinRadio,
    visibleItems,
    visualizerMode,
    volume,
    volumeRef,
  });

  useEffect(() => {
    return window.App.onMenuCommand(handleCommand);
  }, [handleCommand]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (
        (activeTab === "radio-list" || activeTab === "tracks") &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "ArrowDown" || event.key === "ArrowUp")
      ) {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? "down" : "up";

        if (activeTab === "radio-list" && showRadioListTab) {
          scrollRadioList(direction);
          return;
        }

        if (activeTab === "tracks") {
          scrollTrackList(direction);
          return;
        }

        return;
      }

      if (event.key === "Tab" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        cycleTab();
        return;
      }

      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const tabMap: Record<string, string> = {
        "1": "tracks",
        "2": "now-playing",
        "3": "visualizer",
        "4": "controls",
      };

      if (tabMap[event.key]) {
        event.preventDefault();
        setActiveTab(tabMap[event.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, cycleTab, scrollRadioList, scrollTrackList, showRadioListTab]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const startRadioFallbackAfterDelay = () => {
      if (currentItem?.mode !== "radio") {
        return;
      }

      startRadioFallback(currentItem, "buffering");
    };
    const handleRadioReady = () => {
      if (currentItem?.mode !== "radio") {
        return;
      }

      clearConnectionTimers();

      if (connectedRadioItemIdRef.current === currentItem.id) {
        return;
      }

      connectedRadioItemIdRef.current = currentItem.id;
      addToHistory(`[PLAYING] Connected to ${currentItem.title}`);
      addToHistory("  ♫ now playing: unavailable");
    };
    const handleLoadedMetadata = () => {
      const nextDuration = Number.isFinite(audio.duration)
        ? Math.round(audio.duration)
        : 0;

      setDuration(nextDuration);

      if (currentItem) {
        updateLocalItemDuration(currentItem, nextDuration);
      }
    };
    const handleEnded = () => {
      addToHistory("[INFO] Item ended");
      if (isRepeatEnabled && currentItem) {
        addToHistory("[INFO] Repeating current item");
        playItem(currentItem);
        return;
      }

      nextItem();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadstart", startRadioFallbackAfterDelay);
    audio.addEventListener("waiting", startRadioFallbackAfterDelay);
    audio.addEventListener("stalled", startRadioFallbackAfterDelay);
    audio.addEventListener("loadeddata", handleRadioReady);
    audio.addEventListener("canplay", handleRadioReady);
    audio.addEventListener("playing", handleRadioReady);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadstart", startRadioFallbackAfterDelay);
      audio.removeEventListener("waiting", startRadioFallbackAfterDelay);
      audio.removeEventListener("stalled", startRadioFallbackAfterDelay);
      audio.removeEventListener("loadeddata", handleRadioReady);
      audio.removeEventListener("canplay", handleRadioReady);
      audio.removeEventListener("playing", handleRadioReady);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    currentItem,
    isRepeatEnabled,
    nextItem,
    playItem,
    addToHistory,
    clearConnectionTimers,
    startRadioFallback,
    updateLocalItemDuration,
  ]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentItem) {
      return;
    }

    const nextSrc = normalizeAudioSrc(currentItem.src);
    audio.volume = volumeRef.current;

    if (audio.src !== nextSrc && audio.currentSrc !== nextSrc) {
      audio.src = nextSrc;
      audio.load();
    }
  }, [currentItem]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
    if (radioStaticAudioRef.current) {
      radioStaticAudioRef.current.volume = Math.min(volume, 1) * 0.45;
    }
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentItem) {
      return;
    }

    if (isPlaying) {
      audio.play().catch((error: unknown) => {
        if (isExpectedPlaybackAbort(error)) {
          return;
        }

        if (currentItem.mode === "radio") {
          void window.App.resolveRadioStreamUrl(currentItem.src).then(
            (resolvedUrl) => {
              if (!resolvedUrl || resolvedUrl === currentItem.src) {
                const errorMessage = getPlaybackErrorMessage(error);
                const source = audio.currentSrc || audio.src;

                const errorDetails = [
                  `Failed to play audio: ${errorMessage}`,
                  `Source: ${source}`,
                ].join("\n");

                console.error("[audio] playback failed:", error);
                lastErrorRef.current = errorDetails;
                addToHistory(`[WARN] Failed to play audio: ${errorMessage}`);
                addToHistory(`[ERROR] Source: ${source}`);
                addToHistory("[HINT] Type 'copy error' to copy details");
                startRadioFallback(currentItem, "playback failed", 0);
                return;
              }

              addToHistory("[INFO] Retrying radio with resolved stream URL");
              setCurrentItem((prev) =>
                prev?.id === currentItem.id
                  ? {
                      ...prev,
                      src: resolvedUrl,
                      details: prev.details?.map((detail) =>
                        detail.label === "url"
                          ? { ...detail, value: resolvedUrl }
                          : detail,
                      ),
                    }
                  : prev,
              );
            },
          );
          return;
        }

        const errorMessage = getPlaybackErrorMessage(error);
        const errorDetails = [
          `Failed to play audio: ${errorMessage}`,
          `Source: ${audio.currentSrc || audio.src}`,
        ].join("\n");

        console.error("[audio] playback failed:", error);
        clearConnectionTimers();
        setIsPlaying(false);
        lastErrorRef.current = errorDetails;
        addToHistory(`[ERROR] Failed to play audio: ${errorMessage}`);
        addToHistory(`[ERROR] Source: ${audio.currentSrc || audio.src}`);
        addToHistory("[HINT] Type 'copy error' to copy details");
      });
    } else {
      audio.pause();
    }
  }, [
    currentItem,
    addToHistory,
    clearConnectionTimers,
    isPlaying,
    startRadioFallback,
  ]);

  const renderPlayerControls = () => (
    <PlayerControls
      currentItem={currentItem}
      currentTime={currentTime}
      duration={duration}
      isPlaying={isPlaying}
      isRepeatEnabled={isRepeatEnabled}
      isShuffleEnabled={isShuffleEnabled}
      onNext={nextItem}
      onPrev={prevItem}
      onSeek={handleSeek}
      onToggleMute={volume > 0 ? muteVolume : unmuteVolume}
      onTogglePlay={togglePlay}
      onToggleRepeat={toggleRepeat}
      onToggleShuffle={toggleShuffle}
      onVolumeChange={handleVolumeChange}
      radioMetadata={radioMetadata}
      radioMetadataUpdatedAt={radioMetadataUpdatedAt}
      relativeTimeNow={relativeTimeNow}
      source={activeSource}
      volume={volume}
    />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "tracks":
        return (
          <TrackList
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={visibleItems}
            onSelectItem={playItem}
            scrollContainerRef={trackListScrollRef}
            source={activeSource}
          />
        );
      case "now-playing":
        return showNowPlayingJsonTab ? (
          <NowPlayingJsonTab
            snapshot={nowPlayingJsonSnapshot}
            source={activeSource}
          />
        ) : (
          <NowPlaying
            isPlaying={isPlaying}
            item={currentItem}
            radioMetadata={radioMetadata}
            radioMetadataUpdatedAt={radioMetadataUpdatedAt}
            relativeTimeNow={relativeTimeNow}
            source={activeSource}
          />
        );
      case "visualizer":
        return (
          <Visualizer
            currentTime={currentTime}
            frequencyData={frequencyData}
            isAudioConnected={isConnected}
            isPlaying={isPlaying}
            mode={visualizerMode}
            source={activeSource}
          />
        );
      case "controls":
        return renderPlayerControls();
      case "radio-list":
        return (
          <RadioListTab
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={radioListItems}
            mode={radioListMode}
            onSelectItem={playItem}
            radioStatuses={radioStatuses}
            scrollContainerRef={radioListScrollRef}
            searchTerm={radioSearchTerm}
          />
        );
      case "radio-history":
        return (
          <RadioHistoryTab
            entries={radioHistory}
            scrollContainerRef={radioHistoryScrollRef}
          />
        );
      case "music-list":
        return <MusicListTab libraries={musicLibraries} />;
      case "help":
        return <HelpTab source={activeSource} />;
      default:
        return null;
    }
  };

  return (
    <>
      <Header
        title={`prompt-play:/${
          activeSourceMode === "radio" ? "radio" : "music"
        }`}
      />
      <main className="flex items-center justify-center bg-background">
        <div className="min-h-0 w-full max-w-4xl">
          <div className="flex h-[calc(100vh-2rem)] max-h-130 min-h-125 flex-col overflow-hidden rounded-lg bg-background shadow-2xl md:h-[calc(100vh-4rem)]">
            <TerminalTabs
              activeTab={activeTab}
              mouseEnabled={activeTab === "controls"}
              onTabChange={setActiveTab}
              tabs={tabs}
            />
            <div
              className={`relative min-h-0 flex-1 overflow-hidden bg-background ${
                activeTab === "controls" ||
                (activeTab === "now-playing" && showNowPlayingJsonTab)
                  ? ""
                  : "pointer-events-none"
              }`}
            >
              {renderTabContent()}
            </div>
            <TerminalPrompt
              history={commandHistory}
              onArrowNavigation={
                activeTab === "radio-list" && showRadioListTab
                  ? scrollRadioList
                  : activeTab === "radio-history" && showRadioHistoryTab
                    ? scrollRadioHistory
                    : undefined
              }
              onCommand={handleCommand}
              onCycleTab={cycleTab}
              onVolumeShortcut={adjustVolumeByPercent}
              promptContext={
                activeSourceMode === "local" ? "music" : activeSourceMode
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
              visualizerMode={visualizerMode}
              volume={volume}
            />
          </div>

          <audio
            crossOrigin="anonymous"
            key={activeSourceMode}
            preload="auto"
            ref={audioRef}
          >
            <track kind="captions" />
          </audio>
          <audio
            loop
            preload="auto"
            ref={radioStaticAudioRef}
            src={tuningInSoundUrl}
          >
            <track kind="captions" />
          </audio>
        </div>
      </main>
    </>
  );
}
