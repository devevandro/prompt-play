"use client";

import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <header
      className={`draggable top-0 z-10 w-full border-[#000000] border-b-2 bg-[#1e1e1e] shadow-sm sticky`}
    >
      <div className="container mx-auto flex items-center justify-between px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-terminal-green">
            <Terminal className="inline h-3 w-3" />
          </span>
          <span className="truncate font-mono font-semibold text-xs text-terminal-gray">
            prompt play
          </span>
        </div>
      </div>
    </header>
  );
}
