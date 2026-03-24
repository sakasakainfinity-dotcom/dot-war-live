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
  blueTank: 72,
  redTank: 41,
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
};
