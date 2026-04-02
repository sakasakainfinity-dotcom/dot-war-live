import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCommand, parseSuperChat } from '../src/domain/commandParser.js';

test('parse english command', () => {
  assert.deepEqual(parseCommand('A place 45'), { team: 'A', action: 'place', cellId: 45 });
});

test('parse japanese command', () => {
  assert.deepEqual(parseCommand('B 攻撃 78'), { team: 'B', action: 'attack', cellId: 78 });
});

test('reject invalid range', () => {
  assert.equal(parseCommand('A place 200'), null);
});

test('parse JPY 300 super chat as triple vote', () => {
  const item = {
    snippet: {
      displayMessage: 'a',
      superChatDetails: {
        amountMicros: '300000000',
        currency: 'JPY'
      }
    }
  };
  assert.deepEqual(parseSuperChat(item), { type: 'vote', team: 'A', value: 3 });
});

test('parse JPY 500 super chat as triple bomb', () => {
  const item = {
    snippet: {
      displayMessage: 'R',
      superChatDetails: {
        amountMicros: '500000000',
        currency: 'JPY'
      }
    }
  };
  assert.deepEqual(parseSuperChat(item), { type: 'bomb', target: 'A', value: 3 });
});

test('parse USD 3 super chat as triple vote', () => {
  const item = {
    snippet: {
      displayMessage: 'R',
      superChatDetails: {
        amountMicros: '3000000',
        currency: 'USD'
      }
    }
  };
  assert.deepEqual(parseSuperChat(item), { type: 'vote', team: 'R', value: 3 });
});

test('parse USD 5 super chat as triple bomb', () => {
  const item = {
    snippet: {
      displayMessage: 'A',
      superChatDetails: {
        amountMicros: '5000000',
        currency: 'USD'
      }
    }
  };
  assert.deepEqual(parseSuperChat(item), { type: 'bomb', target: 'R', value: 3 });
});

test('ignore super chat when displayMessage is not A/R', () => {
  const item = {
    snippet: {
      displayMessage: 'B',
      superChatDetails: {
        amountMicros: '300000000',
        currency: 'JPY'
      }
    }
  };
  assert.equal(parseSuperChat(item), null);
});
