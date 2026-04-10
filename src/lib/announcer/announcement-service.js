import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_TEMPLATES } from './announcement-templates.js';

function calculateLeadingSide(context) {
  const { redScore, blueScore, teamRedJa, teamBlueJa, teamRedEn, teamBlueEn } = context;
  if (redScore === blueScore) {
    return {
      ja: '両チーム',
      en: 'Both sides',
    };
  }
  if (redScore > blueScore) {
    return { ja: teamRedJa, en: teamRedEn };
  }
  return { ja: teamBlueJa, en: teamBlueEn };
}

export function buildAnnouncementContext(gameState) {
  const redScore = Number(gameState?.redScore ?? 0);
  const blueScore = Number(gameState?.blueScore ?? 0);
  const leading = calculateLeadingSide({
    redScore,
    blueScore,
    teamRedJa: gameState?.teamRedJa || '赤チーム',
    teamBlueJa: gameState?.teamBlueJa || '青チーム',
    teamRedEn: gameState?.teamRedEn || 'Red team',
    teamBlueEn: gameState?.teamBlueEn || 'Blue team',
  });

  return {
    topicTitleJa: gameState?.topicTitleJa || 'Dot War Live',
    topicTitleEn: gameState?.topicTitleEn || 'Dot War Live',
    currentPeriodKey: gameState?.currentPeriodKey || 'normal',
    currentPeriodNameJa: gameState?.currentPeriodNameJa || '通常フェーズ',
    currentPeriodNameEn: gameState?.currentPeriodNameEn || 'Normal',
    redScore,
    blueScore,
    minutesLeft: Math.max(1, Number(gameState?.minutesLeft ?? 1)),
    leadingSide: leading.ja,
    leadingSideEn: leading.en,
  };
}

function pickTemplate(language, category, recentTemplateKeys = []) {
  const list = ANNOUNCEMENT_TEMPLATES[language]?.[category] || ANNOUNCEMENT_TEMPLATES[language]?.engagement || [];
  if (!list.length) return { text: '', templateKey: '' };

  const fresh = list
    .map((template, idx) => ({ template, templateKey: `${language}:${category}:${idx}` }))
    .filter((item) => !recentTemplateKeys.includes(item.templateKey));

  const pool = fresh.length ? fresh : list.map((template, idx) => ({ template, templateKey: `${language}:${category}:${idx}` }));
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { text: selected.template, templateKey: selected.templateKey };
}

export function buildAnnouncementMessage(context, language = 'ja', category = 'engagement', recentTemplateKeys = []) {
  const safeCategory = ANNOUNCEMENT_CATEGORIES.includes(category) ? category : 'engagement';
  const picked = pickTemplate(language, safeCategory, recentTemplateKeys);
  const text = picked.text
    .replaceAll('{minutesLeft}', `${context.minutesLeft}`)
    .replaceAll('{leadingSide}', context.leadingSide)
    .replaceAll('{leadingSideEn}', context.leadingSideEn)
    .replaceAll('{periodNameJa}', context.currentPeriodNameJa)
    .replaceAll('{periodNameEn}', context.currentPeriodNameEn);

  return {
    id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: safeCategory,
    language,
    templateKey: picked.templateKey,
    voice: language === 'en' ? 'verse' : 'alloy',
    text,
    createdAt: new Date().toISOString(),
    status: 'queued',
    kind: 'announcement',
  };
}
