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
        id: 436545,
        utcDate: '2026-06-11T21:00:00Z',
        competition: { name: 'FIFA World Cup' },
        homeTeam: { name: 'Mexico' },
        awayTeam: { name: 'South Africa' },
        score: { fullTime: { home: null, away: null }, halfTime: { home: 0, away: 0 } },
        status: 'TIMED',
        matchday: 1,
        stage: 'GROUP_STAGE',
        group: 'GROUP_A',
      },
      { utcDate: '2026-06-06T20:00:00Z' },
    ]),
    [
      {
        id: 436545,
        utcDate: '2026-06-11T21:00:00Z',
        matchday: 1,
        stage: 'GROUP_STAGE',
        group: 'GROUP_A',
        competition: 'FIFA World Cup',
        source: 'football-data.org',
        homeTeam: 'Mexico',
        awayTeam: 'South Africa',
        homeScore: 0,
        awayScore: 0,
        status: 'TIMED',
      },
    ],
  );
});

test('buildWorldCupMatchesEndpoint targets FIFA World Cup and optional season', () => {
  const current = buildWorldCupMatchesEndpoint();
  assert.equal(current.endpoint.pathname, '/v4/competitions/WC/matches');
  assert.equal(current.endpoint.search, '');
  assert.equal(current.season, '');

  const withSeason = buildWorldCupMatchesEndpoint('2026');
  assert.equal(withSeason.endpoint.pathname, '/v4/competitions/WC/matches');
  assert.equal(withSeason.endpoint.searchParams.get('season'), '2026');
  assert.equal(withSeason.season, '2026');
});
