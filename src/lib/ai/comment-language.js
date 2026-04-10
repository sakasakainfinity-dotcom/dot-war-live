const JAPANESE_RE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const ENGLISH_RE = /[A-Za-z]/;
const URL_ONLY_RE = /^https?:\/\/\S+$/i;

export function detectCommentLanguage(text) {
  const raw = `${text ?? ''}`;
  const compact = raw.replace(/\s+/g, '');
  if (compact.length < 6) return 'skip';
  if (URL_ONLY_RE.test(compact)) return 'skip';
  if (JAPANESE_RE.test(raw)) return 'ja';
  if (ENGLISH_RE.test(raw)) return 'en';
  return 'skip';
}
