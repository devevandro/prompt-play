export function TerminalHeader() {
  return (
    <div className="app-header flex items-center justify-between bg-background px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2 w-2 rounded-sm bg-terminal-green" />
        <span className="truncate font-mono font-semibold text-sm text-terminal-white">
          zsh-player
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-4 font-mono text-terminal-gray text-xs">
        <span className="hidden sm:inline">
          <span className="text-terminal-green">●</span> conectado
        </span>
        <span className="hidden md:inline">
          <span className="text-terminal-cyan">PID:</span> 1337
        </span>
        <span>
          <span className="text-terminal-yellow">TTY:</span> pts/0
        </span>
      </div>
    </div>
  )
}
