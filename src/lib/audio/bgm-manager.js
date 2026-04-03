import { getBgmTrackForPeriod } from '../game/period-config.js';

function devLog(...args) {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
}

export function createBgmManager(settings) {
  let currentAudio = null;
  let currentTrackId = '';
  let muted = false;
  let globalVolume = Number(settings?.bgmConfig?.volume ?? 0.35);

  function fadeTo(audio, target, durationMs = 600) {
    if (!audio) return Promise.resolve();
    const start = audio.volume;
    const startTime = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        const progress = Math.min(1, (now - startTime) / durationMs);
        audio.volume = start + (target - start) * progress;
        if (progress >= 1) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function switchPeriodBgm(periodKey, nextSettings = settings) {
    const track = getBgmTrackForPeriod(periodKey, nextSettings);
    if (!track) return;
    if (currentTrackId === track.id && currentAudio) {
      devLog('[bgm switch skipped same track]', { trackId: track.id });
      return;
    }

    const nextAudio = new Audio(track.filePath);
    nextAudio.loop = track.loop;
    nextAudio.volume = 0;

    try {
      await nextAudio.play();
      devLog('[bgm loaded]', { trackId: track.id, path: track.filePath });
    } catch (error) {
      devLog('[bgm load failed]', { trackId: track.id, error: error?.message });
      return;
    }

    const targetVolume = muted ? 0 : Math.max(0, Math.min(1, globalVolume));
    await Promise.all([fadeTo(nextAudio, targetVolume, 700), fadeTo(currentAudio, 0, 500)]);
    if (currentAudio) currentAudio.pause();
    currentAudio = nextAudio;
    currentTrackId = track.id;
    devLog('[bgm switched]', { trackId: track.id });
  }

  function setBgmVolume(volume) {
    globalVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    if (currentAudio && !muted) currentAudio.volume = globalVolume;
  }

  function muteBgm() {
    muted = true;
    if (currentAudio) currentAudio.volume = 0;
  }

  function unmuteBgm() {
    muted = false;
    if (currentAudio) currentAudio.volume = globalVolume;
  }

  return { switchPeriodBgm, setBgmVolume, muteBgm, unmuteBgm };
}
