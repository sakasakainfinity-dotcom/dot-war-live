import { isGameCommandComment } from './comment-command-filter.js';
import { detectCommentLanguage } from './comment-language.js';

const URL_ONLY_RE = /^https?:\/\/\S+$/i;
const SYMBOLS_ONLY_RE = /^[\p{S}\p{P}\p{Z}\d_]+$/u;
const REPEATED_CHAR_RE = /^(.)\1{3,}$/u;
const SHORT_LAUGH_RE = /^(?:w{3,}|ｗ{3,}|草+|8{3,})$/i;
const EMOJI_ONLY_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u;

function includesNgWords(text, ngWords = []) {
  const lower = text.toLowerCase();
  return ngWords.some((word) => lower.includes(`${word}`.toLowerCase()));
}

export function normalizeCommentText(text) {
  return `${text ?? ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function shouldUseCommentForAiReaction(comment, context) {
  const now = context?.nowMs ?? Date.now();
  const text = `${comment?.text ?? ''}`;
  const compact = text.replace(/\s+/g, '');
  const normalizedText = normalizeCommentText(text);
  const userId = comment?.userId || comment?.user?.id || 'unknown';

  if (compact.length < 6) return { ok: false, reason: 'too_short', normalizedText, detectedLanguage: 'skip' };
  if (isGameCommandComment(text)) return { ok: false, reason: 'game_command', normalizedText, detectedLanguage: 'skip' };
  if (URL_ONLY_RE.test(compact)) return { ok: false, reason: 'url_only', normalizedText, detectedLanguage: 'skip' };
  if (EMOJI_ONLY_RE.test(compact)) return { ok: false, reason: 'emoji_only', normalizedText, detectedLanguage: 'skip' };
  if (SYMBOLS_ONLY_RE.test(compact)) return { ok: false, reason: 'symbols_only', normalizedText, detectedLanguage: 'skip' };
  if (REPEATED_CHAR_RE.test(compact)) return { ok: false, reason: 'repeated_char', normalizedText, detectedLanguage: 'skip' };
  if (SHORT_LAUGH_RE.test(compact)) return { ok: false, reason: 'short_laugh', normalizedText, detectedLanguage: 'skip' };
  if (includesNgWords(text, context?.ngWords)) return { ok: false, reason: 'ng_word', normalizedText, detectedLanguage: 'skip' };

  const lastGlobalAt = context?.lastAcceptedAt ?? 0;
  if (now - lastGlobalAt < (context?.globalCooldownMs ?? 35_000)) return { ok: false, reason: 'global_cooldown', normalizedText, detectedLanguage: 'skip' };

  const lastUserAt = context?.userCooldownMap?.get(userId) ?? 0;
  if (now - lastUserAt < (context?.sameUserCooldownMs ?? 60_000)) return { ok: false, reason: 'same_user_cooldown', normalizedText, detectedLanguage: 'skip' };

  const lastTextAt = context?.recentNormalizedTextMap?.get(normalizedText) ?? 0;
  if (now - lastTextAt < (context?.duplicateCooldownMs ?? 150_000)) return { ok: false, reason: 'duplicate', normalizedText, detectedLanguage: 'skip' };

  const detectedLanguage = detectCommentLanguage(text);
  if (detectedLanguage === 'skip') return { ok: false, reason: 'language_skip', normalizedText, detectedLanguage };

  if (detectedLanguage === 'en' && compact.length < 12) {
    return { ok: false, reason: 'english_too_short', normalizedText, detectedLanguage: 'skip' };
  }

  return { ok: true, reason: 'accepted', normalizedText, detectedLanguage };
}
