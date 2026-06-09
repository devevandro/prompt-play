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
    locationLabel: "~/yt",
    listCommand: "yt playlists",
    itemLabel: "music",
    creatorLabel: "artist",
    contextLabel: "type",
    timeLabel: "duration",
    emptyTitle: "No YouTube playlist selected",
    emptyHint: "yt add https://youtube.com/playlist?list=PL...",
    isLive: false,
    supportsSeek: true,
  },
};

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
const YOUTUBE_STORAGE_KEY = "prompt-play-youtube";

interface YouTubePlaylistSummary {
  id: string;
  title: string;
  videoCount: number;
}

interface YouTubeStorage {
  youtube: {
    apiKey: string;
    playlists: string[];
    playlistDetails: YouTubePlaylistSummary[];
    items: PlayerQueueItem[];
  };
}

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

function createEmptyYouTubeStorage(): YouTubeStorage {
  return {
    youtube: {
      apiKey: "",
      playlists: [],
      playlistDetails: [],
      items: [],
    },
  };
}

function readStoredYouTube(): YouTubeStorage {
  try {
    const storedValue = localStorage.getItem(YOUTUBE_STORAGE_KEY);

    if (!storedValue) {
      return createEmptyYouTubeStorage();
    }

    const stored = JSON.parse(storedValue) as Partial<YouTubeStorage>;
    const youtube = stored.youtube;

    if (!youtube) {
      return createEmptyYouTubeStorage();
    }

    return {
      youtube: {
        apiKey: typeof youtube.apiKey === "string" ? youtube.apiKey : "",
        playlists: Array.isArray(youtube.playlists)
          ? youtube.playlists.filter(
              (playlistId): playlistId is string =>
                typeof playlistId === "string",
            )
          : [],
        playlistDetails: Array.isArray(youtube.playlistDetails)
          ? youtube.playlistDetails
              .filter(
                (playlist): playlist is YouTubePlaylistSummary =>
                  typeof playlist.id === "string" &&
                  typeof playlist.title === "string",
              )
              .map((playlist) => ({
                ...playlist,
                videoCount:
                  typeof playlist.videoCount === "number"
                    ? playlist.videoCount
                    : 0,
              }))
          : [],
        items: Array.isArray(youtube.items)
          ? youtube.items.filter(
              (item): item is PlayerQueueItem =>
                item?.mode === "yt" &&
                typeof item.id === "string" &&
                typeof item.title === "string" &&
                typeof item.artist === "string" &&
                typeof item.src === "string",
            )
          : [],
      },
    };
  } catch {
    return createEmptyYouTubeStorage();
  }
}

function parseYouTubeDuration(duration: string | undefined): number | null {
  if (!duration) {
    return null;
  }

  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(
    duration,
  );

  if (!match) {
    return null;
  }

  const days = Number.parseInt(match[1] ?? "0", 10);
  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);
  const seconds = Number.parseInt(match[4] ?? "0", 10);

  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function parseYouTubePlaylistId(input: string): string {
  const value = input.trim();

  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    const playlistId = url.searchParams.get("list");

    return playlistId?.trim() ?? value;
  } catch {
    return value;
  }
}

function buildYouTubePlaylistItem(
  item: unknown,
  playlistId: string,
  duration: number | null,
): PlayerQueueItem | null {
  const snippet = (item as { snippet?: Record<string, unknown> }).snippet;
  const resourceId = snippet?.resourceId as
    | { videoId?: unknown }
    | undefined;
  const videoId = resourceId?.videoId;
  const title = snippet?.title;
  const artist = snippet?.videoOwnerChannelTitle ?? snippet?.channelTitle;

  if (typeof videoId !== "string" || typeof title !== "string") {
    return null;
  }

  return {
    id: `yt-${playlistId}-${videoId}`,
    mode: "yt",
    title,
    artist: typeof artist === "string" ? artist : "YouTube",
    album: playlistId,
    duration,
    sourceDetail: "video",
    src: videoId,
    videoId,
    details: [
      { label: "playlist", value: playlistId },
      { label: "video", value: videoId },
    ],
  };
}

