import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand } from '../src/domain/commandParser.js';

test('parse english command', () => {
  assert.deepEqual(parseCommand('A place 45'), { team: 'A', action: 'place', cellId: 45 });
});

test('parse japanese command', () => {
  assert.deepEqual(parseCommand('B 攻撃 78'), { team: 'B', action: 'attack', cellId: 78 });
});

test('reject invalid range', () => {
  assert.equal(parseCommand('A place 200'), null);
});
