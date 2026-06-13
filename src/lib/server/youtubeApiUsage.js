const DEFAULT_MAX_CALLS_PER_DAY = 1000;

const state = globalThis.__fanWarYoutubeApiUsage || {
  dayKey: '',
  daily: {},
  hourly: {},
  stopped: false,
  stopReason: '',
  lastHourlyLogAt: 0,
  lastDailyLogKey: '',
};
globalThis.__fanWarYoutubeApiUsage = state;

function boolEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value == null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function getDayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getHourKey(now = new Date()) {
  return now.toISOString().slice(0, 13);
}

function resetIfNeeded(now = new Date()) {
  const dayKey = getDayKey(now);
  if (state.dayKey !== dayKey) {
    state.dayKey = dayKey;
    state.daily = {};
    state.stopped = false;
    state.stopReason = '';
  }
}

function totalDailyCalls() {
  return Object.values(state.daily).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function isYoutubeApiEnabled() {
  return boolEnv('YOUTUBE_API_ENABLED', true);
}

export function isMockCommentsEnabled() {
  return boolEnv('MOCK_COMMENTS_ENABLED', false);
}

export function getMaxYoutubeApiCallsPerDay() {
  const parsed = Number(process.env.MAX_YOUTUBE_API_CALLS_PER_DAY || DEFAULT_MAX_CALLS_PER_DAY);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MAX_CALLS_PER_DAY;
}

export function recordYoutubeQuotaExceeded(method, detail = '') {
  resetIfNeeded();
  state.stopped = true;
  state.stopReason = `quotaExceeded from ${method}`;
  console.error('[youtube:api:quota-exceeded:stopped]', { method, detail, usage: getYoutubeApiUsageSnapshot() });
}

export function assertYoutubeApiCallAllowed(method) {
  resetIfNeeded();
  if (!isYoutubeApiEnabled()) {
    throw new Error(`YouTube API disabled by YOUTUBE_API_ENABLED=false; blocked ${method}`);
  }
  if (state.stopped) {
    throw new Error(`YouTube API stopped: ${state.stopReason}`);
  }
  const maxPerDay = getMaxYoutubeApiCallsPerDay();
  if (totalDailyCalls() >= maxPerDay) {
    state.stopped = true;
    state.stopReason = `MAX_YOUTUBE_API_CALLS_PER_DAY=${maxPerDay} reached`;
    throw new Error(`YouTube API daily app limit reached (${maxPerDay}); blocked ${method}`);
  }
}

export function recordYoutubeApiCall(method) {
  const now = new Date();
  resetIfNeeded(now);
  const hourKey = getHourKey(now);
  state.daily[method] = (state.daily[method] || 0) + 1;
  state.hourly[hourKey] ||= {};
  state.hourly[hourKey][method] = (state.hourly[hourKey][method] || 0) + 1;
  console.log('[youtube:api:call]', { method, dailyMethodCalls: state.daily[method], totalDailyCalls: totalDailyCalls(), maxDailyCalls: getMaxYoutubeApiCallsPerDay() });
  maybeLogYoutubeApiUsage();
}

export function maybeLogYoutubeApiUsage({ force = false } = {}) {
  const now = new Date();
  resetIfNeeded(now);
  const hourKey = getHourKey(now);
  if (force || state.lastHourlyLogAt === 0 || now.getTime() - state.lastHourlyLogAt >= 60 * 60 * 1000) {
    state.lastHourlyLogAt = now.getTime();
    console.log('[youtube:api:usage:hourly]', { hourKey, counts: state.hourly[hourKey] || {}, totalDailyCalls: totalDailyCalls(), maxDailyCalls: getMaxYoutubeApiCallsPerDay() });
  }
  if (force || state.lastDailyLogKey !== state.dayKey) {
    state.lastDailyLogKey = state.dayKey;
    console.log('[youtube:api:usage:daily]', { dayKey: state.dayKey, counts: state.daily, totalDailyCalls: totalDailyCalls(), maxDailyCalls: getMaxYoutubeApiCallsPerDay(), stopped: state.stopped, stopReason: state.stopReason });
  }
}

export function getYoutubeApiUsageSnapshot() {
  resetIfNeeded();
  return { dayKey: state.dayKey, daily: { ...state.daily }, totalDailyCalls: totalDailyCalls(), maxDailyCalls: getMaxYoutubeApiCallsPerDay(), stopped: state.stopped, stopReason: state.stopReason };
}
