import { useEffect, useRef, useState } from "react";

const COMMANDS = [
  "play",
  "pause",
  "stop",
  "next",
  "prev",
  "list",
  "ls",
  "clear",
  "cls",
  "help",
  "status",
  "info",
  "volume",
  "tab 1",
  "tab 2",
  "tab 3",
  "tab 4",
  "zsh-player --init",
  "zsh-player --version",
];

interface TerminalPromptProps {
  history: string[];
  onCommand: (command: string) => void;
}

export function TerminalPrompt({ history, onCommand }: TerminalPromptProps) {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (input.length > 0) {
      const matches = COMMANDS.filter((command) =>
        command.toLowerCase().startsWith(input.toLowerCase()),
      );
      setSuggestions(matches);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
    }

    setShowSuggestions(false);
  }, [input]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (input.trim()) {
      onCommand(input.trim());
      setCommandHistory((prev) => [...prev, input.trim()]);
      setInput("");
      setHistoryIndex(-1);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();

      if (suggestions.length === 1) {
        setInput(suggestions[0]);
        setShowSuggestions(false);
      } else if (suggestions.length > 1) {
        if (showSuggestions) {
          setInput(suggestions[selectedSuggestion]);
          setShowSuggestions(false);
        } else {
          setShowSuggestions(true);
        }
      }

      return;
    }

    if (showSuggestions && suggestions.length > 1) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedSuggestion((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        return;
      }

      if (event.key === "Escape") {
        setShowSuggestions(false);
        return;
      }
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setShowSuggestions(false);

      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex < commandHistory.length - 1
            ? historyIndex + 1
            : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setShowSuggestions(false);

      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  const formatLine = (line: string) => {
    if (line.startsWith("[OK]")) {
      return <span className="text-terminal-green">{line}</span>;
    }
    if (line.startsWith("[ERROR]")) {
      return <span className="text-terminal-red">{line}</span>;
    }
    if (line.startsWith("[PLAYING]")) {
      return <span className="text-terminal-cyan">{line}</span>;
    }
    if (line.startsWith("[PAUSED]")) {
      return <span className="text-terminal-yellow">{line}</span>;
    }
    if (line.startsWith("[INFO]") || line.startsWith("[STATUS]")) {
      return <span className="text-terminal-magenta">{line}</span>;
    }
    if (line.startsWith("[HELP]") || line.startsWith("[HINT]")) {
      return <span className="text-terminal-cyan">{line}</span>;
    }
    if (line.startsWith("[LOADING]")) {
      return <span className="animate-pulse text-terminal-yellow">{line}</span>;
    }
    if (line.startsWith("$")) {
      return (
        <>
          <span className="text-terminal-green">$</span>
          <span className="text-terminal-white">{line.slice(1)}</span>
        </>
      );
    }
    if (line.startsWith("  ")) {
      return <span className="text-terminal-gray">{line}</span>;
    }

    return <span className="text-terminal-white">{line}</span>;
  };

  return (
    <div className="cursor-text bg-muted/30">
      <div
        className="custom-scrollbar h-24 space-y-0.5 overflow-y-auto px-4 py-2 font-mono text-xs"
        ref={containerRef}
      >
        {history.map((line) => (
          <div className="leading-relaxed" key={line}>
            {formatLine(line)}
          </div>
        ))}
      </div>

      {showSuggestions && suggestions.length > 1 && (
        <div className="flex flex-wrap gap-2 bg-muted/80 px-4 py-1 font-mono text-xs">
          {suggestions.map((suggestion, index) => (
            <button
              className={`rounded px-2 py-0.5 transition-colors ${
                index === selectedSuggestion
                  ? "bg-terminal-green/20 text-terminal-green"
                  : "text-terminal-gray hover:text-terminal-cyan"
              }`}
              key={suggestion}
              onClick={() => {
                setInput(suggestion);
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-center gap-2 bg-muted/50 px-4 py-2"
        onSubmit={handleSubmit}
      >
        <span className="text-terminal-green">➜</span>
        <span className="text-terminal-cyan">~</span>
        <div className="relative flex flex-1 items-center">
          <input
            autoComplete="off"
            className="w-full bg-transparent font-mono text-terminal-white text-xs caret-terminal-green outline-none"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="digite 'help' para ver os comandos"
            ref={inputRef}
            spellCheck={false}
            type="text"
            value={input}
          />
          {input && suggestions.length > 0 && suggestions[0] !== input && (
            <span className="pointer-events-none absolute left-0 font-mono text-terminal-gray/40 text-xs">
              {input}
              <span>{suggestions[0].slice(input.length)}</span>
            </span>
          )}
        </div>
        <span className="h-4 w-2 cursor-blink bg-terminal-green" />
        {suggestions.length > 0 && input && (
          <span className="font-mono text-[10px] text-terminal-gray">
            [Tab]
          </span>
        )}
      </form>
    </div>
  );
}
