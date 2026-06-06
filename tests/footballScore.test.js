import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildWorldCupMatchesEndpoint, normalizeFootballMatchCandidates, normalizeFootballMatchScore, pickAvailableScore } from '../src/lib/footballScore.js';

test('pickAvailableScore uses fullTime score when available', () => {
  assert.deepEqual(
    pickAvailableScore({
      fullTime: { home: 2, away: 1 },
      regularTime: { home: 1, away: 1 },
      halfTime: { home: 0, away: 0 },
    }),
    { homeScore: 2, awayScore: 1 },
  );
});

test('pickAvailableScore falls back to regularTime, halfTime, and 0-0', () => {
  assert.deepEqual(pickAvailableScore({ fullTime: { home: null, away: null }, regularTime: { home: 1, away: 0 } }), { homeScore: 1, awayScore: 0 });
  assert.deepEqual(pickAvailableScore({ fullTime: { home: null, away: null }, regularTime: { home: null, away: null }, halfTime: { home: 0, away: 1 } }), { homeScore: 0, awayScore: 1 });
  assert.deepEqual(pickAvailableScore({ fullTime: { home: null, away: null }, halfTime: { home: null, away: null } }), { homeScore: 0, awayScore: 0 });
});

test('normalizeFootballMatchScore returns team names, score, and status', () => {
  assert.deepEqual(
    normalizeFootballMatchScore({
      homeTeam: { name: 'Brighton' },
      awayTeam: { name: 'Chelsea' },
      score: { fullTime: { home: 1, away: 0 } },
      status: 'IN_PLAY',
    }),
    { homeTeam: 'Brighton', awayTeam: 'Chelsea', homeScore: 1, awayScore: 0, status: 'IN_PLAY' },
  );
});

test('normalizeFootballMatchCandidates returns searchable admin match options', () => {
  assert.deepEqual(
    normalizeFootballMatchCandidates([
      {
        id: 497410,
        utcDate: '2026-06-06T19:00:00Z',
        competition: { name: 'Premier League' },
        homeTeam: { name: 'Arsenal' },
        awayTeam: { name: 'Chelsea' },
        score: { fullTime: { home: null, away: null }, halfTime: { home: 0, away: 0 } },
        status: 'SCHEDULED',
      },
      { utcDate: '2026-06-06T20:00:00Z' },
    ]),
    [
      {
        id: 497410,
        utcDate: '2026-06-06T19:00:00Z',
        competition: 'Premier League',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        homeScore: 0,
        awayScore: 0,
        status: 'SCHEDULED',
      },
    ],
  );
});

test('buildWorldCupMatchesEndpoint targets only FIFA World Cup over a 10 day window', () => {
  const { endpoint, dateTo } = buildWorldCupMatchesEndpoint('2026-06-06');

  assert.equal(endpoint.pathname, '/v4/competitions/WC/matches');
  assert.equal(endpoint.searchParams.get('dateFrom'), '2026-06-06');
  assert.equal(endpoint.searchParams.get('dateTo'), '2026-06-16');
  assert.equal(dateTo, '2026-06-16');
});
