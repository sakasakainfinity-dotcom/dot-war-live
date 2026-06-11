import { createDefaultLiveSettings, normalizeLiveSettings } from './liveSettings.js';
import { sanitizeMatchId } from './matchId.js';

const MODE_VALUES = new Set(['soccer', 'war', 'consultation']);

function firstParam(params, names) {
  for (const name of names) {
    const rawValue = typeof params?.get === 'function' ? params.get(name) : params?.[name];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value !== undefined && value !== null && `${value}`.trim()) return `${value}`.trim();
  }
  return '';
}

function optionalNumber(value) {
  if (value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function optionalIsoDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function createUrlMatchSettings(params) {
  const matchId = sanitizeMatchId(firstParam(params, ['matchId', 'roomId']));
  const sideAName = firstParam(params, ['teamA', 'sideAName', 'a']);
  const sideBName = firstParam(params, ['teamB', 'sideBName', 'b']);
  const sideALabel = firstParam(params, ['teamALabel', 'sideALabel', 'aLabel']);
  const sideBLabel = firstParam(params, ['teamBLabel', 'sideBLabel', 'bLabel']);
  const title = firstParam(params, ['title']);

  if (!matchId && !sideAName && !sideBName && !title) return null;

  const modeParam = firstParam(params, ['mode']);
  const mode = MODE_VALUES.has(modeParam) ? modeParam : undefined;
  const startAt = optionalIsoDate(firstParam(params, ['startAt']));
  const endAt = optionalIsoDate(firstParam(params, ['endAt']));
  const durationMinutes = optionalNumber(firstParam(params, ['durationMinutes']));
  const footballMatchId = firstParam(params, ['footballMatchId']);
  const competitionName = firstParam(params, ['competitionName']);
  const defaults = createDefaultLiveSettings();
  const raw = {
    ...defaults,
    matchId: matchId || defaults.matchId,
    mode: mode || defaults.mode,
    title: title || (sideAName && sideBName ? `${sideAName} vs ${sideBName}` : defaults.title),
    sideAName: sideAName || defaults.sideAName,
    sideBName: sideBName || defaults.sideBName,
    sideALabel: sideALabel || sideAName || defaults.sideALabel,
    sideBLabel: sideBLabel || sideBName || defaults.sideBLabel,
    teamA_en: sideAName || defaults.teamA_en,
    teamB_en: sideBName || defaults.teamB_en,
    teamA_ja: sideALabel || sideAName || defaults.teamA_ja,
    teamB_ja: sideBLabel || sideBName || defaults.teamB_ja,
    footballMatchId: footballMatchId || defaults.footballMatchId,
    competitionName: competitionName || defaults.competitionName,
  };

  if (startAt) raw.startAt = startAt;
  if (endAt) raw.endAt = endAt;
  if (durationMinutes !== undefined) raw.durationMinutes = durationMinutes;

  return normalizeLiveSettings(raw);
}

export function buildMatchBroadcastUrl(origin, settings) {
  if (!origin) return '';
  const normalized = normalizeLiveSettings(settings || {});
  const matchId = sanitizeMatchId(normalized.matchId);
  if (!matchId) return '';

  const params = new URLSearchParams();
  params.set('matchId', matchId);
  params.set('mode', normalized.mode);
  params.set('title', normalized.title || `${normalized.sideAName} vs ${normalized.sideBName}`);
  params.set('teamA', normalized.sideAName);
  params.set('teamB', normalized.sideBName);
  params.set('teamALabel', normalized.sideALabel || normalized.sideAName);
  params.set('teamBLabel', normalized.sideBLabel || normalized.sideBName);
  if (normalized.footballMatchId) params.set('footballMatchId', normalized.footballMatchId);
  if (normalized.competitionName) params.set('competitionName', normalized.competitionName);
  if (normalized.startAt) params.set('startAt', normalized.startAt);
  if (normalized.endAt) params.set('endAt', normalized.endAt);
  if (normalized.durationMinutes) params.set('durationMinutes', `${normalized.durationMinutes}`);

  return `${origin.replace(/\/$/, '')}/?${params.toString()}`;
}
