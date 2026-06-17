# Prompt Play

Prompt Play is an Electron desktop music player with a terminal-style
interface. It supports local music files, online radio streams, and YouTube
playlist sources from one shared player UI.

## Features

- Local music folder scanning with persisted libraries.
- MP3 title, artist, album, and duration metadata when available.
- Local playback through a secure Electron `local-audio:` protocol with range
  requests and CORS support.
- Online radio mode with a full radio-list tab and recently played radio list.
- YouTube playlist mode with API-key setup, playlist caching, embedded video
  playback, volume controls, playlist navigation, and automatic advance.
- Source-aware player controls, seek handling, status footer, and visualizer.
- Terminal commands for playback, sources, volume, tabs, themes, and app
  navigation.
- Shuffle, repeat, mute, and unmute controls across supported sources.
- Theme picker with terminal-inspired themes, each with its own monospace font.

## Requirements

- Node.js compatible with the project dependencies.
- Yarn `1.22.22`, as declared in `package.json`.

## Development

Install dependencies:

```sh
yarn install
```

Start the Electron Vite development app:

```sh
yarn dev
```

Build the Electron Vite app:

```sh
yarn compile:app
```

Preview the built app:

```sh
yarn start
```

Run validation:

```sh
yarn typecheck
yarn lint
```

Package the app with Electron Builder:

```sh
yarn build
```

## Core Commands

First access:

| Command | Action |
| --- | --- |
| `music` | Open local music mode. |
| `radio` | Open radio mode. |
| `yt` | Open YouTube playlist mode. |
| `help` | Show the first access hint. |
| `quit` | Close the app. |

Playback:

| Command | Action |
| --- | --- |
| `play` | Play the selected item or first item in the active source. |
| `play 1` | Play an item by list position. |
| `play [name]` | Play the first item matching title or artist/city/channel. |
| `pause` or `stop` | Pause playback. |
| `resume` | Resume playback. |
| `next` or `n` | Play the next item. |
| `prev` or `p` | Play the previous item. |
| `shuffle` | Toggle random playback order. |
| `repeat` | Toggle repeat for the current item. |

Local music:

| Command | Action |
| --- | --- |
| `music -- path [path]` | Scan and store a music folder, then make it active. |
| `music config` | Select a music folder with the native folder picker and make it active. |
| `music list` | Open the temporary saved-folder list tab. |
| `music clear` | Remove saved music folders and cached music lists. |
| `ls -la` | Open the active source list tab. |

Sources and radio:

| Command | Action |
| --- | --- |
| `sources` | Show available sources. |
| `source local` | Switch to local files. |
| `source radio` | Switch to radio. |
| `source yt` | Switch to YouTube playlists. |
| `radio list` or `ls -ra` | Open the full temporary radio list tab. |

YouTube:

| Command | Action |
| --- | --- |
| `yt` | Switch to YouTube mode. |
| `yt auth` | Start the interactive YouTube API key prompt. |
| `yt auth clear` | Remove the saved YouTube API key. |
| `yt add [playlist-url-or-id]` | Fetch and cache a YouTube playlist. |
| `yt remove [number-or-name]` | Remove one saved YouTube playlist and cached videos. |
| `yt clear playlists` | Remove playlists and cached videos while keeping the API key. |
| `yt clean` | Remove all YouTube configuration, including the API key. |
| `yt list` | Open the temporary saved-playlist list tab. |
| `play [number]` in `yt playlists` | Select and start a saved playlist. |

Tabs and utility:

| Command | Action |
| --- | --- |
| `open now-playing` | Open `cat now_playing.txt`. |
| `open visualizer` | Open `./visualizer --mode=spectrum`. |
| `open controls` | Open `./player-controls`. |
| `tab [number]` | Open a tab by position. |
| `theme list` or `ls -th` | Open the theme picker. |
| `theme use [theme]` | Apply a theme. |
| `vol 70`, `vol +10`, `vol -10` | Set or adjust volume. |
| `mute` or `unmute` | Mute playback or restore the previous volume. |
| `status` or `info` | Show current playback status. |
| `:q` | Close a temporary tab. |
| `clear` | Clear terminal history. |
| `clear playback` | Stop playback without removing saved data. |
| `clear all` | Stop playback and remove saved Electron Storage data. |
| `music clear` | Remove saved music folders and cached music lists. |
| `yt clear playlists` | Remove YouTube playlists while keeping the API key. |
| `home` or `exit` | Return to first access. |

See [commands.md](commands.md) for the full command reference.

## Themes

Themes can be selected with `theme list`, `ls -th`, or `theme use [theme]`.
`theme use [theme]` accepts ids such as `dark-soul` and names such as
`dark soul`. Each theme applies its own font family through the shared terminal
typography tokens and is persisted for the next launch.

| Theme | Command id | Font family |
| --- | --- | --- |
| Default | `default` | DM Mono |
| Tokyo Night | `tokyo-night` | Space Mono |
| Dark Soul | `dark-soul` | Datatype |
| Dark Petroleum Blue | `dark-petroleum-blue` | Chivo Mono |
| Shell Pink | `shell-pink` | Lekton |
| Synthwave | `synthwave` | Cousine |

Dark Soul and Shell Pink use a slightly larger text scale and line height so
Datatype and Lekton remain readable in the terminal interface.

## Project Structure

- `src/main`: Electron main process, IPC handlers, radio stream checks, local
  music scanning, and the `local-audio:` protocol.
- `src/preload`: Safe renderer bridge exposed as `window.App`.
- `src/renderer`: React UI, screens, hooks, terminal flow, and player
  components.
- `src/shared`: Shared types, constants, utilities, and radio data.
- `src/lib/electron-app`: Electron setup helpers, factories, release scripts,
  and bundled dev tooling.

## Local Audio Notes

Local files are not loaded with direct `file://` URLs. The main process serves
them through `local-audio:` so Chromium can stream them with byte ranges and the
renderer can use the Web Audio API for visualization. The renderer CSP in
`src/renderer/index.html` must explicitly allow `local-audio:` in `media-src`.

## YouTube Notes

`yt auth` prompts for the API key, and `yt add [playlist-url-or-id]` accepts
either a full playlist URL or a plain playlist id. Playlist loading follows
YouTube pagination, stores total video counts, caches title/channel/video id and
duration metadata, and renders the selected playlist in `ls -la`. The embedded
YouTube player stays mounted while moving between YouTube tabs so playback can
continue and advance automatically. Use `next` and `prev` to navigate the
selected playlist, `yt remove [number-or-name]` to remove one playlist, and
`yt clear playlists` to remove playlist data while keeping the API key.

## Storage Notes

Prompt Play persists app data through Electron Storage under the app user-data
directory. Saved music folders live under `prompt-play-music-libraries`, and
YouTube settings live under `prompt-play-youtube`. In local music mode, the
last folder selected with `music -- path [path]` or `music config` is the active
folder for `list`, `ls -la`, `play`, and the playback queue; older saved
folders remain available in `music list` but are not merged into the active
music list. `clear playback` stops playback without removing saved data, while
`clear all` stops playback and removes saved Electron Storage data. Use
`music clear` to reset saved music folders only, or `yt clear playlists` to
reset YouTube playlists without removing the API key.

## Documentation

- [commands.md](commands.md): terminal command reference.
- [AGENTS.md](AGENTS.md): repository guidelines for future coding agents.
