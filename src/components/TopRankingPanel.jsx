export function TopRankingPanel({ ranking }) {
  return (
    <section className="panel ranking-panel">
      <p className="ranking-title">TOP SUPPORTERS</p>
      <ul>
        {ranking.map((entry) => (
          <li key={entry.rank} className="ranking-row">
            <span>#{entry.rank}</span>
            <span>{entry.name}</span>
            <span>{entry.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
