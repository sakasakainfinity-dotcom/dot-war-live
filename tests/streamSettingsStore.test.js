import test from 'node:test';
import assert from 'node:assert/strict';
import { upsertCurrentStreamSettings } from '../src/lib/server/streamSettingsStore.js';

test('upsertCurrentStreamSettings targets the singleton row with explicit conflict key', async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousFetch = globalThis.fetch;
  const calls = [];

  process.env.SUPABASE_URL = 'https://example.supabase.co/';
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
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      id: 1,
      current_video_id: 'Xf1jDlPMENA',
      current_live_chat_id: 'chat-1',
      updated_at: JSON.parse(calls[0].init.body).updated_at,
    });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
});
