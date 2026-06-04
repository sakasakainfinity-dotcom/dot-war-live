import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCommandCode, parseStrictTeamVote } from '../src/lib/youtubeVoteParser.js';

test('strict vote parser accepts only single A/B token with trim', () => {
  assert.deepEqual(parseStrictTeamVote(' A '), { normalized: 'A', team: 'A' });
  assert.deepEqual(parseStrictTeamVote('b'), { normalized: 'b', team: 'B' });
});

test('strict vote parser rejects non-exact patterns', () => {
  assert.deepEqual(parseStrictTeamVote('BBB'), { normalized: 'BBB', team: '' });
  assert.deepEqual(parseStrictTeamVote('BLUEAA'), { normalized: 'BLUEAA', team: '' });
});

test('detectCommandCode only allows exact A/B for normal comments', () => {
  const base = {
    id: 'm1',
    user: { id: 'u1' },
    isSuperChat: false,
    currency: '',
    amountNumeric: 0,
  };

  assert.equal(detectCommandCode({ ...base, text: 'A' }).commandCode, 'A');
  assert.equal(detectCommandCode({ ...base, text: 'B' }).commandCode, 'B');
  assert.equal(detectCommandCode({ ...base, text: 'b' }).commandCode, 'B');
  assert.equal(detectCommandCode({ ...base, text: 'BBB' }).commandCode, '');
  assert.equal(detectCommandCode({ ...base, text: 'BLUEAA' }).commandCode, '');
});

test('detectCommandCode preserves super chat x3 and blast commands', () => {
  const base = {
    id: 'm2',
    user: { id: 'u2' },
    isSuperChat: true,
  };

  assert.equal(detectCommandCode({ ...base, text: 'A', currency: 'USD', amountNumeric: 3 }).commandCode, '3A');
  assert.equal(detectCommandCode({ ...base, text: 'B', currency: 'JPY', amountNumeric: 500 }).commandCode, '5B');
});
