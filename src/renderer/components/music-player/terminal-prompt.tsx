import { useEffect, useRef, useState } from 'react'
import { Prompt } from '../prompt'

const COMMANDS = [
  'play',
  'resume',
  'pause',
  'stop',
  'next',
  'n',
  'prev',
  'p',
  'aleatorio',
  'shuffle',
  'repetir musica',
  'repeat',
  'list',
  'ls',
  'ls -la',
  'ls -ra',
  'ls -th',
  'music list',
  'music -- path',
  'music config',
  'sources',
  'source local',
  'source radio',
  'source yt',
  'radio',
  'radio list',
  'fm',
  'home',
  'exit',
  'quit',
  'help',
  'h',
  '?',
  ':q',
  'status',
  'info',
  'vol',
  'mute',
  'unmute',
  'pp music',
  'pp radio',
  'pp exit',
  'pp quit',
  'pp clear',
  'pp version',
  'pp open now-playing',
  'pp open visualizer',
  'pp open controls',
  'theme list',
  'theme use default',
  'theme use tokyo-night',
  'theme use dark-soul',
  'theme use synthwave',
  'theme use dark-petroleum-blue',
  'theme use shell-pink',
  'zsh-player --init',
  'init',
]

interface TerminalPromptProps {
  history: string[]
  onCommand: (command: string) => void
  onArrowNavigation?: (direction: 'down' | 'up') => void
  onCycleTab: () => void
  promptContext: string
  themePicker?: {
    activeThemeId: string
    options: readonly {
      id: string
      name: string
    }[]
    selectedIndex: number
    onCancel: () => void
    onMove: (direction: 'next' | 'prev') => void
    onSelect: (index?: number) => void
  }
}

type HistoryBlock = {
  id: string
  lines: {
    id: string
    text: string
  }[]
}

export function TerminalPrompt({
  history,
  onCommand,
  onArrowNavigation,
  onCycleTab,
  promptContext,
  themePicker,
}: TerminalPromptProps) {
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const focusInput = () => {
    inputRef.current?.focus()
  }

  useEffect(() => {
    focusInput()
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
    focusInput()
  }, [history])

  useEffect(() => {
    if (input.length > 0) {
      const matches = COMMANDS.filter(command =>
        command.toLowerCase().startsWith(input.toLowerCase())
      )
      setSuggestions(matches)
      setSelectedSuggestion(0)
    } else {
      setSuggestions([])
    }

    setShowSuggestions(false)
  }, [input])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (themePicker && !input.trim()) {
      themePicker.onSelect()
      requestAnimationFrame(focusInput)
      return
    }

    if (input.trim()) {
      onCommand(input.trim())
      setCommandHistory(prev => [...prev, input.trim()])
      setInput('')
      setHistoryIndex(-1)
      setShowSuggestions(false)
      requestAnimationFrame(focusInput)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      onCycleTab()
      return
    }

    if (themePicker && !showSuggestions) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        themePicker.onMove('next')
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        themePicker.onMove('prev')
        return
      }

      if (event.key === 'Enter' && !input.trim()) {
        event.preventDefault()
        themePicker.onSelect()
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        themePicker.onCancel()
        return
      }
    }

    if (
      onArrowNavigation &&
      !showSuggestions &&
      (event.key === 'ArrowDown' || event.key === 'ArrowUp')
    ) {
      event.preventDefault()
      onArrowNavigation(event.key === 'ArrowDown' ? 'down' : 'up')
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()

      if (suggestions.length === 1) {
        setInput(suggestions[0])
        setShowSuggestions(false)
      } else if (suggestions.length > 1) {
        if (showSuggestions) {
          setInput(suggestions[selectedSuggestion])
          setShowSuggestions(false)
        } else {
          setShowSuggestions(true)
        }
      }

      return
    }

    if (showSuggestions && suggestions.length > 1) {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setSelectedSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSelectedSuggestion(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        return
      }

      if (event.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setShowSuggestions(false)

      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex < commandHistory.length - 1
            ? historyIndex + 1
            : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setShowSuggestions(false)

      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const historyBlocks = history.reduce<HistoryBlock[]>(
    (blocks, line, lineIndex) => {
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
    },
    []
  )

  const formatLine = (line: string) => {
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

  return (
    <div className="cursor-text bg-muted/30" onPointerDown={focusInput}>
      <form onSubmit={handleSubmit}>
        <div
          className="custom-scrollbar h-20 overflow-y-auto px-3 py-2 font-mono text-xs"
          ref={containerRef}
        >
          <div className="flex flex-col gap-1">
            {historyBlocks.map(block => (
              <div className="px-1 leading-5" key={block.id}>
                {block.lines.map(line => (
                  <div key={line.id}>{formatLine(line.text)}</div>
                ))}
              </div>
            ))}

            <div className="flex items-center gap-2 rounded-md bg-background/35 px-2 py-1 leading-5">
              <Prompt text={`pp:${promptContext}`} />
              <Prompt text=">" />
              <div className="relative flex flex-1 items-center">
                <input
                  autoComplete="off"
                  className="w-full bg-transparent font-mono text-terminal-white text-xs caret-terminal-green outline-none"
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  onPointerDown={focusInput}
                  placeholder="type 'help' to show commands"
                  ref={inputRef}
                  spellCheck={false}
                  type="text"
                  value={input}
                />
                {input &&
                  suggestions.length > 0 &&
                  suggestions[0] !== input && (
                    <span className="pointer-events-none absolute left-0 font-mono text-terminal-gray/40 text-xs">
                      {input}
                      <span>{suggestions[0].slice(input.length)}</span>
                    </span>
                  )}
              </div>
              <span className="h-4 w-2" />
              {suggestions.length > 0 && input && (
                <span className="font-mono text-[10px] text-terminal-gray">
                  [Tab]
                </span>
              )}
            </div>
          </div>
        </div>
      </form>

      {themePicker && (
        <div className="border-terminal-green/20 border-y bg-muted/70 px-4 py-2 font-mono text-xs">
          <div className="mb-1 text-terminal-cyan">Available themes</div>
          <div className="space-y-1">
            {themePicker.options.map((theme, index) => {
              const isSelected = index === themePicker.selectedIndex
              const isActive = theme.id === themePicker.activeThemeId

              return (
                <button
                  className={`grid w-full grid-cols-[1rem_1fr] items-center rounded px-1 py-0.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-terminal-green/15 text-terminal-green'
                      : 'text-terminal-gray hover:text-terminal-cyan'
                  }`}
                  key={theme.id}
                  onClick={() => {
                    themePicker.onSelect(index)
                    focusInput()
                  }}
                  type="button"
                >
                  <span>{isActive ? '*' : isSelected ? '›' : ' '}</span>
                  <span>{theme.name}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-2 text-[10px] text-terminal-gray">
            ↑↓ select · Enter apply · Esc cancel
          </div>
        </div>
      )}

      {showSuggestions && suggestions.length > 1 && (
        <div className="flex flex-wrap gap-2 bg-muted/80 px-4 py-1 font-mono text-xs">
          {suggestions.map((suggestion, index) => (
            <button
              className={`rounded px-2 py-0.5 transition-colors ${
                index === selectedSuggestion
                  ? 'bg-terminal-green/20 text-terminal-green'
                  : 'text-terminal-gray hover:text-terminal-cyan'
              }`}
              key={suggestion}
              onClick={() => {
                setInput(suggestion)
                setShowSuggestions(false)
                focusInput()
              }}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
