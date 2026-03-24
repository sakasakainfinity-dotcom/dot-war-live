const defaultCommands = [
  { code: 'A', team: 'blue', icon: '●', count: 1, labelEn: 'Vote', labelJa: '青に1票' },
  { code: 'AA', team: 'blue', icon: '💣', count: 1, labelEn: 'Break red', labelJa: '赤を1マス破壊' },
  { code: '300A', team: 'blue', icon: '●', count: 3, labelEn: 'Boost Vote', labelJa: '青に3票' },
  { code: '500A', team: 'blue', icon: '💣', count: 5, labelEn: 'Smash red', labelJa: '赤を5マス破壊' },
  { code: 'B', team: 'red', icon: '●', count: 1, labelEn: 'Vote', labelJa: '赤に1票' },
  { code: 'BB', team: 'red', icon: '💣', count: 1, labelEn: 'Break blue', labelJa: '青を1マス破壊' },
  { code: '300B', team: 'red', icon: '●', count: 3, labelEn: 'Boost Vote', labelJa: '赤に3票' },
  { code: '500B', team: 'red', icon: '💣', count: 5, labelEn: 'Smash blue', labelJa: '青を5マス破壊' },
];

function CommandCard({ command }) {
  return (
    <section className={`panel command-mini-card command-mini-card-${command.team}`}>
      <span className="command-code">{command.code}</span>
      <span className={`command-symbol command-symbol-${command.team}`}>{command.icon}</span>
      <span className="command-count">×{command.count}</span>
      <span className="command-label-en hud-main-text">{command.labelEn}</span>
      <span className="command-label-ja hud-sub-text">{command.labelJa}</span>
    </section>
  );
}

export function CommandBar({ commands = defaultCommands }) {
  return (
    <div className="command-dock-wrap" aria-label="Command bar">
      <div className="command-dock-grid">
        {commands.map((command) => (
          <CommandCard key={command.code} command={command} />
        ))}
      </div>
    </div>
  );
}