async function fetchYouTubePlaylistItems(
  apiKey: string,
  playlistId: string,
): Promise<{
  items: PlayerQueueItem[];
  playlistTitle: string;
  videoCount: number;
}> {
  const playlistUrl = new URL(
    "https://youtube.googleapis.com/youtube/v3/playlists",
  );
  playlistUrl.searchParams.set("key", apiKey);
  playlistUrl.searchParams.set("id", playlistId);
  playlistUrl.searchParams.set("part", "snippet,contentDetails");

  const playlistResponse = await fetch(playlistUrl.toString());

  let playlistTitle = playlistId;
  let videoCount = 0;

  if (playlistResponse.ok) {
    const playlistData = (await playlistResponse.json()) as {
      items?: {
        contentDetails?: {
          itemCount?: number;
        };
        snippet?: {
          title?: string;
        };
      }[];
    };

    playlistTitle = playlistData.items?.[0]?.snippet?.title ?? playlistId;
    videoCount = playlistData.items?.[0]?.contentDetails?.itemCount ?? 0;
  }

  const playlistItems: unknown[] = [];
  let nextPageToken: string | undefined;

  do {
    const playlistItemsUrl = new URL(
      "https://youtube.googleapis.com/youtube/v3/playlistItems",
    );
    playlistItemsUrl.searchParams.set("key", apiKey);
    playlistItemsUrl.searchParams.set("playlistId", playlistId);
    playlistItemsUrl.searchParams.set("part", "snippet");
    playlistItemsUrl.searchParams.set("maxResults", "50");

    if (nextPageToken) {
      playlistItemsUrl.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(playlistItemsUrl.toString());

    if (!response.ok) {
      throw new Error(`playlistItems failed with ${response.status}`);
    }

    const data = (await response.json()) as {
      items?: unknown[];
      nextPageToken?: string;
    };

    playlistItems.push(...(Array.isArray(data.items) ? data.items : []));
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);

  const videoIds = playlistItems
    .map((item) => {
      const snippet = (item as { snippet?: Record<string, unknown> }).snippet;
      const resourceId = snippet?.resourceId as
        | { videoId?: unknown }
        | undefined;

      return typeof resourceId?.videoId === "string"
        ? resourceId.videoId
        : null;
    })
    .filter((videoId): videoId is string => Boolean(videoId));
  const durationsByVideoId = new Map<string, number | null>();

  for (let index = 0; index < videoIds.length; index += 50) {
    const videoIdBatch = videoIds.slice(index, index + 50);
    const videosUrl = new URL("https://youtube.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("key", apiKey);
    videosUrl.searchParams.set("id", videoIdBatch.join(","));
    videosUrl.searchParams.set("part", "contentDetails");

    const videosResponse = await fetch(videosUrl.toString());

    if (videosResponse.ok) {
      const videosData = (await videosResponse.json()) as {
        items?: {
          id?: string;
          contentDetails?: {
            duration?: string;
          };
        }[];
      };

      videosData.items?.forEach((video) => {
        if (video.id) {
          durationsByVideoId.set(
            video.id,
            parseYouTubeDuration(video.contentDetails?.duration),
          );
        }
      });
    }
  }

  const items = playlistItems
    .map((item) => {
      const snippet = (item as { snippet?: Record<string, unknown> }).snippet;
      const resourceId = snippet?.resourceId as
        | { videoId?: unknown }
        | undefined;
      const videoId =
        typeof resourceId?.videoId === "string" ? resourceId.videoId : "";

      return buildYouTubePlaylistItem(
        item,
        playlistId,
        durationsByVideoId.get(videoId) ?? null,
      );
    })
    .filter((item): item is PlayerQueueItem => Boolean(item));
  return {
    items,
    playlistTitle,
    videoCount: videoCount || items.length,
  };
}

function getTabs(
  source: PlayerSource,
  showHelpTab: boolean,
  showRadioListTab: boolean,
  showMusicListTab: boolean,
  showYouTubeListTab: boolean,
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

  if (showYouTubeListTab) {
    tabs.push({ id: "youtube-list", label: "yt playlists", shortcut: ":q" });
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

function getRandomQueueIndex(itemCount: number, currentIndex: number): number {
  if (itemCount <= 1) {
    return 0;
  }

  let nextIndex = currentIndex;

  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * itemCount);
  }

  return nextIndex;
}

function normalizeCommand(command: string): string {
  return command
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSourceCommandMode(
  cmd: string,
  pathCommandSource: string | undefined,
): PlayerSourceMode | null {
  if (
    cmd === "music" ||
    cmd === "music config" ||
    cmd === "music list" ||
    pathCommandSource === "music"
  ) {
    return "local";
  }

  if (
    cmd === "radio" ||
    cmd === "fm" ||
    cmd === "radio list" ||
    cmd === "ls -ra" ||
    pathCommandSource === "radio"
  ) {
    return "radio";
  }

  if (
    cmd === "yt list" ||
    cmd === "yt auth" ||
    cmd === "yt auth clear" ||
    cmd.startsWith("yt add ")
  ) {
    return "yt";
  }

  return null;
}

function sourceCommandLabel(mode: PlayerSourceMode): string {
  if (mode === "local") {
    return "music";
  }

  return mode;
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
      "shuffle",
      "repeat",
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
      "shuffle",
      "repeat",
    ],
    yt: [
      "yt",
      "yt auth",
      "yt auth clear",
      "yt add playlist-url-or-id",
      "yt list",
      "source yt",
      "play",
      "play 1",
      "list",
      "next",
      "prev",
      "shuffle",
      "repeat",
    ],
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
          {["vol 0-100", "vol +10", "vol -10", "mute", "unmute"].map(
            (command) => (
              <div className="text-terminal-white" key={command}>
                {command}
              </div>
            ),
          )}
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

function YouTubeListTab({
  currentPlaylistId,
  onSelectPlaylist,
  scrollContainerRef,
  youtube,
}: {
  currentPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  youtube: YouTubeStorage["youtube"];
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{" "}
          <span className="text-terminal-cyan">~/yt</span>{" "}
          <span className="text-terminal-white">yt playlists</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        <span className="col-span-1">#</span>
        <span className="col-span-4">playlist</span>
        <span className="col-span-5">id</span>
        <span className="col-span-2 text-right">videos</span>
      </div>

      <div
        className="custom-scrollbar flex-1 overflow-y-auto"
        ref={scrollContainerRef}
      >
        {!youtube.apiKey && (
          <div className="space-y-2 px-4 py-6 font-mono text-xs">
            <div className="text-terminal-yellow">
              You need to register a YouTube API key
            </div>
            <div className="text-terminal-gray">
              yt auth
            </div>
          </div>
        )}

        {youtube.apiKey && youtube.playlists.length === 0 && (
          <div className="space-y-2 px-4 py-6 font-mono text-xs">
            <div className="text-terminal-yellow">
              no youtube playlists configured
            </div>
            <div className="text-terminal-gray">
              yt add https://youtube.com/playlist?list=PL...
            </div>
          </div>
        )}

        {youtube.playlists.map((playlistId, index) => {
          const playlist = youtube.playlistDetails.find(
            (item) => item.id === playlistId,
          );
          const cachedVideoCount = youtube.items.filter(
            (item) => item.album === playlistId,
          ).length;
          const videoCount = playlist?.videoCount || cachedVideoCount;
          const isActive = currentPlaylistId === playlistId;

          return (
            <button
              className={`grid w-full grid-cols-12 items-center gap-2 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                isActive
                  ? "bg-terminal-green/10 text-terminal-green"
                  : "text-terminal-white hover:bg-muted/50"
              }`}
              key={playlistId}
              onClick={() => onSelectPlaylist(playlistId)}
              type="button"
            >
              <span className="col-span-1 text-terminal-gray">
                {index + 1}
              </span>
              <span className="col-span-4 truncate text-terminal-cyan">
                {playlist?.title ?? playlistId}
              </span>
              <span className="col-span-5 truncate text-terminal-magenta">
                {playlistId}
              </span>
              <span className="col-span-2 text-right text-terminal-yellow">
                {videoCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MainScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSourceMode, setActiveSourceMode] = useState<PlayerSourceMode>(
    () => {
      const source = searchParams.get("source");

      if (source === "radio" || source === "yt") {
        return source;
      }

      return "local";
    },
  );
  const [musicLibraries, setMusicLibraries] = useState<MusicLibrary[]>(
    readStoredMusicLibraries,
  );
  const [youtubeStorage, setYouTubeStorage] =
    useState<YouTubeStorage>(readStoredYouTube);
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
  const [activeTab, setActiveTab] = useState("tracks");
  const [showHelpTab, setShowHelpTab] = useState(false);
  const [showRadioListTab, setShowRadioListTab] = useState(false);
  const [showMusicListTab, setShowMusicListTab] = useState(false);
  const [showYouTubeListTab, setShowYouTubeListTab] = useState(false);
  const [isAwaitingYouTubeApiKey, setIsAwaitingYouTubeApiKey] =
    useState(false);
  const [selectedYouTubePlaylistId, setSelectedYouTubePlaylistId] = useState<
    string | null
  >(() => readStoredYouTube().youtube.playlists[0] ?? null);
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
  const trackListScrollRef = useRef<HTMLDivElement>(null);
  const radioListScrollRef = useRef<HTMLDivElement>(null);
  const youtubeListScrollRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);
  const previousVolumeRef = useRef(volume);
  const didHandleEndedRef = useRef(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );
  const items = useMemo(
    () => [
      ...musicLibraries.flatMap((library) => library.items),
      ...RADIO_ITEMS,
      ...youtubeStorage.youtube.items,
    ],
    [musicLibraries, youtubeStorage.youtube.items],
  );
  const activeSource = useMemo(() => {
    const source = PLAYER_SOURCES[activeSourceMode];

    if (activeSourceMode === "yt" && !youtubeStorage.youtube.apiKey) {
      return {
        ...source,
        emptyTitle: "You need to register a YouTube API key",
        emptyHint: "yt auth",
      };
    }

    if (activeSourceMode === "yt") {
      return {
        ...source,
        emptyHint: "yt add https://youtube.com/playlist?list=PL...",
      };
    }

    if (activeSourceMode !== "local" || musicLibraries.length === 0) {
      return source;
    }

    return {
      ...source,
      locationLabel: musicLibraries[0].path,
      emptyHint: "type music -- path pathname to config",
    };
  }, [activeSourceMode, musicLibraries, youtubeStorage.youtube.apiKey]);
  const canAnalyzeAudio = activeSource.supportsSeek && activeSource.mode !== "yt";
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
  const selectedYouTubeItems = useMemo(
    () =>
      youtubeStorage.youtube.items.filter(
        (item) => item.album === selectedYouTubePlaylistId,
      ),
    [selectedYouTubePlaylistId, youtubeStorage.youtube.items],
  );
  const visibleItems =
    activeSourceMode === "radio"
      ? recentRadioItems
      : activeSourceMode === "yt" && selectedYouTubePlaylistId
        ? selectedYouTubeItems
        : activeItems;
  const queueItems =
    activeSourceMode === "yt" && selectedYouTubePlaylistId
      ? selectedYouTubeItems
      : activeItems;
  const tabs = useMemo(
    () =>
      getTabs(
        activeSource,
        showHelpTab,
        showRadioListTab,
        showMusicListTab,
        showYouTubeListTab,
      ),
    [
      activeSource,
      showHelpTab,
      showRadioListTab,
      showMusicListTab,
      showYouTubeListTab,
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

  const scrollTrackList = useCallback((direction: "down" | "up") => {
    trackListScrollRef.current?.scrollBy({
      top: direction === "down" ? 48 : -48,
      behavior: "smooth",
    });
  }, []);

  const scrollYouTubeList = useCallback((direction: "down" | "up") => {
    youtubeListScrollRef.current?.scrollBy({
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
    localStorage.setItem(YOUTUBE_STORAGE_KEY, JSON.stringify(youtubeStorage));
  }, [youtubeStorage]);

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

  const closeYouTubeListTab = useCallback(() => {
    setShowYouTubeListTab(false);
    setActiveTab(previousTabRef.current);
    addToHistory("[OK] YouTube playlists tab closed");
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

  const openYouTubeListTab = useCallback(() => {
    previousTabRef.current =
      activeTab === "youtube-list" ? previousTabRef.current : activeTab;
    setShowYouTubeListTab(true);
    setActiveTab("youtube-list");
    addToHistory("[INFO] Opened YouTube playlists");
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

  const setYouTubeApiKey = useCallback(
    (apiKey: string) => {
      if (!apiKey) {
        addToHistory("[ERROR] YouTube API key cannot be empty");
        return;
      }

      setYouTubeStorage((prev) => ({
        youtube: {
          ...prev.youtube,
          apiKey,
        },
      }));
      addToHistory("[OK] YouTube API key saved");
    },
    [addToHistory],
  );

  const clearYouTubeApiKey = useCallback(() => {
    setIsAwaitingYouTubeApiKey(false);
    setYouTubeStorage((prev) => ({
      youtube: {
        ...prev.youtube,
        apiKey: "",
      },
    }));
    addToHistory("[OK] YouTube API key removed");
  }, [addToHistory]);

  const saveYouTubePlaylist = useCallback(
    async (playlistInput: string) => {
      const playlistId = parseYouTubePlaylistId(playlistInput);
      const apiKey = youtubeStorage.youtube.apiKey;

      if (!apiKey) {
        addToHistory("[ERROR] You need to register a YouTube API key");
        addToHistory("[HINT] yt auth");
        return;
      }

      if (!playlistId) {
        addToHistory(
          "[ERROR] Use yt add https://youtube.com/playlist?list=PL...",
        );
        return;
      }

      setIsLoading(true);
      addToHistory(`[INFO] Loading YouTube playlist: ${playlistId}`);

      try {
        const playlist = await fetchYouTubePlaylistItems(apiKey, playlistId);

        setYouTubeStorage((prev) => ({
          youtube: {
            ...prev.youtube,
            playlists: [
              playlistId,
              ...prev.youtube.playlists.filter((id) => id !== playlistId),
            ],
            playlistDetails: [
              {
                id: playlistId,
                title: playlist.playlistTitle,
                videoCount: playlist.videoCount,
              },
              ...prev.youtube.playlistDetails.filter(
                (item) => item.id !== playlistId,
              ),
            ],
            items: [
              ...prev.youtube.items.filter(
                (item) => item.album !== playlistId,
              ),
              ...playlist.items,
            ],
          },
        }));
        setSelectedYouTubePlaylistId(playlistId);
        addToHistory(`[OK] Saved YouTube playlist: ${playlist.playlistTitle}`);
        addToHistory(`[INFO] ${playlist.items.length} videos found`);
        openYouTubeListTab();
      } catch (error) {
        addToHistory(
          `[ERROR] Could not load YouTube playlist: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      addToHistory,
      openYouTubeListTab,
      youtubeStorage.youtube.apiKey,
    ],
  );

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

      didHandleEndedRef.current = false;
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

  const playYouTubePlaylist = useCallback(
    (playlistId: string) => {
      const playlist = youtubeStorage.youtube.playlistDetails.find(
        (item) => item.id === playlistId,
      );
      const playlistItems = youtubeStorage.youtube.items.filter(
        (item) => item.album === playlistId,
      );

      setSelectedYouTubePlaylistId(playlistId);

      if (playlistItems.length === 0) {
        addToHistory(
          `[ERROR] No videos cached for ${playlist?.title ?? playlistId}`,
        );
        addToHistory("[HINT] Run yt add playlist-url-or-id again");
        return;
      }

      addToHistory(
        `[INFO] Selected YouTube playlist: ${playlist?.title ?? playlistId}`,
      );
      playItem(playlistItems[0]);
    },
    [
      addToHistory,
      playItem,
      youtubeStorage.youtube.items,
      youtubeStorage.youtube.playlistDetails,
    ],
  );

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

  const handleSeek = useCallback((time: number) => {
    if (activeSourceMode === "yt") {
      setCurrentTime(time);
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, [activeSourceMode]);

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
      const cmd = normalizeCommand(rawCommand);
      const pathCommandMatch = /^(music|radio)\s+--\s*path\s+(.+)$/i.exec(
        rawCommand,
      );

      if (cmd === ":q") {
        if (activeTab === "help" && showHelpTab) {
          closeHelpTab();
        } else if (activeTab === "radio-list" && showRadioListTab) {
          closeRadioListTab();
        } else if (activeTab === "music-list" && showMusicListTab) {
          closeMusicListTab();
        } else if (activeTab === "youtube-list" && showYouTubeListTab) {
          closeYouTubeListTab();
        } else if (showHelpTab) {
          closeHelpTab();
        } else if (showRadioListTab) {
          closeRadioListTab();
        } else if (showMusicListTab) {
          closeMusicListTab();
        } else if (showYouTubeListTab) {
          closeYouTubeListTab();
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

      if (isAwaitingYouTubeApiKey) {
        addToHistory("$ ********");
        setYouTubeApiKey(rawCommand);
        setIsAwaitingYouTubeApiKey(false);
        return;
      }

      addToHistory(`$ ${command}`);

      const sourceCommandMode = getSourceCommandMode(
        cmd,
        pathCommandMatch?.[1]?.toLowerCase(),
      );

      if (sourceCommandMode && sourceCommandMode !== activeSourceMode) {
        addToHistory(
          `[ERROR] Current mode is ${sourceCommandLabel(activeSourceMode)}.`,
        );
        addToHistory(
          `[HINT] Only ${sourceCommandLabel(
            activeSourceMode,
          )} commands are supported in this mode.`,
        );
        addToHistory(
          `[HINT] Use 'source ${sourceCommandMode}' to switch modes.`,
        );
        return;
      }

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

      if (cmd === "version") {
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
      } else if (cmd === "music") {
        selectSource("local");
      } else if (pathCommandMatch?.[1].toLowerCase() === "music") {
        selectSource("local");
        void scanMusicPath(pathCommandMatch[2]);
      } else if (pathCommandMatch?.[1].toLowerCase() === "radio") {
        addToHistory("[ERROR] Radio path configuration is not available");
        addToHistory("[HINT] Use 'radio list' or 'ls -ra' to see all radios");
      } else if (cmd === "music config") {
        selectSource("local");
        void selectMusicFolder();
      } else if (cmd === "music list") {
        selectSource("local");
        openMusicListTab();
      } else if (cmd === "radio" || cmd === "fm") {
        selectSource("radio");
      } else if (cmd === "yt") {
        selectSource("yt");
      } else if (cmd === "yt list") {
        openYouTubeListTab();
      } else if (cmd === "yt auth") {
        setIsAwaitingYouTubeApiKey(true);
      } else if (cmd === "yt auth clear") {
        clearYouTubeApiKey();
      } else if (cmd.startsWith("yt add ")) {
        void saveYouTubePlaylist(rawCommand.slice("yt add ".length));
      } else if (
        cmd === "home" ||
        cmd === "exit"
      ) {
        navigate("/");
      } else if (cmd === "quit") {
        window.App.quit();
      } else if (cmd === "clear") {
        setCommandHistory(["$ "]);
      } else if (cmd === "open now-playing") {
        setActiveTab("now-playing");
        addToHistory("[OK] Selected cat now_playing.txt tab");
      } else if (cmd === "open visualizer") {
        setActiveTab("visualizer");
        addToHistory("[OK] Selected ./visualizer --mode=spectrum tab");
      } else if (cmd === "open controls") {
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
        } else if (queueItems.length > 0) {
          playItem(queueItems[0]);
        }
      } else if (cmd === "pause" || cmd === "stop") {
        clearConnectionTimers();
        setIsPlaying(false);
        addToHistory("[PAUSED] Playback paused");
      } else if (cmd === "next" || cmd === "n") {
        nextItem();
      } else if (cmd === "prev" || cmd === "p") {
        prevItem();
      } else if (cmd === "shuffle") {
        toggleShuffle();
      } else if (cmd === "repeat") {
        toggleRepeat();
      } else if (cmd.startsWith("play ")) {
        const query = normalizeCommand(rawCommand.slice(5).replace(/"/g, ""));
        const itemIndex = Number.parseInt(query, 10);
        const isYouTubePlaylistCommand =
          activeSourceMode === "yt" &&
          activeTab === "youtube-list" &&
          showYouTubeListTab;

        if (isYouTubePlaylistCommand) {
          const playlistId =
            Number.isInteger(itemIndex) &&
            itemIndex >= 1 &&
            itemIndex <= youtubeStorage.youtube.playlists.length
              ? youtubeStorage.youtube.playlists[itemIndex - 1]
              : youtubeStorage.youtube.playlists.find((playlistId) => {
                  const playlist = youtubeStorage.youtube.playlistDetails.find(
                    (item) => item.id === playlistId,
                  );

                  return normalizeCommand(
                    playlist?.title ?? playlistId,
                  ).includes(query);
                });

          if (playlistId) {
            playYouTubePlaylist(playlistId);
          } else {
            addToHistory(`[ERROR] YouTube playlist not found: ${query}`);
          }

          return;
        }

        const found =
          Number.isInteger(itemIndex) &&
          itemIndex >= 1 &&
          itemIndex <= visibleItems.length
            ? visibleItems[itemIndex - 1]
            : visibleItems.find(
                (item) =>
                  normalizeCommand(item.title).includes(query) ||
                  normalizeCommand(item.artist).includes(query),
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
          activeSourceMode === "radio" ? recentRadioItems : visibleItems;

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

        if (listedItems.length === 0 && activeSourceMode === "yt") {
          addToHistory("[INFO] no youtube videos selected");
          addToHistory("[HINT] Use 'yt list' and 'play 1' to select a playlist");
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
            `[STATUS] Shuffle: ${isShuffleEnabled ? "on" : "off"}`,
          );
          addToHistory(
            `[STATUS] Repeat: ${isRepeatEnabled ? "on" : "off"}`,
          );
          addToHistory(
            `[STATUS] Audio API: ${isConnected ? "Connected" : "Procedural"}`,
          );
        } else {
          addToHistory("[STATUS] No item is playing");
        }
      } else if (cmd === "mute") {
        muteVolume();
        addToHistory("[OK] Volume muted");
      } else if (cmd === "unmute") {
        unmuteVolume();
        addToHistory(
          `[OK] Volume restored to ${Math.round(volumeRef.current * 100)}%`,
        );
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
      closeYouTubeListTab,
      clearYouTubeApiKey,
      currentItem,
      navigate,
      openHelpTab,
      openMusicListTab,
      openRadioListTab,
      openYouTubeListTab,
      playItem,
      playYouTubePlaylist,
      nextItem,
      prevItem,
      queueItems,
      selectSource,
      scanMusicPath,
      selectMusicFolder,
      setYouTubeApiKey,
      saveYouTubePlaylist,
      visibleItems,
      volume,
      isShuffleEnabled,
      isRepeatEnabled,
      addToHistory,
      clearConnectionTimers,
      simulateLoading,
      isLoading,
      isAwaitingYouTubeApiKey,
      handleVolumeChange,
      muteVolume,
      unmuteVolume,
      toggleShuffle,
      toggleRepeat,
      isConnected,
      showHelpTab,
      showMusicListTab,
      showRadioListTab,
      showYouTubeListTab,
      tabs,
      recentRadioItems,
      youtubeStorage.youtube.playlistDetails,
      youtubeStorage.youtube.playlists,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (
        (activeTab === "radio-list" ||
          activeTab === "tracks" ||
          activeTab === "youtube-list") &&
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

        if (activeTab === "youtube-list" && showYouTubeListTab) {
          scrollYouTubeList(direction);
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
  }, [
    activeTab,
    cycleTab,
    scrollRadioList,
    scrollTrackList,
    scrollYouTubeList,
    showRadioListTab,
    showYouTubeListTab,
  ]);

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
      if (isRepeatEnabled && currentItem) {
        addToHistory("[INFO] Repeating current item");
        playItem(currentItem);
        return;
      }

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
  }, [
    currentItem,
    isRepeatEnabled,
    nextItem,
    playItem,
    addToHistory,
    updateLocalItemDuration,
  ]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !currentItem || currentItem.mode === "yt") {
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

    if (!audio || !currentItem || currentItem.mode === "yt") {
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

  const handlePlayerEnded = useCallback(() => {
    if (didHandleEndedRef.current) {
      return;
    }

    didHandleEndedRef.current = true;
    addToHistory("[INFO] Item ended");

    if (isRepeatEnabled && currentItem) {
      addToHistory("[INFO] Repeating current item");
      playItem(currentItem);
      return;
    }

    nextItem();
  }, [addToHistory, currentItem, isRepeatEnabled, nextItem, playItem]);

  useEffect(() => {
    if (currentItem?.mode !== "yt" || !isPlaying || duration <= 0) {
      return;
    }

    const timerId = window.setInterval(() => {
      setCurrentTime((prev) => {
        const nextTime = Math.min(prev + 1, duration);

        if (nextTime >= duration) {
          window.setTimeout(handlePlayerEnded, 0);
        }

        return nextTime;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [currentItem?.mode, duration, handlePlayerEnded, isPlaying]);

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
        return renderPlayerControls();
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
      case "youtube-list":
        return (
          <YouTubeListTab
            currentPlaylistId={selectedYouTubePlaylistId}
            onSelectPlaylist={playYouTubePlaylist}
            scrollContainerRef={youtubeListScrollRef}
            youtube={youtubeStorage.youtube}
          />
        );
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
              className={`relative min-h-0 flex-1 overflow-hidden bg-background ${
                activeTab === "controls" ? "" : "pointer-events-none"
              }`}
            >
              {activeSourceMode === "yt" ? (
                <>
                  <div
                    className={
                      activeTab === "controls"
                        ? "h-full"
                        : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                    }
                  >
                    {renderPlayerControls()}
                  </div>
                  {activeTab === "controls" ? null : renderTabContent()}
                </>
              ) : (
                renderTabContent()
              )}
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
              promptLabel={
                isAwaitingYouTubeApiKey ? "YouTube API Key:" : undefined
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
