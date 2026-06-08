import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "renderer/components/header";

import { NowPlaying } from "renderer/components/music-player/now-playing";
import { PlayerControls } from "renderer/components/music-player/player-controls";
import { StatusFooter } from "renderer/components/music-player/status-footer";
import { TerminalPrompt } from "renderer/components/music-player/terminal-prompt";
import { TerminalTabs } from "renderer/components/music-player/terminal-tabs";
import { TrackList } from "renderer/components/music-player/track-list";
import { radios } from "shared/data/radios";
import type {
  MusicLibrary,
  PlayerQueueItem,
  PlayerSource,
  PlayerSourceMode,
} from "shared/types";
import { Visualizer } from "renderer/components/music-player/visualizer";
import { getThemeById, THEMES, type ThemeId } from "renderer/lib/themes";
import { useAudioAnalyzer } from "renderer/hooks/use-audio-analyzer";
import { version } from "../../../package.json";

const PLAYER_SOURCES: Record<PlayerSourceMode, PlayerSource> = {
  local: {
    mode: "local",
    label: "local files",
    description: "Music files on this computer",
    locationLabel: "~/music",
    listCommand: "ls -la audio/aac *.mp3 *.aac *.wav *.flac *.ogg",
    itemLabel: "file",
    creatorLabel: "artist",
    contextLabel: "perm",
    timeLabel: "duration",
    emptyTitle: "no recent musics to listen",
    emptyHint: "type music -- path pathname to config",
    isLive: false,
    supportsSeek: true,
  },
  radio: {
    mode: "radio",
    label: "radio",
    description: "FM and web radio streams",
    locationLabel: "~/radio",
    listCommand: "ls -la audio/aac *.mp3 *.aac *.m3u *.pls stream",
    itemLabel: "station",
    creatorLabel: "city",
    contextLabel: "freq",
    timeLabel: "status",
    emptyTitle: "No radio selected",
    emptyHint: "Select a radio or use 'source radio' and 'play'",
    isLive: true,
    supportsSeek: false,
  },
  yt: {
    mode: "yt",
    label: "youtube",
    description: "YouTube playlists",
    locationLabel: "~/youtube",
    listCommand: "yt playlists",
    itemLabel: "playlist",
    creatorLabel: "channel",
    contextLabel: "origin",
    timeLabel: "duration",
    emptyTitle: "No playlist selected",
    emptyHint: "Select a playlist or use 'source yt' and 'play'",
    isLive: false,
    supportsSeek: true,
  },
};

const YOUTUBE_PLAYLISTS: PlayerQueueItem[] = [
  {
    id: "yt-1",
    mode: "yt",
    title: "Synthwave Coding Session",
    artist: "Prompt Play",
    album: "YouTube playlists",
    duration: 3600,
    sourceDetail: "playlist",
    src: "/Users/evandro.carvalho/Downloads/aeo.mp3",
  },
  {
    id: "yt-2",
    mode: "yt",
    title: "Lo-fi Terminal Focus",
    artist: "Prompt Play",
    album: "YouTube playlists",
    duration: 5400,
    sourceDetail: "playlist",
    src: "/Users/evandro.carvalho/Downloads/aeo.mp3",
  },
];

const RADIO_ITEMS: PlayerQueueItem[] = radios.map((radio) => ({
  id: radio.id,
  mode: "radio",
  title: radio.name,
  artist: radio.city,
  album: radio.region,
  duration: null,
  sourceDetail: radio.frequency,
  src: radio.url,
  details: [
    { label: "name", value: radio.name },
    { label: "city", value: radio.city },
    { label: "frequency", value: radio.frequency },
    { label: "region", value: radio.region },
    { label: "state", value: radio.state },
  ],
}));

type RadioStreamStatus = "checking" | "live" | "offline";

const MUSIC_LIBRARY_STORAGE_KEY = "prompt-play-music-libraries";

function getDefaultMusicLocations() {
  const username = window.App.username;
  const homePath = username ? `/Users/${username}` : "~";

  return [
    { name: "Music", path: `${homePath}/Music` },
    { name: "Downloads", path: `${homePath}/Downloads` },
  ];
}

