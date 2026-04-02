'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPeriodContext, readLiveSettings } from '../lib/liveSettings';
import { BattleGrid } from './BattleGrid';
import { CommandBar } from './CommandGuideDock';

const BOARD_ROWS = 10;
const BOARD_COLS = 20;
const COMMAND_EFFECTS = {
  B: { blueDelta: 1, redDelta: 0 },
  '3B': { blueDelta: 3, redDelta: 0 },
  '5B': { blueDelta: 0, redDelta: -3 },
  R: { blueDelta: 0, redDelta: 1 },
  '3R': { blueDelta: 0, redDelta: 3 },
  '5R': { blueDelta: -3, redDelta: 0 },
};

const COMMANDS = [
  { code: 'B', team: 'blue', labelEn: '“B” Vote Blue', labelJa: '青へ1票' },
  { code: '3B', team: 'blue', labelEn: '$3 or ¥300 + “B”', labelJa: '青へ3票' },
  { code: '5B', team: 'blue', labelEn: '$5 or ¥500 + “B”', labelJa: '赤へ攻撃×3💣' },
  { code: 'R', team: 'red', labelEn: '“R” Vote Red', labelJa: '赤へ1票' },
  { code: '3R', team: 'red', labelEn: '$3 or ¥300 + “R”', labelJa: '赤へ3票' },
  { code: '5R', team: 'red', labelEn: '$5 or ¥500 + “R”', labelJa: '青へ攻撃×3💣' },
];

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildFrontlineGrid(totalBalance) {
  const centerColumn = Math.floor(BOARD_COLS / 2);
  const grid = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, (_, colIndex) => (colIndex < centerColumn ? 'blue' : 'red')),
  );
  const steps = Math.abs(totalBalance);
  const isBluePush = totalBalance > 0;
  for (let i = 0; i < steps; i += 1) {
    const row = i % BOARD_ROWS;
    const wave = Math.floor(i / BOARD_ROWS);
    const col = isBluePush ? centerColumn + wave : centerColumn - 1 - wave;
    if (col >= 0 && col < BOARD_COLS) grid[row][col] = isBluePush ? 'blue' : 'red';
  }
  return grid;
}

function clampTotalBalance(value) {
  const center = Math.floor(BOARD_COLS / 2);
  const maxBlue = (BOARD_COLS - center) * BOARD_ROWS;
  const maxRed = center * BOARD_ROWS;
  return Math.max(-maxRed, Math.min(maxBlue, value));
}

function applyPeriodRule(periodKey, baseDelta, text, beforeBalance) {
  let adjustedDelta = baseDelta;

  if (periodKey === 'double_vote') {
    adjustedDelta *= 2;
  }

  if (periodKey === 'central_bonus' && Math.abs(beforeBalance) <= BOARD_ROWS && adjustedDelta !== 0) {
    adjustedDelta += Math.sign(adjustedDelta);
  }

  if (periodKey === 'ai_random' && Math.random() < 0.2) {
    adjustedDelta += Math.random() < 0.5 ? -2 : 2;
  }

  if (periodKey === 'random_bomb' && text.includes('💣')) {
    adjustedDelta += Math.random() < 0.5 ? -4 : 4;
  }

  return adjustedDelta;
}

