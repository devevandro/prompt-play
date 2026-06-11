import type { TerminalThemePicker } from 'renderer/hooks/use-terminal-input'

export function ThemePickerPanel({
  onFocusInput,
  themePicker,
}: {
  onFocusInput: () => void
  themePicker: TerminalThemePicker
}) {
  return (
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
                onFocusInput()
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
  )
}
