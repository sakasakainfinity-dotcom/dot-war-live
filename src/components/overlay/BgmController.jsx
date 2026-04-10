'use client';

import { useEffect, useMemo, useRef } from 'react';
import { createBgmManager } from '../../lib/audio/bgm-manager';

import { getBgmTrackForPeriod } from '../../lib/game/period-config';

function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.info(...args);
  }
}

export function BgmController({ settings, currentPeriod }) {
  const managerRef = useRef(null);
  const bgmVolume = useMemo(() => Math.max(0, Math.min(1, Number(settings?.bgmConfig?.volume ?? 0.35) || 0)), [settings?.bgmConfig?.volume]);

  useEffect(() => {
    managerRef.current = createBgmManager(settings);
    return () => {
      managerRef.current?.stop();
      managerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    manager.setVolume(bgmVolume);

    if (settings?.bgmConfig?.muted) manager.muteBgm();
    else manager.unmuteBgm();

    if (!settings?.bgmConfig?.enabled) {
      manager.stop();
    }
  }, [bgmVolume, settings?.bgmConfig?.muted, settings?.bgmConfig?.enabled]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !currentPeriod || !settings?.bgmConfig?.enabled) return;

    const track = getBgmTrackForPeriod(currentPeriod, settings);
    if (!track) {
      console.warn('[bgm] no track for current period', currentPeriod);
      return;
    }

    debugLog('[bgm] current period key:', currentPeriod?.periodKey || currentPeriod?.key || currentPeriod?.id);
    debugLog('[bgm] current track id:', track.id);
    manager.switch(track.filePath, bgmVolume, track.loop);
  }, [currentPeriod, settings, bgmVolume]);

  return null;
}
