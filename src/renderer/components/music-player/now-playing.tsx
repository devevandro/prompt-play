import type { Track } from './types'

interface NowPlayingProps {
  track: Track | null
  isPlaying: boolean
}

export function NowPlaying({ track, isPlaying }: NowPlayingProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">~/music</span>{' '}
          <span className="text-terminal-white">cat now_playing.txt</span>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 font-mono">
        {!track ? (
          <div className="space-y-2">
            <div className="text-sm text-terminal-red">
              cat: now_playing.txt: Nenhuma faixa selecionada
            </div>
            <div className="mt-4 text-terminal-gray text-xs">
              <span className="text-terminal-cyan"># DICA:</span> Selecione uma
              faixa na aba de músicas ou digite 'play' no terminal
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="text-terminal-gray">---</div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">status:</span>
              <span
                className={
                  isPlaying ? 'text-terminal-green' : 'text-terminal-yellow'
                }
              >
                {isPlaying ? '▶ PLAYING' : '▐▐ PAUSED'}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">título:</span>
              <span className="text-terminal-white">{track.title}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">artista:</span>
              <span className="text-terminal-magenta">{track.artist}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">álbum:</span>
              <span className="text-terminal-blue">{track.album}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-24 text-terminal-cyan">duração:</span>
              <span className="text-terminal-yellow">
                {Math.floor(track.duration / 60)}:
                {(track.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="text-terminal-gray">---</div>

            <div className="mt-6 whitespace-pre text-[10px] text-terminal-green/60 leading-tight">
              {`    +====================================+
    |                                    |
    |     ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪        |
    |                                    |
    |        +-----------------+         |
    |        |  #############  |         |
    |        |  #############  |         |
    |        |  #############  |         |
    |        |  #############  |         |
    |        +-----------------+         |
    |                                    |
    |     ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪ ♫ ♪        |
    |                                    |
    +====================================+`}
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        {track ? (
          <span>
            <span className="text-terminal-green">●</span> arquivo carregado
          </span>
        ) : (
          <span>
            <span className="text-terminal-yellow">○</span> aguardando seleção
          </span>
        )}
      </div>
    </div>
  )
}