function readStoredMusicLibraries(): MusicLibrary[] {
  try {
    const storedValue = localStorage.getItem(MUSIC_LIBRARY_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const libraries = JSON.parse(storedValue) as MusicLibrary[];

    if (!Array.isArray(libraries)) {
      return [];
    }

    return libraries.filter(
      (library) =>
        typeof library.id === "string" &&
        typeof library.name === "string" &&
        typeof library.path === "string" &&
        typeof library.musicCount === "number" &&
        Array.isArray(library.items),
    );
  } catch {
    return [];
  }
}

function getTabs(
  source: PlayerSource,
  showHelpTab: boolean,
  showRadioListTab: boolean,
  showMusicListTab: boolean,
) {
  const tabs = [
    { id: "tracks", label: source.listCommand, shortcut: "⌘1" },
    { id: "now-playing", label: "cat now_playing.txt", shortcut: "⌘2" },
    { id: "visualizer", label: "./visualizer --mode=spectrum", shortcut: "⌘3" },
    { id: "controls", label: "./player-controls", shortcut: "⌘4" },
  ];

  if (showRadioListTab) {
    tabs.push({ id: "radio-list", label: "radio list", shortcut: ":q" });
  }

  if (showMusicListTab) {
    tabs.push({ id: "music-list", label: "music lists", shortcut: ":q" });
  }

  if (showHelpTab) {
    tabs.push({ id: "help", label: "Prompt Play Help", shortcut: ":q" });
  }

  return tabs;
}

function generateProgressBar(progress: number, width = 30): string {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;

  return `[${"\u2588".repeat(filled)}${"\u2591".repeat(empty)}] ${progress}%`;
}

function normalizeAudioSrc(src: string): string {
  if (
    /^(file|https?|local-audio):\/\//.test(src) ||
    src.startsWith("/assets/")
  ) {
    return src;
  }

  if (src.startsWith("/")) {
    const encodedPath = src.split("/").map(encodeURIComponent).join("/");

    return `local-audio://file${encodedPath}`;
  }

  return src;
}

function getPlaybackErrorMessage(error: unknown): string {
  if (error instanceof DOMException) {
    return error.name;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "unknown error";
}

function isExpectedPlaybackAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function clampVolumePercent(volumePercent: number): number {
  return Math.max(0, Math.min(100, volumePercent));
}

function HelpTab({ source }: { source: PlayerSource }) {
  const sourceCommands: Record<PlayerSourceMode, string[]> = {
    local: [
      "music",
      "music -- path <pathname>",
      "music config",
      "music list",
      "source local",
      "play",
      "play 1",
      "list",
      "next",
      "prev",
    ],
    radio: [
      "radio",
      "fm",
      "source radio",
      "radio list",
      "ls -ra",
      "play",
      "play 1",
      "list",
      "next",
      "prev",
    ],
    yt: ["source yt", "play", "play 1", "list", "next", "prev"],
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-5 font-mono text-sm">
      <div className="mb-5 text-terminal-cyan">Prompt Play Help</div>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Core Commands</h2>
          {["help", "home", "exit", "quit", ":q"].map((command) => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">
            {source.label} Commands
          </h2>
          {sourceCommands[source.mode].map((command) => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Theme Commands</h2>
          {["theme list", "ls -th", "theme use [name]"].map((command) => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Volume Commands</h2>
          {["vol 0-100", "vol +10", "vol -10"].map((command) => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>
      </div>

      <div className="mt-6 text-terminal-gray text-xs">Press :q to close</div>
    </div>
  );
}

function RadioListTab({
  currentItem,
  isPlaying,
  items,
  onSelectItem,
  radioStatuses,
  scrollContainerRef,
}: {
  currentItem: PlayerQueueItem | null;
  isPlaying: boolean;
  items: PlayerQueueItem[];
  onSelectItem: (item: PlayerQueueItem) => void;
  radioStatuses: Record<string, RadioStreamStatus>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{" "}
          <span className="text-terminal-cyan">~/radio</span>{" "}
          <span className="text-terminal-white">radio list</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        <span className="col-span-1">#</span>
        <span className="col-span-2">freq</span>
        <span className="col-span-4">station</span>
        <span className="col-span-3">city</span>
        <span className="col-span-2 text-right">status</span>
      </div>

      <div
        className="custom-scrollbar flex-1 overflow-y-auto"
        ref={scrollContainerRef}
      >
        {items.map((item, index) => {
          const isActive = currentItem?.id === item.id;
          const isCurrentlyPlaying = isActive && isPlaying;
          const status = radioStatuses[item.id] ?? "checking";

          return (
            <button
              className={`grid w-full grid-cols-12 items-center gap-2 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                isActive
                  ? "bg-terminal-green/10 text-terminal-green"
                  : "text-terminal-white hover:bg-muted/50"
              }`}
              key={item.id}
              onClick={() => onSelectItem(item)}
              type="button"
            >
              <span className="col-span-1 text-terminal-gray">
                {isCurrentlyPlaying ? (
                  <span className="animate-pulse text-terminal-green">▶</span>
                ) : isActive ? (
                  <span className="text-terminal-yellow">▐▐</span>
                ) : (
                  index + 1
                )}
              </span>
              <span className="col-span-2 truncate text-[10px] text-terminal-gray">
                {item.sourceDetail}
              </span>
              <span
                className={`col-span-4 truncate ${
                  isActive ? "text-terminal-cyan" : "text-terminal-white"
                }`}
              >
                {item.title}
              </span>
              <span className="col-span-3 truncate text-terminal-magenta">
                {item.artist}
              </span>
              <span
                className={`col-span-2 text-right ${
                  status === "live"
                    ? "text-terminal-yellow"
                    : status === "checking"
                      ? "text-terminal-gray"
                      : "text-terminal-red"
                }`}
              >
                {status}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MusicListTab({ libraries }: { libraries: MusicLibrary[] }) {
  const defaultLocations = getDefaultMusicLocations();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{" "}
          <span className="text-terminal-cyan">~/music</span>{" "}
          <span className="text-terminal-white">music list</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        <span className="col-span-1">#</span>
        <span className="col-span-3">folder</span>
        <span className="col-span-6">path</span>
        <span className="col-span-2 text-right">musics</span>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {libraries.length === 0
          ? defaultLocations.map((location, index) => (
              <div
                className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 font-mono text-xs text-terminal-white"
                key={location.path}
              >
                <span className="col-span-1 text-terminal-gray">
                  {index + 1}
                </span>
                <span className="col-span-3 truncate text-terminal-cyan">
                  {location.name}
                </span>
                <span className="col-span-6 truncate text-terminal-magenta">
                  {location.path}
                </span>
                <span className="col-span-2 text-right text-terminal-yellow">
                  path
                </span>
              </div>
            ))
          : null}

        {libraries.map((library, index) => (
          <div
            className="grid grid-cols-12 items-center gap-2 px-4 py-2.5 font-mono text-xs text-terminal-white"
            key={library.id}
          >
            <span className="col-span-1 text-terminal-gray">{index + 1}</span>
            <span className="col-span-3 truncate text-terminal-cyan">
              {library.name}
            </span>
            <span className="col-span-6 truncate text-terminal-magenta">
              {library.path}
            </span>
            <span className="col-span-2 text-right text-terminal-yellow">
              {library.musicCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MainScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSourceMode, setActiveSourceMode] = useState<PlayerSourceMode>(
    () => (searchParams.get("source") === "radio" ? "radio" : "local"),
  );
  const [musicLibraries, setMusicLibraries] = useState<MusicLibrary[]>(
    readStoredMusicLibraries,
  );
  const [activeTheme, setActiveTheme] = useState<ThemeId>("default");
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState<PlayerQueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [activeTab, setActiveTab] = useState("tracks");
  const [showHelpTab, setShowHelpTab] = useState(false);
  const [showRadioListTab, setShowRadioListTab] = useState(false);
  const [showMusicListTab, setShowMusicListTab] = useState(false);
  const [radioStatuses, setRadioStatuses] = useState<
    Record<string, RadioStreamStatus>
  >({});
  const [recentRadioIds, setRecentRadioIds] = useState<string[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([
    `[INFO] prompt play v${version}`,
    "[HINT] Type 'prompt play --init' to start or 'help' for help",
    "$ ",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const connectionTimersRef = useRef<number[]>([]);
  const previousTabRef = useRef("tracks");
  const radioListScrollRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const items = useMemo(
    () => [
      ...musicLibraries.flatMap((library) => library.items),
      ...RADIO_ITEMS,
      ...YOUTUBE_PLAYLISTS,
    ],
    [musicLibraries],
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
  const radioItems = useMemo(
    () => items.filter((item) => item.mode === "radio"),
    [items],
  );
  const recentRadioItems = useMemo(
    () =>
      recentRadioIds
        .map((id) => radioItems.find((item) => item.id === id))
        .filter((item): item is PlayerQueueItem => Boolean(item)),
    [radioItems, recentRadioIds],
  );
  const visibleItems =
    activeSourceMode === "radio" ? recentRadioItems : activeItems;
  const tabs = useMemo(
    () =>
      getTabs(activeSource, showHelpTab, showRadioListTab, showMusicListTab),
    [activeSource, showHelpTab, showRadioListTab, showMusicListTab],
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

  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }
  }, [activeSourceMode, currentItem]);

  useEffect(() => {
    if (activeTab !== "radio-list" || !showRadioListTab) {
      return;
    }

    let isMounted = true;

    radioItems.forEach((item) => {
      setRadioStatuses((prev) => ({
        ...prev,
        [item.id]: prev[item.id] ?? "checking",
      }));

      window.App.checkRadioStream(item.src)
        .then((isLive) => {
          if (!isMounted) {
            return;
          }

          setRadioStatuses((prev) => ({
            ...prev,
            [item.id]: isLive ? "live" : "offline",
          }));
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setRadioStatuses((prev) => ({
            ...prev,
            [item.id]: "offline",
          }));
        });
    });

    return () => {
      isMounted = false;
    };
  }, [activeTab, radioItems, showRadioListTab]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("prompt-play-theme");
    const theme = storedTheme ? getThemeById(storedTheme) : undefined;

    if (theme) {
      setActiveTheme(theme.id);
      setSelectedThemeIndex(THEMES.findIndex((item) => item.id === theme.id));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = activeTheme;
    localStorage.setItem("prompt-play-theme", activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem(
      MUSIC_LIBRARY_STORAGE_KEY,
      JSON.stringify(musicLibraries),
    );
  }, [musicLibraries]);

  useEffect(() => {
    const storedLibraries = readStoredMusicLibraries();

    if (storedLibraries.length === 0) {
      return;
    }

    let isMounted = true;

    Promise.all(
      storedLibraries.map((library) =>
        window.App.scanMusicFolder(library.path),
      ),
    )
      .then((libraries) => {
        if (isMounted) {
          setMusicLibraries(libraries);
        }
      })
      .catch(() => {
        // Keep the stored library if a path is temporarily unavailable.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const addToHistory = useCallback((command: string) => {
    setCommandHistory((prev) => [...prev.slice(-30), command]);
  }, []);

  const clearConnectionTimers = useCallback(() => {
    connectionTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    connectionTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearConnectionTimers();
  }, [clearConnectionTimers]);

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

  const closeMusicListTab = useCallback(() => {
    setShowMusicListTab(false);
    setActiveTab(previousTabRef.current);
    addToHistory("[OK] Music lists tab closed");
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

  const openMusicListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === "music-list" ? previousTabRef.current : activeTab;
    setShowMusicListTab(true);
    setActiveTab("music-list");
    addToHistory("[INFO] Opened music lists");
  }, [activeTab, addToHistory]);

  const storeMusicLibrary = useCallback(
    (library: MusicLibrary) => {
      setMusicLibraries((prev) => [
        library,
        ...prev.filter((item) => item.path !== library.path),
      ]);
      addToHistory(`[OK] Configured music folder: ${library.name}`);
      addToHistory(`[INFO] Path: ${library.path}`);
      addToHistory(`[INFO] ${library.musicCount} musics found`);
    },
    [addToHistory],
  );

  const updateLocalItemDuration = useCallback(
    (item: PlayerQueueItem, nextDuration: number) => {
      if (item.mode !== "local" || nextDuration <= 0) {
        return;
      }

      setCurrentItem((prev) =>
        prev?.id === item.id ? { ...prev, duration: nextDuration } : prev,
      );
      setMusicLibraries((prev) =>
        prev.map((library) => ({
          ...library,
          items: library.items.map((libraryItem) =>
            libraryItem.id === item.id
              ? { ...libraryItem, duration: nextDuration }
              : libraryItem,
          ),
        })),
      );
    },
    [],
  );

  const scanMusicPath = useCallback(
    async (folderPath: string) => {
      const path = folderPath.trim();

      if (!path) {
        addToHistory("[ERROR] Use music -- path pathname");
        return;
      }

      setIsLoading(true);
      addToHistory(`[INFO] Scanning music folder: ${path}`);

      try {
        const library = await window.App.scanMusicFolder(path);
        storeMusicLibrary(library);
        openMusicListTab();
      } catch {
        addToHistory(`[ERROR] Could not access music folder: ${path}`);
      } finally {
        setIsLoading(false);
      }
    },
    [addToHistory, openMusicListTab, storeMusicLibrary],
  );

  const selectMusicFolder = useCallback(async () => {
    setIsLoading(true);
    addToHistory("[INFO] Select a folder to scan for musics");

    try {
      const library = await window.App.selectMusicFolder();

      if (!library) {
        addToHistory("[INFO] Music folder selection canceled");
        return;
      }

      storeMusicLibrary(library);
      openMusicListTab();
    } catch {
      addToHistory("[ERROR] Could not select music folder");
    } finally {
      setIsLoading(false);
    }
  }, [addToHistory, openMusicListTab, storeMusicLibrary]);

  const simulateLoading = useCallback(
    async (
      messages: { text: string; delay: number }[],
      onComplete?: () => void,
    ) => {
      setIsLoading(true);

      for (const message of messages) {
        addToHistory(message.text);
        await new Promise((resolve) => setTimeout(resolve, message.delay));
      }

      for (let progress = 0; progress <= 100; progress += 10) {
        setCommandHistory((prev) => {
          const newHistory = [...prev];

          if (newHistory[newHistory.length - 1]?.includes("[")) {
            newHistory[newHistory.length - 1] =
              `[LOADING] ${generateProgressBar(progress)}`;
          } else {
            newHistory.push(`[LOADING] ${generateProgressBar(progress)}`);
          }

          return newHistory.slice(-30);
        });
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      setIsLoading(false);
      onComplete?.();
    },
    [addToHistory],
  );

  const selectSource = useCallback(
    (mode: PlayerSourceMode) => {
      clearConnectionTimers();
      const nextSource = PLAYER_SOURCES[mode];

      setActiveSourceMode(mode);
      setCurrentItem(null);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      addToHistory(`[INFO] Active source: ${nextSource.label}`);
      addToHistory(`[INFO] ${nextSource.description}`);
    },
    [addToHistory, clearConnectionTimers],
  );

  const playItem = useCallback(
    (item: PlayerQueueItem) => {
      clearConnectionTimers();

      if (item.mode !== activeSourceMode) {
        setActiveSourceMode(item.mode);
      }

      setCurrentItem(item);
      setCurrentTime(0);
      setDuration(item.duration ?? 0);
      setIsPlaying(false);
      addToHistory(`$ play "${item.title}"`);
      addToHistory(`[LOADING] Connecting to ${item.title}...`);

      const startPlaybackAfterConnected = () => {
        addToHistory(`[PLAYING] Connected to ${item.title}`);
        window.requestAnimationFrame(() => {
          setIsPlaying(true);
        });
      };

      if (item.mode === "radio") {
        setRecentRadioIds((prev) =>
          [item.id, ...prev.filter((radioId) => radioId !== item.id)].slice(
            0,
            5,
          ),
        );
        connectionTimersRef.current = [
          window.setTimeout(() => {
            addToHistory("[LOADING] Buffering...");
          }, 1800),
          window.setTimeout(startPlaybackAfterConnected, 4000),
        ];
        return;
      }

      startPlaybackAfterConnected();
    },
    [activeSourceMode, addToHistory, clearConnectionTimers],
  );

  const togglePlay = useCallback(() => {
    if (!currentItem) {
      if (activeItems.length > 0) {
        playItem(activeItems[0]);
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
  }, [activeItems, currentItem, playItem, addToHistory, clearConnectionTimers]);

  const nextItem = useCallback(() => {
    if (!currentItem || activeItems.length === 0) {
      return;
    }

    const currentIndex = activeItems.findIndex(
      (item) => item.id === currentItem.id,
    );
    const nextIndex = (currentIndex + 1) % activeItems.length;
    addToHistory("$ next");
    playItem(activeItems[nextIndex]);
  }, [activeItems, currentItem, playItem, addToHistory]);

  const prevItem = useCallback(() => {
    if (!currentItem || activeItems.length === 0) {
      return;
    }

    const currentIndex = activeItems.findIndex(
      (item) => item.id === currentItem.id,
    );
    const prevIndex =
      currentIndex <= 0 ? activeItems.length - 1 : currentIndex - 1;
    addToHistory("$ prev");
    playItem(activeItems[prevIndex]);
  }, [activeItems, currentItem, playItem, addToHistory]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleVolumeChange = useCallback((newVolume: number) => {
    volumeRef.current = newVolume;
    setVolume(newVolume);

    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const applyTheme = useCallback(
    (themeId: string) => {
      const theme = getThemeById(themeId);

      if (!theme) {
        addToHistory(`[ERROR] Theme not found: ${themeId}`);
        addToHistory("[HINT] Use 'theme list' to see available themes");
        return;
      }

      setActiveTheme(theme.id);
      setSelectedThemeIndex(THEMES.findIndex((item) => item.id === theme.id));
      setIsThemePickerOpen(false);
      addToHistory(`[INFO] Theme changed to ${theme.name}.`);
    },
    [addToHistory],
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
      applyTheme(THEMES[index]?.id ?? activeTheme);
    },
    [activeTheme, applyTheme, selectedThemeIndex],
  );

  const handleCommand = useCallback(
    (command: string) => {
      const rawCommand = command.trim();
      const cmd = rawCommand.toLowerCase();
      const musicPathMatch = /^(music|radio)\s+--\s*path\s+(.+)$/i.exec(
        rawCommand,
      );

      if (cmd === ":q") {
        if (activeTab === "help" && showHelpTab) {
          closeHelpTab();
        } else if (activeTab === "radio-list" && showRadioListTab) {
          closeRadioListTab();
        } else if (activeTab === "music-list" && showMusicListTab) {
          closeMusicListTab();
        } else if (showHelpTab) {
          closeHelpTab();
        } else if (showRadioListTab) {
          closeRadioListTab();
        } else if (showMusicListTab) {
          closeMusicListTab();
        } else {
          addToHistory("[INFO] No temporary tab is open");
        }
        return;
      }

      if (isLoading) {
        addToHistory(`$ ${command}`);
        addToHistory("[ERROR] Wait for the current process to finish");
        return;
      }

      addToHistory(`$ ${command}`);

      if (cmd === "zsh-player --init" || cmd === "init") {
        simulateLoading(
          [
            { text: "[INFO] Starting zsh-player...", delay: 200 },
            { text: "[INFO] Loading audio modules...", delay: 300 },
            { text: "[INFO] Connecting Web Audio API...", delay: 250 },
            { text: "[INFO] Scanning music library...", delay: 200 },
          ],
          () => {
            addToHistory("[OK] Player initialized successfully");
            addToHistory(`[INFO] Active source: ${activeSource.label}`);
            addToHistory(`[INFO] ${activeItems.length} items available`);
            addToHistory(
              "[HINT] Use 'sources' to see modes or 'list' to see items",
            );
          },
        );
        return;
      }

      if (cmd === "pp version") {
        addToHistory(`[INFO] Prompt Play v${version}`);
        return;
      }

      if (cmd === "theme list" || cmd === "ls -th") {
        setSelectedThemeIndex(
          Math.max(
            0,
            THEMES.findIndex((theme) => theme.id === activeTheme),
          ),
        );
        setIsThemePickerOpen(true);
      } else if (cmd.startsWith("theme use ")) {
        const themeId = cmd.slice(10).trim();
        applyTheme(themeId);
      } else if (cmd === "pp music" || cmd === "music") {
        selectSource("local");
      } else if (musicPathMatch) {
        selectSource("local");
        void scanMusicPath(musicPathMatch[2]);
      } else if (cmd === "music config") {
        selectSource("local");
        void selectMusicFolder();
      } else if (cmd === "music list") {
        selectSource("local");
        openMusicListTab();
      } else if (cmd === "pp radio" || cmd === "radio" || cmd === "fm") {
        selectSource("radio");
      } else if (
        cmd === "pp home" ||
        cmd === "pp exit" ||
        cmd === "home" ||
        cmd === "exit"
      ) {
        navigate("/");
      } else if (cmd === "pp quit" || cmd === "quit") {
        window.App.quit();
      } else if (cmd === "pp clear") {
        setCommandHistory(["$ "]);
      } else if (cmd === "pp open now-playing") {
        setActiveTab("now-playing");
        addToHistory("[OK] Selected cat now_playing.txt tab");
      } else if (cmd === "pp open visualizer") {
        setActiveTab("visualizer");
        addToHistory("[OK] Selected ./visualizer --mode=spectrum tab");
      } else if (cmd === "pp open controls") {
        setActiveTab("controls");
        addToHistory("[OK] Selected ./player-controls tab");
      } else if (cmd === "radio list" || cmd === "ls -ra") {
        selectSource("radio");
        openRadioListTab();
      } else if (cmd === "ls -la") {
        setActiveTab("tracks");
        addToHistory("[OK] Selected ls -la tab");
      } else if (cmd === "sources") {
        addToHistory("[INFO] Available sources:");
        Object.values(PLAYER_SOURCES).forEach((source) => {
          const prefix = source.mode === activeSourceMode ? "▶" : " ";
          addToHistory(
            `[INFO] ${prefix} ${source.mode.padEnd(5)} ${source.description}`,
          );
        });
      } else if (cmd.startsWith("source ")) {
        const mode = cmd.slice(7).trim() as PlayerSourceMode;

        if (mode in PLAYER_SOURCES) {
          selectSource(mode);
        } else {
          addToHistory(`[ERROR] Source not found: ${mode}`);
          addToHistory("[HINT] Use 'sources' to see available sources");
        }
      } else if (cmd === "play" || cmd === "resume") {
        if (currentItem) {
          setIsPlaying(true);
          addToHistory("[PLAYING] Playback resumed");
        } else if (activeItems.length > 0) {
          playItem(activeItems[0]);
        }
      } else if (cmd === "pause" || cmd === "stop") {
        clearConnectionTimers();
        setIsPlaying(false);
        addToHistory("[PAUSED] Playback paused");
      } else if (cmd === "next" || cmd === "n") {
        nextItem();
      } else if (cmd === "prev" || cmd === "p") {
        prevItem();
      } else if (cmd.startsWith("play ")) {
        const query = cmd.slice(5).replace(/"/g, "");
        const itemIndex = Number.parseInt(query, 10);
        const found =
          Number.isInteger(itemIndex) &&
          itemIndex >= 1 &&
          itemIndex <= activeItems.length
            ? activeItems[itemIndex - 1]
            : activeItems.find(
                (item) =>
                  item.title.toLowerCase().includes(query) ||
                  item.artist.toLowerCase().includes(query),
              );

        if (found) {
          playItem(found);
        } else {
          addToHistory(
            `[ERROR] Item not found in ${activeSource.label}: ${query}`,
          );
        }
      } else if (cmd === "list" || cmd === "ls") {
        addToHistory(`[INFO] Listing ${activeSource.label}...`);
        const listedItems =
          activeSourceMode === "radio" ? recentRadioItems : activeItems;

        if (listedItems.length === 0 && activeSourceMode === "radio") {
          addToHistory("[INFO] No recently played radios yet");
          addToHistory("[HINT] Use 'radio list' or 'ls -ra' to see all radios");
          return;
        }

        if (listedItems.length === 0 && activeSourceMode === "local") {
          addToHistory("[INFO] no recent musics to listen");
          addToHistory("[HINT] type music -- path pathname to config");
          return;
        }

        listedItems.forEach((item, index) => {
          const prefix = currentItem?.id === item.id ? "▶" : " ";
          const context =
            item.mode === "radio"
              ? ` - ${item.artist} - ${item.sourceDetail}`
              : "";
          addToHistory(
            `[INFO] ${prefix} ${index + 1}. ${item.title}${context}`,
          );
        });
      } else if (cmd === "help" || cmd === "h" || cmd === "?") {
        openHelpTab();
      } else if (cmd === "status" || cmd === "info") {
        addToHistory(`[STATUS] Source: ${activeSource.label}`);
        if (currentItem) {
          addToHistory(`[STATUS] Playing: ${currentItem.title}`);
          addToHistory(
            `[STATUS] ${activeSource.creatorLabel}: ${currentItem.artist}`,
          );
          addToHistory(`[STATUS] Volume: ${Math.round(volume * 100)}%`);
          addToHistory(
            `[STATUS] Audio API: ${isConnected ? "Connected" : "Procedural"}`,
          );
        } else {
          addToHistory("[STATUS] No item is playing");
        }
      } else if (cmd.startsWith("vol ")) {
        const volumeInput = cmd.slice(4).trim();
        const relativeMatch = /^([+-])\s*(\d+)$/.exec(volumeInput);
        const newVolume = relativeMatch
          ? clampVolumePercent(
              Math.round(volume * 100) +
                (relativeMatch[1] === "+" ? 1 : -1) *
                  Number.parseInt(relativeMatch[2], 10),
            )
          : Number.parseInt(volumeInput, 10);

        if (!Number.isNaN(newVolume) && newVolume >= 0 && newVolume <= 100) {
          handleVolumeChange(newVolume / 100);
          addToHistory(`[OK] Volume set to ${newVolume}%`);
        } else {
          addToHistory("[ERROR] Use vol 0-100, vol +10, or vol -10");
        }
      } else if (cmd.startsWith("tab ")) {
        const tabNumber = Number.parseInt(cmd.slice(4), 10);

        if (tabNumber >= 1 && tabNumber <= tabs.length) {
          setActiveTab(tabs[tabNumber - 1].id);
          addToHistory(`[OK] Selected tab ${tabNumber}`);
        } else {
          addToHistory(
            `[ERROR] Tab number must be between 1 and ${tabs.length}`,
          );
        }
      } else if (cmd) {
        addToHistory(`[ERROR] Unknown command: ${cmd}`);
        addToHistory("[HINT] Type 'help' to see available commands");
      }
    },
    [
      activeItems,
      activeSource,
      activeSourceMode,
      activeTheme,
      applyTheme,
      activeTab,
      closeHelpTab,
      closeMusicListTab,
      closeRadioListTab,
      currentItem,
      navigate,
      openHelpTab,
      openMusicListTab,
      openRadioListTab,
      playItem,
      nextItem,
      prevItem,
      selectSource,
      scanMusicPath,
      selectMusicFolder,
      volume,
      addToHistory,
      clearConnectionTimers,
      simulateLoading,
      isLoading,
      handleVolumeChange,
      isConnected,
      showHelpTab,
      showMusicListTab,
      showRadioListTab,
      tabs,
      recentRadioItems,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (
        activeTab === "radio-list" &&
        showRadioListTab &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (event.key === "ArrowDown" || event.key === "ArrowUp")
      ) {
        event.preventDefault();
        scrollRadioList(event.key === "ArrowDown" ? "down" : "up");
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
  }, [activeTab, cycleTab, scrollRadioList, showRadioListTab]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
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
      nextItem();
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentItem, nextItem, addToHistory, updateLocalItemDuration]);

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

        const errorMessage = getPlaybackErrorMessage(error);

        console.error("[audio] playback failed:", error);
        clearConnectionTimers();
        setIsPlaying(false);
        addToHistory(`[ERROR] Failed to play audio: ${errorMessage}`);
        addToHistory(`[ERROR] Source: ${audio.currentSrc || audio.src}`);
      });
    } else {
      audio.pause();
    }
  }, [currentItem, addToHistory, clearConnectionTimers, isPlaying]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "tracks":
        return (
          <TrackList
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={visibleItems}
            onSelectItem={playItem}
            source={activeSource}
          />
        );
      case "now-playing":
        return (
          <NowPlaying
            isPlaying={isPlaying}
            item={currentItem}
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
            source={activeSource}
          />
        );
      case "controls":
        return (
          <PlayerControls
            currentItem={currentItem}
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
        );
      case "radio-list":
        return (
          <RadioListTab
            currentItem={currentItem}
            isPlaying={isPlaying}
            items={radioItems}
            onSelectItem={playItem}
            radioStatuses={radioStatuses}
            scrollContainerRef={radioListScrollRef}
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
      <Header />
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
              className={`min-h-0 flex-1 overflow-hidden bg-background ${
                activeTab === "controls" ? "" : "pointer-events-none"
              }`}
            >
              {renderTabContent()}
            </div>
            <TerminalPrompt
              history={commandHistory}
              onArrowNavigation={
                activeTab === "radio-list" && showRadioListTab
                  ? scrollRadioList
                  : undefined
              }
              onCommand={handleCommand}
              onCycleTab={cycleTab}
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
  );
}
