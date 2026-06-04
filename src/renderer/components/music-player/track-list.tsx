import type { Track } from "./types";

interface TrackListProps {
  tracks: Track[];
  currentTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  isPlaying: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getFilePermissions(index: number): string {
  const permissions = ["-rw-r--r--", "-rwxr-xr-x", "-rw-rw-r--"];

  return permissions[index % permissions.length];
}

export function TrackList({
  tracks,
  currentTrack,
  onSelectTrack,
  isPlaying,
}: TrackListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3">
        <div className="font-mono text-sm">
          <span className="text-terminal-green">➜</span>{" "}
          <span className="text-terminal-cyan">~/music</span>{" "}
          <span className="text-terminal-yellow">git:(main)</span>{" "}
          <span className="text-terminal-white">
            ls -la *.mp3 *.wav *.flac *.ogg
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 bg-muted/30 px-4 py-2 font-mono text-terminal-gray text-xs">
        <span className="col-span-1">#</span>
        <span className="col-span-2">perm</span>
        <span className="col-span-4">arquivo</span>
        <span className="col-span-3">artista</span>
        <span className="col-span-2 text-right">duração</span>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        {tracks.map((track, index) => {
          const isActive = currentTrack?.id === track.id;
          const isCurrentlyPlaying = isActive && isPlaying;

          return (
            <button
              className={`grid w-full grid-cols-12 items-center gap-2 px-4 py-2.5 text-left font-mono text-xs transition-colors ${
                isActive
                  ? "bg-terminal-green/10 text-terminal-green"
                  : "text-terminal-white hover:bg-muted/50"
              }`}
              key={track.id}
              onClick={() => onSelectTrack(track)}
              type="button"
            >
              <span className="col-span-1 text-terminal-gray">
                {isCurrentlyPlaying ? (
                  <span className="animate-pulse text-terminal-green">▶</span>
                ) : isActive ? (
                  <span className="text-terminal-yellow">▐▐</span>
                ) : (
                  index + 1
                )}
              </span>
              <span className="col-span-2 text-[10px] text-terminal-gray">
                {getFilePermissions(index)}
              </span>
              <span
                className={`col-span-4 truncate ${
                  isActive ? "text-terminal-cyan" : "text-terminal-white"
                }`}
              >
                {track.title}
              </span>
              <span className="col-span-3 truncate text-terminal-magenta">
                {track.artist}
              </span>
              <span className="col-span-2 text-right text-terminal-yellow">
                {formatDuration(track.duration)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
