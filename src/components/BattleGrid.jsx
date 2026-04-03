export function BattleGrid({ grid }) {
  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;

  return (
    <div className="battle-grid-wrap-inner">
      <div
        className="battle-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {grid.flatMap((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}-${cell}`}
              className={`grid-cell grid-flip ${cell === 'blue' ? 'grid-blue' : 'grid-red'}`}
            />
          )),
        )}
      </div>
      <div className="battle-grid-midline" aria-hidden />
    </div>
  );
}
