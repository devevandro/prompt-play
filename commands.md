# Commands

Reference for commands accepted by the Prompt Play terminal input.

## First Access

| Command | Description |
| --- | --- |
| `music` | Opens the player on the local music library. |
| `radio` | Opens the player on FM and web radio streams. |
| `yt` | Opens the player on YouTube playlists. |
| `exit` | Keeps the app on the first access screen. |
| `quit` | Closes the application. |
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
| `next` or `n` | Plays the next item from the active queue. In radio mode, this follows the recent list on `ls -la` and the full station list on `radio list` or `ls -ra`. |
| `prev` or `p` | Plays the previous item from the active queue. In radio mode, this follows the recent list on `ls -la` and the full station list on `radio list` or `ls -ra`. |
| `shuffle` | Toggles random playback order for the active source. |
| `repeat` | Toggles repeat for the current item. |

## Sources

| Command | Description |
| --- | --- |
| `sources` | Lists available player sources and highlights the active one. |
| `source local` | Uses music files available on the computer. |
| `source radio` | Uses FM and web radio streams. |
| `source yt` | Uses YouTube playlists. |
| `music` | Switches the player to local music mode. |
| `radio` or `fm` | Switches the player to radio mode. |
| `yt` | Switches the player to YouTube mode. |

Source-specific commands only work in their active mode. For example, radio
commands such as `radio list` and `fm` are rejected while the player is in
music mode, and music commands such as `music config` and `music list` are
rejected while the player is in radio mode. YouTube commands such as `yt list`
and `yt add` are rejected outside YouTube mode. Use `source local`,
`source radio`, or `source yt` to change modes.

## Library

| Command | Description |
| --- | --- |
| `list` or `ls` | Lists items from the active source. |
| `ls -la` | Opens the active source list tab. For radio, this tab shows the 5 most recently played radios. |
| `music -- path [path]` | Scans and stores a local music folder. Relative paths are resolved from the app, home, `~/Music`, and `~/Downloads`. The scanned folder becomes the active music folder. |
| `radio -- path [path]` | Not supported. Radio stations are configured in `src/shared/data/radios.ts`; use `radio list` or `ls -ra` to view them. |
| `music config` | Opens the native folder picker, stores the selected music folder, and makes it the active music folder. |
| `music list` | Opens the temporary `music lists` tab with saved music folders. When no library is configured, it shows suggested `~/Music` and `~/Downloads` paths. |
| `music clear` or `music reset` | Removes saved music folders and cached music lists without removing YouTube data or the selected theme. |
| `radio list` or `ls -ra` | Opens a temporary `radio list` tab with every configured radio. |
| `yt list` | Opens the temporary `yt playlists` tab. |
| `yt auth` | Starts the interactive YouTube API key prompt. Enter the key at `YouTube API Key:`. |
| `yt auth clear` | Removes the saved YouTube API key from Electron Storage. |
| `yt add [playlist-url-or-id]` | Fetches a YouTube playlist from a full playlist URL or playlist id, saves the playlist id, total video count, and cached video metadata in Electron Storage. |
| `yt remove [number-or-name]` | Removes one saved YouTube playlist and its cached videos by playlist position, id, or title match. |
| `yt clear` or `yt clear playlists` | Removes saved YouTube playlists and cached videos while keeping the saved API key. |
| `yt clean` | Removes the saved YouTube API key, playlists, and cached videos. |
| `play [number]` in `yt playlists` | Selects and starts the playlist by its 1-based position. Example: `play 1`. |
| `status` or `info` | Shows active source, current item, creator/city/channel, volume, random/repeat state, and audio API status. |

For radio sources, `list`, `ls`, and the `ls -la` tab show only the 5 most
recently played radios. Use `radio list` or `ls -ra` to verify the full radio
listing from `src/shared/data/radios.ts` in a temporary tab. The playback queue
follows the visible radio context: `next` and `prev` use the recent list on
`ls -la`, and the full station list while the temporary `radio list` tab is
open.

For local music, scans are persisted in Electron Storage under
`prompt-play-music-libraries`. Stored libraries are refreshed when the player
opens so duration and ID3 artist/title/album metadata can be updated without
reconfiguring the folder. The active music folder is always the last folder
selected with `music -- path [path]` or `music config`; `list`, `ls`, `ls -la`,
`play`, and the playback queue use only that folder. Previously saved folders
remain available in `music list`, but they are not merged into the active music
list.

