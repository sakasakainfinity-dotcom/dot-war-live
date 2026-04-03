export const bgmTracks = [
  { id: 'normal1', filePath: '/bgm/normal1.mp3', loop: true, defaultVolume: 0.3 },
  { id: 'double', filePath: '/bgm/double.mp3', loop: true, defaultVolume: 0.35 },
  { id: 'bonus', filePath: '/bgm/bonus.mp3', loop: true, defaultVolume: 0.4 },
  { id: 'normal2', filePath: '/bgm/normal2.mp3', loop: true, defaultVolume: 0.3 },
  { id: 'random', filePath: '/bgm/random.mp3', loop: true, defaultVolume: 0.35 },
  { id: 'bomb', filePath: '/bgm/bomb.mp3', loop: true, defaultVolume: 0.4 },
];

export const bgmTrackMap = new Map(bgmTracks.map((track) => [track.id, track]));
