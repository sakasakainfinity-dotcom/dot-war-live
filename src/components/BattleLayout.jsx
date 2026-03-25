'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { battleMockData } from '../lib/mockData';
import { readLiveSettings } from '../lib/liveSettings';
import { BattleGrid } from './BattleGrid';
import { CommandBar } from './CommandGuideDock';
import { TopRankingPanel } from './TopRankingPanel';

const COMMAND_EFFECTS = {
  B: { blueDelta: 1, redDelta: 0 },
  '3B': { blueDelta: 3, redDelta: 0 },
  '5B': { blueDelta: 0, redDelta: -3 },
  R: { blueDelta: 0, redDelta: 1 },
  '3R': { blueDelta: 0, redDelta: 3 },
  '5R': { blueDelta: -3, redDelta: 0 },
};

const CHAT_LINES = ['Push now!', 'Hold line!', 'Blue go!', 'Red go!', 'Nice hit!'];
const USERS = ['Kenji', 'Mika', 'Aoi', 'Sora', 'Riku', 'Moe', 'Yuto', 'Nana'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function byCenterRowDistance(height) {
  const middle = Math.floor(height / 2);
  return Array.from({ length: height }, (_, row) => row).sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
}

function buildCaptureOrder(height, width, isBluePush) {
  const centerColumn = Math.floor(width / 2);
  const rows = byCenterRowDistance(height);
  const columns = isBluePush
    ? Array.from({ length: width - centerColumn }, (_, idx) => centerColumn + idx)
    : Array.from({ length: centerColumn }, (_, idx) => centerColumn - 1 - idx);

  return columns.flatMap((col) => rows.map((row) => ({ row, col })));
}

function buildFrontlineGrid(baseGrid, totalBalance) {
  const height = baseGrid.length;
  const width = baseGrid[0]?.length ?? 0;
  const centerColumn = Math.floor(width / 2);
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, (_, colIndex) => (colIndex < centerColumn ? 'blue' : 'red')),
  );
  const isBluePushing = totalBalance > 0;
  const captureOrder = buildCaptureOrder(height, width, isBluePushing);
  captureOrder.slice(0, Math.abs(totalBalance)).forEach(({ row, col }) => {
    grid[row][col] = isBluePushing ? 'blue' : 'red';
  });

  return grid;
}

function clampTotalBalance(value, width, height) {
  const center = Math.floor(width / 2);
  const maxBlue = (width - center) * height;
  const maxRed = center * height;
  return Math.max(-maxRed, Math.min(maxBlue, value));
}

