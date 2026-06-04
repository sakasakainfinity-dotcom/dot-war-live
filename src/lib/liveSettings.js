export const LIVE_SETTINGS_STORAGE_KEY = 'fan-war-live-settings-v3';
export const PERIOD_TOTAL_COUNT = 48;
export const PERIOD_CYCLE_SIZE = 6;

const FIXED_PERIOD_SLOTS = [
  { slotKey: 'normal_1', periodKey: 'normal', title: 'NORMAL', titleJa: '通常', descriptionEn: 'Standard A/B battle rules.', descriptionJa: 'A/B投票の通常ルールです。', bgmTrackId: 'normal1', announcementStyle: 'normal' },
  { slotKey: 'double_vote', periodKey: 'double_vote', title: 'DOUBLE VOTE', titleJa: 'ダブル投票', descriptionEn: 'A/B votes count as double.', descriptionJa: 'A/B投票が2倍で反映されます。', bgmTrackId: 'double', announcementStyle: 'exciting' },
  { slotKey: 'central_bonus', periodKey: 'central_bonus', title: 'CENTRAL BONUS', titleJa: '中央ボーナス', descriptionEn: 'Break through the center for bonus points.', descriptionJa: '中央突破でボーナスが入ります。', bgmTrackId: 'bonus', announcementStyle: 'tense' },
  { slotKey: 'normal_2', periodKey: 'normal', title: 'NORMAL', titleJa: '通常', descriptionEn: 'Standard A/B battle rules.', descriptionJa: 'A/B投票の通常ルールです。', bgmTrackId: 'normal2', announcementStyle: 'normal' },
  { slotKey: 'ai_random', periodKey: 'ai_random', title: 'AI RANDOM', titleJa: 'AIランダム', descriptionEn: 'AI may trigger a random event.', descriptionJa: 'AIがランダムイベントを発動します。', bgmTrackId: 'random', announcementStyle: 'exciting' },
  { slotKey: 'random_bomb', periodKey: 'random_bomb', title: 'RANDOM BOMB', titleJa: 'ランダム爆弾', descriptionEn: 'Bomb comments may blast either side.', descriptionJa: '爆弾コメントでどちらかがランダム爆破されます。', bgmTrackId: 'bomb', announcementStyle: 'final' },
];

const MODE_COPY = {
  soccer: {
    statusTitleEn: 'SOCCER FAN WAR',
    statusTitleJa: 'サッカーモード',
    descriptionEn: 'Comment A or B to support your team.',
    descriptionJa: 'A or Bで応援チームに投票！',
    timerPrefix: '',
  },
  war: {
    statusTitleEn: 'A/B FAN WAR',
    statusTitleJa: '2択戦争モード',
    descriptionEn: 'Comment A or B to join the war.',
    descriptionJa: 'A or Bであなたの派閥に投票！',
    timerPrefix: '決着まで',
  },
  consultation: {
    statusTitleEn: 'A/B CONSULTATION',
    statusTitleJa: '2択相談モード',
    descriptionEn: 'Comment A or B to vote your opinion.',
    descriptionJa: 'A or Bで意見を投票！',
    timerPrefix: '相談終了まで',
  },
};

function startOfNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

const MODE_VALUES = ['soccer', 'war', 'consultation'];

function makeDefaultPeriodDefinitions() {
  return FIXED_PERIOD_SLOTS.map((slot, index) => ({
    id: slot.slotKey,
    slotIndex: index,
    periodKey: slot.periodKey,
    title: slot.title,
    titleJa: slot.titleJa,
    descriptionEn: slot.descriptionEn,
    descriptionJa: slot.descriptionJa,
    bgmTrackId: slot.bgmTrackId,
    announcementStyle: slot.announcementStyle,
    enabled: true,
  }));
}

