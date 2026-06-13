import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertCurrentStreamSettings } from '../src/lib/server/streamSettingsStore.js';

function saveEnvAndFetch() {
  return {
    url: process.env.SUPABASE_URL,
    publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    fetch: globalThis.fetch,
  };
}

function restoreEnvAndFetch(previous) {
  if (previous.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = previous.url;
  if (previous.publicUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.publicUrl;
  if (previous.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = previous.key;
  globalThis.fetch = previous.fetch;
}

test('upsertCurrentStreamSettings targets the singleton row with explicit conflict key', async () => {
  const previous = saveEnvAndFetch();
  const calls = [];

  process.env.SUPABASE_URL = 'https://example.supabase.co/';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json([{ id: 1, current_video_id: 'Xf1jDlPMENA', current_live_chat_id: 'chat-1', updated_at: 'now' }]);
  };

  try {
    const result = await upsertCurrentStreamSettings({ videoId: 'Xf1jDlPMENA', liveChatId: 'chat-1' });
    assert.equal(result.current_video_id, 'Xf1jDlPMENA');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/stream_settings?on_conflict=id');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers.Prefer, 'resolution=merge-duplicates,return=representation');
    assert.equal(calls[0].init.headers.apikey, 'service-key');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer service-key');
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      id: 1,
      current_video_id: 'Xf1jDlPMENA',
      current_live_chat_id: 'chat-1',
      updated_at: JSON.parse(calls[0].init.body).updated_at,
    });
  } finally {
    restoreEnvAndFetch(previous);
  }
});

test('upsertCurrentStreamSettings validates missing Supabase URL before fetch', async () => {
  const previous = saveEnvAndFetch();
  delete process.env.SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  globalThis.fetch = async () => {
    throw new Error('fetch should not run');
  };

  try {
    await assert.rejects(
      upsertCurrentStreamSettings({ videoId: 'Xf1jDlPMENA', liveChatId: 'chat-1' }),
      (error) => error.step === 'save_db' && error.message === 'Supabase URL is missing',
    );
  } finally {
    restoreEnvAndFetch(previous);
  }
});

test('upsertCurrentStreamSettings validates Supabase URL scheme before fetch', async () => {
  const previous = saveEnvAndFetch();
  process.env.SUPABASE_URL = 'http://example.supabase.co';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  globalThis.fetch = async () => {
    throw new Error('fetch should not run');
  };

  try {
    await assert.rejects(
      upsertCurrentStreamSettings({ videoId: 'Xf1jDlPMENA', liveChatId: 'chat-1' }),
      (error) => error.step === 'save_db'
        && error.message === 'Supabase URL must start with https://'
        && error.detail === 'http://example.supabase.co',
    );
  } finally {
    restoreEnvAndFetch(previous);
  }
});

test('upsertCurrentStreamSettings validates service role key before fetch', async () => {
  const previous = saveEnvAndFetch();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async () => {
    throw new Error('fetch should not run');
  };

  try {
    await assert.rejects(
      upsertCurrentStreamSettings({ videoId: 'Xf1jDlPMENA', liveChatId: 'chat-1' }),
      (error) => error.step === 'save_db' && error.message === 'SUPABASE_SERVICE_ROLE_KEY is missing',
    );
  } finally {
    restoreEnvAndFetch(previous);
  }
});

test('upsertCurrentStreamSettings includes fetch failed cause details', async () => {
  const previous = saveEnvAndFetch();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND example.supabase.co') });
  };

  try {
    await assert.rejects(
      upsertCurrentStreamSettings({ videoId: 'Xf1jDlPMENA', liveChatId: 'chat-1' }),
      (error) => {
        assert.equal(error.step, 'save_db');
        assert.equal(error.message, 'fetch failed');
        assert.match(error.detail, /TypeError/);
        assert.match(error.detail, /getaddrinfo ENOTFOUND/);
        return true;
      },
    );
  } finally {
    restoreEnvAndFetch(previous);
  }
});
