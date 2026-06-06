export const WORLD_CUP_COMPETITION_CODE = 'WC';
export const WORLD_CUP_SEARCH_WINDOW_DAYS = 10;
export const FALLBACK_WORLD_CUP_SOURCE = 'fallback_world_cup_2026';

const FALLBACK_WORLD_CUP_MATCHES = [
  { id: 'wc-2026-mexico-south-africa', utcDate: '2026-06-12T04:00:00.000Z', homeTeam: 'Mexico', awayTeam: 'South Africa' },
  { id: 'wc-2026-south-korea-czechia', utcDate: '2026-06-12T11:00:00.000Z', homeTeam: 'South Korea', awayTeam: 'Czechia' },
  { id: 'wc-2026-canada-bosnia-herzegovina', utcDate: '2026-06-13T04:00:00.000Z', homeTeam: 'Canada', awayTeam: 'Bosnia-Herzegovina' },
  { id: 'wc-2026-united-states-paraguay', utcDate: '2026-06-13T10:00:00.000Z', homeTeam: 'United States', awayTeam: 'Paraguay' },
  { id: 'wc-2026-qatar-switzerland', utcDate: '2026-06-14T04:00:00.000Z', homeTeam: 'Qatar', awayTeam: 'Switzerland' },
  { id: 'wc-2026-brazil-morocco', utcDate: '2026-06-14T07:00:00.000Z', homeTeam: 'Brazil', awayTeam: 'Morocco' },
  { id: 'wc-2026-haiti-scotland', utcDate: '2026-06-14T10:00:00.000Z', homeTeam: 'Haiti', awayTeam: 'Scotland' },
  { id: 'wc-2026-australia-turkey', utcDate: '2026-06-14T13:00:00.000Z', homeTeam: 'Australia', awayTeam: 'Turkey' },
  { id: 'wc-2026-germany-curacao', utcDate: '2026-06-15T02:00:00.000Z', homeTeam: 'Germany', awayTeam: 'Curaçao' },
  { id: 'wc-2026-netherlands-japan', utcDate: '2026-06-15T05:00:00.000Z', homeTeam: 'Netherlands', awayTeam: 'Japan' },
];

export function addUtcDays(date, days) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function buildWorldCupMatchesEndpoint(date) {
  const dateTo = addUtcDays(date, WORLD_CUP_SEARCH_WINDOW_DAYS);
  const endpoint = new URL(`https://api.football-data.org/v4/competitions/${WORLD_CUP_COMPETITION_CODE}/matches`);
  endpoint.searchParams.set('dateFrom', date);
  endpoint.searchParams.set('dateTo', dateTo);
  return { endpoint, dateTo };
}

export function coerceScore(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function scorePairHasAnyValue(pair) {
  return pair && (pair.home !== null && pair.home !== undefined || pair.away !== null && pair.away !== undefined);
}

export function pickAvailableScore(score = {}) {
  const candidates = [score.fullTime, score.regularTime, score.halfTime];
  const selected = candidates.find(scorePairHasAnyValue) || {};
  return {
    homeScore: coerceScore(selected.home),
    awayScore: coerceScore(selected.away),
  };
}

export function normalizeFootballMatchScore(match = {}) {
  const { homeScore, awayScore } = pickAvailableScore(match.score || {});
  return {
    homeTeam: `${match.homeTeam?.name ?? match.homeTeam ?? ''}`.trim(),
    awayTeam: `${match.awayTeam?.name ?? match.awayTeam ?? ''}`.trim(),
    homeScore,
    awayScore,
    status: match.status || '',
  };
}

export function normalizeFootballMatchCandidate(match = {}) {
  const normalizedScore = normalizeFootballMatchScore(match);
  return {
    id: match.id,
    utcDate: match.utcDate || '',
    competition: match.competition?.name || match.competition || '',
    source: match.source || 'football-data.org',
    ...normalizedScore,
  };
}

export function normalizeFootballMatchCandidates(matches = []) {
  return matches.map(normalizeFootballMatchCandidate).filter((match) => match.id !== null && match.id !== undefined);
}

export function getFallbackWorldCupMatches(dateFrom, dateTo) {
  const fromMs = Date.parse(`${dateFrom}T00:00:00.000Z`);
  const toMs = Date.parse(`${dateTo}T23:59:59.999Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return [];

  return FALLBACK_WORLD_CUP_MATCHES
    .filter((match) => {
      const matchMs = Date.parse(match.utcDate);
      return matchMs >= fromMs && matchMs <= toMs;
    })
    .map((match) => normalizeFootballMatchCandidate({
      ...match,
      competition: 'FIFA World Cup',
      status: 'SCHEDULED',
      score: { fullTime: { home: 0, away: 0 } },
      source: FALLBACK_WORLD_CUP_SOURCE,
    }));
}

export function findFallbackWorldCupMatch(matchId) {
  return getFallbackWorldCupMatches('2026-01-01', '2026-12-31').find((match) => `${match.id}` === `${matchId}`) || null;
}
