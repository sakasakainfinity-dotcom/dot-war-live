'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { battleMockData } from '../lib/mockData';
import { readLiveSettings } from '../lib/liveSettings';
import { BattleGrid } from './BattleGrid';
import { CommandBar } from './CommandGuideDock';

const COMMAND_EFFECTS = {
  A: { blueDelta: 1, redDelta: 0, target: 'blue', attack: false },
  '300A': { blueDelta: 3, redDelta: 0, target: 'blue', attack: false },
  '500A': { blueDelta: 0, redDelta: -3, target: 'red', attack: true },
  B: { blueDelta: 0, redDelta: 1, target: 'red', attack: false },
  '300B': { blueDelta: 0, redDelta: 3, target: 'red', attack: false },
  '500B': { blueDelta: -3, redDelta: 0, target: 'blue', attack: true },
};

const CHAT_LINES = ['いけー！', '押し込め！', '守り切れ！', 'ここから逆転！', 'ナイス！'];
const USERS = ['Kenji', 'Mika', 'Aoi', 'Sora', 'Riku', 'Moe', 'Yuto', 'Nana'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function byCenterRowDistance(height) {
  const middle = Math.floor(height / 2);
  return Array.from({ length: height }, (_, row) => row).sort(
    (a, b) => Math.abs(a - middle) - Math.abs(b - middle),
  );
}

function buildCaptureOrder(height, width, isBluePush) {
  const centerColumn = Math.floor(width / 2);
  const rows = byCenterRowDistance(height);
  const columns = isBluePush
    ? Array.from({ length: width - centerColumn }, (_, idx) => centerColumn + idx)
    : Array.from({ length: centerColumn }, (_, idx) => centerColumn - 1 - idx);

  const order = [];
  columns.forEach((col) => {
    rows.forEach((row) => {
      order.push({ row, col });
    });
  });
  return order;
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

function formatHhMm(iso) {
  const date = new Date(iso);
  return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const COMMANDS = [
  { code: 'A', team: 'blue', icon: '●', count: 1, labelEn: 'blue 1vote', labelJa: '青に1票' },
  { code: '300A', team: 'blue', icon: '●', count: 3, labelEn: '300A 3vote', labelJa: '青に3票', priceLabel: '¥300' },
  { code: '500A', team: 'blue', icon: '💥', count: 3, labelEn: '500A red smash', labelJa: '赤を3マス爆破', priceLabel: '¥500' },
  { code: 'B', team: 'red', icon: '●', count: 1, labelEn: 'red 1vote', labelJa: '赤に1票' },
  { code: '300B', team: 'red', icon: '●', count: 3, labelEn: '300B 3vote', labelJa: '赤に3票', priceLabel: '¥300' },
  { code: '500B', team: 'red', icon: '💥', count: 3, labelEn: '500B blue smash', labelJa: '青を3マス爆破', priceLabel: '¥500' },
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
    const reload = (event) => {
      if (event?.detail) {
        setSettings(event.detail);
      } else {
        setSettings(readLiveSettings());
      }
    };

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

      const isSuperChat = commandCode.startsWith('300') || commandCode.startsWith('500');
      const userKey = user.id || `${user.platform}:${user.name}`;
      const lastVoteAt = voteCooldownRef.current.get(userKey) ?? 0;
      const elapsed = Date.now() - lastVoteAt;

      if (!isSuperChat && elapsed < 30_000) {
        return;
      }
      if (!isSuperChat) {
        voteCooldownRef.current.set(userKey, Date.now());
      }

      const width = data.grid[0]?.length ?? 0;
      const height = data.grid.length;
      setTotalBalance((prev) => clampTotalBalance(prev + effect.blueDelta - effect.redDelta, width, height));

      const entry = {
        id: `${Date.now()}-${Math.random()}`,
        user: user.name,
        platform: user.platform,
        text,
        amount,
        commandCode,
        isSuperChat,
        createdAt: Date.now(),
      };

      setComments((prev) => [entry, ...prev].slice(0, 50));
      setFlyingComments((prev) => [...prev, entry]);
      setTimeout(() => {
        setFlyingComments((prev) => prev.filter((item) => item.id !== entry.id));
      }, isSuperChat ? 2000 : 1200);
    },
    [data.grid],
  );

  useEffect(() => {
    const ticker = setInterval(() => {
      const command = pick(COMMANDS);
      const userName = pick(USERS);
      const superAmount = command.code.startsWith('300') ? '¥300' : command.code.startsWith('500') ? '¥500' : '';
      applyCommand({
        commandCode: command.code,
        user: { id: `${userName.toLowerCase()}-id`, name: userName, platform: 'youtube' },
        text: `${command.code} ${pick(CHAT_LINES)} ${command.labelJa}`,
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

  const statusHeadline =
    phase === 'pre_live'
      ? `${formatHhMm(settings.startAt)} START`
      : phase === 'live'
        ? currentQuestion
        : phase === 'ended'
          ? '配信は終了しました'
          : '配信開始をお待ちください';

  const statusSubline =
    phase === 'pre_live'
      ? `START IN ${formatCountdown(startAtMs - nowMs)}`
      : phase === 'live'
        ? `PERIOD ${periodIndex + 1} / 6`
        : phase === 'ended'
          ? 'FINAL PERIOD COMPLETED'
          : `START AT ${formatHhMm(settings.startAt)}`;

  const sortedComments = [...comments].sort((a, b) => {
    if (a.isSuperChat !== b.isSuperChat) return a.isSuperChat ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  const grid = useMemo(() => buildFrontlineGrid(data.grid, totalBalance), [data.grid, totalBalance]);

  return (
    <main className="hud-root">
      <div className="hud-stage live-mode-stage">
        <header className="live-head panel">
          <h1>{settings.title}</h1>
          <p className="live-status-main">{statusHeadline}</p>
          <p className="live-status-sub">{statusSubline}</p>
        </header>

        <section className="live-content">
          <div className="live-grid-wrap">
            <BattleGrid grid={grid} />
            <div className="flight-overlay" aria-hidden>
              {flyingComments.map((flight) => (
                <span
                  key={flight.id}
                  className={`flight-chip ${flight.commandCode.includes('B') ? 'flight-to-red' : ''} ${flight.commandCode.includes('500') ? 'flight-attack' : ''} ${flight.isSuperChat ? 'flight-super' : ''}`}
                >
                  {flight.commandCode}
                </span>
              ))}
            </div>
          </div>

          <aside className="panel comment-side-panel">
            <p className="comment-log-title hud-main-text">LIVE COMMENTS</p>
            <div className="comment-scroll">
              {sortedComments.length === 0 ? (
                <p className="comment-line">
                  <strong>System</strong>
                  <span>コメント待機中...</span>
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
          <p>A = 青に投票 / B = 赤に投票 / 1アカウント30秒に1回</p>
          <p>¥300 = 3マス追加 / ¥500 = 3マス爆破</p>
        </section>

        <CommandBar commands={COMMANDS} />
      </div>
    </main>
  );
}
