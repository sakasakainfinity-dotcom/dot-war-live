const defaultGuides = [
  {
    team: 'blue',
    titleEn: 'Blue Team',
    titleJa: '青',
    rows: [
      { code: 'A', labelEn: 'Vote', labelJa: '青に1票' },
      { code: 'AA', labelEn: 'Attack', labelJa: '1マス破壊' },
      { code: 'AAA', labelEn: 'Mega', labelJa: '3マス破壊' },
      { code: '300A', labelEn: 'Boost', labelJa: '3倍投票' },
      { code: '500A', labelEn: 'Smash', labelJa: '5マス破壊' },
    ],
  },
  {
    team: 'red',
    titleEn: 'Red Team',
    titleJa: '赤',
    rows: [
      { code: 'B', labelEn: 'Vote', labelJa: '赤に1票' },
      { code: 'BB', labelEn: 'Attack', labelJa: '1マス破壊' },
      { code: 'BBB', labelEn: 'Mega', labelJa: '3マス破壊' },
      { code: '300B', labelEn: 'Boost', labelJa: '3倍投票' },
      { code: '500B', labelEn: 'Smash', labelJa: '5マス破壊' },
    ],
  },
];

function CommandGuideCard({ guide }) {
  return (
    <section className={`panel command-card command-card-${guide.team}`}>
      <header className="command-card-header">
        <p className="command-card-title hud-main-text">{guide.titleEn}</p>
        <p className="command-card-title-ja hud-sub-text">{guide.titleJa}</p>
      </header>
      <ul className="command-list">
        {guide.rows.map((row) => (
          <li key={row.code} className="command-row">
            <span className="command-code">{row.code}</span>
            <span className="command-label-en hud-main-text">{row.labelEn}</span>
            <span className="command-label-ja hud-sub-text">{row.labelJa}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CommandGuideDock({ guides = defaultGuides }) {
  return (
    <div className="command-dock-wrap" aria-label="Command guide">
      <p className="command-dock-hint hud-sub-text">Type in chat / コメントで入力</p>
      <div className="command-dock-grid">
        {guides.map((guide) => (
          <CommandGuideCard key={guide.team} guide={guide} />
        ))}
      </div>
    </div>
  );
}
