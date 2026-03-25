const defaultCommands = [
  { code: 'B', team: 'blue', labelEn: '"B" = BLUE VOTE', labelJa: '青に投票' },
  { code: '3B', team: 'blue', labelEn: '"3B" ¥300 / $3 = +BLUE ×3', labelJa: '3マス追加' },
  { code: '5B', team: 'blue', labelEn: '"5B" ¥500 / $5 = RED💣SMASH3', labelJa: '3マス破壊' },
  { code: 'R', team: 'red', labelEn: '"R" = RED VOTE', labelJa: '赤に投票' },
  { code: '3R', team: 'red', labelEn: '"3R" ¥300 / $3 = +RED ×3', labelJa: '3マス追加' },
  { code: '5R', team: 'red', labelEn: '"5R" ¥500 / $5 = BLUE💣SMASH3', labelJa: '3マス破壊' },
];

function CommandCard({ command }) {
  return (
    <section className={`panel command-mini-card command-mini-card-${command.team}`}>
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
