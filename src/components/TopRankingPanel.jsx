export function TopRankingPanel({ ranking }) {
  return (
    <section className="panel ranking-panel">
      <div className="ranking-head">
        <p className="ranking-title hud-main-text">TOP SUPPORTERS</p>
        <p className="ranking-title-ja hud-sub-text">ランキング上位</p>
      </div>
      <ul>
        {(ranking?.length ? ranking : [{ rank: 1, name: '-', point: 0 }]).slice(0, 5).map((entry) => (
          <li key={`${entry.rank}-${entry.name}`} className="ranking-row">
            <span className="ranking-rank">{entry.rank}.</span>
            <span className="ranking-name">{entry.name}</span>
            <span className="ranking-amount">{entry.point} pt</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
