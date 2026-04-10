const UNIFIED_DEFAULT_VOLUME = 0.3;

export const bgmTracks = [
  { id: 'normal1', filePath: '/bgm/normal1.mp3', loop: true, defaultVolume: UNIFIED_DEFAULT_VOLUME },
  { id: 'double', filePath: '/bgm/double.mp3', loop: true, defaultVolume: UNIFIED_DEFAULT_VOLUME },
  { id: 'bonus', filePath: '/bgm/bonus.mp3', loop: true, defaultVolume: UNIFIED_DEFAULT_VOLUME },
  { id: 'normal2', filePath: '/bgm/normal2.mp3', loop: true, defaultVolume: UNIFIED_DEFAULT_VOLUME },
  { id: 'random', filePath: '/bgm/random.mp3', loop: true, defaultVolume: UNIFIED_DEFAULT_VOLUME },
  { id: 'bomb', filePath: '/bgm/bomb.mp3', loop: true, defaultVolume: UNIFIED_DEFAULT_VOLUME },
];

export const bgmTrackMap = new Map(bgmTracks.map((track) => [track.id, track]));
