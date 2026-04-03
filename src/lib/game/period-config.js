import { bgmTrackMap } from '../audio/bgm-tracks.js';

export function getBgmTrackForPeriod(periodKey, settings) {
  const period = settings?.periodDefinitions?.find((item) => item.periodKey === periodKey);
  const trackId = period?.bgmTrackId || period?.id || 'normal_1';
  return bgmTrackMap.get(trackId) || bgmTrackMap.get('normal_1');
}
