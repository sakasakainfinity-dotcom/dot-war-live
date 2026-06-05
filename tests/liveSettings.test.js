import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultLiveSettings, getModeTimeContext, getPeriodContext, normalizeLiveSettings, normalizeModeProfile } from '../src/lib/liveSettings.js';

test('normalizeLiveSettings keeps mode-specific names isolated', () => {
  const defaults = createDefaultLiveSettings();
  const soccerProfile = normalizeModeProfile(
    {
      ...defaults.modeProfiles.soccer,
      title: 'SAMURAI vs SELECAO',
      sideAName: 'SAMURAI BLUE',
      sideBName: 'SELECAO',
      sideALabel: 'JPN',
      sideBLabel: 'BRA',
    },
    'soccer',
    defaults.startAt,
  );

  const savedSoccer = normalizeLiveSettings({
    ...defaults,
    ...soccerProfile,
    mode: 'soccer',
    modeProfiles: { ...defaults.modeProfiles, soccer: soccerProfile },
  });

  assert.equal(savedSoccer.title, 'SAMURAI vs SELECAO');
  assert.equal(savedSoccer.modeProfiles.soccer.sideAName, 'SAMURAI BLUE');
  assert.equal(savedSoccer.modeProfiles.war.sideAName, 'CITY');
  assert.equal(savedSoccer.modeProfiles.war.sideBName, 'COUNTRY');

  const switchedToWar = normalizeLiveSettings({
    ...savedSoccer,
    ...savedSoccer.modeProfiles.war,
    mode: 'war',
  });

  assert.equal(switchedToWar.title, 'CITY vs COUNTRY');
  assert.equal(switchedToWar.sideAName, 'CITY');
  assert.equal(switchedToWar.modeProfiles.soccer.sideAName, 'SAMURAI BLUE');
});

test('getModeTimeContext shows soccer kickoff, elapsed match clocks, and half-time countdowns', () => {
  const startAt = '2026-06-04T12:00:00.000Z';
  const settings = normalizeModeProfile({ startAt, soccerFirstHalfMinutes: 50, soccerHalfTimeMinutes: 15, soccerSecondHalfMinutes: 50 }, 'soccer', startAt);

  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T11:55:00.000Z')).label, '12:00 KICK OFF');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T12:00:00.000Z')).label, '前半 00:00');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T12:34:25.000Z')).label, '前半 34:25');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T12:50:00.000Z')).label, '前半 50:00');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T12:50:01.000Z')).label, 'ハーフタイム 残り 14:59');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T13:05:00.000Z')).label, '後半 00:00');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T13:39:25.000Z')).label, '後半 34:25');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T13:55:00.000Z')).label, '後半 50:00');
});

test('consultation mode always uses a 60 minute countdown window', () => {
  const startAt = '2026-06-04T12:00:00.000Z';
  const settings = normalizeModeProfile({ startAt, durationMinutes: 120, endAt: '2026-06-04T14:00:00.000Z' }, 'consultation', startAt);

  assert.equal(getModeTimeContext(settings, Date.parse(startAt)).label, '相談終了まで 60:00');
  assert.equal(getModeTimeContext(settings, Date.parse('2026-06-04T12:30:00.000Z')).label, '相談終了まで 30:00');
  assert.equal(getPeriodContext(settings, Date.parse(startAt)).periodDurationMs, 60 * 60_000);
});
