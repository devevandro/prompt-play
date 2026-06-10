import { CommandSuggestions } from 'renderer/components/music-player/command-suggestions'
import { TerminalHistory } from 'renderer/components/music-player/terminal-history'
import { ThemePickerPanel } from 'renderer/components/music-player/theme-picker-panel'
import {
  useTerminalInput,
  type TerminalThemePicker,
} from 'renderer/hooks/use-terminal-input'
import { Prompt } from '../prompt'

interface TerminalPromptProps {
  history: string[]
  onCommand: (command: string) => void
  onArrowNavigation?: (direction: 'down' | 'up') => void
  onCycleTab: () => void
  promptLabel?: string
  promptContext: string
  themePicker?: TerminalThemePicker
}

export function TerminalPrompt({
  history,
  onCommand,
  onArrowNavigation,
  onCycleTab,
  promptLabel,
  promptContext,
  themePicker,
}: TerminalPromptProps) {
  const {
    acceptSuggestion,
    containerRef,
    focusInput,
    handleKeyDown,
    handleSubmit,
    input,
    inputRef,
    selectedSuggestion,
    setInput,
    showSuggestions,
    suggestions,
  } = useTerminalInput({
    history,
    onArrowNavigation,
    onCommand,
    onCycleTab,
    themePicker,
  })

  return (
    <div className="cursor-text bg-muted/30" onPointerDown={focusInput}>
      <form onSubmit={handleSubmit}>
        <div
          className="custom-scrollbar h-20 overflow-y-auto px-3 py-2 font-mono text-xs"
          ref={containerRef}
        >
          <div className="flex flex-col gap-1">
            <TerminalHistory history={history} />

            {promptLabel && (
              <div className="px-2 text-terminal-cyan">{promptLabel}</div>
            )}

            <div className="flex items-center gap-2 rounded-md bg-background/35 px-2 py-1 leading-5">
              {promptLabel ? (
                <Prompt text=">" />
              ) : (
                <>
                  <Prompt text={promptContext} />
                  <Prompt text=">" />
                </>
              )}
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
        <ThemePickerPanel onFocusInput={focusInput} themePicker={themePicker} />
      )}

      {showSuggestions && (
        <CommandSuggestions
          onSelect={acceptSuggestion}
          selectedIndex={selectedSuggestion}
          suggestions={suggestions}
        />
      )}
    </div>
  )
}
