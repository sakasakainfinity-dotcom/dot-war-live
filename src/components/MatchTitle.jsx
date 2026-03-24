export function MatchTitle({ title }) {
  return (
    <header className="panel title-panel">
      <p className="title-en hud-main-text">{title.titleEn}</p>
      <p className="title-ja hud-sub-text">{title.titleJa}</p>
    </header>
  );
}
