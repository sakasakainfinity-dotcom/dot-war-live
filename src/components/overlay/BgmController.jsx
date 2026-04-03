'use client';

import { useEffect, useRef } from 'react';
import { createBgmManager } from '../../lib/audio/bgm-manager';

export function BgmController({ settings, periodKey }) {
  const managerRef = useRef(null);

  useEffect(() => {
    managerRef.current = createBgmManager(settings);
  }, [settings]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager || !periodKey || !settings?.bgmConfig?.enabled) return;
    manager.switchPeriodBgm(periodKey, settings);
  }, [periodKey, settings]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.setBgmVolume(settings?.bgmConfig?.volume ?? 0.35);
    if (settings?.bgmConfig?.muted) manager.muteBgm();
    else manager.unmuteBgm();
  }, [settings?.bgmConfig?.volume, settings?.bgmConfig?.muted]);

  return null;
}
