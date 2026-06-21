# Repository Guidelines

## Project Structure & Module Organization

Prompt Play is an Electron desktop app built with Electron Vite, React, and
TypeScript. Main-process code lives in `src/main`, preload code in
`src/preload`, and renderer UI code in `src/renderer`. Shared constants, types,
and helpers belong in `src/shared`. Reusable renderer components are grouped in
`src/renderer/components`, with feature folders such as
`components/music-player` and generic UI primitives in `components/ui`. Static
resources and build icons live under `src/resources`. Electron app helpers,
release scripts, and factories are in `src/lib/electron-app`.

## Music Player Architecture

The music player supports three listening modes: local computer files, online
radio streams, and YouTube playlists. Keep renderer components in
`src/renderer/components/music-player` source-agnostic: they should receive
`PlayerSource` and `PlayerQueueItem` values from `src/shared/types` instead of
hard-coding music-file labels such as track, artist, album, or duration.

When adding player behavior, update the source configuration in
`src/renderer/screens/main.tsx` and keep commands working against the active
source. The current commands are `sources`, `source local`, `source radio`,
`source yt`, `music`, `radio`, `fm`, `yt`, `yt list`, `yt auth`,
`yt auth clear`, `yt add [playlist-url-or-id]`,
`yt remove [playlist-number-or-name]`, `yt clear`, `yt clear playlists`,
`yt clean`, `music -- path [path]`, `radio -- path [path]`, `music config`,
`music list`, `music clear`, `music reset`, `play`, `play [number]`,
`play [name]`, `resume`, `pause`, `stop`, `list`, `ls`, `ls -la`, `status`,
`info`, `next`, `n`, `prev`, `p`, `shuffle`, `repeat`, `vol [0-100]`,
`vol +[number]`, `vol -[number]`, `mute`, `unmute`, `theme list`, `ls -th`,
`theme use [theme]`, `radio list`, `radio history`, `ls -ra`, `open now-playing`,
`open visualizer`, `open controls`, `tab [number]`, `home`, `exit`, `quit`,
`clear`, `clear playback`, `clear all`, `version`, `help`, `h`, `?`, and
`:q`.

Radio is live streaming and should not expose seek controls; local files and
YouTube playlists can expose duration and seeking. The radio `ls -la` source
tab shows the 5 most recently played radios, while `radio list` and `ls -ra`
open a temporary full radio-list tab next to `./player-controls`, following the
same temporary-tab pattern as help. Radio `next` and `prev` must use the
visible radio context: recent radios on `ls -la`, and all radios while the
temporary `radio list` tab is active. Local music folders are configured with
`music -- path [path]` or `music config`; `music list` opens a temporary
`music lists` tab and shows suggested `~/Music` and `~/Downloads` paths when no
library has been stored. The last configured music folder is the active music
folder for `list`, `ls -la`, `play`, and the playback queue; previously saved
folders remain visible in `music list` but are not merged into the active music
list. `music clear` and `music reset` remove saved folders and cached music
lists without clearing YouTube data or theme settings.

Live radio song metadata is read in the main process. FM O Dia, id
`648261db9770c6cc4d305f46`, uses its dedicated live-information endpoint;
other stations use ICY metadata when available. Render
`♫ now playing: unavailable` when no song data is available. The
`radio history` command opens a temporary `cat radio_history.txt` tab and keeps
up to 10 valid songs in renderer session memory only. Do not store empty,
unavailable, or non-song metadata. The history tab scrolls through the terminal
input with Up/Down and closes with `:q`. In radio mode,
`cat now_playing.txt` should remain minimal and show station status, state,
city, current song, and relative update time.

YouTube configuration is stored in Electron Storage under
`prompt-play-youtube`. `yt auth` opens an interactive `YouTube API Key:` prompt,
`yt auth clear` removes the stored key, and `yt add [playlist-url-or-id]`
accepts either a full playlist URL or a plain playlist id. YouTube playlist
loading must follow `nextPageToken` pagination, store playlist summaries with
the total video count from the YouTube `playlists` API, cache video title,
channel/artist, video id, and duration metadata, and render only the selected
playlist in the source list. `yt list` opens the temporary `yt playlists` tab;
from that tab, `play [number]` selects and starts the playlist. YouTube playback
uses an embedded player in `./player-controls`, keeps playback mounted while
navigating between YouTube tabs, supports volume/mute commands through the
iframe API, supports `next` and `prev` within the selected playlist queue, and
advances automatically when the current video ends. `yt remove [number-or-name]`
removes one saved playlist and its cached videos, while `yt clear` and
`yt clear playlists` remove playlists and cached videos without removing the
API key. `yt clean` remains the command for removing all YouTube configuration,
including the API key.

