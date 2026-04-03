const DEFAULT_FADE_MS = 500;

function warnLog(...args) {
  console.warn(...args);
}

function fadeTo(audio, target, durationMs = DEFAULT_FADE_MS) {
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

export function createBgmManager(settings) {
  let currentAudio = null;
  let currentFilePath = '';
  let muted = false;
  let globalVolume = Number(settings?.bgmConfig?.volume ?? 0.35);

  async function switchTrack(filePath, volume = globalVolume, loop = true) {
    if (!filePath) {
      warnLog('[bgm] filePath is empty, skip switch');
      return;
    }

    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      warnLog('[bgm] Audio API is unavailable in this environment');
      return;
    }

    if (currentAudio && currentFilePath === filePath) {
      return;
    }

    const nextAudio = new Audio(filePath);
    nextAudio.loop = loop;
    nextAudio.volume = 0;

    try {
      await nextAudio.play();
    } catch (error) {
      warnLog('[bgm] failed to play track', { filePath, error: error?.message });
      return;
    }

    const requestedVolume = Math.max(0, Math.min(1, Number(volume) || 0));
    const targetVolume = muted ? 0 : requestedVolume;
    await Promise.all([
      fadeTo(nextAudio, targetVolume, 500),
      fadeTo(currentAudio, 0, 400),
    ]);

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    currentAudio = nextAudio;
    currentFilePath = filePath;
    globalVolume = requestedVolume;
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

  return { switch: switchTrack, setBgmVolume, muteBgm, unmuteBgm };
}
