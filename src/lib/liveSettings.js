export const LIVE_SETTINGS_STORAGE_KEY = 'dot-war-live-settings-v1';

export function createDefaultLiveSettings() {
  const now = new Date();
  const rounded = new Date(now);
  rounded.setMinutes(0, 0, 0);
  rounded.setHours(rounded.getHours() + 1);

  return {
    title: '都会 VS 田舎',
    startAt: rounded.toISOString(),
    periodDurationSec: 180,
    questions: [
      '都会と田舎、住みやすいのはどっち？',
      '子育てしやすいのはどっち？',
      '仕事のチャンスが多いのはどっち？',
      '人間関係が楽なのはどっち？',
      '老後を過ごしたいのはどっち？',
      '最終的に住みたいのはどっち？',
    ],
  };
}

export function normalizeLiveSettings(raw) {
  const fallback = createDefaultLiveSettings();
  const safeQuestions = Array.isArray(raw?.questions)
    ? raw.questions.slice(0, 6).map((q) => `${q ?? ''}`.trim())
    : fallback.questions;

  while (safeQuestions.length < 6) {
    safeQuestions.push(`質問${safeQuestions.length + 1}`);
  }

  const periodDurationSec = Number(raw?.periodDurationSec);
  const parsedStartAt = new Date(raw?.startAt);

  return {
    title: `${raw?.title ?? fallback.title}`.trim() || fallback.title,
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
