export function TeamTank({ team, value, ticks = 8 }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const isBlue = team === 'blue';
  const teamLabel = isBlue ? 'Blue Team' : 'Red Team';
  const teamLabelJa = isBlue ? '青チーム' : '赤チーム';

  return (
    <aside className={`tank ${isBlue ? 'tank-blue' : 'tank-red'}`}>
      <div className="tank-label-wrap">
        <p className="tank-label hud-main-text">{teamLabel}</p>
        <p className="tank-label-ja hud-sub-text">{teamLabelJa}</p>
      </div>
      <div className="tank-shell">
        <div className="tank-inner">
          {Array.from({ length: ticks + 1 }).map((_, i) => (
            <span key={i} className="tank-tick" style={{ top: `${(i / ticks) * 100}%` }} />
          ))}
          <div className={`tank-fill ${isBlue ? 'tank-fill-blue' : 'tank-fill-red'}`} style={{ height: `${safeValue}%` }} />
        </div>
      </div>
      <p className="tank-value">{safeValue}%</p>
    </aside>
  );
}
