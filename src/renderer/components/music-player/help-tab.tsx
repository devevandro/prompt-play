import type { PlayerSource, PlayerSourceMode } from 'shared/types'

export function HelpTab({ source }: { source: PlayerSource }) {
  const sourceCommands: Record<PlayerSourceMode, string[]> = {
    local: [
      'music',
      'music -- path <pathname>',
      'music config',
      'music list',
      'music clear',
      'source local',
      'play',
      'play 1',
      'list',
      'next',
      'prev',
      'shuffle',
      'repeat',
    ],
    radio: [
      'radio',
      'fm',
      'source radio',
      'radio list',
      'radio search "CBN"',
      'radio add 1',
      'radio add Name | City | State | URL | Frequency',
      'radio edit 1 Name | City | State | URL | Frequency',
      'radio remove 1',
      'radio clear',
      'radio history',
      'radio search music 1',
      'ls -ra',
      'play',
      'play 1',
      'list',
      'next',
      'prev',
      'shuffle',
      'repeat',
    ],
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-5 font-mono text-sm">
      <div className="mb-5 text-terminal-cyan">Prompt Play Help</div>

      <div className="grid gap-5 sm:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Core Commands</h2>
          {[
            'help',
            'home',
            'exit',
            'quit',
            'clear playback',
            'clear all',
            ':q',
          ].map(command => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">
            {source.label} Commands
          </h2>
          {sourceCommands[source.mode].map(command => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Theme Commands</h2>
          {['theme list', 'ls -th', 'theme use [name]'].map(command => (
            <div className="text-terminal-white" key={command}>
              {command}
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Visualizer Commands</h2>
          {['visualizer ascii'].map(
            command => (
              <div className="text-terminal-white" key={command}>
                {command}
              </div>
            )
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-terminal-yellow text-xs">Volume Commands</h2>
          {['vol 0-100', 'vol +10', 'vol -10', 'mute', 'unmute'].map(
            command => (
              <div className="text-terminal-white" key={command}>
                {command}
              </div>
            )
          )}
        </section>
      </div>

      <div className="mt-6 text-terminal-gray text-xs">Press :q to close</div>
    </div>
  )
}
