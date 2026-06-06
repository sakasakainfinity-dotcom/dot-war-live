export const WORLD_CUP_COMPETITION_CODE = 'WC';
export const WORLD_CUP_SEARCH_WINDOW_DAYS = 10;

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
    homeTeam: `${match.homeTeam?.name ?? ''}`.trim(),
    awayTeam: `${match.awayTeam?.name ?? ''}`.trim(),
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
    competition: match.competition?.name || '',
    ...normalizedScore,
  };
}

export function normalizeFootballMatchCandidates(matches = []) {
  return matches.map(normalizeFootballMatchCandidate).filter((match) => match.id !== null && match.id !== undefined);
}
