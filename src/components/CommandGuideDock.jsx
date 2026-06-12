export function CommandBar() {
  return (
    <div className="command-dock-wrap" aria-label="Viewer command bar">
      <div className="simple-command-banner panel">
        <span className="simple-command-main">Comment A or B</span>
        <span className="simple-command-sub"><strong>A</strong> = Left Team&nbsp;&nbsp; / &nbsp;&nbsp;<strong>B</strong> = Right Team</span>
      </div>
    </div>
  );
}
