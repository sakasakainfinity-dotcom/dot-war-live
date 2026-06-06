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
