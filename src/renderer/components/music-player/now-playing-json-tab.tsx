import type { ReactNode } from 'react'
import type { NowPlayingSnapshot, PlayerSource } from 'shared/types'

function renderHighlightedJson(value: unknown) {
  const json = JSON.stringify(value, null, 2)
  const parts: ReactNode[] = []
  const tokenPattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  let lastIndex = 0
  let match = tokenPattern.exec(json)

  while (match) {
    if (match.index > lastIndex) {
      parts.push(json.slice(lastIndex, match.index))
    }

    const [token, stringToken, keySuffix, literalToken] = match
    const className = stringToken
      ? keySuffix
        ? 'text-terminal-cyan'
        : 'text-terminal-green'
      : literalToken
        ? literalToken === 'null'
          ? 'text-terminal-gray'
          : 'text-terminal-yellow'
        : 'text-terminal-magenta'

    parts.push(
      <span className={className} key={`${match.index}-${token}`}>
        {token}
      </span>
    )
    lastIndex = match.index + token.length
    match = tokenPattern.exec(json)
  }

  if (lastIndex < json.length) {
    parts.push(json.slice(lastIndex))
  }

  return parts
}

export function NowPlayingJsonTab({
  snapshot,
  source,
}: {
  snapshot: NowPlayingSnapshot
  source: PlayerSource
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{' '}
          <span className="text-terminal-cyan">{source.locationLabel}</span>{' '}
          <span className="text-terminal-white">cat now_playing.json</span>
        </div>
      </div>

      <pre className="custom-scrollbar min-h-0 flex-1 overflow-auto p-4 font-mono text-terminal-white text-xs leading-relaxed">
        {renderHighlightedJson(snapshot)}
      </pre>
    </div>
  )
}
