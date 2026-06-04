import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDefaultLiveSettings, normalizeLiveSettings, normalizeModeProfile } from '../src/lib/liveSettings.js';

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
