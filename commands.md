# Commands

Reference for commands accepted by the Prompt Play terminal input.

## First Access

| Command | Description |
| --- | --- |
| `music` | Opens the player on the local music library. |
| `radio` or `fm` | Opens the player on FM and web radio streams. |
| `exit` | Keeps the app on the first access screen. |
| `quit` | Closes the application. |
| `help` | Shows the first access hint. |

## Playback

| Command | Description |
| --- | --- |
| `play` | Starts playback. If no item is selected, plays the first item from the active source. |
| `play [number]` | Plays the item by its 1-based position in the active source list. Example: `play 1`. |
| `play [name]` | Plays the first item from the active source matching title, artist, station, or city. |
| `artist [name]` | In local music mode, builds an artist-only queue and plays the first matching item. |
| `play artist [name]` | Alias for `artist [name]`. |
| `artist clear` | Clears the artist-only queue and returns `next`/`prev` to the full local library. |
| `resume` | Resumes the current item. |
| `pause` | Pauses playback. |
| `stop` | Pauses playback. |
| `next` or `n` | Plays the next item from the active queue. In radio mode, this follows the recent list on `ls -la` and the visible saved/search list on `radio list` or `ls -ra`. |
| `prev` or `p` | Plays the previous item from the active queue. In radio mode, this follows the recent list on `ls -la` and the visible saved/search list on `radio list` or `ls -ra`. |
| `shuffle` | Toggles random playback order for the active source. |
| `repeat` | Toggles repeat for the current item. |

## Sources

| Command | Description |
| --- | --- |
| `sources` | Lists available player sources and highlights the active one. |
| `source local` | Uses music files available on the computer. |
| `source radio` | Uses FM and web radio streams. |
| `music` | Switches the player to local music mode. |
| `radio` or `fm` | Switches the player to radio mode. |

Source-specific commands only work in their active mode. For example, radio
commands such as `radio list`, `radio search`, and `radio history` are rejected
while the player is in music mode. Music commands such as `music config` and
`music list` are rejected while the player is in radio mode. Use `source local`
or `source radio` to change modes.

## Library

| Command | Description |
| --- | --- |
| `list` or `ls` | Lists items from the active source. |
| `ls -la` | Opens the active source list tab. For radio, this tab shows the 5 most recently played saved radios. |
| `music -- path [path]` | Scans and stores a local music folder. Relative paths are resolved from the app, home, `~/Music`, and `~/Downloads`. The scanned folder becomes the active music folder. |
| `radio -- path [path]` | Not supported. Use `radio add` or `radio search` to configure radio stations. |
| `music config` | Opens the native folder picker, stores the selected music folder, and makes it the active music folder. |
| `music list` | Opens the temporary `music lists` tab with saved music folders. When no library is configured, it shows suggested `~/Music` and `~/Downloads` paths. |
| `music clear` or `music reset` | Removes saved music folders and cached music lists without removing saved radios or the selected theme. |
| `radio list` or `ls -ra` | Opens a temporary `radio list` tab with saved radios. |
| `radio search [term]` | Searches Radio Browser for Brazilian stations by name, state, and tag. Example: `radio search "CBN"`. |
| `radio add [number]` | Saves a station from the current search results. Example: `radio add 1`. |
| `radio add Name \| City \| State \| URL \| Frequency` | Adds a station manually. `Frequency` is optional and defaults to `stream`. |
| `radio edit [number] Name \| City \| State \| URL \| Frequency` | Replaces the details for a saved station while keeping its saved id. |
| `radio remove [number]` | Removes one saved radio and clears it from recent-radio state. |
| `radio clear` | Removes all saved radios and clears recent-radio state. |
| `radio export` | Exports saved radios as a timestamped JSON file in Downloads. |
| `radio import` | Imports saved radios from a JSON file through a native open dialog. |
| `radio import external` | Alias for importing externally prepared radio JSON. |
| `radio pin [number]` | Pins a saved radio so it appears in the radio `ls -la` list. |
| `radio pins` | Lists radios currently pinned for `ls -la`. |
| `radio unpin [number]` | Removes one pinned radio from the radio `ls -la` list. |
| `radio history` | Opens the temporary `cat radio_history.txt` tab with up to 10 valid songs heard during the current app session. |
| `radio search music [number]` | Opens a YouTube search in the browser for a radio-history song. |
| `settings radio.static on` | Enables the optional tuning sound while radio buffering takes longer than 1 second. |
| `settings radio.static off` | Disables the optional tuning sound. |
| `status` or `info` | Shows active source, current item, creator/city, volume, random/repeat state, and audio API status. |

For radio sources, `list`, `ls`, and the `ls -la` tab show only the 5 most
recently played saved radios. Use `radio list` or `ls -ra` to view saved
radios in a temporary tab. Running `radio search [term]` switches that tab into
search mode; use `radio add [number]` to save a result locally.

Radio stations expose live song metadata when available. Most stations use ICY
`StreamTitle`; the station named `FM O DIA 100.5` uses its dedicated
live-information endpoint. The player renders `♫ now playing: unavailable`
when the station does not provide song data. Only valid songs are added to
`radio history`; programs, empty metadata, and unavailable values are ignored.
History is held only in memory for the current session and includes the station
name and relative update time.

For local music, scans are persisted in Electron Storage under
`prompt-play-music-libraries`. Stored libraries are refreshed when the player
opens so duration and ID3 artist/title/album metadata can be updated without
reconfiguring the folder. The active music folder is always the last folder
selected with `music -- path [path]` or `music config`; `list`, `ls`, `ls -la`,
`play`, and the playback queue use only that folder. Previously saved folders
remain available in `music list`, but they are not merged into the active music
list.