function getPhase(settings, now = Date.now()) {
  const startAt = new Date(settings.startAt).getTime();
  const preLiveStart = startAt - 60 * 60 * 1000;
  const liveEnd = startAt + settings.periodDurationSec * 6 * 1000;

  if (now < preLiveStart) return 'idle';
  if (now < startAt) return 'pre_live';
  if (now < liveEnd) return 'live';
  return 'ended';
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function commandPoint(commandCode) {
  if (commandCode.startsWith('5')) return 5;
  if (commandCode.startsWith('3')) return 3;
  return 1;
}

const COMMANDS = [
  { code: 'B', team: 'blue', labelEn: '"B" = BLUE VOTE', labelJa: '青に投票' },
  { code: '3B', team: 'blue', labelEn: '"3B" ¥300 / $3 = +BLUE ×3', labelJa: '3マス追加' },
  { code: '5B', team: 'blue', labelEn: '"5B" ¥500 / $5 = RED💣SMASH3', labelJa: '3マス破壊' },
  { code: 'R', team: 'red', labelEn: '"R" = RED VOTE', labelJa: '赤に投票' },
  { code: '3R', team: 'red', labelEn: '"3R" ¥300 / $3 = +RED ×3', labelJa: '3マス追加' },
  { code: '5R', team: 'red', labelEn: '"5R" ¥500 / $5 = BLUE💣SMASH3', labelJa: '3マス破壊' },
];

export function BattleLayout({ data = battleMockData }) {
  const [settings, setSettings] = useState(() => readLiveSettings());
  const [nowMs, setNowMs] = useState(Date.now());
  const [totalBalance, setTotalBalance] = useState(0);
  const [comments, setComments] = useState([]);
  const [flyingComments, setFlyingComments] = useState([]);
  const voteCooldownRef = useRef(new Map());

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const reload = (event) => setSettings(event?.detail || readLiveSettings());
    window.addEventListener('storage', reload);
    window.addEventListener('dot-war-live:settings-updated', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('dot-war-live:settings-updated', reload);
    };
  }, []);

  const applyCommand = useCallback(
    ({ commandCode, user, text, amount = '' }) => {
      const effect = COMMAND_EFFECTS[commandCode];
      if (!effect) return;
      const isSuperChat = commandCode.startsWith('3') || commandCode.startsWith('5');
      const userKey = user.id || `${user.platform}:${user.name}`;
      const lastVoteAt = voteCooldownRef.current.get(userKey) ?? 0;
      if (!isSuperChat && Date.now() - lastVoteAt < 30_000) return;
      if (!isSuperChat) voteCooldownRef.current.set(userKey, Date.now());

      const width = data.grid[0]?.length ?? 0;
      const height = data.grid.length;
      setTotalBalance((prev) => clampTotalBalance(prev + effect.blueDelta - effect.redDelta, width, height));

      const entry = {
        id: `${Date.now()}-${Math.random()}`,
        user: user.name,
        text,
        amount,
        commandCode,
        isSuperChat,
        createdAt: Date.now(),
      };

      setComments((prev) => [entry, ...prev].slice(0, 80));
      setFlyingComments((prev) => [...prev, entry]);
      setTimeout(() => setFlyingComments((prev) => prev.filter((item) => item.id !== entry.id)), isSuperChat ? 2000 : 1200);
    },
    [data.grid],
  );

  useEffect(() => {
    const ticker = setInterval(() => {
      const command = pick(COMMANDS);
      const userName = pick(USERS);
      const superAmount = command.code.startsWith('3') ? '¥300 / $3' : command.code.startsWith('5') ? '¥500 / $5' : '';
      applyCommand({
        commandCode: command.code,
        user: { id: `${userName.toLowerCase()}-id`, name: userName, platform: 'youtube' },
        text: `${command.code} ${pick(CHAT_LINES)}`,
        amount: superAmount,
      });
    }, 1800);

    return () => clearInterval(ticker);
  }, [applyCommand]);

  const phase = getPhase(settings, nowMs);
  const startAtMs = new Date(settings.startAt).getTime();
  const elapsedLiveSec = Math.max(0, Math.floor((nowMs - startAtMs) / 1000));
  const periodIndex = Math.min(5, Math.floor(elapsedLiveSec / settings.periodDurationSec));
  const currentQuestion = settings.questions[periodIndex] ?? settings.questions[0];
  const periodRemainingSec = Math.max(0, settings.periodDurationSec - (elapsedLiveSec % settings.periodDurationSec));
  const periodTime = formatCountdown(periodRemainingSec * 1000);

  const statusEn =
    phase === 'pre_live'
      ? `STARTS IN ${formatCountdown(startAtMs - nowMs)}`
      : phase === 'live'
        ? `PERIOD ${periodIndex + 1} / 6 • ENDS IN ${periodTime}`
        : phase === 'ended'
          ? 'FINAL PERIOD ENDED'
          : 'WAITING FOR LIVE';

  const statusJa = phase === 'live' ? `残り ${periodTime}` : phase === 'pre_live' ? '開始まで' : '待機中';

  const sortedComments = [...comments].sort((a, b) => {
    if (a.isSuperChat !== b.isSuperChat) return a.isSuperChat ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  const ranking = Object.entries(
    comments.reduce((acc, c) => {
      acc[c.user] = (acc[c.user] ?? 0) + commandPoint(c.commandCode);
      return acc;
    }, {}),
  )
    .map(([name, point]) => ({ name, point }))
    .sort((a, b) => b.point - a.point)
    .slice(0, 5)
    .map((entry, index) => ({ rank: index + 1, ...entry }));

  const grid = useMemo(() => buildFrontlineGrid(data.grid, totalBalance), [data.grid, totalBalance]);

  return (
    <main className="hud-root">
      <div className="hud-stage live-mode-stage">
        <header className="live-head panel">
          <div className="live-title-wrap">
            <p className="live-title-en">{settings.titleEn}</p>
            <p className="live-title-ja">{settings.titleJa}</p>
          </div>
          <TopRankingPanel ranking={ranking} />
          <div className="question-block">
            <p className="live-status-main">{currentQuestion.en}</p>
            <p className="live-status-ja">{currentQuestion.ja}</p>
            <p className="live-status-sub">{statusEn}</p>
            <p className="live-status-ja">{statusJa}</p>
          </div>
          <Link href="/admin" className="stealth-link">admin</Link>
        </header>

        <section className="live-content">
          <div className="live-grid-wrap">
            <div className="team-side-label team-side-left">{settings.blueTeamEn}</div>
            <div className="team-side-label team-side-right">{settings.redTeamEn}</div>
            <BattleGrid grid={grid} />
            <div className="flight-overlay" aria-hidden>
              {flyingComments.map((flight) => (
                <span
                  key={flight.id}
                  className={`flight-chip ${flight.commandCode.includes('R') ? 'flight-to-red' : ''} ${flight.commandCode.includes('5') ? 'flight-attack' : ''} ${flight.isSuperChat ? 'flight-super' : ''}`}
                >
                  {flight.commandCode}
                </span>
              ))}
            </div>
          </div>

          <aside className="panel comment-side-panel">
            <p className="comment-log-title hud-main-text">LIVE COMMENTS</p>
            <p className="hud-sub-text">コメント</p>
            <div className="comment-scroll">
              {sortedComments.length === 0 ? (
                <p className="comment-line">
                  <strong>System</strong>
                  <span>Waiting comments...</span>
                </p>
              ) : (
                sortedComments.map((comment) => (
                  <p key={comment.id} className={`comment-line ${comment.isSuperChat ? 'comment-line-super' : ''}`}>
                    <strong>{comment.user}</strong>
                    {comment.amount ? <span className="comment-amount">{comment.amount}</span> : null}
                    <span>{comment.text}</span>
                  </p>
                ))
              )}
            </div>
          </aside>
        </section>

        <section className="panel operation-guide">
          <p>Type "" command in comment to vote.</p>
          <p>「」の文字をコメントすると投票できます。</p>
        </section>

        <CommandBar commands={COMMANDS} />
      </div>
    </main>
  );
}
