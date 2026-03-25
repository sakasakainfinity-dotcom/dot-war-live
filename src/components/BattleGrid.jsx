export function BattleGrid({ grid }) {
  const cols = grid[0]?.length ?? 0;

  return (
    <section className="panel grid-panel">
      <div className="battle-grid-wrap-inner">
        <div className="battle-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {grid.flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div key={`${rowIndex}-${colIndex}`} className={`grid-cell ${cell === 'blue' ? 'grid-blue' : 'grid-red'}`} />
            )),
          )}
        </div>
        <div className="battle-grid-midline" aria-hidden />
      </div>
    </section>
  );
}
