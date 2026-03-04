import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePhase, applyAction, createInitialState } from '../src/domain/gameEngine.js';

test('rejects action in debate phase', () => {
  const state = createInitialState();
  const result = applyAction(state, {
    userId: 'u1',
    team: 'A',
    action: 'place',
    cellId: 10,
    paidTier: 0
  });
  assert.equal(result.accepted, false);
});

test('one action per user per turn', () => {
  const state = createInitialState();
  advancePhase(state);

  const first = applyAction(state, {
    userId: 'u1',
    team: 'A',
    action: 'place',
    cellId: 10,
    paidTier: 0
  });
  const second = applyAction(state, {
    userId: 'u1',
    team: 'A',
    action: 'place',
    cellId: 11,
    paidTier: 0
  });

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
});

test('tier 500 attack breaks wall', () => {
  const state = createInitialState();
  advancePhase(state);

  const result = applyAction(state, {
    userId: 'u2',
    team: 'A',
    action: 'attack',
    cellId: 44,
    paidTier: 500
  });

  assert.equal(result.accepted, true);
  assert.equal(state.board[44].type, 'EMPTY');
});
