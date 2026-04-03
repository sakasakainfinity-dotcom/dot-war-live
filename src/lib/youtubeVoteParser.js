const SUPER_CHAT_RULES = {
  JPY: {
    vote: 300,
    bomb: 500,
  },
  USD: {
    vote: 3,
    bomb: 5,
  },
};

export function parseStrictTeamVote(text = '') {
  const normalized = `${text}`.trim();
  if (/^b$/i.test(normalized)) return { normalized, team: 'B' };
  if (/^r$/i.test(normalized)) return { normalized, team: 'R' };
  return { normalized, team: '' };
}

export function detectCommandCode(item) {
  const strictVote = parseStrictTeamVote(item.text);
  if (!strictVote.team) {
    return { commandCode: '', ignoreReason: 'invalid format', normalizedText: strictVote.normalized };
  }

  if (!item.isSuperChat) {
    return { commandCode: strictVote.team, ignoreReason: '', normalizedText: strictVote.normalized };
  }

  const currency = `${item.currency || ''}`.toUpperCase();
  const rules = SUPER_CHAT_RULES[currency];
  if (!rules) {
    return { commandCode: strictVote.team, ignoreReason: '', normalizedText: strictVote.normalized };
  }

  if (item.amountNumeric === rules.bomb) {
    return { commandCode: `5${strictVote.team}`, ignoreReason: '', normalizedText: strictVote.normalized };
  }
  if (item.amountNumeric === rules.vote) {
    return { commandCode: `3${strictVote.team}`, ignoreReason: '', normalizedText: strictVote.normalized };
  }
  return { commandCode: strictVote.team, ignoreReason: '', normalizedText: strictVote.normalized };
}
