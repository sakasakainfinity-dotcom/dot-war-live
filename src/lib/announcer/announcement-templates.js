export const ANNOUNCEMENT_CATEGORIES = ['status', 'how_to_vote', 'battle_explain', 'cta'];

export const ANNOUNCEMENT_TEMPLATES = {
  ja: {
    status: ['いまはかなり接戦です！', '青チームが少し前に出ています！', '赤チームが押し返してきました！'],
    how_to_vote: ['コメントで R または B を送ると参加できます！', 'チャットに R か B と送るだけで投票できます！', '投票はコメント欄からすぐ参加できます！'],
    battle_explain: ['いまは {periodNameJa} の時間です！', '現在は {periodDescriptionJa}', 'このターンは {periodNameJa} で進行中です！'],
    cta: ['コメントでどっちが勝つか教えてください！', '今のうちに投票して流れを変えてください！', '参加はコメントからすぐできます！'],
  },
  en: {
    status: ['This match is very close right now!', 'Blue team is slightly ahead!', 'Red team is pushing back!'],
    how_to_vote: ['Vote by commenting R or B!', 'Join the battle by sending R or B in chat!', 'You can vote directly from the chat!'],
    battle_explain: ['We are now in {periodNameEn}.', 'This round is {periodDescriptionEn}.', 'The current period is {periodNameEn}.'],
    cta: ['Tell us in chat who wins this!', 'Drop your vote and swing the match!', 'Join the battle in the chat!'],
  },
};