Saved radios are persisted in Electron Storage under `prompt-play-radios`.
Use `radio export` to save the current station list as JSON in Downloads, and
`radio import` or `radio import external` to merge a previously exported or
externally prepared JSON file into saved radios. Use `radio pin [number]` to
choose which saved radios appear in radio `ls -la`; if no radios are pinned,
`ls -la` falls back to the 5 most recently played saved radios.
Manual station commands use pipe-separated fields:

```text
radio add Name | City | State | URL | Frequency
radio edit 1 Name | City | State | URL | Frequency
```

`Frequency` can be omitted when the stream has no FM label or codec detail. The
optional radio tuning sound setting is persisted under `prompt-play-settings`.
When a radio stalls or fails to start, the player starts the tuning sound and
keeps searching for up to 30 seconds. If the stream does not become playable in
that window, playback advances to the next station in the current radio queue.

## Volume

| Command | Description |
| --- | --- |
| `vol [0-100]` | Sets the player volume. Example: `vol 70`. |
| `vol +[number]` | Increases the current volume by a relative amount. Example: `vol +10`. |
| `vol -[number]` | Decreases the current volume by a relative amount. Example: `vol -10`. |
| `+` or `=` | Increases volume by 5 when the terminal input is empty. |
| `-` | Decreases volume by 5 when the terminal input is empty. |
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
| `clear playback` | Stops and clears the current playback state without removing saved data. |
| `clear all` | Stops and clears the current playback state, then removes saved Electron Storage data. |
| `copy error` | Copies the most recent playback error details to the clipboard. |
| `music clear` or `music reset` | Removes saved music folders and cached music lists. |
| `radio clear` | Removes saved radios. |
| `settings radio.static on` | Enables the radio tuning sound during slow buffering. |
| `settings radio.static off` | Disables the radio tuning sound. |
| `version` | Shows the current project version. |
| `open now-playing` | Opens the `cat now_playing.txt` tab. |
| `open visualizer` | Opens the terminal-green `./visualizer --mode=ascii` TUI. |
| `visualizer ascii` | Opens the visualizer and keeps the visualizer mode as ASCII. |
| `open controls` | Opens the `./player-controls` tab. |
| `tab [number]` | Opens a tab by 1-based position in the current tab strip. |
| `music list` | Opens the temporary `music lists` tab next to `./player-controls`. |
| `radio list` or `ls -ra` | Opens the temporary `radio list` tab next to `./player-controls`. |
| `radio history` | Opens the temporary `cat radio_history.txt` tab next to `./player-controls`. |
| `:q` | Closes the active temporary tab, such as `Prompt Play Help`, `music lists`, `radio list`, or `cat radio_history.txt`. |

## Status Footer

The footer always shows the current volume. The left status changes by active
tab and active source:

| Tab | Footer status |
| --- | --- |
| Source list tab | Total source items and total duration, or live streaming status for radio. |
| `cat now_playing.txt` | Current source item status. In radio mode, shows station, state, city, live song metadata, and relative update time. |
| `./visualizer --mode=ascii` | Terminal-green 48-band ASCII/TUI spectrum with input, source, peak, average, and playback state. |
| `./player-controls` tab | `player-controls ready`. |
| `radio list` | Saved/search radio list status and `:q` close hint. |
| `cat radio_history.txt` | In-session radio song history and `:q` close hint. |
| `music lists` | Music library list status and `:q` close hint. |
| `Prompt Play Help` | Help status and `:q` close hint. |

## Source Behavior

| Source | List command label | Seek | Duration display |
| --- | --- | --- | --- |
| `local` | `ls -la audio/aac *.mp3 *.aac *.wav *.flac *.ogg` | Enabled | Track duration from ID3/browser metadata when available. |
| `radio` | `ls -la audio/aac *.mp3 *.aac *.m3u *.pls stream` | Disabled | `live`. |

Local files are served through the privileged `local-audio:` Electron protocol
with range requests, CORS headers, and CSP `media-src` support. This allows the
native audio element and the Web Audio visualizer to read local files without
using unsafe `file://` URLs. Radio playback uses the native audio element
without Web Audio analysis because many live streams do not allow CORS access
for `MediaElementAudioSource`.

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
| `theme use claude-code` | Applies the Claude Code theme. |

Theme picker controls: `Up`/`Down` selects a theme, `Enter` applies it, and
`Esc` closes the picker. `theme use [theme]` accepts either the command id or
the theme name, such as `theme use dark-soul` or `theme use dark soul`.

## System

| Command | Description |
| --- | --- |
| `version` | Shows project and audio engine version info. |
| `help`, `h`, or `?` | Opens the temporary help tab. |
| `:q` | Closes the active temporary tab. |
| `clear` | Clears terminal history. |
| `clear playback` | Stops and clears playback without removing saved data. |
| `clear all` | Stops and clears playback, then removes saved Electron Storage data. |
| `music clear` or `music reset` | Removes saved music folders and cached music lists. |
| `radio clear` | Removes saved radios. |

## Input Shortcuts

| Shortcut | Description |
| --- | --- |
| `Tab` | Autocompletes commands or opens suggestions. |
| `Left`/`Right` | Moves between autocomplete suggestions when visible. |
| `Up`/`Down` | Navigates command history, or theme picker items when the picker is open. |
| `Up`/`Down` on list tabs | Scrolls `ls -la`, `radio list`, `cat radio_history.txt`, and `music lists`. |
| `Esc` | Closes suggestions or the theme picker. |
| `Cmd/Ctrl + 1..4` | Switches tabs directly. |
