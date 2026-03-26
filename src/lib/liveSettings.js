export const LIVE_SETTINGS_STORAGE_KEY = 'dot-war-live-settings-v2';

function startOfNextHour() {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

function makePeriod(baseStartAt, hourOffset, name, bonusType, overlayText, overrides = {}) {
  const startAt = new Date(baseStartAt.getTime() + hourOffset * 60 * 60 * 1000);
  const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000);
  return {
    id: `${hourOffset}-${name}`,
    sortOrder: hourOffset + 1,
    name,
    description: `${name} block`,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    bonusType,
    bonusValue: 1,
    narrationLevel: 2,
    aiCommentMode: 'broad',
    voiceReplyEnabled: true,
    overlayText,
    ...overrides,
  };
}

export function createDefaultLiveSettings() {
  const startAt = startOfNextHour();
  const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
  return {
    streamDate: startAt.toISOString().slice(0, 10),
    title: 'Dot War Live 24H Frontline',
    theme: 'いつ来ても何か起きる24時間大戦',
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    autoNarrationEnabled: true,
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
    voiceConfig: {
      enabled: true,
      speed: 1,
      volume: 0.85,
      maxSeconds: 8,
      summarizeLongText: true,
    },
    periods: [
      makePeriod(startAt, 0, '通常戦', 'standard', 'NOW: 通常戦 / NEXT BONUS IN countdown'),
      makePeriod(startAt, 3, '爆弾強化タイム', 'bomb_boost', '爆弾ダメージ増加', { bonusValue: 1.5, narrationLevel: 3 }),
      makePeriod(startAt, 6, '中央突破ボーナス', 'center_break', '中央突破で得点2倍', { bonusValue: 2, aiCommentMode: 'normal' }),
      makePeriod(startAt, 9, '壁多めステージ', 'wall_defense', '守備ライン強化', { voiceReplyEnabled: false }),
      makePeriod(startAt, 12, '得点2倍タイム', 'double_score', '得点2倍', { bonusValue: 2, aiCommentMode: 'normal' }),
      makePeriod(startAt, 15, '深夜静音モード', 'night_silent', '静音運用 / 返信控えめ', { voiceReplyEnabled: false, aiCommentMode: 'strict', narrationLevel: 1 }),
      makePeriod(startAt, 18, 'ゴールデン激戦タイム', 'golden_rush', 'コメント参加ボーナス', { bonusValue: 1.8, aiCommentMode: 'broad', narrationLevel: 4 }),
      makePeriod(startAt, 21, 'ラストスパート', 'last_spurt', '最終3時間ボーナス', { bonusValue: 2.2, aiCommentMode: 'strict', narrationLevel: 5 }),
    ],
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

function normalizePeriod(period, index, fallbackStartAt, fallbackEndAt) {
  const base = {
    id: `period-${index + 1}`,
    sortOrder: index + 1,
    name: `Period ${index + 1}`,
    description: '',
    startAt: fallbackStartAt,
    endAt: fallbackEndAt,
    bonusType: 'standard',
    bonusValue: 1,
    narrationLevel: 2,
    aiCommentMode: 'broad',
    voiceReplyEnabled: true,
    overlayText: '',
  };

  return {
    id: `${period?.id ?? base.id}`,
    sortOrder: normalizeNumber(period?.sortOrder, base.sortOrder, 1, 99),
    name: `${period?.name ?? base.name}`.trim() || base.name,
    description: `${period?.description ?? base.description}`.trim(),
    startAt: normalizeDate(period?.startAt, base.startAt),
    endAt: normalizeDate(period?.endAt, base.endAt),
    bonusType: `${period?.bonusType ?? base.bonusType}`.trim() || base.bonusType,
    bonusValue: normalizeNumber(period?.bonusValue, base.bonusValue, 0.5, 5, 2),
    narrationLevel: normalizeNumber(period?.narrationLevel, base.narrationLevel, 0, 5),
    aiCommentMode: ['broad', 'normal', 'strict'].includes(period?.aiCommentMode) ? period.aiCommentMode : base.aiCommentMode,
    voiceReplyEnabled: normalizeBoolean(period?.voiceReplyEnabled, base.voiceReplyEnabled),
    overlayText: `${period?.overlayText ?? base.overlayText}`.trim(),
  };
}

export function normalizeLiveSettings(raw) {
  const fallback = createDefaultLiveSettings();
  const startAt = normalizeDate(raw?.startAt, fallback.startAt);
  const endAt = normalizeDate(raw?.endAt, fallback.endAt);
  const safePeriods = (Array.isArray(raw?.periods) ? raw.periods : fallback.periods)
    .slice(0, 24)
    .map((period, index) => normalizePeriod(period, index, startAt, endAt))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    streamDate: `${raw?.streamDate ?? fallback.streamDate}`,
    title: `${raw?.title ?? fallback.title}`.trim() || fallback.title,
    theme: `${raw?.theme ?? fallback.theme}`.trim() || fallback.theme,
    startAt,
    endAt,
    autoNarrationEnabled: normalizeBoolean(raw?.autoNarrationEnabled, fallback.autoNarrationEnabled),
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
    voiceConfig: {
      enabled: normalizeBoolean(raw?.voiceConfig?.enabled, fallback.voiceConfig.enabled),
      speed: normalizeNumber(raw?.voiceConfig?.speed, fallback.voiceConfig.speed, 0.6, 1.5, 2),
      volume: normalizeNumber(raw?.voiceConfig?.volume, fallback.voiceConfig.volume, 0, 1, 2),
      maxSeconds: normalizeNumber(raw?.voiceConfig?.maxSeconds, fallback.voiceConfig.maxSeconds, 2, 20),
      summarizeLongText: normalizeBoolean(raw?.voiceConfig?.summarizeLongText, fallback.voiceConfig.summarizeLongText),
    },
    periods: safePeriods.length > 0 ? safePeriods : fallback.periods,
  };
}

export function readLiveSettings() {
  if (typeof window === 'undefined') {
    return createDefaultLiveSettings();
  }

  const stored = window.localStorage.getItem(LIVE_SETTINGS_STORAGE_KEY);
  if (!stored) {
    const defaults = createDefaultLiveSettings();
    window.localStorage.setItem(LIVE_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(stored);
    return normalizeLiveSettings(parsed);
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

export function getActivePeriod(settings, nowMs = Date.now()) {
  const periods = settings?.periods ?? [];
  const found = periods.find((period) => {
    const start = new Date(period.startAt).getTime();
    const end = new Date(period.endAt).getTime();
    return nowMs >= start && nowMs < end;
  });
  return found ?? periods[0] ?? null;
}

export function getNextPeriod(settings, nowMs = Date.now()) {
  const periods = settings?.periods ?? [];
  return (
    periods
      .filter((period) => new Date(period.startAt).getTime() > nowMs)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null
  );
}
