export const WORLD_CUP_COMPETITION_CODE = 'WC';

export function buildWorldCupMatchesEndpoint(season = '') {
  const endpoint = new URL(`https://api.football-data.org/v4/competitions/${WORLD_CUP_COMPETITION_CODE}/matches`);
  const normalizedSeason = `${season ?? ''}`.trim();
  if (normalizedSeason) {
    endpoint.searchParams.set('season', normalizedSeason);
  }
  return { endpoint, season: normalizedSeason };
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
    matchday: match.matchday ?? null,
    stage: match.stage || '',
    group: match.group || '',
    competition: match.competition?.name || match.competition || '',
    source: 'football-data.org',
    ...normalizedScore,
  };
}

export function normalizeFootballMatchCandidates(matches = []) {
  return matches.map(normalizeFootballMatchCandidate).filter((match) => match.id !== null && match.id !== undefined);
}
