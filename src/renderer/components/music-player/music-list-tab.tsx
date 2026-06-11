import { getDefaultMusicLocations } from 'renderer/hooks/use-music-library'
import type { MusicLibrary } from 'shared/types'

export function MusicListTab({ libraries }: { libraries: MusicLibrary[] }) {
  const defaultLocations = getDefaultMusicLocations()

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">~/music</span>{' '}
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
  )
}
