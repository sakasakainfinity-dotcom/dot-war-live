'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HUD_CONFIG } from '../config/hudConfig';
import { battleMockData } from '../lib/mockData';
import { BattleGrid } from './BattleGrid';
import { CommandBar } from './CommandGuideDock';
import { CountdownTimer } from './CountdownTimer';
import { MatchTitle } from './MatchTitle';
import { SuperChatBanner } from './SuperChatBanner';
import { TeamTank } from './TeamTank';
import { TopRankingPanel } from './TopRankingPanel';

const GAUGE_MIN = HUD_CONFIG.gauge.min;
const GAUGE_MAX = HUD_CONFIG.gauge.max;
const ROUND_SECONDS = HUD_CONFIG.votePhaseSeconds;

const COMMAND_EFFECTS = {
  A: { blueDelta: 1, redDelta: 0, target: 'blue', attack: false },
  AA: { blueDelta: 0, redDelta: -1, target: 'red', attack: true },
  '300A': { blueDelta: 3, redDelta: 0, target: 'blue', attack: false },
  '500A': { blueDelta: 0, redDelta: -5, target: 'red', attack: true },
  B: { blueDelta: 0, redDelta: 1, target: 'red', attack: false },
  BB: { blueDelta: -1, redDelta: 0, target: 'blue', attack: true },
  '300B': { blueDelta: 0, redDelta: 3, target: 'red', attack: false },
  '500B': { blueDelta: -5, redDelta: 0, target: 'blue', attack: true },
};

const TALK_LINES = {
  blueLead: [
    'Blue team is building momentum.',
    '青チームに勢いが溜まっています。',
  ],
  redLead: [
    'Red team is gaining power.',
    '赤チームが力を溜めています。',
  ],
  tie: [
    'Both sides are still balanced.',
    '両チーム拮抗しています。',
  ],
};

const CHAT_LINES = ['いけー！', '押し込め！', '守り切れ！', 'ここから逆転！', 'ナイス！'];

function clampGauge(value) {
  return Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, value));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function resolveFrontlineShift(blueValue, redValue) {
  const diff = blueValue - redValue;
  if (Math.abs(diff) < 2) return 0;
  return Math.sign(diff) * Math.min(3, Math.ceil(Math.abs(diff) / 4));
}

function applyFrontlineShift(grid, shift) {
  if (shift === 0) return grid;

  const width = grid[0]?.length ?? 0;
  return grid.map((row) => {
    const currentBlueWidth = row.findIndex((cell) => cell === 'red');
    const safeBlueWidth = currentBlueWidth === -1 ? width : currentBlueWidth;
    const nextBlueWidth = Math.max(1, Math.min(width - 1, safeBlueWidth + shift));
    return row.map((_, colIndex) => (colIndex < nextBlueWidth ? 'blue' : 'red'));
  });
}

function buildFlight(id, text, commandCode, target, attack, isSuperChat) {
  return { id, text, commandCode, target, attack, isSuperChat };
}