For YouTube, configuration is persisted in Electron Storage under
`prompt-play-youtube` using a JSON shape with a `youtube.apiKey` and
`youtube.playlists` array. The `yt add` command uses the YouTube
`playlists` API for the title and total video count, then uses the
`playlistItems` API for titles and video ids, following `nextPageToken` until
all playlist pages are loaded. It then calls the YouTube `videos` API in batches
for durations because `playlistItems` does not include duration metadata.
The `ls -la` tab renders video title, artist/channel when available, and total
video duration for the selected playlist only. The `yt playlists` tab lists
saved playlists; run `play [number]` there to choose which playlist feeds
`ls -la`. In YouTube mode, use `play [number]` from the selected playlist list
to move to a specific video, or `next`, `n`, `prev`, and `p` to move through
the selected playlist queue.
The `./player-controls` tab renders the current YouTube video as an autoplaying
embedded player and stays mounted while navigating between YouTube tabs so
playback can continue. Volume commands and the volume control send YouTube
iframe API commands too. When a YouTube video ends while playback is active,
the player advances to the next selected playlist item automatically from the
YouTube iframe end event.

## Volume

| Command | Description |
| --- | --- |
| `vol [0-100]` | Sets the player volume. Example: `vol 70`. |
| `vol +[number]` | Increases the current volume by a relative amount. Example: `vol +10`. |
| `vol -[number]` | Decreases the current volume by a relative amount. Example: `vol -10`. |
| `mute` | Mutes the player and remembers the previous non-zero volume. |
| `unmute` | Restores the volume saved before muting, or 70% when no previous volume exists. |

## Tabs

| Command | Description |
| --- | --- |
| `music` | Switches the player to the local music library. |
| `radio` | Switches the player to FM and web radio streams. |
| `home` or `exit` | Returns from the player to the first access screen. |
| `quit` | Closes the application. |
| `clear` | Clears terminal history. |
| `clear playback` | Stops and clears the current playback state for radio, music, and YouTube without removing saved data. |
| `clear all` | Stops and clears the current playback state for radio, music, and YouTube, then removes saved Electron Storage data. |
| `music clear` or `music reset` | Removes saved music folders and cached music lists. |
| `yt clear` or `yt clear playlists` | Removes YouTube playlists and cached videos while keeping the saved API key. |
| `yt clean` | Removes all YouTube configuration, including the API key. |
| `version` | Shows the current project version. |
| `open now-playing` | Opens the `cat now_playing.txt` tab. |
| `open visualizer` | Opens the `./visualizer --mode=spectrum` tab. |
| `open controls` | Opens the `./player-controls` tab. |
| `tab [number]` | Opens a tab by 1-based position in the current tab strip. |
| `music list` | Opens the temporary `music lists` tab next to `./player-controls`. |
| `radio list` or `ls -ra` | Opens the temporary `radio list` tab next to `./player-controls`. |
| `yt list` | Opens the temporary `yt playlists` tab next to `./player-controls`. |
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
| `yt playlists` | YouTube playlist list status and `:q` close hint. |
| `Prompt Play Help` | Help status and `:q` close hint. |

## Source Behavior

| Source | List command label | Seek | Duration display |
| --- | --- | --- | --- |
| `local` | `ls -la audio/aac *.mp3 *.aac *.wav *.flac *.ogg` | Enabled | Track duration from ID3/browser metadata when available. |
| `radio` | `ls -la audio/aac *.mp3 *.aac *.m3u *.pls stream` | Disabled | `live`. |
| `yt` | `yt playlists` | Enabled | YouTube video duration from the `videos` API when available. |

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
| `theme use shell-pink` | Applies the Shell Pink theme. |
| `theme use synthwave` | Applies the Synthwave theme. |

Theme picker controls: `Up`/`Down` selects a theme, `Enter` applies it, and
`Esc` closes the picker. `theme use [theme]` accepts either the command id or
the theme name, such as `theme use dark-soul` or `theme use dark soul`.

## System

| Command | Description |
| --- | --- |
| `zsh-player --init` or `init` | Simulates player initialization. |
| `version` | Shows project, audio engine, and visualizer version info. |
| `help`, `h`, or `?` | Opens the temporary help tab. |
| `:q` | Closes the active temporary tab. |
| `clear` | Clears terminal history. |
| `clear playback` | Stops and clears playback for radio, music, and YouTube without removing saved data. |
| `clear all` | Stops and clears playback for radio, music, and YouTube, then removes saved Electron Storage data. |
| `music clear` or `music reset` | Removes saved music folders and cached music lists. |
| `yt clear` or `yt clear playlists` | Removes YouTube playlists and cached videos while keeping the saved API key. |
| `yt clean` | Removes all YouTube configuration, including the API key. |

## Input Shortcuts

| Shortcut | Description |
| --- | --- |
| `Tab` | Autocompletes commands or opens suggestions. |
| `Left`/`Right` | Moves between autocomplete suggestions when visible. |
| `Up`/`Down` | Navigates command history, or theme picker items when the picker is open. |
| `Up`/`Down` on list tabs | Scrolls `ls -la`, `radio list`, and `yt playlists`. |
| `Esc` | Closes suggestions or the theme picker. |
| `Cmd/Ctrl + 1..4` | Switches tabs directly. |
