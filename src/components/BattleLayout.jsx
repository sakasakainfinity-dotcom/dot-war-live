'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { battleMockData } from '../lib/mockData';
import { getActivePeriod, getNextPeriod, readLiveSettings } from '../lib/liveSettings';
import { evaluateCommentForReply, prefilterComment, trimForVoice } from '../lib/commentReplyEngine';
import { BattleGrid } from './BattleGrid';
import { CommandBar } from './CommandGuideDock';

const COMMAND_EFFECTS = {
  B: { blueDelta: 1, redDelta: 0 },
  '3B': { blueDelta: 3, redDelta: 0 },
  '5B': { blueDelta: 0, redDelta: -3 },
  R: { blueDelta: 0, redDelta: 1 },
  '3R': { blueDelta: 0, redDelta: 3 },
  '5R': { blueDelta: -3, redDelta: 0 },
};

const CHAT_LINES = [
  '中央押したい！',
  '守備ライン維持しよう',
  '爆弾ここで使う？',
  '今逆転あるぞ',
  'ナイス連携！',
  'R go go',
  'B push center',
  'スパチャで流れ変える',
];
const USERS = ['Kenji', 'Mika', 'Aoi', 'Sora', 'Riku', 'Moe', 'Yuto', 'Nana', 'Hina', 'Kota'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function buildFrontlineGrid(baseGrid, totalBalance) {
  const height = baseGrid.length;
  const width = baseGrid[0]?.length ?? 0;
  const centerColumn = Math.floor(width / 2);
  const grid = Array.from({ length: height }, () =>
    Array.from({ length: width }, (_, colIndex) => (colIndex < centerColumn ? 'blue' : 'red')),
  );
  const steps = Math.abs(totalBalance);
  const isBluePush = totalBalance > 0;
  for (let i = 0; i < steps; i += 1) {
    const row = i % height;
    const wave = Math.floor(i / height);
    const col = isBluePush ? centerColumn + wave : centerColumn - 1 - wave;
    if (col >= 0 && col < width) grid[row][col] = isBluePush ? 'blue' : 'red';
  }
  return grid;
}

function clampTotalBalance(value, width, height) {
  const center = Math.floor(width / 2);
  const maxBlue = (width - center) * height;
  const maxRed = center * height;
  return Math.max(-maxRed, Math.min(maxBlue, value));
}

const COMMANDS = [
  { code: 'B', labelEn: '"B" = BLUE VOTE', labelJa: '青に投票' },
  { code: '3B', labelEn: '"3B" ¥300 / $3 = +BLUE ×3', labelJa: '3マス追加' },
  { code: '5B', labelEn: '"5B" ¥500 / $5 = RED💣SMASH3', labelJa: '3マス破壊' },
  { code: 'R', labelEn: '"R" = RED VOTE', labelJa: '赤に投票' },
  { code: '3R', labelEn: '"3R" ¥300 / $3 = +RED ×3', labelJa: '3マス追加' },
  { code: '5R', labelEn: '"5R" ¥500 / $5 = BLUE💣SMASH3', labelJa: '3マス破壊' },
];

export function BattleLayout({ data = battleMockData }) {
  const [settings, setSettings] = useState(() => readLiveSettings());
  const [nowMs, setNowMs] = useState(Date.now());
  const [totalBalance, setTotalBalance] = useState(0);
  const [comments, setComments] = useState([]);
  const [aiReplies, setAiReplies] = useState([]);
  const [paidComments, setPaidComments] = useState([]);
  const [voiceLine, setVoiceLine] = useState('');
  const [autoPosts, setAutoPosts] = useState([]);
  const voteCooldownRef = useRef(new Map());
  const recentUserMapRef = useRef(new Map());
  const recentTextMapRef = useRef(new Map());
  const replyTimesRef = useRef([]);
  const aiStateRef = useRef({ lastPickedUser: '', lastPickedAt: 0, lastVoiceAt: 0 });

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

  const activePeriod = getActivePeriod(settings, nowMs);
  const nextPeriod = getNextPeriod(settings, nowMs);

  const processAiReply = useCallback(
    (entry) => {
      if (!settings.aiReplyEnabled || !activePeriod) return;
      const rule = prefilterComment(entry, settings.replyConfig, {
        recentUserMap: recentUserMapRef.current,
        recentTextMap: recentTextMapRef.current,
        lastPickedUser: aiStateRef.current.lastPickedUser,
        lastPickedAt: aiStateRef.current.lastPickedAt,
      });
      if (!rule.pass) return;

      const inMinute = Date.now() - 60_000;
      replyTimesRef.current = replyTimesRef.current.filter((time) => time > inMinute);
      if (replyTimesRef.current.length >= settings.replyConfig.frequencyLimitPerMinute) return;

      const result = evaluateCommentForReply(
        entry,
        { ...settings.replyConfig, mode: activePeriod.aiCommentMode || settings.replyConfig.mode },
        { voiceReplyEnabled: settings.voiceReplyEnabled && settings.voiceConfig.enabled && activePeriod.voiceReplyEnabled },
        { lastVoiceAt: aiStateRef.current.lastVoiceAt },
      );
      if (!result.picked) return;

      replyTimesRef.current.push(Date.now());
      aiStateRef.current.lastPickedUser = entry.user.id;
      aiStateRef.current.lastPickedAt = Date.now();

      const reply = {
        id: `${entry.id}-reply`,
        to: entry.user.name,
        text: result.replyText,
        category: result.category,
        priority: result.priority,
        spoken: result.spoken,
        createdAt: Date.now(),
      };

      setAiReplies((prev) => [reply, ...prev].slice(0, 20));

      if (reply.spoken) {
        aiStateRef.current.lastVoiceAt = Date.now();
        setVoiceLine(trimForVoice(reply.text, settings.voiceConfig.summarizeLongText ? 52 : 80));
      }
    },
    [activePeriod, settings],
  );

  const applyCommand = useCallback(
    ({ commandCode, user, text, amount = '' }) => {
      const effect = COMMAND_EFFECTS[commandCode];
      if (!effect || !activePeriod) return;
      const isSuperChat = commandCode.startsWith('3') || commandCode.startsWith('5');
      const userKey = user.id || `${user.platform}:${user.name}`;
      const lastVoteAt = voteCooldownRef.current.get(userKey) ?? 0;
      if (!isSuperChat && Date.now() - lastVoteAt < 15_000) return;
      if (!isSuperChat) voteCooldownRef.current.set(userKey, Date.now());

      recentUserMapRef.current.set(userKey, Date.now());
      recentTextMapRef.current.set(text.toLowerCase(), Date.now());

      const width = data.grid[0]?.length ?? 0;
      const height = data.grid.length;
      const periodBoost = Number(activePeriod.bonusValue ?? 1);
      setTotalBalance((prev) => clampTotalBalance(prev + (effect.blueDelta - effect.redDelta) * periodBoost, width, height));

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
      processAiReply(entry);

      if (isSuperChat) {
        setPaidComments((prev) => [entry, ...prev].slice(0, 5));
      }
    },
    [activePeriod, data.grid, processAiReply],
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
    }, 1700);

    return () => clearInterval(ticker);
  }, [applyCommand]);

  useEffect(() => {
    if (!settings.autoNarrationEnabled || !activePeriod) return;
    const intervalMs = Math.max(15_000, 60_000 - activePeriod.narrationLevel * 8_000);
    const narrator = setInterval(() => {
      const side = totalBalance >= 0 ? 'BLUE' : 'RED';
      const message = `[AUTO] ${activePeriod.name}: ${side}優勢 / bonus x${activePeriod.bonusValue}`;
      setAutoPosts((prev) => [{ id: `${Date.now()}`, target: 'feed', message, createdAt: Date.now() }, ...prev].slice(0, 10));
    }, intervalMs);

    return () => clearInterval(narrator);
  }, [activePeriod, settings.autoNarrationEnabled, totalBalance]);

  useEffect(() => {
    if (!nextPeriod) return;
    const remain = new Date(nextPeriod.startAt).getTime() - nowMs;
    if (remain < 30_000 && remain > 28_000) {
      const eventMessage = `次のボーナス: ${nextPeriod.name} まもなく開始`; 
      setAutoPosts((prev) => [{ id: `${Date.now()}-next`, target: settings.autoPostXEnabled ? 'X' : 'feed', message: eventMessage, createdAt: Date.now() }, ...prev].slice(0, 10));
    }
  }, [nextPeriod, nowMs, settings.autoPostXEnabled]);

  const streamStart = new Date(settings.startAt).getTime();
  const streamEnd = new Date(settings.endAt).getTime();
  const phase = nowMs < streamStart ? 'pre_live' : nowMs >= streamEnd ? 'ended' : 'live';
  const grid = useMemo(() => buildFrontlineGrid(data.grid, Math.floor(totalBalance)), [data.grid, totalBalance]);

  const nextCountdown = nextPeriod ? formatCountdown(new Date(nextPeriod.startAt).getTime() - nowMs) : '00:00:00';
  const currentRule = activePeriod ? `${activePeriod.bonusType} ×${activePeriod.bonusValue}` : 'standby';

  return (
    <main className="hud-root">
      <div className="hud-stage live-mode-stage">
        <header className="live-head panel">
          <div className="live-title-wrap">
            <p className="live-title-en">{settings.title}</p>
            <p className="live-title-ja">{settings.theme}</p>
            <p className="live-status-sub">{phase === 'live' ? '24H LIVE RUNNING' : phase === 'pre_live' ? 'STARTING SOON' : '24H LIVE ENDED'}</p>
          </div>

          <div className="question-block">
            <p className="live-status-main">NOW: {activePeriod?.name ?? '待機中'}</p>
            <p className="live-status-ja">NEXT BONUS IN {nextCountdown}</p>
            <p className="live-status-ja">現在ルール: {currentRule}</p>
            <p className="live-status-ja">コメントで参加: B / R / 3B / 3R / 5B / 5R</p>
          </div>
          <Link href="/admin" className="stealth-link">admin</Link>
        </header>

        <section className="live-content">
          <div className="live-grid-wrap panel">
            <div className="team-side-label team-side-left">BLUE</div>
            <div className="team-side-label team-side-right">RED</div>
            <BattleGrid grid={grid} />
            <div className="overlay-note">{activePeriod?.overlayText}</div>
          </div>

          <aside className="panel comment-side-panel">
            <p className="comment-log-title hud-main-text">AI REPLY LOG</p>
            <p className="hud-sub-text">broad / normal / strict 切替対応</p>
            <div className="comment-scroll">
              {aiReplies.map((reply) => (
                <p key={reply.id} className="comment-line comment-line-super">
                  <strong>{reply.to}</strong>
                  <span className="comment-amount">{reply.category}</span>
                  <span>{reply.text}</span>
                </p>
              ))}
            </div>
          </aside>
        </section>

        <section className="panel operation-guide">
          <p>NOW PERIOD / NEXT BONUS / RULE を常時表示中</p>
          <p>AI返信: {settings.aiReplyEnabled ? 'ON' : 'OFF'} / 音声: {settings.voiceReplyEnabled ? 'ON' : 'OFF'} {voiceLine ? ` / VOICE: ${voiceLine}` : ''}</p>
        </section>

        <section className="panel paid-fixed-panel">
          <p className="hud-main-text">PAID COMMENTS (Fixed latest 5)</p>
          <div className="paid-fixed-list">
            {paidComments.length === 0 ? <p className="hud-sub-text">まだスパチャはありません</p> : null}
            {paidComments.map((comment) => (
              <p key={comment.id} className="comment-line comment-line-super">
                <strong>{comment.user.name}</strong>
                <span className="comment-amount">{comment.amount}</span>
                <span>{comment.text}</span>
              </p>
            ))}
          </div>
        </section>

        <section className="panel auto-post-panel">
          <p className="hud-main-text">AUTO NARRATION / SNS QUEUE</p>
          <div className="comment-scroll">
            {autoPosts.map((post) => (
              <p key={post.id} className="comment-line">
                <strong>{post.target}</strong>
                <span>{post.message}</span>
              </p>
            ))}
          </div>
        </section>

        <CommandBar commands={COMMANDS} />
      </div>
    </main>
  );
}
