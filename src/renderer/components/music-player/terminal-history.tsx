type HistoryBlock = {
  id: string
  lines: {
    id: string
    text: string
  }[]
}

function formatLine(line: string) {
  if (line.startsWith('[ERROR]')) {
    return <span className="text-terminal-red">{line}</span>
  }
  if (line.startsWith('[PLAYING]')) {
    return <span className="text-terminal-cyan">{line}</span>
  }
  if (
    line.startsWith('[WARNING]') ||
    line.startsWith('[WARN]') ||
    line.startsWith('[PAUSED]') ||
    line.startsWith('[HINT]')
  ) {
    return <span className="text-terminal-yellow">{line}</span>
  }
  if (line.startsWith('[LOADING]')) {
    return <span className="animate-pulse text-terminal-yellow">{line}</span>
  }
  if (
    line.startsWith('[OK]') ||
    line.startsWith('[INFO]') ||
    line.startsWith('[STATUS]') ||
    line.startsWith('[HELP]')
  ) {
    return <span className="text-terminal-green">{line}</span>
  }
  if (line.startsWith('  ')) {
    return <span className="text-terminal-gray">{line}</span>
  }

  return <span className="text-terminal-white">{line}</span>
}

function getHistoryBlocks(history: string[]) {
  return history.reduce<HistoryBlock[]>((blocks, line, lineIndex) => {
    if (!/^\[[A-Z]+\]/.test(line)) {
      return blocks
    }

    const lineItem = {
      id: `${lineIndex}-${line}`,
      text: line,
    }

    const lastBlock = blocks.at(-1)

    if (lastBlock) {
      lastBlock.lines.push(lineItem)
      return blocks
    }

    blocks.push({
      id: lineItem.id,
      lines: [lineItem],
    })
    return blocks
  }, [])
}

export function TerminalHistory({ history }: { history: string[] }) {
  return (
    <>
      {getHistoryBlocks(history).map(block => (
        <div className="px-1 leading-5" key={block.id}>
          {block.lines.map(line => (
            <div key={line.id}>{formatLine(line.text)}</div>
          ))}
        </div>
      ))}
    </>
  )
}
