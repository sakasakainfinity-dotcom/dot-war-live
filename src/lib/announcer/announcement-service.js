import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_TEMPLATES } from './announcement-templates.js';

export function buildAnnouncementContext(gameState) {
  const redScore = Number(gameState?.redScore ?? 0);
  const blueScore = Number(gameState?.blueScore ?? 0);
  const diff = Math.abs(redScore - blueScore);
  const leadingTeam = redScore === blueScore ? 'tie' : redScore > blueScore ? 'red' : 'blue';
  const battleState = diff <= 3 ? 'close' : diff <= 15 ? 'slight_lead' : 'dominant';

  return {
    topicTitleJa: gameState?.topicTitleJa || 'Dot War Live',
    topicTitleEn: gameState?.topicTitleEn || 'Dot War Live',
    currentPeriodKey: gameState?.currentPeriodKey || 'normal',
    currentPeriodNameJa: gameState?.currentPeriodNameJa || '通常フェーズ',
    currentPeriodNameEn: gameState?.currentPeriodNameEn || 'Normal',
    currentPeriodDescriptionJa: gameState?.currentPeriodDescriptionJa || '通常ルールのバトルです。',
    currentPeriodDescriptionEn: gameState?.currentPeriodDescriptionEn || 'Standard battle rules.',
    redScore,
    blueScore,
    leadingTeam,
    battleState,
    canVote: gameState?.canVote ?? true,
    voteInstructionsJa: gameState?.voteInstructionsJa || 'コメントで R または B を送ると参加できます',
    voteInstructionsEn: gameState?.voteInstructionsEn || 'Vote by commenting R or B',
  };
}

function pickTemplate(language, category) {
  const list = ANNOUNCEMENT_TEMPLATES[language]?.[category] || ANNOUNCEMENT_TEMPLATES[language]?.status || [];
  if (!list.length) return '';
  return list[Math.floor(Math.random() * list.length)];
}

export function buildAnnouncementMessage(context, language = 'ja', category = 'status') {
  const safeCategory = ANNOUNCEMENT_CATEGORIES.includes(category) ? category : 'status';
  const template = pickTemplate(language, safeCategory);
  const text = template
    .replaceAll('{periodNameJa}', context.currentPeriodNameJa)
    .replaceAll('{periodDescriptionJa}', context.currentPeriodDescriptionJa)
    .replaceAll('{periodNameEn}', context.currentPeriodNameEn)
    .replaceAll('{periodDescriptionEn}', context.currentPeriodDescriptionEn);

  return {
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: safeCategory,
    language,
    text,
    createdAt: new Date().toISOString(),
    status: 'queued',
  };
}
