const NG_WORDS = ['spam', 'scam', '暴言', '死ね', 'http://bad'];
const STRATEGY_KEYWORDS = ['中央', 'center', 'push', '守', '防衛', 'attack', '攻め', 'bomb', '爆弾'];
const HYPE_KEYWORDS = ['やば', '熱い', 'go', 'いけ', '勝て', '逆転', 'clutch'];
const FUNNY_KEYWORDS = ['w', '笑', '草', 'lol', 'www'];

function includesAny(text, list) {
  const lower = text.toLowerCase();
  return list.some((word) => lower.includes(word.toLowerCase()));
}

function isLikelyMeaningful(text) {
  const trimmed = text.trim();
  if (trimmed.length < 5) return false;
  if (/^[!?.。、\s]+$/.test(trimmed)) return false;
  if (/^[\w\d]{1,4}$/.test(trimmed)) return false;
  return /[ぁ-んァ-ヶ一-龥A-Za-z]/.test(trimmed);
}

export function prefilterComment(comment, config, context) {
  const text = `${comment?.text ?? ''}`.trim();
  const userId = comment?.user?.id || comment?.user?.name || 'unknown';
  const now = Date.now();

  if (!text) return { pass: false, reason: 'empty' };
  if (text.length < Number(config.minLength ?? 5)) return { pass: false, reason: 'too_short' };
  if (text.length > Number(config.maxLength ?? 120)) return { pass: false, reason: 'too_long' };
  if (includesAny(text, NG_WORDS)) return { pass: false, reason: 'ng_word' };
  if (/(https?:\/\/|www\.)/i.test(text)) return { pass: false, reason: 'url' };
  if (!isLikelyMeaningful(text)) return { pass: false, reason: 'not_meaningful' };

  const lastTextAt = context.recentTextMap.get(text.toLowerCase()) ?? 0;
  if (now - lastTextAt < 60_000) return { pass: false, reason: 'duplicate_text' };

  const recentUser = context.recentUserMap.get(userId) ?? 0;
  if (now - recentUser < 8_000) return { pass: false, reason: 'rapid_fire' };

  if (context.lastPickedUser === userId && now - context.lastPickedAt < Number(config.sameUserCooldownMs ?? 90_000)) {
    return { pass: false, reason: 'same_user_cooldown' };
  }

  return { pass: true, reason: 'ok' };
}

function detectCategory(comment) {
  const text = comment.text;
  if (comment.isSuperChat) return 'paid';
  if (includesAny(text, STRATEGY_KEYWORDS)) return 'strategy';
  if (includesAny(text, HYPE_KEYWORDS)) return 'hype';
  if (includesAny(text, FUNNY_KEYWORDS)) return 'funny';
  if (text.includes('?')) return 'reaction';
  return 'supporter';
}

function buildReplyText(comment, category) {
  const name = comment.user.name;
  const snippets = {
    strategy: [`${name}さん、その視点いい！`, 'それな！中央押したい！', '今その指示めっちゃ助かる！'],
    hype: ['うわ、それ逆転あるぞ！', `${name}さん熱い！`, '今それ言うの熱い！'],
    funny: ['その一言すきw', `${name}さん今日キレてるw`, '笑った、でも流れ来てる！'],
    paid: [`${name}さん支援ありがとう！`, 'スパチャで戦況動いた！', 'この一手、でかい！'],
    reaction: ['その疑問いいね、今見ていこう！', 'ナイス質問、次の展開注目！', 'それ気になるよね！'],
    supporter: ['ナイス応援！', `${name}さん、ありがとう！`, 'その声でチーム伸びる！'],
  };
  const pool = snippets[category] ?? snippets.supporter;
  return pool[Math.floor(Math.random() * pool.length)];
}

function scoreComment(comment, weights) {
  const category = detectCategory(comment);
  let score = 10;
  if (comment.isSuperChat) score += Number(weights.paidPriority ?? 30);
  if (category === 'strategy') score += Number(weights.strategyPriority ?? 18);
  if (category === 'hype') score += Number(weights.battlePriority ?? 12);
  if (category === 'funny') score += Number(weights.funnyPriority ?? 10);
  score += Math.min(8, Math.floor(comment.text.length / 15));
  return { score, category };
}

export function evaluateCommentForReply(comment, replyConfig, periodConfig, context) {
  const mode = replyConfig.mode ?? 'broad';
  const { score, category } = scoreComment(comment, replyConfig);

  const thresholds = {
    broad: 14,
    normal: 22,
    strict: 30,
  };

  const minScore = thresholds[mode] ?? thresholds.broad;
  const shouldReply = score >= minScore || comment.isSuperChat;
  const voiceWindowMs = Number(replyConfig.voiceIntervalMs ?? 35_000);
  const canSpeak = (periodConfig.voiceReplyEnabled ?? false) && Date.now() - context.lastVoiceAt > voiceWindowMs;

  return {
    picked: shouldReply,
    priority: Math.min(100, score),
    category,
    replyText: shouldReply ? buildReplyText(comment, category) : '',
    spoken: shouldReply && canSpeak,
  };
}

export function trimForVoice(text, maxChars = 48) {
  const clean = `${text ?? ''}`.trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1)}…`;
}
