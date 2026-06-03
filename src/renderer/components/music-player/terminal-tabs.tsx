interface Tab {
  id: string
  label: string
  shortcut: string
}

interface TerminalTabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
}

export function TerminalTabs({
  tabs,
  activeTab,
  onTabChange,
}: TerminalTabsProps) {
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto bg-background px-3 py-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.id

        return (
          <button
            className={`relative flex items-center gap-2 rounded-t px-3 py-1.5 font-mono text-xs transition-colors ${
              isActive
                ? 'bg-muted/70 text-terminal-white'
                : 'text-terminal-gray hover:bg-muted/50 hover:text-terminal-white'
            }`}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <span
              className={`h-2 w-2 rounded-sm ${
                isActive ? 'bg-terminal-green' : 'bg-terminal-yellow'
              }`}
            />
            <span className="max-w-32 truncate">{tab.label}</span>
            <span className="hidden text-[10px] text-terminal-gray/50 sm:inline">
              {tab.shortcut}
            </span>
          </button>
        )
      })}
      <button
        aria-label="Nova aba"
        className="ml-1 px-2 py-1.5 text-terminal-gray text-xs transition-colors hover:text-terminal-white"
        type="button"
      >
        +
      </button>
    </div>
  )
}
