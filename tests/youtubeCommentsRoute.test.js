import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCommandCode, parseStrictTeamVote } from '../src/lib/youtubeVoteParser.js';

test('strict vote parser accepts only single B/R token with trim', () => {
  assert.deepEqual(parseStrictTeamVote(' B '), { normalized: 'B', team: 'B' });
  assert.deepEqual(parseStrictTeamVote('r'), { normalized: 'r', team: 'R' });
});

test('strict vote parser rejects non-exact patterns', () => {
  assert.deepEqual(parseStrictTeamVote('BBB'), { normalized: 'BBB', team: '' });
  assert.deepEqual(parseStrictTeamVote('REDBB'), { normalized: 'REDBB', team: '' });
});

test('detectCommandCode only allows exact B/R for normal comments', () => {
  const base = {
    id: 'm1',
    user: { id: 'u1' },
    isSuperChat: false,
    currency: '',
    amountNumeric: 0,
  };

  assert.equal(detectCommandCode({ ...base, text: 'B' }).commandCode, 'B');
  assert.equal(detectCommandCode({ ...base, text: 'R' }).commandCode, 'R');
  assert.equal(detectCommandCode({ ...base, text: 'r' }).commandCode, 'R');
  assert.equal(detectCommandCode({ ...base, text: 'BBB' }).commandCode, '');
  assert.equal(detectCommandCode({ ...base, text: 'REDBB' }).commandCode, '');
});

test('detectCommandCode preserves super chat x3 and blast commands', () => {
  const base = {
    id: 'm2',
    user: { id: 'u2' },
    isSuperChat: true,
  };

  assert.equal(detectCommandCode({ ...base, text: 'B', currency: 'USD', amountNumeric: 3 }).commandCode, '3B');
  assert.equal(detectCommandCode({ ...base, text: 'R', currency: 'JPY', amountNumeric: 500 }).commandCode, '5R');
});
