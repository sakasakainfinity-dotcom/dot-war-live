import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAdminRequest } from '../src/lib/server/adminAuth.js';

function makeRequest(headers) {
  return new Request('https://example.com/api/admin/youtube/current', { headers });
}

test('allows admin same-origin requests when browser omits Origin on GET', () => {
  const previousToken = process.env.ADMIN_API_TOKEN;
  delete process.env.ADMIN_API_TOKEN;
  try {
    const result = checkAdminRequest(makeRequest({
      host: 'example.com',
      referer: 'https://example.com/admin',
    }));
    assert.deepEqual(result, { ok: true });
  } finally {
    if (previousToken === undefined) {
      delete process.env.ADMIN_API_TOKEN;
    } else {
      process.env.ADMIN_API_TOKEN = previousToken;
    }
  }
});

test('rejects admin referer from a different host when Origin is omitted', () => {
  const previousToken = process.env.ADMIN_API_TOKEN;
  delete process.env.ADMIN_API_TOKEN;
  try {
    const result = checkAdminRequest(makeRequest({
      host: 'example.com',
      referer: 'https://evil.example/admin',
    }));
    assert.equal(result.ok, false);
  } finally {
    if (previousToken === undefined) {
      delete process.env.ADMIN_API_TOKEN;
    } else {
      process.env.ADMIN_API_TOKEN = previousToken;
    }
  }
});