export function BattleLayout({ data = battleMockData }) {
  const [grid, setGrid] = useState(data.grid);
  const [blueGauge, setBlueGauge] = useState(0);
  const [redGauge, setRedGauge] = useState(0);
  const [superChat, setSuperChat] = useState(data.superChat);
  const [commentLog, setCommentLog] = useState([]);
  const [flyingComments, setFlyingComments] = useState([]);
  const [voiceNow, setVoiceNow] = useState('');

  const speechQueueRef = useRef([]);
  const speakingRef = useRef(false);
  const commands = useMemo(() => data.commandGuides.map((item) => item.code), [data.commandGuides]);

  const enqueueSpeech = useCallback((text, priority = 'normal') => {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

    const item = { text };
    if (priority === 'high') {
      speechQueueRef.current.unshift(item);
    } else {
      speechQueueRef.current.push(item);
    }

    const playNext = () => {
      if (speakingRef.current || speechQueueRef.current.length === 0) return;
      const next = speechQueueRef.current.shift();
      if (!next) return;

      const utterance = new SpeechSynthesisUtterance(next.text);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.onstart = () => {
        speakingRef.current = true;
        setVoiceNow(next.text);
      };
      utterance.onend = () => {
        speakingRef.current = false;
        setVoiceNow('');
        playNext();
      };
      utterance.onerror = () => {
        speakingRef.current = false;
        setVoiceNow('');
        playNext();
      };

      window.speechSynthesis.speak(utterance);
    };

    playNext();
  }, []);

  const applyCommand = useCallback(
    ({ commandCode, displayText, isSuperChat = false, user = 'Live Chat', amount = '' }) => {
      const effect = COMMAND_EFFECTS[commandCode];
      const entryId = `${Date.now()}-${Math.random()}`;

      setCommentLog((prev) => [
        {
          id: entryId,
          user,
          text: displayText,
          commandCode,
          isSuperChat,
          amount,
        },
        ...prev,
      ].slice(0, 6));

      if (!effect) return;

      setBlueGauge((prev) => clampGauge(prev + effect.blueDelta));
      setRedGauge((prev) => clampGauge(prev + effect.redDelta));

      setFlyingComments((prev) => [
        ...prev,
        buildFlight(entryId, displayText, commandCode, effect.target, effect.attack, isSuperChat),
      ]);

      setTimeout(() => {
        setFlyingComments((prev) => prev.filter((item) => item.id !== entryId));
      }, 700);

      if (isSuperChat) {
        setSuperChat({ user, amount, message: displayText });
        enqueueSpeech(`${user} ${amount}. ${displayText}`, 'high');
      }
    },
    [enqueueSpeech],
  );

  useEffect(() => {
    const liveTicker = setInterval(() => {
      const commandCode = pick(commands);
      const commandMeta = data.commandGuides.find((item) => item.code === commandCode);
      const isSuperChat = Math.random() < 0.16;

      applyCommand({
        commandCode,
        displayText: `${commandCode} ${pick(CHAT_LINES)} ${commandMeta?.labelJa ?? ''}`,
        isSuperChat,
        user: isSuperChat ? pick(['Kenji', 'Mika', 'Aoi', 'Sora']) : 'Live Chat',
        amount: isSuperChat ? pick(['¥200', '¥500', '¥1,000']) : '',
      });
    }, 2200);

    return () => clearInterval(liveTicker);
  }, [applyCommand, commands, data.commandGuides]);

  useEffect(() => {
    const commentaryTicker = setInterval(() => {
      if (speakingRef.current) return;
      const linePool = blueGauge === redGauge ? TALK_LINES.tie : blueGauge > redGauge ? TALK_LINES.blueLead : TALK_LINES.redLead;
      enqueueSpeech(pick(linePool));
    }, HUD_CONFIG.commentaryIntervalMs);

    return () => clearInterval(commentaryTicker);
  }, [blueGauge, enqueueSpeech, redGauge]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleUpdateTick = useCallback(() => {
    setGrid((prev) => applyFrontlineShift(prev, resolveFrontlineShift(blueGauge, redGauge)));

    if (HUD_CONFIG.gauge.resetPerRound) {
      setBlueGauge(0);
      setRedGauge(0);
    }
  }, [blueGauge, redGauge]);

  return (
    <main className="hud-root">
      <div className="hud-stage">
        <section className="hud-topbar">
          <MatchTitle title={data.title} />
          <TopRankingPanel ranking={data.ranking} />
          <CountdownTimer intervalSeconds={ROUND_SECONDS} onUpdateTick={handleUpdateTick} />
        </section>

        <SuperChatBanner chat={superChat} durationMs={HUD_CONFIG.superChatHighlightMs} />

        <section className="panel comment-log-panel">
          <p className="comment-log-title hud-main-text">LIVE COMMENTS</p>
          <div className="comment-log-list">
            {commentLog.map((entry) => (
              <p key={entry.id} className={`comment-line ${entry.isSuperChat ? 'comment-line-super' : ''}`}>
                <strong>{entry.user}</strong>
                {entry.amount ? <span className="comment-amount">{entry.amount}</span> : null}
                <span>{entry.text}</span>
              </p>
            ))}
          </div>
        </section>

        {voiceNow ? (
          <div className="voice-status panel">
            <p className="hud-main-text">AI VOICE</p>
            <p className="hud-sub-text">{voiceNow}</p>
          </div>
        ) : null}

        <section className="hud-center">
          <TeamTank team="blue" min={GAUGE_MIN} max={GAUGE_MAX} currentValue={blueGauge} />
          <div className="hud-grid-wrap">
            <BattleGrid grid={grid} />
            <div className="flight-overlay" aria-hidden>
              {flyingComments.map((flight) => (
                <span
                  key={flight.id}
                  className={`flight-chip flight-to-${flight.target} ${flight.attack ? 'flight-attack' : ''} ${flight.isSuperChat ? 'flight-super' : ''}`}
                >
                  {flight.commandCode}
                </span>
              ))}
            </div>
          </div>
          <TeamTank team="red" min={GAUGE_MIN} max={GAUGE_MAX} currentValue={redGauge} />
        </section>

        <div className="hud-join panel">
          <p className="hud-main-text">Join by comment</p>
          <p className="hud-sub-text">コメントで参加</p>
        </div>
        <CommandBar commands={data.commandGuides} />
      </div>
    </main>
  );
}
