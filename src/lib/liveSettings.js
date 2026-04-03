export const LIVE_SETTINGS_STORAGE_KEY = 'dot-war-live-settings-v2';
export const PERIOD_TOTAL_COUNT = 48;
export const PERIOD_CYCLE_SIZE = 6;

const FIXED_PERIOD_SLOTS = [
  { slotKey: 'normal_1', periodKey: 'normal', title: 'NORMAL', titleJa: '通常', descriptionEn: 'Standard battle rules.', descriptionJa: '通常ルールのバトルです。', bgmTrackId: 'normal1', announcementStyle: 'normal' },
  { slotKey: 'double_vote', periodKey: 'double_vote', title: 'DOUBLE VOTE', titleJa: 'ダブル投票', descriptionEn: 'Votes count as double.', descriptionJa: '投票が2倍で反映されます。', bgmTrackId: 'double', announcementStyle: 'exciting' },
  { slotKey: 'central_bonus', periodKey: 'central_bonus', title: 'CENTRAL BONUS', titleJa: '中央ボーナス', descriptionEn: 'Break through the center for bonus points.', descriptionJa: '中央突破でボーナスが入ります。', bgmTrackId: 'bonus', announcementStyle: 'tense' },
  { slotKey: 'normal_2', periodKey: 'normal', title: 'NORMAL', titleJa: '通常', descriptionEn: 'Standard battle rules.', descriptionJa: '通常ルールのバトルです。', bgmTrackId: 'normal2', announcementStyle: 'normal' },
  { slotKey: 'ai_random', periodKey: 'ai_random', title: 'AI RANDOM', titleJa: 'AIランダム', descriptionEn: 'AI may trigger a random event.', descriptionJa: 'AIがランダムイベントを発動します。', bgmTrackId: 'random', announcementStyle: 'exciting' },
  { slotKey: 'random_bomb', periodKey: 'random_bomb', title: 'RANDOM BOMB', titleJa: 'ランダム爆弾', descriptionEn: 'Bomb comments may blast either side.', descriptionJa: '爆弾コメントでどちらかがランダム爆破されます。', bgmTrackId: 'bomb', announcementStyle: 'final' },
];

function startOfNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

export function createDefaultLiveSettings() {
  const startAt = startOfNextHour();
  const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);

  return {
    streamDate: startAt.toISOString().slice(0, 10),
    teamA_en: 'CITY',
    teamB_en: 'COUNTRY',
    teamA_ja: '都会',
    teamB_ja: '田舎',
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
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
      intervalSec: 60,
      minCooldownSec: 50,
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
    periodDefinitions: FIXED_PERIOD_SLOTS.map((slot, index) => ({
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
    })),
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

function normalizeTeamName(value, fallback) {
  return `${value ?? fallback}`.trim() || fallback;
}

export function normalizeLiveSettings(raw) {
  const fallback = createDefaultLiveSettings();
  const startAt = normalizeDate(raw?.startAt, fallback.startAt);
  const endAt = normalizeDate(raw?.endAt, fallback.endAt);

  const rawDefinitions = Array.isArray(raw?.periodDefinitions) ? raw.periodDefinitions : [];
  const normalizedDefinitions = fallback.periodDefinitions.map((fallbackDefinition, index) => {
    const candidate = rawDefinitions[index];
    return normalizePeriodDefinition(candidate, fallbackDefinition, index);
  });

  return {
    streamDate: `${raw?.streamDate ?? fallback.streamDate}`,
    teamA_en: normalizeTeamName(raw?.teamA_en, fallback.teamA_en),
    teamB_en: normalizeTeamName(raw?.teamB_en, fallback.teamB_en),
    teamA_ja: normalizeTeamName(raw?.teamA_ja, fallback.teamA_ja),
    teamB_ja: normalizeTeamName(raw?.teamB_ja, fallback.teamB_ja),
    startAt,
    endAt,
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
      intervalSec: normalizeNumber(raw?.announcementConfig?.intervalSec, fallback.announcementConfig.intervalSec, 30, 180),
      minCooldownSec: normalizeNumber(raw?.announcementConfig?.minCooldownSec, fallback.announcementConfig.minCooldownSec, 30, 180),
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
    periodDefinitions: normalizedDefinitions,
  };
}

export function readLiveSettings() {
  if (typeof window === 'undefined') return createDefaultLiveSettings();
  const stored = window.localStorage.getItem(LIVE_SETTINGS_STORAGE_KEY);
  if (!stored) {
    const defaults = createDefaultLiveSettings();
    window.localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    return normalizeLiveSettings(JSON.parse(stored));
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

export function getPeriodContext(settings, nowMs = Date.now()) {
  const safeSettings = normalizeLiveSettings(settings);
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

  return {
    currentPeriodIndex,
    nextPeriodIndex,
    current: makePeriodInstance(currentDef, currentPeriodIndex, currentStartMs, currentEndMs),
    next: makePeriodInstance(nextDef, nextPeriodIndex, currentEndMs, currentEndMs + durationMs),
    periodDurationMs: durationMs,
    remainingMs,
  };
}

export const getActivePeriod = (settings, nowMs = Date.now()) => getPeriodContext(settings, nowMs).current;
export const getNextPeriod = (settings, nowMs = Date.now()) => getPeriodContext(settings, nowMs).next;
