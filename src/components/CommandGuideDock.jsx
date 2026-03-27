const defaultCommands = [
  { code: 'B', team: 'blue', labelEn: '“B” Vote Blue', labelJa: '青へ1票' },
  { code: '3B', team: 'blue', labelEn: '$3 or ¥300 + “B”', labelJa: 'Vote Blue ×3' },
  { code: '5B', team: 'blue', labelEn: '$5 or ¥500 + “B”', labelJa: 'Attack Red ×3💣' },
  { code: 'R', team: 'red', labelEn: '“R” Vote Red', labelJa: '赤へ1票' },
  { code: '3R', team: 'red', labelEn: '$3 or ¥300 + “R”', labelJa: 'Vote Red ×3' },
  { code: '5R', team: 'red', labelEn: '$5 or ¥500 + “R”', labelJa: 'Attack Blue ×3💣' },
];

function getCardCopy(command) {
  const isBlue = command.team === 'blue';
  const side = isBlue ? 'Blue' : 'Red';
  const enemy = isBlue ? 'Red' : 'Blue';
  const symbol = isBlue ? 'B' : 'R';

  if (command.code.startsWith('5')) {
    return {
      amount: '$5 or ¥500',
      action: `Attack ${enemy} ×3💣`,
      symbol,
    };
  }

  if (command.code.startsWith('3')) {
    return {
      amount: '$3 or ¥300',
      action: `Vote ${side} ×3`,
      symbol,
    };
  }

  return {
    amount: '',
    action: `Vote ${side}`,
    symbol,
  };
}

function CommandCard({ command }) {
  const copy = getCardCopy(command);

  return (
    <section className={`panel command-mini-card command-mini-card-${command.team}`}>
      <span className="command-amount hud-main-text">{copy.amount || ' '}</span>
      <div className="command-main-row">
        <span className="command-symbol hud-main-text">“{copy.symbol}”</span>
        <span className="command-action hud-main-text">{copy.action}</span>
      </div>
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
