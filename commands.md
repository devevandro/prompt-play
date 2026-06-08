# Commands

Reference for commands accepted by the Prompt Play terminal input.

## First Access

| Command | Description |
| --- | --- |
| `pp music` or `music` | Opens the player on the local music library. |
| `pp radio` or `radio` | Opens the player on FM and web radio streams. |
| `pp exit` | Keeps the app on the first access screen. |
| `pp quit` | Closes the application. |
| `help` | Shows the first access hint. |

## Playback

| Command | Description |
| --- | --- |
| `play` | Starts playback. If no item is selected, plays the first item from the active source. |
| `play [number]` | Plays the item by its 1-based position in the active source list. Example: `play 1`. |
| `play [name]` | Plays the first item from the active source matching title or artist/channel/city. Example: `play midnight` or `play FM o Dia`. |
| `resume` | Resumes the current item. |
| `pause` | Pauses playback. |
| `stop` | Pauses playback. |
| `next` or `n` | Plays the next item from the active source. |
| `prev` or `p` | Plays the previous item from the active source. |

## Sources

| Command | Description |
| --- | --- |
| `sources` | Lists available player sources and highlights the active one. |
| `source local` | Uses music files available on the computer. |
| `source radio` | Uses FM and web radio streams. |
| `source yt` | Uses YouTube playlists. |
| `pp music` or `music` | Switches the player to local music mode. |
| `pp radio`, `radio`, or `fm` | Switches the player to radio mode. |

## Library

| Command | Description |
| --- | --- |
| `list` or `ls` | Lists items from the active source. |
| `ls -la` | Opens the active source list tab. For radio, this tab shows the 5 most recently played radios. |
| `music -- path [path]` | Scans and stores a local music folder. Relative paths are resolved from the app, home, `~/Music`, and `~/Downloads`. |
| `radio -- path [path]` | Alias for local folder scanning kept for terminal-style input compatibility. |
| `music config` | Opens the native folder picker and stores the selected music folder. |
| `music list` | Opens the temporary `music lists` tab. When no library is configured, it shows suggested `~/Music` and `~/Downloads` paths. |
| `radio list` or `ls -ra` | Switches to radio and opens a temporary `radio list` tab with every configured radio. |
| `status` or `info` | Shows active source, current item, creator/city/channel, volume, and audio API status. |

For radio sources, `list`, `ls`, and the `ls -la` tab show only the 5 most
recently played radios. Use `radio list` or `ls -ra` to verify the full radio
listing from `src/shared/data/radios.ts` in a temporary tab.

For local music, scans are persisted in `localStorage` under
`prompt-play-music-libraries`. Stored libraries are refreshed when the player
opens so duration and ID3 artist/title/album metadata can be updated without
reconfiguring the folder.

## Volume

| Command | Description |
| --- | --- |
| `vol [0-100]` | Sets the player volume. Example: `vol 70`. |
| `vol +[number]` | Increases the current volume by a relative amount. Example: `vol +10`. |
| `vol -[number]` | Decreases the current volume by a relative amount. Example: `vol -10`. |

## Tabs

| Command | Description |
| --- | --- |
| `pp music` | Switches the player to the local music library. |
| `pp radio` | Switches the player to FM and web radio streams. |
| `pp home`, `pp exit`, `home`, or `exit` | Returns from the player to the first access screen. |
| `pp quit` or `quit` | Closes the application. |
| `pp clear` | Clears terminal history. |
| `pp version` | Shows the current project version. |
| `pp open now-playing` | Opens the `cat now_playing.txt` tab. |
| `pp open visualizer` | Opens the `./visualizer --mode=spectrum` tab. |
| `pp open controls` | Opens the `./player-controls` tab. |
| `tab [number]` | Opens a tab by 1-based position in the current tab strip. |
| `music list` | Opens the temporary `music lists` tab next to `./player-controls`. |
| `radio list` or `ls -ra` | Opens the temporary `radio list` tab next to `./player-controls`. |
| `:q` | Closes the active temporary tab, such as `Prompt Play Help`, `music lists`, or `radio list`. |

## Status Footer

The footer always shows the current volume. The left status changes by active
tab and active source:

| Tab | Footer status |
| --- | --- |
| Source list tab | Total source items and total duration, or live streaming status for radio. |
| `cat now_playing.txt` | Current source item status: playing, paused, or waiting for selection. |
| `./visualizer --mode=spectrum` | Active source plus FFT status. |
| `./player-controls` tab | `player-controls ready`. |
| `radio list` | Full radio list status and `:q` close hint. |
| `music lists` | Music library list status and `:q` close hint. |
| `Prompt Play Help` | Help status and `:q` close hint. |

## Source Behavior

| Source | List command label | Seek | Duration display |
| --- | --- | --- | --- |
| `local` | `ls -la audio/aac *.mp3 *.aac *.wav *.flac *.ogg` | Enabled | Track duration from ID3/browser metadata when available. |
| `radio` | `ls -la audio/aac *.mp3 *.aac *.m3u *.pls stream` | Disabled | `live`. |
| `yt` | `yt playlists` | Enabled | Playlist duration. |

Local files are served through the privileged `local-audio:` Electron protocol
with range requests, CORS headers, and CSP `media-src` support. This allows the
native audio element and the Web Audio visualizer to read local files without
using unsafe `file://` URLs. Radio playback uses the native audio element without
Web Audio analysis because many live streams do not allow CORS access for
`MediaElementAudioSource`.

## Themes

| Command | Description |
| --- | --- |
| `theme list` | Opens the interactive theme picker. |
| `ls -th` | Opens the interactive theme picker. |
| `theme use default` | Applies the Default theme. |
| `theme use tokyo-night` | Applies the Tokyo Night theme. |
| `theme use dark-soul` | Applies the Dark Soul theme. |
| `theme use dark-petroleum-blue` | Applies the Dark Petroleum Blue theme. |

Theme picker controls: `Up`/`Down` selects a theme, `Enter` applies it, and
`Esc` closes the picker.

## System

| Command | Description |
| --- | --- |
| `zsh-player --init` or `init` | Simulates player initialization. |
| `pp version` | Shows project, audio engine, and visualizer version info. |
| `help`, `h`, or `?` | Opens the temporary help tab. |
| `:q` | Closes the active temporary tab. |
| `pp clear` | Clears terminal history. |

## Input Shortcuts

| Shortcut | Description |
| --- | --- |
| `Tab` | Autocompletes commands or opens suggestions. |
| `Left`/`Right` | Moves between autocomplete suggestions when visible. |
| `Up`/`Down` | Navigates command history, or theme picker items when the picker is open. |
| `Esc` | Closes suggestions or the theme picker. |
| `Cmd/Ctrl + 1..4` | Switches tabs directly. |
