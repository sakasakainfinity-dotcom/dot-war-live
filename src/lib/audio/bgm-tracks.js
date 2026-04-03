export const bgmTracks = [
  { id: 'normal_1', label: 'Normal 1', filePath: '/bgm/normal-1.mp3', loop: true, defaultVolume: 0.35 },
  { id: 'double_vote', label: 'Double Vote', filePath: '/bgm/double-vote.mp3', loop: true, defaultVolume: 0.4 },
  { id: 'central_bonus', label: 'Central Bonus', filePath: '/bgm/central-bonus.mp3', loop: true, defaultVolume: 0.4 },
  { id: 'normal_2', label: 'Normal 2', filePath: '/bgm/normal-2.mp3', loop: true, defaultVolume: 0.35 },
  { id: 'ai_random', label: 'AI Random', filePath: '/bgm/ai-random.mp3', loop: true, defaultVolume: 0.38 },
  { id: 'random_bomb', label: 'Random Bomb', filePath: '/bgm/random-bomb.mp3', loop: true, defaultVolume: 0.42 },
];

export const bgmTrackMap = new Map(bgmTracks.map((track) => [track.id, track]));
