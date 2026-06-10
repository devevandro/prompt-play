export function CommandSuggestions({
  onSelect,
  selectedIndex,
  suggestions,
}: {
  onSelect: (suggestion: string) => void
  selectedIndex: number
  suggestions: string[]
}) {
  if (suggestions.length <= 1) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 bg-muted/80 px-4 py-1 font-mono text-xs">
      {suggestions.map((suggestion, index) => (
        <button
          className={`rounded px-2 py-0.5 transition-colors ${
            index === selectedIndex
              ? 'bg-terminal-green/20 text-terminal-green'
              : 'text-terminal-gray hover:text-terminal-cyan'
          }`}
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          type="button"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
