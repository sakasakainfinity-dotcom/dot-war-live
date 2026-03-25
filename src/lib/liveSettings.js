export const LIVE_SETTINGS_STORAGE_KEY = 'dot-war-live-settings-v1';

function defaultQuestions() {
  return [
    { en: 'CITY OR COUNTRY?', ja: '都会と田舎どっち？' },
    { en: 'BEST FOR FAMILY?', ja: '子育て向きは？' },
    { en: 'MORE JOB CHANCES?', ja: '仕事の機会は？' },
    { en: 'EASIER RELATIONSHIPS?', ja: '人間関係が楽なのは？' },
    { en: 'RETIREMENT: WHICH?', ja: '老後はどっち？' },
    { en: 'FINAL CHOICE?', ja: '最終的に住みたいのは？' },
  ];
}

export function createDefaultLiveSettings() {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(0, 0, 0);
  rounded.setHours(rounded.getHours() + 1);

  return {
    titleEn: 'DOG (BLUE) vs CAT (RED)',
    titleJa: '犬 vs 猫',
    blueTeamEn: 'DOG',
    blueTeamJa: '犬',
    redTeamEn: 'CAT',
    redTeamJa: '猫',
    startAt: rounded.toISOString(),
    periodDurationSec: 180,
    questions: defaultQuestions(),
  };
}

function normalizeQuestion(raw, index) {
  const fallback = defaultQuestions()[index] ?? { en: `QUESTION ${index + 1}`, ja: `質問${index + 1}` };
  if (typeof raw === 'string') {
    return { en: fallback.en, ja: raw.trim() || fallback.ja };
  }

  return {
    en: `${raw?.en ?? fallback.en}`.trim() || fallback.en,
    ja: `${raw?.ja ?? fallback.ja}`.trim() || fallback.ja,
  };
}

export function normalizeLiveSettings(raw) {
  const fallback = createDefaultLiveSettings();
  const list = Array.isArray(raw?.questions) ? raw.questions.slice(0, 6) : fallback.questions;
  const safeQuestions = list.map((q, index) => normalizeQuestion(q, index));

  while (safeQuestions.length < 6) {
    safeQuestions.push(normalizeQuestion(null, safeQuestions.length));
  }

  const periodDurationSec = Number(raw?.periodDurationSec);
  const parsedStartAt = new Date(raw?.startAt);

  return {
    titleEn: `${raw?.titleEn ?? fallback.titleEn}`.trim() || fallback.titleEn,
    titleJa: `${raw?.titleJa ?? fallback.titleJa}`.trim() || fallback.titleJa,
    blueTeamEn: `${raw?.blueTeamEn ?? fallback.blueTeamEn}`.trim() || fallback.blueTeamEn,
    blueTeamJa: `${raw?.blueTeamJa ?? fallback.blueTeamJa}`.trim() || fallback.blueTeamJa,
    redTeamEn: `${raw?.redTeamEn ?? fallback.redTeamEn}`.trim() || fallback.redTeamEn,
    redTeamJa: `${raw?.redTeamJa ?? fallback.redTeamJa}`.trim() || fallback.redTeamJa,
    startAt: Number.isNaN(parsedStartAt.getTime()) ? fallback.startAt : parsedStartAt.toISOString(),
    periodDurationSec:
      Number.isFinite(periodDurationSec) && periodDurationSec >= 10 ? Math.floor(periodDurationSec) : fallback.periodDurationSec,
    questions: safeQuestions,
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
