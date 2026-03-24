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
  commandGuides: [
    {
      team: 'blue',
      titleEn: 'Blue Team',
      titleJa: '青',
      rows: [
        { code: 'A', labelEn: 'Vote', labelJa: '青に1票' },
        { code: 'AA', labelEn: 'Attack', labelJa: '1マス破壊' },
        { code: 'AAA', labelEn: 'Mega', labelJa: '3マス破壊' },
        { code: '300A', labelEn: 'Boost', labelJa: '3倍投票' },
        { code: '500A', labelEn: 'Smash', labelJa: '5マス破壊' },
      ],
    },
    {
      team: 'red',
      titleEn: 'Red Team',
      titleJa: '赤',
      rows: [
        { code: 'B', labelEn: 'Vote', labelJa: '赤に1票' },
        { code: 'BB', labelEn: 'Attack', labelJa: '1マス破壊' },
        { code: 'BBB', labelEn: 'Mega', labelJa: '3マス破壊' },
        { code: '300B', labelEn: 'Boost', labelJa: '3倍投票' },
        { code: '500B', labelEn: 'Smash', labelJa: '5マス破壊' },
      ],
    },
  ],
};
