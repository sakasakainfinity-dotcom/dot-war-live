export function TeamTank({ team, value, ticks = 8 }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const isBlue = team === 'blue';
  const teamLabel = isBlue ? 'BLUE' : 'RED';

  return (
    <aside className={`tank ${isBlue ? 'tank-blue' : 'tank-red'}`}>
      <p className="tank-label">{teamLabel}</p>
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
