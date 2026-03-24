const DEFAULT_MARKS = [-5, 0, 5, 10, 15];

function toPercent(value, min, max) {
  return ((value - min) / (max - min)) * 100;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function TeamTank({ team, currentValue, min = -5, max = 15, marks = DEFAULT_MARKS }) {
  const safeValue = clamp(currentValue, min, max);
  const fillPercent = toPercent(safeValue, min, max);
  const zeroPercent = toPercent(0, min, max);
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
          {marks.map((mark) => (
            <span
              key={mark}
              className={`tank-tick ${mark === 0 ? 'tank-zero' : ''}`}
              style={{ top: `${100 - toPercent(mark, min, max)}%` }}
            >
              <em className="tank-tick-label">{mark}</em>
            </span>
          ))}
          <div className={`tank-fill ${isBlue ? 'tank-fill-blue' : 'tank-fill-red'}`} style={{ height: `${fillPercent}%` }} />
          <span className="tank-current" style={{ bottom: `${fillPercent}%` }}>
            {safeValue}
          </span>
          <span className="tank-zero-badge" style={{ bottom: `${zeroPercent}%` }}>
            0
          </span>
        </div>
      </div>
      <p className="tank-value">{safeValue}</p>
    </aside>
  );
}
