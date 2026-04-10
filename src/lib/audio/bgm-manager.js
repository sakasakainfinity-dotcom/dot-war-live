const DEFAULT_FADE_MS = 500;

function warnLog(...args) {
  console.warn(...args);
}

function debugLog(...args) {
  if (process.env.NODE_ENV !== 'production') {
    console.info(...args);
  }
}

function sanitizeVolume(volume) {
  return Math.max(0, Math.min(1, Number(volume) || 0));
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
  let globalVolume = sanitizeVolume(settings?.bgmConfig?.volume ?? 0.35);

  function applyCurrentAudioVolume() {
    if (!currentAudio) return;
    currentAudio.volume = muted ? 0 : globalVolume;
    debugLog('[bgm] applied volume to current audio');
  }

  async function switchTrack(filePath, volume = globalVolume, loop = true) {
    if (!filePath) {
      warnLog('[bgm] filePath is empty, skip switch');
      return;
    }

    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      warnLog('[bgm] Audio API is unavailable in this environment');
      return;
    }

    const requestedVolume = sanitizeVolume(volume);
    globalVolume = requestedVolume;

    if (currentAudio && currentFilePath === filePath) {
      applyCurrentAudioVolume();
      return;
    }

    debugLog('[bgm] switching bgm with volume:', requestedVolume);

    const nextAudio = new Audio(filePath);
    nextAudio.loop = loop;
    nextAudio.volume = 0;

    try {
      await nextAudio.play();
    } catch (error) {
      warnLog('[bgm] failed to play track', { filePath, error: error?.message });
      return;
    }

    const targetVolume = muted ? 0 : requestedVolume;
    await Promise.all([fadeTo(nextAudio, targetVolume, 500), fadeTo(currentAudio, 0, 400)]);

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    currentAudio = nextAudio;
    currentFilePath = filePath;
  }

  function setVolume(volume) {
    globalVolume = sanitizeVolume(volume);
    debugLog('[bgm] bgm volume changed:', globalVolume);
    applyCurrentAudioVolume();
  }

  function muteBgm() {
    muted = true;
    debugLog('[bgm] muted');
    applyCurrentAudioVolume();
  }

  function unmuteBgm() {
    muted = false;
    debugLog('[bgm] unmuted');
    applyCurrentAudioVolume();
  }

  function stop() {
    if (!currentAudio) return;
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
    currentFilePath = '';
  }

  return {
    switch: switchTrack,
    setVolume,
    muteBgm,
    unmuteBgm,
    stop,
  };
}
