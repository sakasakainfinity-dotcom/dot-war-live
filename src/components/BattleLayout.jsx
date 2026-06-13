'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createDefaultLiveSettings, getModeTimeContext, getPeriodContext, normalizeLiveSettings, readLiveSettings } from '../lib/liveSettings';
import { sanitizeMatchId } from '../lib/matchId';
import { createUrlMatchSettings } from '../lib/matchUrlSettings';
import { detectCommentLanguage } from '../lib/ai/comment-language';
import { shouldUseCommentForAiReaction } from '../lib/ai/comment-filter';
import { createAiReactionQueue } from '../lib/ai/comment-reaction-queue';
import { chooseVoiceForLanguage } from '../lib/ai/comment-reaction-service';
import { buildAnnouncementContext, buildAnnouncementMessage } from '../lib/announcer/announcement-service';
import { createAnnouncementQueue, shouldScheduleAutoAnnouncement } from '../lib/announcer/announcement-scheduler';
import { BattleGrid } from './BattleGrid';
import { BgmController } from './overlay/BgmController';

const BOARD_ROWS = 10;
const BOARD_COLS = 20;
const COMMAND_EFFECTS = {
  A: { blueDelta: 1, redDelta: 0 },
  '3A': { blueDelta: 3, redDelta: 0 },
  '5A': { blueDelta: 0, redDelta: -3 },
  B: { blueDelta: 0, redDelta: 1 },
  '3B': { blueDelta: 0, redDelta: 3 },
  '5B': { blueDelta: -3, redDelta: 0 },
};

const HUD_UPDATE_RULES = {
  marathon: {
    intervalSec: 60,
    titleEn: 'NEXT UPDATE',
    titleJa: '次の更新まで',
  },
  blitz: {
    intervalSec: 20,
    titleEn: 'NEXT UPDATE',
    titleJa: '次の更新まで',
  },
};
const COMMENT_POLL_INTERVAL_MS = 60_000;
const FOOTBALL_SCORE_POLL_INTERVAL_MS = 60_000;


function formatCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function FootballScoreLine({ matchId, homeFallback = 'Left Team', awayFallback = 'Right Team' }) {
  const normalizedMatchId = `${matchId ?? ''}`.trim();
  const fallbackText = `${homeFallback} 0 - 0 ${awayFallback}`;
  const [state, setState] = useState({ status: normalizedMatchId ? 'loading' : 'idle', text: normalizedMatchId ? 'Loading score...' : fallbackText });

  useEffect(() => {
    if (!normalizedMatchId) {
      setState({ status: 'idle', text: fallbackText });
      return undefined;
    }

    let cancelled = false;
    let intervalId;

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const loadScore = async () => {
      setState((prev) => ({ status: 'loading', text: prev.status === 'success' ? prev.text : 'Loading score...' }));

      try {
        const res = await fetch(`/api/football-score?matchId=${encodeURIComponent(normalizedMatchId)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'score request failed');
        }

        const homeScore = Number.isFinite(Number(data.homeScore)) ? Number(data.homeScore) : 0;
        const awayScore = Number.isFinite(Number(data.awayScore)) ? Number(data.awayScore) : 0;
        const homeTeam = data.homeTeam || homeFallback || 'Left Team';
        const awayTeam = data.awayTeam || awayFallback || 'Right Team';

        if (!cancelled) {
          setState({ status: 'success', text: `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}` });
        }

        if (data.status === 'FINISHED') {
          stopPolling();
        }
      } catch {
        if (!cancelled) {
          setState({ status: 'error', text: fallbackText });
        }
      }
    };

    loadScore();
    intervalId = setInterval(loadScore, FOOTBALL_SCORE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [awayFallback, fallbackText, homeFallback, normalizedMatchId]);

  return <p className={`war-live-score war-live-score-${state.status}`}>{state.text}</p>;
}

function resolveHudMode(settings) {
  if (settings?.gameMode === 'marathon' || settings?.gameMode === 'blitz') return settings.gameMode;
  const startMs = new Date(settings?.startAt).getTime();
  const endMs = new Date(settings?.endAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 'marathon';
  return endMs - startMs <= 2 * 60 * 60 * 1000 ? 'blitz' : 'marathon';
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

export function BattleLayout({ initialMatchId = '', initialMatchSettings = null, initialMatchLoadState = null }) {
  const searchParams = useSearchParams();
  const urlMatchId = sanitizeMatchId(searchParams.get('matchId') || searchParams.get('roomId') || initialMatchId);
  const urlSettings = useMemo(() => createUrlMatchSettings(searchParams), [searchParams]);
  const [settings, setSettings] = useState(() => {
    if (urlMatchId) {
      if (initialMatchSettings) {
        return normalizeLiveSettings({ ...initialMatchSettings, matchId: initialMatchSettings.matchId || urlMatchId });
      }
      if (urlSettings) {
        return normalizeLiveSettings({ ...urlSettings, matchId: urlSettings.matchId || urlMatchId });
      }

      return normalizeLiveSettings({ ...createDefaultLiveSettings(), matchId: urlMatchId });
    }

    return urlSettings || readLiveSettings();
  });
  const [matchLoadState, setMatchLoadState] = useState(() => (
    initialMatchLoadState || { status: urlMatchId ? 'loading' : 'idle', message: '' }
  ));
  const [nowMs, setNowMs] = useState(Date.now());
  const [totalBalance, setTotalBalance] = useState(0);
  const [periodCommittedBalance, setPeriodCommittedBalance] = useState(0);
  const [comments, setComments] = useState([]);
  const [latestFanComments, setLatestFanComments] = useState([]);
  const [commentsAvailable, setCommentsAvailable] = useState(false);
  const [updateCycleStartedAtMs, setUpdateCycleStartedAtMs] = useState(Date.now());
  const voteCooldownRef = useRef(new Map());
  const activePeriodRef = useRef(null);
  const nextPageTokenRef = useRef('');
  const seenMessageIdsRef = useRef(new Set());
  const aiQueueRef = useRef(createAiReactionQueue());
  const announcementQueueRef = useRef(createAnnouncementQueue());
  const lastAiReactionAtRef = useRef(0);
  const lastMeaningfulCommentAtRef = useRef(0);
  const periodStartedAtRef = useRef(Date.now());
  const recentCommentTimestampsRef = useRef([]);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (urlMatchId) return undefined;

    const reload = (event) => setSettings(event?.detail || readLiveSettings());
    window.addEventListener('storage', reload);
    window.addEventListener('dot-war-live:settings-updated', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('dot-war-live:settings-updated', reload);
    };
  }, [urlMatchId]);

  useEffect(() => {
    if (!urlMatchId) {
      setMatchLoadState({ status: 'idle', message: '' });
      return undefined;
    }

    let cancelled = false;
    let intervalId;

    const loadMatchSettings = async (showLoading = false) => {
      if (showLoading) setMatchLoadState({ status: 'loading', message: '試合設定を読み込み中...' });

      try {
        const res = await fetch(`/api/matches/${encodeURIComponent(urlMatchId)}`, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.match?.settings) {
          const error = new Error(data.error || '試合設定を取得できませんでした');
          error.code = data.code || '';
          throw error;
        }

        if (!cancelled) {
          setSettings(normalizeLiveSettings({ ...data.match.settings, matchId: data.match.matchId || urlMatchId }));
          setMatchLoadState({ status: 'success', message: `matchId=${data.match.matchId || urlMatchId}` });
        }
      } catch (error) {
        if (!cancelled) {
          const canUseUrlSettings = Boolean(urlSettings);
          const tableMissing = error.code === 'LIVE_MATCHES_TABLE_MISSING';
          setMatchLoadState({
            status: canUseUrlSettings && tableMissing ? 'success' : 'error',
            message: canUseUrlSettings && tableMissing
              ? `URL内のチーム名で表示中: matchId=${urlMatchId}（DB未初期化）`
              : error.message || '試合設定を取得できませんでした',
          });
        }
      }
    };

    loadMatchSettings(true);
    intervalId = setInterval(() => loadMatchSettings(false), 5000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [urlMatchId]);

  const periodContext = getPeriodContext(settings, nowMs);
  const modeTime = periodContext.modeTime ?? getModeTimeContext(settings, nowMs);
  const activePeriod = periodContext.current;
  const hudMode = resolveHudMode(settings);
  const hudRule = HUD_UPDATE_RULES[hudMode] ?? HUD_UPDATE_RULES.marathon;
  const updateCycleMs = hudRule.intervalSec * 1000;

  useEffect(() => {
    setUpdateCycleStartedAtMs(Date.now());
  }, [hudMode]);

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
      periodStartedAtRef.current = Date.now();
    }
  }, [activePeriod?.id, totalBalance]);

  useEffect(() => {
    const elapsedMs = Math.max(0, nowMs - updateCycleStartedAtMs);
    if (elapsedMs < updateCycleMs) return;
    setPeriodCommittedBalance(Math.floor(totalBalance));
    setUpdateCycleStartedAtMs(nowMs);
  }, [nowMs, totalBalance, updateCycleMs, updateCycleStartedAtMs]);

  const grid = useMemo(() => buildFrontlineGrid(Math.floor(totalBalance)), [totalBalance]);
  const liveBlueCells = useMemo(() => grid.flat().filter((cell) => cell === 'blue').length, [grid]);
  const liveRedCells = BOARD_ROWS * BOARD_COLS - liveBlueCells;
  const committedGrid = useMemo(() => buildFrontlineGrid(Math.floor(periodCommittedBalance)), [periodCommittedBalance]);
  const blueCells = useMemo(() => committedGrid.flat().filter((cell) => cell === 'blue').length, [committedGrid]);
  const redCells = BOARD_ROWS * BOARD_COLS - blueCells;

  const processAiReaction = useCallback(async (item) => {
    if (!settings.aiReplyEnabled) return;
    if (!item?.text) return;

    if (process.env.NODE_ENV !== 'production') console.log('[comment received]', { id: item.id, text: item.text });
    const detectedLanguage = detectCommentLanguage(item.text);
    if (process.env.NODE_ENV !== 'production') console.log('[detected language]', { messageId: item.id, detectedLanguage });

    const filterResult = shouldUseCommentForAiReaction(
      { ...item, userId: item?.user?.id },
      aiQueueRef.current.getFilterContext(),
    );

    if (!filterResult.ok) {
      if (process.env.NODE_ENV !== 'production') console.log('[comment skipped reason]', { messageId: item.id, reason: filterResult.reason });
      return;
    }
    if (process.env.NODE_ENV !== 'production') console.log('[comment accepted for ai reply]', { messageId: item.id, language: filterResult.detectedLanguage });

    aiQueueRef.current.markAccepted({
      userId: item?.user?.id || 'unknown',
      normalizedText: filterResult.normalizedText,
    });

    if (process.env.NODE_ENV !== 'production') console.log('[AI generation start]', { messageId: item.id });
    const res = await fetch('/api/ai/comment-reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: item.id,
        userId: item?.user?.id || 'unknown',
        userName: item?.user?.name || 'viewer',
        commentText: item.text,
        language: filterResult.detectedLanguage,
        redScore: redCells,
        blueScore: blueCells,
        periodTitle: activePeriod?.title || 'NORMAL',
        topicTitle: settings.title || `${settings.sideAName} vs ${settings.sideBName}`,
      }),
    }).catch(() => null);

    if (!res || !res.ok) {
      if (process.env.NODE_ENV !== 'production') console.log('[generation failed]', { messageId: item.id });
      return;
    }

    const data = await res.json();
    if (data.skipped || !data.result) return;
    const selectedVoice = chooseVoiceForLanguage(data.result.language);
    if (process.env.NODE_ENV !== 'production') console.log('[selected voice]', { messageId: item.id, selectedVoice });
    aiQueueRef.current.enqueueAiSpeech({ ...data.result, voice: selectedVoice });
    const next = aiQueueRef.current.getNextAiSpeech();
    if (next) {
      lastAiReactionAtRef.current = Date.now();
      if (process.env.NODE_ENV !== 'production') console.log('[AI generation success]', { messageId: item.id, reply: next.replyText });
      if (process.env.NODE_ENV !== 'production') console.log('[speech queued]', { queueSize: aiQueueRef.current.size });
    }
  }, [activePeriod?.title, blueCells, redCells, settings.aiReplyEnabled, settings.sideAName, settings.sideBName, settings.title]);

  const applyCommand = useCallback(
    ({ commandCode, user, text, amount = '', messageId = '', authorChannelId = '' }) => {
      const effect = COMMAND_EFFECTS[commandCode];
      if (!effect || !activePeriod) {
        if (!effect) {
          console.log('[youtube:ignored-comment]', {
            rawText: text,
            normalizedText: `${text ?? ''}`.trim(),
            authorChannelId: authorChannelId || user?.id || '',
            messageId,
            ignoreReason: 'invalid format',
          });
        }
        return;
      }
      const isSuperChat = commandCode.startsWith('3') || commandCode.startsWith('5');
      const userKey = user.id || `${user.platform}:${user.name}`;
      const lastVoteAt = voteCooldownRef.current.get(userKey) ?? 0;
      if (!isSuperChat && Date.now() - lastVoteAt < 15_000) {
        console.log('[youtube:ignored-comment]', {
          rawText: text,
          normalizedText: `${text ?? ''}`.trim(),
          authorChannelId: authorChannelId || user?.id || '',
          messageId,
          ignoreReason: 'already voted this turn',
        });
        return;
      }
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
        setCommentsAvailable(false);
        timer = setTimeout(poll, COMMENT_POLL_INTERVAL_MS);
        return;
      }

      const data = await res.json();
      const received = Array.isArray(data.comments) ? data.comments : [];
      setCommentsAvailable(true);
      nextPageTokenRef.current = data.nextPageToken || '';
      const freshItems = received.filter((item) => {
        if (seenMessageIdsRef.current.has(item.id)) {
          console.log('[youtube:ignored-comment]', {
            rawText: item.text,
            normalizedText: `${item.text ?? ''}`.trim(),
            authorChannelId: item?.user?.id || '',
            messageId: item.id,
            ignoreReason: 'duplicate message',
          });
          return false;
        }
        seenMessageIdsRef.current.add(item.id);
        return true;
      });

      if (freshItems.length > 0) {
        setLatestFanComments((prev) => {
          const newEntries = freshItems.map((item) => ({
            id: item.id || `${Date.now()}-${Math.random()}`,
            text: item.text || '',
            userName: item?.user?.name || '',
            createdAt: Date.now(),
          }));
          return [...newEntries, ...prev].slice(0, 4);
        });
      }

      freshItems.reverse().forEach((item) => {
        const now = Date.now();
        recentCommentTimestampsRef.current.push(now);
        recentCommentTimestampsRef.current = recentCommentTimestampsRef.current.filter((ts) => now - ts < 90_000);
        applyCommand({
          commandCode: item.commandCode,
          user: item.user,
          text: item.text,
          amount: item.amount || '',
          messageId: item.id,
          authorChannelId: item?.user?.id || '',
        });
        if ((item.text || '').replace(/\s+/g, '').length >= 10 && !item.commandCode) {
          lastMeaningfulCommentAtRef.current = Date.now();
        }
        processAiReaction(item);
      });

      timer = setTimeout(poll, COMMENT_POLL_INTERVAL_MS);
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [applyCommand, processAiReaction]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!settings.autoAnnouncementEnabled || !settings.announcementConfig?.enabled) return;
      const nowMs = Date.now();
      recentCommentTimestampsRef.current = recentCommentTimestampsRef.current.filter((ts) => nowMs - ts < 90_000);
      const scheduleCheck = shouldScheduleAutoAnnouncement({}, {
        enabled: true,
        nowMs,
        lastMeaningfulCommentAtMs: lastMeaningfulCommentAtRef.current,
        lastAiReactionAtMs: lastAiReactionAtRef.current,
        lastAnnouncementAtMs: announcementQueueRef.current.lastAnnouncementAtMs,
        nextAnnouncementAtMs: announcementQueueRef.current.nextAnnouncementAtMs,
        announcementCooldownMs: (settings.announcementConfig?.minCooldownSec || 50) * 1000,
        idleThresholdMs: (settings.announcementConfig?.intervalSec || 60) * 1000,
        recentCommentCount: recentCommentTimestampsRef.current.length,
        speechQueueBusy: aiQueueRef.current.size > 0 || announcementQueueRef.current.size > 0,
        periodStartedAtMs: periodStartedAtRef.current,
      });
      if (!scheduleCheck.ok) {
        if (process.env.NODE_ENV !== 'production') console.log('[speech dropped due to cooldown]', scheduleCheck.reason);
        return;
      }
      if (process.env.NODE_ENV !== 'production') console.log('[announcement scheduled]', { period: activePeriod?.periodKey });
      const ctx = buildAnnouncementContext({
        topicTitleJa: settings.title || `${settings.sideALabel} vs ${settings.sideBLabel}`,
        topicTitleEn: settings.title || `${settings.sideAName} vs ${settings.sideBName}`,
        currentPeriodKey: activePeriod?.periodKey,
        currentPeriodNameJa: activePeriod?.titleJa || activePeriod?.title,
        currentPeriodNameEn: activePeriod?.title,
        currentPeriodDescriptionJa: activePeriod?.descriptionJa,
        currentPeriodDescriptionEn: activePeriod?.descriptionEn,
        redScore: redCells,
        blueScore: blueCells,
        minutesLeft: Math.max(1, Math.ceil(periodContext.remainingMs / 60_000)),
        teamRedJa: settings.sideBLabel,
        teamBlueJa: settings.sideALabel,
        teamRedEn: settings.sideBName,
        teamBlueEn: settings.sideAName,
      });
      const tokyoNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
      const language = announcementQueueRef.current.chooseAnnouncementLanguage(tokyoNow);
      if (process.env.NODE_ENV !== 'production') console.log('[announcement language selected]', language);
      const category = announcementQueueRef.current.chooseAnnouncementCategory();
      if (process.env.NODE_ENV !== 'production') console.log('[announcement category selected]', category);
      const message = buildAnnouncementMessage(ctx, language, category, announcementQueueRef.current.recentTemplateKeys);
      announcementQueueRef.current.enqueueAnnouncementSpeech(message);
      const next = announcementQueueRef.current.getNextAnnouncementToPlay();
      if (next) {
        if (process.env.NODE_ENV !== 'production') console.log('[speech queued]', next);
        if (process.env.NODE_ENV !== 'production') console.log('[announcement played]', next.id);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [activePeriod?.descriptionEn, activePeriod?.descriptionJa, activePeriod?.periodKey, activePeriod?.title, activePeriod?.titleJa, blueCells, periodContext.remainingMs, redCells, settings.announcementConfig?.enabled, settings.announcementConfig?.intervalSec, settings.announcementConfig?.minCooldownSec, settings.autoAnnouncementEnabled, settings.sideAName, settings.sideALabel, settings.sideBName, settings.sideBLabel, settings.title]);

  const blueVotes = comments.filter((comment) => ['A', '3A', '5A'].includes(comment.commandCode)).length;
  const redVotes = comments.filter((comment) => ['B', '3B', '5B'].includes(comment.commandCode)).length;
  const blueBlasts = comments.filter((comment) => comment.commandCode === '5A').length;
  const redBlasts = comments.filter((comment) => comment.commandCode === '5B').length;

  const updateCountdownMs = Math.max(0, updateCycleMs - Math.max(0, nowMs - updateCycleStartedAtMs));
  const updateRemain = formatCountdown(updateCountdownMs);
  const periodRemain = modeTime.label;
  const isUpdateUrgent = updateCountdownMs <= 5000;
  const showUpdateCountdown = settings.mode !== 'soccer';

  return (
    <main className="hud-root">
      <BgmController settings={settings} currentPeriod={activePeriod} />
      <div className="hud-stage war-stage">
        <header className="war-header panel">
          <div className="war-title-block">
            <FootballScoreLine matchId={settings.footballMatchId} homeFallback={settings.sideAName} awayFallback={settings.sideBName} />
            <p className="war-title-ja"><span className="team-blue">A: {settings.sideALabel}</span><span className="team-vs"> / </span><span className="team-red">B: {settings.sideBLabel}</span></p>
            {urlMatchId ? <p className={`war-status-sub-ja${matchLoadState.status === 'error' ? ' match-load-error' : ''}`}>{matchLoadState.message}</p> : null}
          </div>
          <div className="war-status-block">
            <p className="war-status-period">{periodRemain}</p>
            {showUpdateCountdown ? <p className={`war-status-next${isUpdateUrgent ? ' war-status-next-urgent' : ''}`}>{`update ${updateRemain}`}</p> : null}
          </div>
        </header>

        <section className="battle-zone">
          <section className="battle-main panel">
            <div className="team-side-label team-side-left">{settings.sideAName}</div>
            <div className="team-side-label team-side-right">{settings.sideBName}</div>
            <BattleGrid grid={grid} />
          </section>

          <aside className="panel live-comment-panel" aria-label="YouTube live comment preview">
            <p className="live-comment-kicker">LIVE COMMENT</p>
            <div className="live-comment-list">
              {latestFanComments.length > 0 ? latestFanComments.slice().reverse().map((comment) => (
                <div className="live-comment-item" key={comment.id}>
                  {comment.userName ? <p className="live-comment-author">{comment.userName}</p> : null}
                  <p className="live-comment-text">{comment.text}</p>
                </div>
              )) : (
                <p className="live-comment-empty">{commentsAvailable ? 'コメントを表示' : '取得してきた\nコメントを表示'}</p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
