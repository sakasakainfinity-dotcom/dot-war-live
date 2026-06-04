const defaultCommands = [
  { code: 'A', team: 'blue', labelEn: '“A” Vote Blue', labelJa: 'Aで青へ投票' },
  { code: '3A', team: 'blue', labelEn: '$3 or ¥300 + “A”', labelJa: '“A” Vote Blue ×3' },
  { code: '5A', team: 'blue', labelEn: '$5 or ¥500 + “A”', labelJa: '“A” Attack Red ×3💣' },
  { code: 'B', team: 'red', labelEn: '“B” Vote Red', labelJa: 'Bで赤へ投票' },
  { code: '3B', team: 'red', labelEn: '$3 or ¥300 + “B”', labelJa: '“B” Vote Red ×3' },
  { code: '5B', team: 'red', labelEn: '$5 or ¥500 + “B”', labelJa: '“B” Attack Blue ×3💣' },
];

function getCardCopy(command) {
  const isBlue = command.team === 'blue';
  const side = isBlue ? 'Blue' : 'Red';
  const enemy = isBlue ? 'Red' : 'Blue';
  const symbol = isBlue ? 'A' : 'B';

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
