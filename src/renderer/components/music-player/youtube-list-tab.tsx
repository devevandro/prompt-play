import type { RefObject } from 'react'

import type { YouTubeStorage } from 'renderer/lib/youtube'

export function YouTubeListTab({
  currentPlaylistId,
  onSelectPlaylist,
  scrollContainerRef,
  youtube,
}: {
  currentPlaylistId: string | null
  onSelectPlaylist: (playlistId: string) => void
  scrollContainerRef: RefObject<HTMLDivElement | null>
  youtube: YouTubeStorage['youtube']
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">~/yt</span>{' '}
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
            <div className="text-terminal-gray">yt auth</div>
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
            item => item.id === playlistId
          )
          const cachedVideoCount = youtube.items.filter(
            item => item.album === playlistId
          ).length
          const videoCount = playlist?.videoCount || cachedVideoCount
          const isActive = currentPlaylistId === playlistId

          return (
            <button
              className={`grid w-full grid-cols-12 items-center gap-2 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-terminal-green/10 text-terminal-green'
                  : 'text-terminal-white hover:bg-muted/50'
              }`}
              key={playlistId}
              onClick={() => onSelectPlaylist(playlistId)}
              type="button"
            >
              <span className="col-span-1 text-terminal-gray">{index + 1}</span>
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
          )
        })}
      </div>
    </div>
  )
}
