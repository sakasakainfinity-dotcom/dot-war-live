const width = 26;
const height = 14;

const grid = Array.from({ length: height }, (_, y) =>
  Array.from({ length: width }, (_, x) => {
    const frontLine = Math.floor(width / 2) + Math.floor(Math.sin(y * 0.8) * 2);
    return x <= frontLine ? 'blue' : 'red';
  }),
);

export const battleMockData = {
  title: {
    titleJa: '都会 VS 田舎',
    titleEn: 'URBAN VS COUNTRYSIDE',
  },
  timerSeconds: 222,
  updateIntervalSeconds: 300,
  blueTank: 4,
  redTank: 2,
  grid,
  superChat: {
    user: 'Kenji',
    amount: '¥500',
    message: '都会が勝つじゃろ！',
  },
  ranking: [
    { rank: 1, name: 'Kenji', amount: '¥5,000' },
    { rank: 2, name: 'Haruka', amount: '¥3,000' },
    { rank: 3, name: 'Taro', amount: '¥1,500' },
  ],
  commandGuides: [
    { code: 'A', team: 'blue', icon: '●', count: 1, labelEn: 'Vote', labelJa: '青に1票' },
    { code: 'AA', team: 'blue', icon: '💣', count: 1, labelEn: 'Break red', labelJa: '赤を1マス破壊' },
    { code: '300A', team: 'blue', icon: '●', count: 3, labelEn: 'Boost Vote', labelJa: '青に3票', priceLabel: '¥300 / $3' },
    { code: '500A', team: 'blue', icon: '💣', count: 5, labelEn: 'Smash red', labelJa: '赤を5マス破壊', priceLabel: '¥500 / $5' },
    { code: 'B', team: 'red', icon: '●', count: 1, labelEn: 'Vote', labelJa: '赤に1票' },
    { code: 'BB', team: 'red', icon: '💣', count: 1, labelEn: 'Break blue', labelJa: '青を1マス破壊' },
    { code: '300B', team: 'red', icon: '●', count: 3, labelEn: 'Boost Vote', labelJa: '赤に3票', priceLabel: '¥300 / $3' },
    { code: '500B', team: 'red', icon: '💣', count: 5, labelEn: 'Smash blue', labelJa: '青を5マス破壊', priceLabel: '¥500 / $5' },
  ],
};
