const defaultCommands = [
  { code: 'A', team: 'blue', icon: '●', count: 1, labelEn: 'A blue 1vote', labelJa: '青に1票' },
  { code: '300A', team: 'blue', icon: '●', count: 3, labelEn: '300A 3 vote', labelJa: '青に3票', priceLabel: '¥300 / $3' },
  { code: '500A', team: 'blue', icon: '💥', count: 3, labelEn: '500A red smash', labelJa: '赤を3マス爆破', priceLabel: '¥500 / $5' },
  { code: 'B', team: 'red', icon: '●', count: 1, labelEn: 'B red 1 vote', labelJa: '赤に1票' },
  { code: '300B', team: 'red', icon: '●', count: 3, labelEn: '300B 3 vote', labelJa: '赤に3票', priceLabel: '¥300 / $3' },
  { code: '500B', team: 'red', icon: '💥', count: 3, labelEn: '500B blue smash', labelJa: '青を3マス爆破', priceLabel: '¥500 / $5' },
];

function CommandCard({ command }) {
  return (
    <section className={`panel command-mini-card command-mini-card-${command.team}`}>
      <span className="command-code">{command.code}</span>
      <span className={`command-symbol command-symbol-${command.team}`}>{command.icon}</span>
      <span className="command-count">×{command.count}</span>
      <span className="command-label-en hud-main-text">{command.labelEn}</span>
      <span className="command-label-ja hud-sub-text">{command.labelJa}</span>
      {command.priceLabel ? <span className="command-price hud-main-text">{command.priceLabel}</span> : null}
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
