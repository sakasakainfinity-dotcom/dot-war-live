export function sanitizeMatchId(value) {
  return `${value ?? ''}`.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export function createMatchId(prefix = 'match') {
  const safePrefix = sanitizeMatchId(prefix) || 'match';
  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return sanitizeMatchId(`${safePrefix}-${timePart}-${randomPart}`);
}
