import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCommentForReply, prefilterComment, trimForVoice } from '../src/lib/commentReplyEngine.js';

test('prefilter rejects too short message', () => {
  const result = prefilterComment(
    { text: 'aaa', user: { id: 'u1', name: 'A' } },
    { minLength: 5, maxLength: 100, sameUserCooldownMs: 1000 },
    { recentUserMap: new Map(), recentTextMap: new Map(), lastPickedUser: '', lastPickedAt: 0 },
  );
  assert.equal(result.pass, false);
});

test('superchat is picked even in strict mode', () => {
  const result = evaluateCommentForReply(
    { text: '5B 今攻めよう', isSuperChat: true, user: { name: 'Kenji' } },
    { mode: 'strict', paidPriority: 35, strategyPriority: 20, battlePriority: 12, funnyPriority: 10, voiceIntervalMs: 1000 },
    { voiceReplyEnabled: true },
    { lastVoiceAt: 0 },
  );

  assert.equal(result.picked, true);
  assert.equal(result.category, 'paid');
});

test('trimForVoice shortens long text', () => {
  const output = trimForVoice('1234567890abcdefghij', 10);
  assert.equal(output, '123456789…');
});
