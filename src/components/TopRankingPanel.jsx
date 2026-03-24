export function TopRankingPanel({ ranking }) {
  return (
    <section className="panel ranking-panel">
      <div className="ranking-head">
        <p className="ranking-title hud-main-text">TOP SUPPORTERS</p>
        <p className="ranking-title-ja hud-sub-text">支援ランキング</p>
      </div>
      <ul>
        {ranking.slice(0, 3).map((entry) => (
          <li key={entry.rank} className="ranking-row">
            <span className="ranking-rank">{entry.rank}.</span>
            <span className="ranking-name">{entry.name}</span>
            <span className="ranking-amount">{entry.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
