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
`source yt`, `play`, `list`, `ls`, `ls -la`, `status`, `next`, `prev`,
`theme list`, `ls -th`, `radio list`, `ls -ra`, `help`, and `:q`. Radio is
live streaming and should not expose seek controls; local files and YouTube
playlists can expose duration and seeking. The radio `ls -la` source tab shows
the 5 most recently played radios, while `radio list` and `ls -ra` open a
temporary full radio-list tab next to `./player-controls`, following the same
temporary-tab pattern as help.

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
