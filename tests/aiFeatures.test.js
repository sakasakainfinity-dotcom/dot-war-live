import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCommentLanguage } from '../src/lib/ai/comment-language.js';
import { isGameCommandComment } from '../src/lib/ai/comment-command-filter.js';
import { shouldUseCommentForAiReaction } from '../src/lib/ai/comment-filter.js';
import { createAiReactionQueue } from '../src/lib/ai/comment-reaction-queue.js';
import { buildAnnouncementContext, buildAnnouncementMessage } from '../src/lib/announcer/announcement-service.js';
import { createAnnouncementQueue, shouldScheduleAutoAnnouncement } from '../src/lib/announcer/announcement-scheduler.js';

test('detectCommentLanguage follows ja/en/skip rules', () => {
  assert.equal(detectCommentLanguage('それ青つよすぎるでしょ笑'), 'ja');
  assert.equal(detectCommentLanguage('Blue is actually dominating now'), 'en');
  assert.equal(detectCommentLanguage('😂😂😂😂😂😂😂😂😂😂'), 'skip');
  assert.equal(detectCommentLanguage('https://example.com'), 'skip');
});

test('isGameCommandComment catches command formats', () => {
  assert.equal(isGameCommandComment('R'), true);
  assert.equal(isGameCommandComment('A place 45'), true);
  assert.equal(isGameCommandComment('爆弾'), true);
  assert.equal(isGameCommandComment('No way red team comes back from this'), false);
});

test('shouldUseCommentForAiReaction accepts meaningful and rejects spam', () => {
  const context = {
    nowMs: 100_000,
    lastAcceptedAt: 0,
    globalCooldownMs: 30_000,
    sameUserCooldownMs: 45_000,
    duplicateCooldownMs: 60_000,
    ngWords: ['ngword'],
    userCooldownMap: new Map(),
    recentNormalizedTextMap: new Map(),
  };

  assert.equal(shouldUseCommentForAiReaction({ text: 'この流れで赤逆転したら熱い', user: { id: 'u1' } }, context).ok, true);
  assert.equal(shouldUseCommentForAiReaction({ text: 'wwwwwwwwww', user: { id: 'u1' } }, context).ok, false);
  assert.equal(shouldUseCommentForAiReaction({ text: 'https://example.com', user: { id: 'u1' } }, context).ok, false);
});

test('ai reaction queue enqueues and dequeues', () => {
  const queue = createAiReactionQueue({ maxQueueSize: 2 });
  queue.enqueueAiReaction({ replyText: 'one', status: 'queued' });
  queue.enqueueAiReaction({ replyText: 'two', status: 'queued' });
  queue.enqueueAiReaction({ replyText: 'three', status: 'queued' });
  assert.equal(queue.size, 2);
  assert.equal(queue.getNextAiReactionToPlay().replyText, 'two');
});

test('announcement scheduler and queue work', () => {
  const check = shouldScheduleAutoAnnouncement({}, {
    enabled: true,
    nowMs: 100_000,
    periodStartedAtMs: 0,
    periodGraceMs: 8_000,
    lastMeaningfulCommentAtMs: 0,
    idleThresholdMs: 60_000,
    lastAiReactionAtMs: 0,
    aiReactionCooldownMs: 45_000,
    lastAnnouncementAtMs: 0,
    announcementCooldownMs: 55_000,
  });
  assert.equal(check.ok, true);

  const context = buildAnnouncementContext({ currentPeriodNameJa: '中央ボーナス', currentPeriodNameEn: 'Central Bonus' });
  const msg = buildAnnouncementMessage(context, 'ja', 'battle_explain');
  assert.equal(msg.language, 'ja');

  const queue = createAnnouncementQueue();
  queue.enqueueAnnouncement(msg);
  assert.equal(queue.getNextAnnouncementToPlay().status, 'played');
});
