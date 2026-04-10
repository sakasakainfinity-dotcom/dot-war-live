import { ANNOUNCEMENT_CATEGORIES } from './announcement-templates.js';

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shouldScheduleAutoAnnouncement(context, recentActivity) {
  const nowMs = recentActivity?.nowMs ?? Date.now();
  if (!recentActivity?.enabled) return { ok: false, reason: 'disabled' };
  if (recentActivity?.speechQueueBusy) return { ok: false, reason: 'speech_queue_busy' };
  if (recentActivity?.isInMajorAnimation) return { ok: false, reason: 'major_animation' };
  if (nowMs - (recentActivity?.periodStartedAtMs ?? 0) < (recentActivity?.periodGraceMs ?? 12_000)) return { ok: false, reason: 'period_grace' };
  if ((recentActivity?.recentCommentCount ?? 0) >= (recentActivity?.activeCommentThreshold ?? 2)) return { ok: false, reason: 'chat_active_burst' };
  if (nowMs - (recentActivity?.lastMeaningfulCommentAtMs ?? 0) < (recentActivity?.idleThresholdMs ?? 210_000)) return { ok: false, reason: 'chat_active' };
  if (nowMs - (recentActivity?.lastAiReactionAtMs ?? 0) < (recentActivity?.aiReactionCooldownMs ?? 70_000)) return { ok: false, reason: 'ai_recent' };
  if (nowMs < (recentActivity?.nextAnnouncementAtMs ?? 0)) return { ok: false, reason: 'not_due' };
  if (nowMs - (recentActivity?.lastAnnouncementAtMs ?? 0) < (recentActivity?.announcementCooldownMs ?? 390_000)) return { ok: false, reason: 'announcement_cooldown' };
  return { ok: true, reason: 'scheduled' };
}

export function createAnnouncementQueue(options = {}) {
  const queue = [];
  let lastAnnouncementAtMs = 0;
  let nextAnnouncementAtMs = Date.now() + randInt(420_000, 540_000);
  const history = [];
  let jaCount = 0;
  let enCount = 0;
  let engagementCount = 0;
  let explanationCount = 0;

  function chooseAnnouncementLanguage(nowInTokyo = new Date()) {
    const hour = nowInTokyo.getHours();
    const daytime = hour >= 12 && hour < 24;
    const targetJaRatio = daytime ? 0.75 : 0.5;
    const total = jaCount + enCount;
    const currentJaRatio = total === 0 ? targetJaRatio : jaCount / total;
    const lastTwo = history.slice(-2).map((item) => item.language);

    if (lastTwo.length === 2 && lastTwo[0] === 'ja' && lastTwo[1] === 'ja') return 'en';
    if (lastTwo.length === 2 && lastTwo[0] === 'en' && lastTwo[1] === 'en') return 'ja';

    if (currentJaRatio < targetJaRatio) return 'ja';
    if (currentJaRatio > targetJaRatio) return 'en';
    return Math.random() < targetJaRatio ? 'ja' : 'en';
  }

  function chooseAnnouncementCategory() {
    const total = engagementCount + explanationCount;
    const targetEngagementRatio = 4 / 6;
    const currentEngagementRatio = total === 0 ? targetEngagementRatio : engagementCount / total;
    const lastTwo = history.slice(-2).map((item) => item.category);

    if (lastTwo.length === 2 && lastTwo[0] === 'engagement' && lastTwo[1] === 'engagement') return 'explanation';
    if (lastTwo.length === 2 && lastTwo[0] === 'explanation' && lastTwo[1] === 'explanation') return 'engagement';

    if (currentEngagementRatio < targetEngagementRatio) return 'engagement';
    if (currentEngagementRatio > targetEngagementRatio) return 'explanation';
    return ANNOUNCEMENT_CATEGORIES[Math.floor(Math.random() * ANNOUNCEMENT_CATEGORIES.length)];
  }

  function enqueueAnnouncement(message) {
    return enqueueAnnouncementSpeech(message);
  }

  function enqueueAnnouncementSpeech(item) {
    if (!item) return { queued: false };
    if (queue.length >= (options.maxQueueSize ?? 3)) queue.shift();
    queue.push(item);
    return { queued: true, size: queue.length };
  }

  function getNextAnnouncementToPlay() {
    const next = queue.shift();
    if (!next) return null;
    next.status = 'played';
    lastAnnouncementAtMs = Date.now();
    nextAnnouncementAtMs = lastAnnouncementAtMs + randInt(420_000, 540_000);
    history.push({ language: next.language, category: next.category, templateKey: next.templateKey });
    if (history.length > 12) history.shift();
    if (next.language === 'ja') jaCount += 1;
    if (next.language === 'en') enCount += 1;
    if (next.category === 'engagement') engagementCount += 1;
    if (next.category === 'explanation') explanationCount += 1;
    return next;
  }

  return {
    enqueueAnnouncement,
    enqueueAnnouncementSpeech,
    getNextAnnouncementToPlay,
    chooseAnnouncementLanguage,
    chooseAnnouncementCategory,
    get recentTemplateKeys() {
      return history.slice(-4).map((item) => item.templateKey).filter(Boolean);
    },
    get lastAnnouncementAtMs() {
      return lastAnnouncementAtMs;
    },
    get nextAnnouncementAtMs() {
      return nextAnnouncementAtMs;
    },
    get size() {
      return queue.length;
    },
  };
}
