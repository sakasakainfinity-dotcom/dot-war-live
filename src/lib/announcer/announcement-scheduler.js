import { ANNOUNCEMENT_CATEGORIES } from './announcement-templates.js';

export function shouldScheduleAutoAnnouncement(context, recentActivity) {
  const nowMs = recentActivity?.nowMs ?? Date.now();
  if (!recentActivity?.enabled) return { ok: false, reason: 'disabled' };
  if (recentActivity?.isInMajorAnimation) return { ok: false, reason: 'major_animation' };
  if (nowMs - (recentActivity?.periodStartedAtMs ?? 0) < (recentActivity?.periodGraceMs ?? 8_000)) return { ok: false, reason: 'period_grace' };
  if (nowMs - (recentActivity?.lastMeaningfulCommentAtMs ?? 0) < (recentActivity?.idleThresholdMs ?? 60_000)) return { ok: false, reason: 'chat_active' };
  if (nowMs - (recentActivity?.lastAiReactionAtMs ?? 0) < (recentActivity?.aiReactionCooldownMs ?? 45_000)) return { ok: false, reason: 'ai_recent' };
  if (nowMs - (recentActivity?.lastAnnouncementAtMs ?? 0) < (recentActivity?.announcementCooldownMs ?? 55_000)) return { ok: false, reason: 'announcement_cooldown' };
  return { ok: true, reason: 'scheduled' };
}

export function createAnnouncementQueue(options = {}) {
  const queue = [];
  let lastAnnouncementAtMs = 0;
  let languageToggle = options.initialLanguage === 'en' ? 'en' : 'ja';
  let categoryCursor = 0;

  function getNextLanguage(mode = 'ja_en_alternate') {
    if (mode === 'ja_only') return 'ja';
    if (mode === 'en_only') return 'en';
    if (mode === 'ja_then_en_same_message') return 'ja';
    languageToggle = languageToggle === 'ja' ? 'en' : 'ja';
    return languageToggle;
  }

  function getNextCategory() {
    const category = ANNOUNCEMENT_CATEGORIES[categoryCursor % ANNOUNCEMENT_CATEGORIES.length];
    categoryCursor += 1;
    return category;
  }

  function enqueueAnnouncement(message) {
    if (!message) return { queued: false };
    if (queue.length >= (options.maxQueueSize ?? 10)) queue.shift();
    queue.push(message);
    return { queued: true, size: queue.length };
  }

  function getNextAnnouncementToPlay() {
    const next = queue.shift();
    if (!next) return null;
    next.status = 'played';
    lastAnnouncementAtMs = Date.now();
    return next;
  }

  return {
    enqueueAnnouncement,
    getNextAnnouncementToPlay,
    getNextLanguage,
    getNextCategory,
    get lastAnnouncementAtMs() {
      return lastAnnouncementAtMs;
    },
    get size() {
      return queue.length;
    },
  };
}
