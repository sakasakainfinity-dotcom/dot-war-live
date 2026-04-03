'use client';

import { useEffect, useRef } from 'react';
import { createBgmManager } from '../../lib/audio/bgm-manager';

import { getBgmTrackForPeriod } from '../../lib/game/period-config';

export function BgmController({ settings, currentPeriod }) {
  const managerRef = useRef(null);

  useEffect(() => {
    managerRef.current = createBgmManager(settings);
  }, [settings]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !currentPeriod || !settings?.bgmConfig?.enabled) return;

    const track = getBgmTrackForPeriod(currentPeriod, settings);
    if (!track) {
      console.warn('[bgm] no track for current period', currentPeriod);
      return;
    }

    manager.switch(track.filePath, track.defaultVolume, track.loop);
  }, [currentPeriod, settings]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.setBgmVolume(settings?.bgmConfig?.volume ?? 0.35);
    if (settings?.bgmConfig?.muted) manager.muteBgm();
    else manager.unmuteBgm();
  }, [settings?.bgmConfig?.volume, settings?.bgmConfig?.muted]);

  return null;
}
