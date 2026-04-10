export const ANNOUNCEMENT_CATEGORIES = ['engagement', 'engagement', 'explanation'];

export const ANNOUNCEMENT_TEMPLATES = {
  ja: {
    engagement: [
      'あと{minutesLeft}分！コメント1つで流れが変わるかも。',
      'まだ勝負は動くよ。どっちを押すかコメントで教えて。',
      'このままで終わっていい？コメントで流れを変えてみて。',
      '今入ったコメントが決め手になるかも。参加してみて。',
    ],
    explanation: [
      '現在は{leadingSide}がやや優勢。このあとまだ動く可能性があります。',
      'いまは{periodNameJa}の時間です。残り{minutesLeft}分、まだ逆転もあります。',
    ],
  },
  en: {
    engagement: [
      '{minutesLeft} minutes left! One comment could change the game.',
      'This match can still swing. Pick your side in the chat.',
      'Is this really the final result? Jump in and change it.',
      'Your comment might be the turning point. Join now.',
    ],
    explanation: [
      '{leadingSideEn} is slightly ahead right now, but this match is still open.',
      'We are now in {periodNameEn}. {minutesLeft} minutes left, and a comeback is still possible.',
    ],
  },
};
