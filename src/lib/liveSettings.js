export const LIVE_SETTINGS_STORAGE_KEY = 'dot-war-live-settings-v2';
export const PERIOD_TOTAL_COUNT = 48;
export const PERIOD_CYCLE_SIZE = 6;

const FIXED_PERIOD_SLOTS = [
  { slotKey: 'normal_1', periodKey: 'normal', title: 'NORMAL', descriptionEn: 'Standard battle rules.', descriptionJa: '通常ルールのバトルです。' },
  { slotKey: 'double_vote', periodKey: 'double_vote', title: 'DOUBLE VOTE', descriptionEn: 'Votes count as double.', descriptionJa: '投票が2倍で反映されます。' },
  { slotKey: 'central_bonus', periodKey: 'central_bonus', title: 'CENTRAL BONUS', descriptionEn: 'Break through the center for bonus points.', descriptionJa: '中央突破でボーナスが入ります。' },
  { slotKey: 'normal_2', periodKey: 'normal', title: 'NORMAL', descriptionEn: 'Standard battle rules.', descriptionJa: '通常ルールのバトルです。' },
  { slotKey: 'ai_random', periodKey: 'ai_random', title: 'AI RANDOM', descriptionEn: 'AI may trigger a random event.', descriptionJa: 'AIがランダムイベントを発動します。' },
  { slotKey: 'random_bomb', periodKey: 'random_bomb', title: 'RANDOM BOMB', descriptionEn: 'Bomb comments may blast either side.', descriptionJa: '爆弾コメントでどちらかがランダム爆破されます。' },
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
    periodDefinitions: FIXED_PERIOD_SLOTS.map((slot, index) => ({
      id: slot.slotKey,
      slotIndex: index,
      periodKey: slot.periodKey,
      title: slot.title,
      descriptionEn: slot.descriptionEn,
      descriptionJa: slot.descriptionJa,
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
    descriptionEn: `${rawDefinition?.descriptionEn ?? fallbackDefinition.descriptionEn}`.trim() || fallbackDefinition.descriptionEn,
    descriptionJa: `${rawDefinition?.descriptionJa ?? fallbackDefinition.descriptionJa}`.trim() || fallbackDefinition.descriptionJa,
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
    periodDefinitions: normalizedDefinitions,
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

function getPeriodDurationMs(settings) {
  const startMs = new Date(settings?.startAt).getTime();
  const endMs = new Date(settings?.endAt).getTime();
  const totalDurationMs = Math.max(1, endMs - startMs);
  return Math.floor(totalDurationMs / PERIOD_TOTAL_COUNT);
}

function makePeriodInstance(definition, periodIndex, periodStartMs, periodEndMs) {
  return {
    id: `period-${periodIndex}`,
    periodIndex,
    slotIndex: (periodIndex - 1) % PERIOD_CYCLE_SIZE,
    periodKey: definition.periodKey,
    title: definition.title,
    descriptionEn: definition.descriptionEn,
    descriptionJa: definition.descriptionJa,
    enabled: definition.enabled,
    startAt: new Date(periodStartMs).toISOString(),
    endAt: new Date(periodEndMs).toISOString(),
  };
}

export function getPeriodContext(settings, nowMs = Date.now()) {
  const safeSettings = normalizeLiveSettings(settings);
  const definitions = safeSettings.periodDefinitions;
  const startMs = new Date(safeSettings.startAt).getTime();
  const durationMs = getPeriodDurationMs(safeSettings);

  const elapsed = nowMs - startMs;
  const rawIndex = elapsed < 0 ? 1 : Math.floor(elapsed / durationMs) + 1;
  const currentPeriodIndex = Math.max(1, Math.min(PERIOD_TOTAL_COUNT, rawIndex));
  const nextPeriodIndex = currentPeriodIndex === PERIOD_TOTAL_COUNT ? 1 : currentPeriodIndex + 1;

  const currentSlotIndex = (currentPeriodIndex - 1) % PERIOD_CYCLE_SIZE;
  const nextSlotIndex = (nextPeriodIndex - 1) % PERIOD_CYCLE_SIZE;
  const currentDef = definitions[currentSlotIndex];
  const nextDef = definitions[nextSlotIndex];

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

export function getActivePeriod(settings, nowMs = Date.now()) {
  return getPeriodContext(settings, nowMs).current;
}

export function getNextPeriod(settings, nowMs = Date.now()) {
  return getPeriodContext(settings, nowMs).next;
}