Player tab changes should be terminal-driven through commands such as
`tab [number]`, `open now-playing`, `open visualizer`, `open controls`, and
temporary-tab commands. Do not add mouse-only navigation as the primary path.
The visualizer uses a terminal-green 48-band ASCII/TUI presentation identified
as `./visualizer --mode=ascii`.

Local audio files must be played through the privileged `local-audio:` protocol
registered in `src/main/index.ts`, not directly through `file://`. The protocol
supports range requests, CORS headers, and CSP `media-src` access for the native
audio element and Web Audio visualizer. Keep CSP changes in
`src/renderer/index.html` aligned with any custom media schemes. Local music
metadata is populated during folder scans in the main process: MP3 files may use
ID3 title, artist, album, and estimated duration; the renderer also updates
duration from browser `loadedmetadata` when available. Stored libraries live in
Electron Storage under `prompt-play-music-libraries` and are refreshed on player
startup. The `clear playback` command stops playback without removing saved
data, while `clear all` stops playback and removes saved Electron Storage data.
Prefer source-specific cleanup commands such as `music clear` and
`yt clear playlists` when only one library source should be reset.

## Theme Typography

Theme font families and text scale variables live in `src/renderer/globals.css`,
while available theme names and ids live in `src/renderer/lib/themes.ts`. Keep
terminal UI components on Tailwind typography utilities such as `font-mono`,
`text-xs`, `text-sm`, and `text-base` so theme changes can be made centrally.

Current theme font mapping:

| Theme | Font family |
| --- | --- |
| Default | DM Mono |
| Tokyo Night | Space Mono |
| Dark Soul | Cousine |
| Dark Petroleum Blue | Chivo Mono |
| Shell Pink | Lekton |
| Synthwave | Cousine |

Theme font files are loaded from Google Fonts in `src/renderer/index.html`.
Shell Pink uses larger theme-specific text scale variables in `globals.css`
because Lekton renders visually smaller and tighter than the other monospace
fonts. Theme selection is persisted under
`prompt-play-theme`; `theme use [theme]` should accept both theme ids and
human-readable names after normalization.

## Build, Test, and Development Commands

Use Yarn 1.22.22, as declared in `package.json`.

- `yarn dev`: starts Electron Vite in development mode with file watching.
- `yarn start`: previews the built Electron Vite app.
- `yarn compile:app`: builds the Electron Vite app only.
- `yarn build`: runs the full Electron Builder packaging flow.
- `yarn lint`: checks formatting and lint rules with Biome.
- `yarn lint:fix`: applies Biome fixes and assists where possible.
- `yarn typecheck`: runs `tsc --noEmit` for TypeScript validation.

## Coding Style & Naming Conventions

Follow `.editorconfig` and `biome.json`: 2-space indentation, LF endings,
UTF-8, 80-column formatting, single quotes in TypeScript, double quotes in JSX,
and semicolons only where needed. Prefer functional React components and hooks.
Use PascalCase for components, camelCase for functions and variables, and
kebab-case for route or feature file names such as `track-list.tsx`.

## Testing Guidelines

No automated test framework is currently configured. Before submitting changes,
run `yarn lint` and `yarn typecheck`; for UI or Electron behavior, also run
`yarn dev` and manually verify the affected workflow. If tests are added, place
them next to the code they cover using `*.test.ts` or `*.test.tsx`, and add a
matching `yarn test` script.

## Commit & Pull Request Guidelines

The current history uses Conventional Commit style, for example
`refactor: adjust code structure for improved readability and maintainability`.
Use short, imperative messages with a type prefix such as `feat:`, `fix:`,
`refactor:`, or `chore:`.

Pull requests should include a brief description, the reason for the change,
manual verification steps, and screenshots or recordings for visible UI changes.
Link related issues when available. Confirm `yarn lint` and `yarn typecheck`
pass before requesting review.

## Security & Configuration Tips

Do not commit secrets, local credentials, generated packages, or platform build
artifacts. Keep release changes aligned with `electron-builder.ts` and the tag
release workflow in `.github/workflows/release.yml`, which publishes builds from
version tags such as `v1.0.0`.
