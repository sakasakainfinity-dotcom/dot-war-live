const defaultCommands = [
  { code: 'A', team: 'blue', labelEn: 'Vote', labelJa: '青に1票' },
  { code: 'AA', team: 'blue', labelEn: 'Attack', labelJa: '1マス破壊' },
  { code: '300A', team: 'blue', labelEn: 'Boost', labelJa: '3倍投票' },
  { code: '500A', team: 'blue', labelEn: 'Smash', labelJa: '5マス破壊' },
  { code: 'B', team: 'red', labelEn: 'Vote', labelJa: '赤に1票' },
  { code: 'BB', team: 'red', labelEn: 'Attack', labelJa: '1マス破壊' },
  { code: '300B', team: 'red', labelEn: 'Boost', labelJa: '3倍投票' },
  { code: '500B', team: 'red', labelEn: 'Smash', labelJa: '5マス破壊' },
];

function CommandGuideCard({ command }) {
  return (
    <section className={`panel command-mini-card command-mini-card-${command.team}`}>
      <p className="command-code">{command.code}</p>
      <p className="command-label-en hud-main-text">{command.labelEn}</p>
      <p className="command-label-ja hud-sub-text">{command.labelJa}</p>
    </section>
  );
}

export function CommandGuideDock({ commands = defaultCommands }) {
  return (
    <div className="command-dock-wrap" aria-label="Command guide">
      <p className="command-dock-hint hud-sub-text">Type in chat / コメントで入力</p>
      <div className="command-dock-grid">
        {commands.map((command) => (
          <CommandGuideCard key={command.code} command={command} />
        ))}
      </div>
    </div>
  );
}