export function createDefaultModeProfile(mode, anchorStartAt) {
  const startAt = anchorStartAt ? new Date(anchorStartAt) : startOfNextHour();
  const safeStartAt = Number.isNaN(startAt.getTime()) ? startOfNextHour() : startAt;
  const startIso = safeStartAt.toISOString();

  if (mode === 'soccer') {
    const endAt = new Date(safeStartAt.getTime() + 115 * 60 * 1000).toISOString();
    return {
      mode: 'soccer',
      title: 'BLUE FC vs RED FC',
      sideAName: 'BLUE FC',
      sideBName: 'RED FC',
      sideALabel: 'BLUE',
      sideBLabel: 'RED',
      sideADescription: '青チーム',
      sideBDescription: '赤チーム',
      soccerTeamAEmoji: '🔵',
      soccerTeamBEmoji: '🔴',
      competitionName: '',
      consultationBody: '',
      durationMinutes: 115,
      soccerFirstHalfMinutes: 50,
      soccerHalfTimeMinutes: 15,
      soccerSecondHalfMinutes: 50,
      currentPhase: 'first_half',
      streamDate: startIso.slice(0, 10),
      startAt: startIso,
      endAt,
      periodDefinitions: makeDefaultPeriodDefinitions(),
    };
  }

  if (mode === 'consultation') {
    const endAt = new Date(safeStartAt.getTime() + 60 * 60 * 1000).toISOString();
    return {
      mode: 'consultation',
      title: '相談タイトル',
      sideAName: 'A案',
      sideBName: 'B案',
      sideALabel: 'A案',
      sideBLabel: 'B案',
      sideADescription: 'A案の説明',
      sideBDescription: 'B案の説明',
      soccerTeamAEmoji: '🔵',
      soccerTeamBEmoji: '🔴',
      competitionName: '',
      consultationBody: '',
      durationMinutes: 60,
      soccerFirstHalfMinutes: 50,
      soccerHalfTimeMinutes: 15,
      soccerSecondHalfMinutes: 50,
      currentPhase: 'active',
      streamDate: startIso.slice(0, 10),
      startAt: startIso,
      endAt,
      periodDefinitions: makeDefaultPeriodDefinitions(),
    };
  }

  const endAt = new Date(safeStartAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return {
    mode: 'war',
    title: 'CITY vs COUNTRY',
    sideAName: 'CITY',
    sideBName: 'COUNTRY',
    sideALabel: 'CITY',
    sideBLabel: 'COUNTRY',
    sideADescription: '都会派',
    sideBDescription: '田舎派',
    soccerTeamAEmoji: '🔵',
    soccerTeamBEmoji: '🔴',
    competitionName: '',
    consultationBody: '',
    durationMinutes: 24 * 60,
    soccerFirstHalfMinutes: 50,
    soccerHalfTimeMinutes: 15,
    soccerSecondHalfMinutes: 50,
    currentPhase: 'active',
    streamDate: startIso.slice(0, 10),
    startAt: startIso,
    endAt,
    periodDefinitions: makeDefaultPeriodDefinitions(),
  };
}

function createBaseDefaultLiveSettings() {
  const profile = createDefaultModeProfile('war');

  return {
    ...profile,
    teamA_en: profile.sideAName,
    teamB_en: profile.sideBName,
    teamA_ja: '都会',
    teamB_ja: '田舎',
    autoNarrationEnabled: true,
    autoAnnouncementEnabled: true,
    aiReplyEnabled: true,
    voiceReplyEnabled: true,
    autoPostXEnabled: false,
    autoPostThreadsEnabled: false,
    replyConfig: {
      mode: 'broad',
      frequencyLimitPerMinute: 8,
      sameUserCooldownMs: 120000,
      minLength: 5,
      maxLength: 120,
      paidPriority: 35,
      strategyPriority: 20,
      battlePriority: 12,
      funnyPriority: 10,
      voiceIntervalMs: 35000,
    },
    announcementConfig: {
      enabled: true,
      intervalSec: 480,
      minCooldownSec: 420,
      languageMode: 'ja_en_alternate',
    },
    bgmConfig: {
      enabled: true,
      muted: false,
      volume: 0.35,
    },
    voiceConfig: {
      enabled: true,
      speed: 1,
      volume: 0.85,
      maxSeconds: 8,
      summarizeLongText: true,
    },
  };
}

export function createDefaultLiveSettings() {
  const defaults = createBaseDefaultLiveSettings();
  return {
    ...defaults,
    modeProfiles: MODE_VALUES.reduce((profiles, mode) => ({
      ...profiles,
      [mode]: normalizeModeProfile(createDefaultModeProfile(mode, defaults.startAt), mode),
    }), {}),
  };
}

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeNumber(value, fallback, min, max, digits = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const clipped = Math.max(min, Math.min(max, num));
  return digits > 0 ? Number(clipped.toFixed(digits)) : Math.floor(clipped);
}

function normalizeDate(value, fallback) {
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? fallback : dt.toISOString();
}

function normalizePeriodDefinition(rawDefinition, fallbackDefinition, index) {
  return {
    id: fallbackDefinition.id,
    slotIndex: index,
    periodKey: fallbackDefinition.periodKey,
    title: `${rawDefinition?.title ?? fallbackDefinition.title}`.trim() || fallbackDefinition.title,
    titleJa: `${rawDefinition?.titleJa ?? fallbackDefinition.titleJa ?? fallbackDefinition.title}`.trim() || fallbackDefinition.title,
    descriptionEn: `${rawDefinition?.descriptionEn ?? fallbackDefinition.descriptionEn}`.trim() || fallbackDefinition.descriptionEn,
    descriptionJa: `${rawDefinition?.descriptionJa ?? fallbackDefinition.descriptionJa}`.trim() || fallbackDefinition.descriptionJa,
    bgmTrackId: `${rawDefinition?.bgmTrackId ?? fallbackDefinition.bgmTrackId ?? fallbackDefinition.id}`.trim() || fallbackDefinition.id,
    announcementStyle: `${rawDefinition?.announcementStyle ?? fallbackDefinition.announcementStyle ?? 'normal'}`.trim() || 'normal',
    enabled: normalizeBoolean(rawDefinition?.enabled, true),
  };
}

function normalizeText(value, fallback) {
  return `${value ?? fallback}`.trim() || fallback;
}


export function normalizeModeProfile(raw, mode, anchorStartAt) {
  const fallback = createDefaultModeProfile(mode, anchorStartAt);
  const safeMode = MODE_VALUES.includes(raw?.mode) ? raw.mode : mode;
  const startAt = normalizeDate(raw?.startAt, fallback.startAt);
  const defaultDuration = safeMode === 'consultation' ? 60 : safeMode === 'soccer' ? 115 : 24 * 60;
  const fallbackEndAt = addMinutes(startAt, defaultDuration);
  const endAt = normalizeDate(raw?.endAt, raw?.durationMinutes ? addMinutes(startAt, Number(raw.durationMinutes)) : fallbackEndAt);
  const durationMinutes = inferDurationMinutes(raw, fallback, startAt, endAt, safeMode);
  const sideAName = normalizeText(raw?.sideAName ?? raw?.teamA_en, fallback.sideAName);
  const sideBName = normalizeText(raw?.sideBName ?? raw?.teamB_en, fallback.sideBName);
  const sideALabel = normalizeText(raw?.sideALabel ?? raw?.teamA_ja ?? sideAName, sideAName);
  const sideBLabel = normalizeText(raw?.sideBLabel ?? raw?.teamB_ja ?? sideBName, sideBName);
  const rawDefinitions = Array.isArray(raw?.periodDefinitions) ? raw.periodDefinitions : [];
  const normalizedDefinitions = fallback.periodDefinitions.map((fallbackDefinition, index) => normalizePeriodDefinition(rawDefinitions[index], fallbackDefinition, index));

  return {
    mode: safeMode,
    title: normalizeText(raw?.title, `${sideAName} vs ${sideBName}`),
    sideAName,
    sideBName,
    sideALabel,
    sideBLabel,
    sideADescription: normalizeText(raw?.sideADescription, fallback.sideADescription),
    sideBDescription: normalizeText(raw?.sideBDescription, fallback.sideBDescription),
    soccerTeamAEmoji: normalizeText(raw?.soccerTeamAEmoji, fallback.soccerTeamAEmoji),
    soccerTeamBEmoji: normalizeText(raw?.soccerTeamBEmoji, fallback.soccerTeamBEmoji),
    competitionName: `${raw?.competitionName ?? fallback.competitionName}`.trim(),
    consultationBody: `${raw?.consultationBody ?? fallback.consultationBody}`.trim(),
    durationMinutes,
    soccerFirstHalfMinutes: normalizeNumber(raw?.soccerFirstHalfMinutes, fallback.soccerFirstHalfMinutes, 1, 120),
    soccerHalfTimeMinutes: normalizeNumber(raw?.soccerHalfTimeMinutes, fallback.soccerHalfTimeMinutes, 0, 60),
    soccerSecondHalfMinutes: normalizeNumber(raw?.soccerSecondHalfMinutes, fallback.soccerSecondHalfMinutes, 1, 120),
    currentPhase: normalizeText(raw?.currentPhase, safeMode === 'soccer' ? 'first_half' : 'active'),
    streamDate: `${raw?.streamDate ?? fallback.streamDate}`,
    teamA_en: sideAName,
    teamB_en: sideBName,
    teamA_ja: sideALabel,
    teamB_ja: sideBLabel,
    startAt,
    endAt,
    periodDefinitions: normalizedDefinitions,
  };
}

function addMinutes(iso, minutes) {
  const baseMs = new Date(iso).getTime();
  const safeBase = Number.isFinite(baseMs) ? baseMs : Date.now();
  return new Date(safeBase + minutes * 60 * 1000).toISOString();
}

function inferDurationMinutes(raw, fallback, startAt, endAt, mode) {
  const defaultMinutes = mode === 'consultation' ? 60 : mode === 'soccer' ? 115 : 24 * 60;
  const fromDates = Math.max(1, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
  return normalizeNumber(raw?.durationMinutes ?? fallback.durationMinutes ?? fromDates, defaultMinutes, 1, 7 * 24 * 60);
}

export function normalizeLiveSettings(raw) {
  const fallback = createBaseDefaultLiveSettings();
  const mode = MODE_VALUES.includes(raw?.mode) ? raw.mode : fallback.mode;
  const activeProfileRaw = { ...(raw?.modeProfiles?.[mode] ?? {}), ...raw, mode };
  const activeProfile = normalizeModeProfile(activeProfileRaw, mode, fallback.startAt);
  const modeProfiles = MODE_VALUES.reduce((profiles, profileMode) => {
    const profileRaw = profileMode === mode ? activeProfile : raw?.modeProfiles?.[profileMode];
    return {
      ...profiles,
      [profileMode]: normalizeModeProfile(profileRaw, profileMode, fallback.startAt),
    };
  }, {});

  modeProfiles[mode] = activeProfile;

  return {
    ...activeProfile,
    autoNarrationEnabled: normalizeBoolean(raw?.autoNarrationEnabled, fallback.autoNarrationEnabled),
    autoAnnouncementEnabled: normalizeBoolean(raw?.autoAnnouncementEnabled, fallback.autoAnnouncementEnabled),
    aiReplyEnabled: normalizeBoolean(raw?.aiReplyEnabled, fallback.aiReplyEnabled),
    voiceReplyEnabled: normalizeBoolean(raw?.voiceReplyEnabled, fallback.voiceReplyEnabled),
    autoPostXEnabled: normalizeBoolean(raw?.autoPostXEnabled, fallback.autoPostXEnabled),
    autoPostThreadsEnabled: normalizeBoolean(raw?.autoPostThreadsEnabled, fallback.autoPostThreadsEnabled),
    replyConfig: {
      mode: ['broad', 'normal', 'strict'].includes(raw?.replyConfig?.mode) ? raw.replyConfig.mode : fallback.replyConfig.mode,
      frequencyLimitPerMinute: normalizeNumber(raw?.replyConfig?.frequencyLimitPerMinute, fallback.replyConfig.frequencyLimitPerMinute, 1, 30),
      sameUserCooldownMs: normalizeNumber(raw?.replyConfig?.sameUserCooldownMs, fallback.replyConfig.sameUserCooldownMs, 5000, 600000),
      minLength: normalizeNumber(raw?.replyConfig?.minLength, fallback.replyConfig.minLength, 1, 200),
      maxLength: normalizeNumber(raw?.replyConfig?.maxLength, fallback.replyConfig.maxLength, 10, 500),
      paidPriority: normalizeNumber(raw?.replyConfig?.paidPriority, fallback.replyConfig.paidPriority, 0, 100),
      strategyPriority: normalizeNumber(raw?.replyConfig?.strategyPriority, fallback.replyConfig.strategyPriority, 0, 100),
      battlePriority: normalizeNumber(raw?.replyConfig?.battlePriority, fallback.replyConfig.battlePriority, 0, 100),
      funnyPriority: normalizeNumber(raw?.replyConfig?.funnyPriority, fallback.replyConfig.funnyPriority, 0, 100),
      voiceIntervalMs: normalizeNumber(raw?.replyConfig?.voiceIntervalMs, fallback.replyConfig.voiceIntervalMs, 5000, 120000),
    },
    announcementConfig: {
      enabled: normalizeBoolean(raw?.announcementConfig?.enabled, fallback.announcementConfig.enabled),
      intervalSec: normalizeNumber(raw?.announcementConfig?.intervalSec, fallback.announcementConfig.intervalSec, 120, 1200),
      minCooldownSec: normalizeNumber(raw?.announcementConfig?.minCooldownSec, fallback.announcementConfig.minCooldownSec, 120, 1200),
      languageMode: ['ja_only', 'en_only', 'ja_en_alternate', 'ja_then_en_same_message'].includes(raw?.announcementConfig?.languageMode) ? raw.announcementConfig.languageMode : fallback.announcementConfig.languageMode,
    },
    bgmConfig: {
      enabled: normalizeBoolean(raw?.bgmConfig?.enabled, fallback.bgmConfig.enabled),
      muted: normalizeBoolean(raw?.bgmConfig?.muted, fallback.bgmConfig.muted),
      volume: normalizeNumber(raw?.bgmConfig?.volume, fallback.bgmConfig.volume, 0, 1, 2),
    },
    voiceConfig: {
      enabled: normalizeBoolean(raw?.voiceConfig?.enabled, fallback.voiceConfig.enabled),
      speed: normalizeNumber(raw?.voiceConfig?.speed, fallback.voiceConfig.speed, 0.6, 1.5, 2),
      volume: normalizeNumber(raw?.voiceConfig?.volume, fallback.voiceConfig.volume, 0, 1, 2),
      maxSeconds: normalizeNumber(raw?.voiceConfig?.maxSeconds, fallback.voiceConfig.maxSeconds, 2, 20),
      summarizeLongText: normalizeBoolean(raw?.voiceConfig?.summarizeLongText, fallback.voiceConfig.summarizeLongText),
    },
    modeProfiles,
  };
}


export function readLiveSettings() {
  if (typeof window === 'undefined') return createDefaultLiveSettings();
  const stored = window.localStorage.getItem(LIVE_SETTINGS_STORAGE_KEY) || window.localStorage.getItem('dot-war-live-settings-v2');
  if (!stored) {
    const defaults = createDefaultLiveSettings();
    window.localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const normalized = normalizeLiveSettings(JSON.parse(stored));
    window.localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    const defaults = createDefaultLiveSettings();
    window.localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
}

export function writeLiveSettings(nextSettings) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeLiveSettings(nextSettings);
  window.localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent('dot-war-live:settings-updated', { detail: normalized }));
}

function getPeriodDurationMs(settings) {
  const startMs = new Date(settings?.startAt).getTime();
  const endMs = new Date(settings?.endAt).getTime();
  return Math.floor(Math.max(1, endMs - startMs) / PERIOD_TOTAL_COUNT);
}

function makePeriodInstance(definition, periodIndex, periodStartMs, periodEndMs) {
  return {
    id: `period-${periodIndex}`,
    periodIndex,
    slotIndex: (periodIndex - 1) % PERIOD_CYCLE_SIZE,
    periodKey: definition.periodKey,
    title: definition.title,
    titleJa: definition.titleJa || definition.title,
    descriptionEn: definition.descriptionEn,
    descriptionJa: definition.descriptionJa,
    bgmTrackId: definition.bgmTrackId || definition.id,
    announcementStyle: definition.announcementStyle || 'normal',
    enabled: definition.enabled,
    startAt: new Date(periodStartMs).toISOString(),
    endAt: new Date(periodEndMs).toISOString(),
  };
}

function makeModePeriod(settings, phase, title, titleJa, descriptionEn, descriptionJa, startMs, endMs) {
  return {
    id: `${settings.mode}-${phase}`,
    periodIndex: 1,
    slotIndex: 0,
    periodKey: 'normal',
    title,
    titleJa,
    descriptionEn,
    descriptionJa,
    bgmTrackId: 'normal1',
    announcementStyle: phase === 'full_time' || phase === 'ended' ? 'final' : 'normal',
    enabled: true,
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
  };
}

export function getModeTimeContext(settings, nowMs = Date.now()) {
  const safeSettings = normalizeLiveSettings(settings);
  const startMs = new Date(safeSettings.startAt).getTime();
  const endMs = new Date(safeSettings.endAt).getTime();
  const copy = MODE_COPY[safeSettings.mode] ?? MODE_COPY.war;

  if (safeSettings.mode === 'soccer') {
    const firstMs = safeSettings.soccerFirstHalfMinutes * 60_000;
    const halfMs = safeSettings.soccerHalfTimeMinutes * 60_000;
    const secondMs = safeSettings.soccerSecondHalfMinutes * 60_000;
    const elapsed = Math.max(0, nowMs - startMs);

    if (nowMs < startMs) {
      return { phase: 'pre_match', label: `${formatKickoffTime(startMs)} KICK OFF`, remainingMs: startMs - nowMs, elapsedMs: 0, statusText: 'KICK OFF', displayIndex: 0 };
    }
    if (elapsed < firstMs) {
      return { phase: 'first_half', label: `前半 残り ${formatClock(firstMs - elapsed)}`, remainingMs: firstMs - elapsed, elapsedMs: elapsed, statusText: copy.statusTitleEn, displayIndex: 1 };
    }
    if (elapsed < firstMs + halfMs) {
      const remaining = firstMs + halfMs - elapsed;
      return { phase: 'half_time', label: `ハーフタイム 残り ${formatClock(remaining)}`, remainingMs: remaining, elapsedMs: elapsed - firstMs, statusText: 'HALF TIME', displayIndex: 2 };
    }
    if (elapsed < firstMs + halfMs + secondMs) {
      const secondElapsed = elapsed - firstMs - halfMs;
      const secondRemaining = firstMs + halfMs + secondMs - elapsed;
      return { phase: 'second_half', label: `後半 残り ${formatClock(secondRemaining)}`, remainingMs: secondRemaining, elapsedMs: secondElapsed, statusText: copy.statusTitleEn, displayIndex: 3 };
    }
    return { phase: 'full_time', label: 'FULL TIME', remainingMs: 0, elapsedMs: secondMs, statusText: 'FULL TIME', displayIndex: 4 };
  }

  const consultationEndMs = safeSettings.mode === 'consultation' ? startMs + 60 * 60_000 : endMs;
  const remainingMs = Math.max(0, consultationEndMs - nowMs);
  const phase = remainingMs > 0 ? 'active' : 'ended';
  const countdownText = safeSettings.mode === 'consultation' ? formatClock(remainingMs) : formatLongCountdown(remainingMs);
  const label = phase === 'ended' ? (safeSettings.mode === 'consultation' ? '相談終了' : '決着') : `${copy.timerPrefix} ${countdownText}`;
  return { phase, label, remainingMs, elapsedMs: Math.max(0, nowMs - startMs), statusText: copy.statusTitleEn, displayIndex: 1 };
}

function formatKickoffTime(ms) {
  const date = new Date(ms);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatClock(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function formatLongCountdown(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function getPeriodContext(settings, nowMs = Date.now()) {
  const safeSettings = normalizeLiveSettings(settings);

  if (safeSettings.mode === 'soccer') {
    const modeTime = getModeTimeContext(safeSettings, nowMs);
    const copy = MODE_COPY.soccer;
    const startMs = new Date(safeSettings.startAt).getTime();
    const matchEndMs = startMs + (safeSettings.soccerFirstHalfMinutes + safeSettings.soccerHalfTimeMinutes + safeSettings.soccerSecondHalfMinutes) * 60_000;
    const current = makeModePeriod(safeSettings, modeTime.phase, modeTime.statusText, copy.statusTitleJa, copy.descriptionEn, copy.descriptionJa, startMs, matchEndMs);
    return { currentPeriodIndex: modeTime.displayIndex, nextPeriodIndex: modeTime.displayIndex, current, next: current, periodDurationMs: Math.max(1, matchEndMs - startMs), remainingMs: modeTime.remainingMs, modeTime };
  }

  if (safeSettings.mode === 'consultation') {
    const modeTime = getModeTimeContext(safeSettings, nowMs);
    const copy = MODE_COPY.consultation;
    const startMs = new Date(safeSettings.startAt).getTime();
    const endMs = startMs + 60 * 60_000;
    const current = makeModePeriod(safeSettings, modeTime.phase, modeTime.statusText, copy.statusTitleJa, copy.descriptionEn, copy.descriptionJa, startMs, endMs);
    return { currentPeriodIndex: 1, nextPeriodIndex: 1, current, next: current, periodDurationMs: Math.max(1, endMs - startMs), remainingMs: modeTime.remainingMs, modeTime };
  }

  const startMs = new Date(safeSettings.startAt).getTime();
  const durationMs = getPeriodDurationMs(safeSettings);
  const elapsed = nowMs - startMs;
  const rawIndex = elapsed < 0 ? 1 : Math.floor(elapsed / durationMs) + 1;
  const currentPeriodIndex = Math.max(1, Math.min(PERIOD_TOTAL_COUNT, rawIndex));
  const nextPeriodIndex = currentPeriodIndex === PERIOD_TOTAL_COUNT ? 1 : currentPeriodIndex + 1;

  const currentDef = safeSettings.periodDefinitions[(currentPeriodIndex - 1) % PERIOD_CYCLE_SIZE];
  const nextDef = safeSettings.periodDefinitions[(nextPeriodIndex - 1) % PERIOD_CYCLE_SIZE];

  const currentStartMs = startMs + (currentPeriodIndex - 1) * durationMs;
  const currentEndMs = currentStartMs + durationMs;
  const remainingMs = nowMs < currentStartMs ? durationMs : Math.max(0, currentEndMs - nowMs);
  const modeTime = getModeTimeContext(safeSettings, nowMs);

  return {
    currentPeriodIndex,
    nextPeriodIndex,
    current: makePeriodInstance(currentDef, currentPeriodIndex, currentStartMs, currentEndMs),
    next: makePeriodInstance(nextDef, nextPeriodIndex, currentEndMs, currentEndMs + durationMs),
    periodDurationMs: durationMs,
    remainingMs,
    modeTime,
  };
}

export const getActivePeriod = (settings, nowMs = Date.now()) => getPeriodContext(settings, nowMs).current;
export const getNextPeriod = (settings, nowMs = Date.now()) => getPeriodContext(settings, nowMs).next;
