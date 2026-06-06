import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeFootballMatchScore, pickAvailableScore } from '../src/lib/footballScore.js';

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