export function BattleLayout() {
  const [settings, setSettings] = useState(() => readLiveSettings());
  const [nowMs, setNowMs] = useState(Date.now());
  const [totalBalance, setTotalBalance] = useState(0);
  const [periodCommittedBalance, setPeriodCommittedBalance] = useState(0);
  const [comments, setComments] = useState([]);
  const [topSupporters, setTopSupporters] = useState([]);
  const [latestPaidComments, setLatestPaidComments] = useState([]);
  const voteCooldownRef = useRef(new Map());
  const activePeriodRef = useRef(null);
  const nextPageTokenRef = useRef('');
  const seenMessageIdsRef = useRef(new Set());

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

  const periodContext = getPeriodContext(settings, nowMs);
  const activePeriod = periodContext.current;
  const nextPeriod = periodContext.next;

  useEffect(() => {
    const currentPeriodId = activePeriod?.id;
    if (!currentPeriodId) return;
    if (activePeriodRef.current === null) {
      activePeriodRef.current = currentPeriodId;
      return;
    }
    if (activePeriodRef.current !== currentPeriodId) {
      setPeriodCommittedBalance(Math.floor(totalBalance));
      activePeriodRef.current = currentPeriodId;
    }
  }, [activePeriod?.id, totalBalance]);

  const applyCommand = useCallback(
    ({ commandCode, user, text, amount = '' }) => {
      const effect = COMMAND_EFFECTS[commandCode];
      if (!effect || !activePeriod) return;
      const isSuperChat = commandCode.startsWith('3') || commandCode.startsWith('5');
      const userKey = user.id || `${user.platform}:${user.name}`;
      const lastVoteAt = voteCooldownRef.current.get(userKey) ?? 0;
      if (!isSuperChat && Date.now() - lastVoteAt < 15_000) return;
      if (!isSuperChat) voteCooldownRef.current.set(userKey, Date.now());

      const commandDelta = effect.blueDelta - effect.redDelta;
      setTotalBalance((prev) => {
        const adjusted = applyPeriodRule(activePeriod.periodKey, commandDelta, text, prev);
        return clampTotalBalance(prev + adjusted);
      });

      const entry = {
        id: `${Date.now()}-${Math.random()}`,
        user,
        text,
        amount,
        commandCode,
        isSuperChat,
        createdAt: Date.now(),
      };

      setComments((prev) => [entry, ...prev].slice(0, 120));

    },
    [activePeriod],
  );

  useEffect(() => {
    let active = true;
    let timer;

    const poll = async () => {
      const pageToken = nextPageTokenRef.current ? `?pageToken=${encodeURIComponent(nextPageTokenRef.current)}` : '';
      const res = await fetch(`/api/youtube/comments${pageToken}`, { cache: 'no-store' }).catch(() => null);
      if (!active) return;
      if (!res || !res.ok) {
        timer = setTimeout(poll, 5000);
        return;
      }

      const data = await res.json();
      setTopSupporters(Array.isArray(data.topSupporters) ? data.topSupporters : []);
      setLatestPaidComments(Array.isArray(data.latestPaidComments) ? data.latestPaidComments : []);
      const received = Array.isArray(data.comments) ? data.comments : [];
      nextPageTokenRef.current = data.nextPageToken || '';
      const freshItems = received.filter((item) => {
        if (seenMessageIdsRef.current.has(item.id)) return false;
        seenMessageIdsRef.current.add(item.id);
        return true;
      });

      freshItems.reverse().forEach((item) => {
        applyCommand({
          commandCode: item.commandCode,
          user: item.user,
          text: item.text,
          amount: item.amount || '',
        });
      });

      timer = setTimeout(poll, Number(data.pollingIntervalMs) || 5000);
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [applyCommand]);

  const grid = useMemo(() => buildFrontlineGrid(Math.floor(totalBalance)), [totalBalance]);
  const liveBlueCells = useMemo(() => grid.flat().filter((cell) => cell === 'blue').length, [grid]);
  const liveRedCells = BOARD_ROWS * BOARD_COLS - liveBlueCells;
  const committedGrid = useMemo(() => buildFrontlineGrid(Math.floor(periodCommittedBalance)), [periodCommittedBalance]);
  const blueCells = useMemo(() => committedGrid.flat().filter((cell) => cell === 'blue').length, [committedGrid]);
  const redCells = BOARD_ROWS * BOARD_COLS - blueCells;

  const blueVotes = comments.filter((comment) => ['B', '3B', '5B'].includes(comment.commandCode)).length;
  const redVotes = comments.filter((comment) => ['R', '3R', '5R'].includes(comment.commandCode)).length;
  const blueBlasts = comments.filter((comment) => comment.commandCode === '5B').length;
  const redBlasts = comments.filter((comment) => comment.commandCode === '5R').length;

  const latestPaid = latestPaidComments;
  const ranking = topSupporters;

  const periodNumber = periodContext.currentPeriodIndex;
  const periodRemain = formatCountdown(periodContext.remainingMs);

  return (
    <main className="hud-root">
      <div className="hud-stage war-stage">
        <header className="war-header panel">
          <div>
            <p className="war-title-en"><span className="team-blue">{settings.teamA_en}</span><span className="team-vs"> vs </span><span className="team-red">{settings.teamB_en}</span></p>
            <p className="war-title-ja"><span className="team-blue">{settings.teamA_ja}</span><span className="team-vs"> vs </span><span className="team-red">{settings.teamB_ja}</span></p>
          </div>
          <div className="war-status-block">
            <p className="war-status-now">NOW: {activePeriod?.title ?? 'NORMAL'}</p>
            <p className="war-status-sub-en">{activePeriod?.descriptionEn ?? 'Standard battle rules.'}</p>
            <p className="war-status-sub-ja">{activePeriod?.descriptionJa ?? '通常ルールのバトルです。'}</p>
            <p className="war-status-next">Next period: {nextPeriod?.title ?? 'NORMAL'}</p>
          </div>
          <Link href="/admin" className="stealth-link">admin</Link>
        </header>

        <section className="battle-zone">
          <aside className="panel side-tank side-tank-blue">
            <p className="tank-top-label">Total Score</p>
            <p className="tank-big-score">{blueCells.toLocaleString()}</p>
            <div className="meter-shell">
              <div className="meter-fill meter-fill-blue" style={{ height: `${(blueCells / (BOARD_ROWS * BOARD_COLS)) * 100}%` }} />
              {Array.from({ length: 10 }).map((_, idx) => <i key={idx} className="meter-tick" style={{ bottom: `${idx * 10}%` }} />)}
            </div>
            <div className="tank-foot">
              <p>Total votes {blueVotes}</p>
              <p>Total Blasts {blueBlasts}</p>
            </div>
          </aside>

          <section className="battle-main panel">
            <div className="period-badge">PERIOD {periodNumber} <span>| 48</span> <em>{periodRemain}</em></div>
            <div className="team-side-label team-side-left">BLUE</div>
            <div className="team-side-label team-side-right">RED</div>
            <BattleGrid grid={grid} />
            <p className="live-balance-note">Live front: B {liveBlueCells} / R {liveRedCells} (gauge reflects on period end)</p>
          </section>

          <aside className="panel side-tank side-tank-red">
            <p className="tank-top-label">Total Score</p>
            <p className="tank-big-score">{redCells.toLocaleString()}</p>
            <div className="meter-shell">
              <div className="meter-fill meter-fill-red" style={{ height: `${(redCells / (BOARD_ROWS * BOARD_COLS)) * 100}%` }} />
              {Array.from({ length: 10 }).map((_, idx) => <i key={idx} className="meter-tick" style={{ bottom: `${idx * 10}%` }} />)}
            </div>
            <div className="tank-foot">
              <p>Total votes {redVotes}</p>
              <p>Total Blasts {redBlasts}</p>
            </div>
          </aside>
        </section>

        <div className="center-lane">
          <section className="info-row">
            <article className="panel paid-panel">
              <h3>LATEST PAID COMMENTS</h3>
              <div className="fixed-list">
                {latestPaid.length === 0 ? <p className="muted">No paid comments yet.</p> : null}
                {latestPaid.map((comment) => (
                  <p key={comment.messageId} className="feed-line">
                    <strong>{comment.userName}</strong>
                    <span className="price">{comment.amountLabel}</span>
                    <span className="ellipsis">{comment.messageText}</span>
                  </p>
                ))}
              </div>
            </article>

            <article className="panel rank-panel">
              <h3>TOP SUPPORTERS</h3>
              <div className="fixed-list">
                {ranking.length === 0 ? <p className="muted">No supporters yet.</p> : null}
                {ranking.map((entry, index) => (
                  <p key={entry.userChannelId} className="rank-line">
                    <strong>#{index + 1}</strong>
                    <span className="ellipsis">{entry.userName}</span>
                    <span>{entry.amountLabel}</span>
                  </p>
                ))}
              </div>
            </article>
          </section>

          <section className="vote-note panel">
            <p className="vote-en">Just Comment "B" or "R" to Vote! Only B or R!</p>
            <p className="vote-ja">投票は「B」か「R」を打つだけ！（BまたはRの1文字のみ！）</p>
          </section>
        </div>
        <CommandBar commands={COMMANDS} />
      </div>
    </main>
  );
}
