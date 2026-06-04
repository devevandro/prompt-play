import { Terminal } from "lucide-react";
import { useMemo } from "react";

interface StatusFooterProps {
  volume: number;
}

export function StatusFooter({ volume }: StatusFooterProps) {
  const pid = useMemo(
    () => (Math.floor(Math.random() * 9000) + 1000).toString(),
    [],
  );

  return (
    <footer className="flex h-5 shrink-0 items-center justify-between bg-[#1b3a24] px-3 font-mono text-[11px] text-terminal-cyan">
      <div className="flex min-w-0 items-center gap-2">
        <Terminal className="h-3 w-3 shrink-0" />
        <span className="truncate">conectado</span>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span>vol: {Math.round(volume * 100)}%</span>
        <span>pid: {pid}</span>
        <span>tty: pts/0</span>
      </div>
    </footer>
  );
}
