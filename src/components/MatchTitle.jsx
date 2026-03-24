export function MatchTitle({ title }) {
  return (
    <header className="panel title-panel">
      <p className="title-ja">{title.titleJa}</p>
      <p className="title-en">{title.titleEn}</p>
    </header>
  );
}
