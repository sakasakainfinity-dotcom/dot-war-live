const EXACT_COMMANDS = new Set(['A', 'B', 'R', 'RED', 'BLUE', 'BB', 'RR', '爆弾', 'BOMB', '3B', '3R', '5B', '5R']);
const PREFIX_COMMANDS = ['PLACE', 'ATTACK', 'SHIELD', 'BOMB', 'SET', 'MOVE'];
const COMMAND_PATTERNS = [/^(?:[BR]|RED|BLUE)\s*$/i, /^(?:[0-9]+)?\s*[BR]\s*$/i, /^(?:[ABR])\s+place\s+\d+$/i, /^(?:place|attack|shield|bomb)\b/i, /^(?:爆弾|ボム)\b/u];

export function isGameCommandComment(text) {
  const raw = `${text ?? ''}`.trim();
  if (!raw) return false;
  const normalized = raw.replace(/\s+/g, ' ').toUpperCase();
  if (EXACT_COMMANDS.has(normalized)) return true;
  if (PREFIX_COMMANDS.some((prefix) => normalized.startsWith(prefix))) return true;
  return COMMAND_PATTERNS.some((pattern) => pattern.test(raw));
}
