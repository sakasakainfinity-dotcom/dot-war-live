export function createAiReactionQueue(options = {}) {
  const maxQueueSize = options.maxQueueSize ?? 20;
  const queue = [];
  const userCooldownMap = new Map();
  const recentNormalizedTextMap = new Map();
  let lastAcceptedAt = 0;

  function enqueueAiReaction(result) {
    if (!result) return { queued: false, reason: 'empty' };
    if (queue.length >= maxQueueSize) queue.shift();
    queue.push(result);
    return { queued: true, size: queue.length };
  }

  function getNextAiReactionToPlay() {
    const next = queue.shift();
    if (!next) return null;
    next.status = 'played';
    return next;
  }

  function markAccepted(candidate) {
    const nowMs = Date.now();
    lastAcceptedAt = nowMs;
    userCooldownMap.set(candidate.userId, nowMs);
    recentNormalizedTextMap.set(candidate.normalizedText, nowMs);
  }

  function getFilterContext() {
    return {
      lastAcceptedAt,
      userCooldownMap,
      recentNormalizedTextMap,
      globalCooldownMs: options.globalCooldownMs ?? 30_000,
      sameUserCooldownMs: options.sameUserCooldownMs ?? 45_000,
      duplicateCooldownMs: options.duplicateCooldownMs ?? 120_000,
      ngWords: options.ngWords ?? ['差別', '死ね', 'kill yourself', 'spam link'],
    };
  }

  return {
    enqueueAiReaction,
    getNextAiReactionToPlay,
    markAccepted,
    getFilterContext,
    get size() {
      return queue.length;
    },
    get pending() {
      return [...queue];
    },
  };
}
