import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMatchBroadcastUrl, createUrlMatchSettings } from '../src/lib/matchUrlSettings.js';

test('buildMatchBroadcastUrl includes match id and team names in query parameters', () => {
  const url = buildMatchBroadcastUrl('https://dot-war-live.vercel.app', {
    matchId: '537328',
    mode: 'soccer',
    title: 'Japan vs Brazil',
    sideAName: 'Japan',
    sideBName: 'Brazil',
    sideALabel: '日本',
    sideBLabel: 'ブラジル',
    startAt: '2026-06-11T12:00:00.000Z',
    endAt: '2026-06-11T13:55:00.000Z',
    durationMinutes: 115,
  });

  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('matchId'), '537328');
  assert.equal(parsed.searchParams.get('mode'), 'soccer');
  assert.equal(parsed.searchParams.get('teamA'), 'Japan');
  assert.equal(parsed.searchParams.get('teamB'), 'Brazil');
  assert.equal(parsed.searchParams.get('teamALabel'), '日本');
  assert.equal(parsed.searchParams.get('teamBLabel'), 'ブラジル');
});

test('createUrlMatchSettings uses team names from URL as localStorage-independent fallback', () => {
  const settings = createUrlMatchSettings(new URLSearchParams({
    matchId: '537328',
    mode: 'soccer',
    title: 'Japan vs Brazil',
    teamA: 'Japan',
    teamB: 'Brazil',
    teamALabel: '日本',
    teamBLabel: 'ブラジル',
  }));

  assert.equal(settings.matchId, '537328');
  assert.equal(settings.mode, 'soccer');
  assert.equal(settings.title, 'Japan vs Brazil');
  assert.equal(settings.sideAName, 'Japan');
  assert.equal(settings.sideBName, 'Brazil');
  assert.equal(settings.sideALabel, '日本');
  assert.equal(settings.sideBLabel, 'ブラジル');
});
