import { bgmTrackMap } from '../audio/bgm-tracks.js';

export const periodConfigs = [
  { key: 'normal_1', bgmTrackId: 'normal1' },
  { key: 'double_vote', bgmTrackId: 'double' },
  { key: 'central_bonus', bgmTrackId: 'bonus' },
  { key: 'normal_2', bgmTrackId: 'normal2' },
  { key: 'ai_random', bgmTrackId: 'random' },
  { key: 'random_bomb', bgmTrackId: 'bomb' },
];

const periodConfigMap = new Map(periodConfigs.map((config) => [config.key, config]));

const slotIndexKeyMap = ['normal_1', 'double_vote', 'central_bonus', 'normal_2', 'ai_random', 'random_bomb'];

function resolvePeriodKey(periodKeyOrPeriod, settings) {
  if (!periodKeyOrPeriod) return '';
  if (typeof periodKeyOrPeriod === 'string') {
    return periodKeyOrPeriod;
  }

  if (periodKeyOrPeriod.key) return periodKeyOrPeriod.key;
  if (periodKeyOrPeriod.bgmTrackId) return periodKeyOrPeriod.bgmTrackId;
  if (typeof periodKeyOrPeriod.slotIndex === 'number') {
    return slotIndexKeyMap[periodKeyOrPeriod.slotIndex] || '';
  }

  if (periodKeyOrPeriod.id) return periodKeyOrPeriod.id;
  if (periodKeyOrPeriod.periodKey && settings?.periodDefinitions) {
    const matched = settings.periodDefinitions.find((item) => item.periodKey === periodKeyOrPeriod.periodKey);
    if (matched?.id) return matched.id;
  }

  return periodKeyOrPeriod.periodKey || '';
}

export function getBgmTrackForPeriod(periodKeyOrPeriod, settings) {
  const resolvedKey = resolvePeriodKey(periodKeyOrPeriod, settings);
  const period = periodConfigMap.get(resolvedKey);
  const bgmTrackId = period?.bgmTrackId || resolvedKey;

  const track = bgmTrackMap.get(bgmTrackId);
  if (!track) {
    if (!period) {
      console.warn('[bgm] period config not found', { periodKey: resolvedKey });
    } else {
      console.warn('[bgm] track not found', { periodKey: resolvedKey, bgmTrackId });
    }
    return null;
  }

  return track;
}
