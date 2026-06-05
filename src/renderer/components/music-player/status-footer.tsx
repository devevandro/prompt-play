import { Terminal } from "lucide-react";

import type { Track } from "../../../shared/types";

interface StatusFooterProps {
  activeTab: string;
  currentTrack: Track | null;
  tracks: Track[];
  volume: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function StatusFooter({
  activeTab,
  currentTrack,
  tracks,
  volume,
}: StatusFooterProps) {
  const totalDuration = tracks.reduce((acc, track) => acc + track.duration, 0);

  const statusByTab: Record<string, string> = {
    tracks: `total ${tracks.length} arquivos  duração total ${formatDuration(totalDuration)}`,
    "now-playing": currentTrack
      ? "track: arquivo carregado"
      : "track: aguardando seleção",
    visualizer: "idle fft: 48 bands sr: 44.1khz 16bit",
    controls: "player-controls pronto",
  };

  return (
    <footer className="flex h-5 shrink-0 items-center justify-between bg-[#1b3a24] px-3 font-mono text-[11px] text-terminal-cyan">
      <div className="flex min-w-0 items-center gap-2">
        <Terminal className="h-3 w-3 shrink-0" />
        <span className="truncate">{statusByTab[activeTab]}</span>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span>vol: {Math.round(volume * 100)}%</span>
      </div>
    </footer>
  );
}
