const TABLE = 'stream_settings';
const SINGLETON_ID = 1;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function makeHeaders() {
  const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };
}

function getSupabaseProjectUrl() {
  const value = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set');
  }
  return value;
}

function supabaseUrl(pathAndQuery) {
  const base = getSupabaseProjectUrl().replace(/\/$/, '');
  return `${base}/rest/v1/${pathAndQuery}`;
}

export async function readCurrentStreamSettings() {
  const res = await fetch(supabaseUrl(`${TABLE}?id=eq.${SINGLETON_ID}&select=id,current_video_id,current_live_chat_id,updated_at`), {
    headers: makeHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to read ${TABLE}: ${detail}`);
  }

  const rows = await res.json();
  return rows[0] || null;
}

export async function upsertCurrentStreamSettings({ videoId, liveChatId }) {
  const body = {
    id: SINGLETON_ID,
    current_video_id: videoId,
    current_live_chat_id: liveChatId,
    updated_at: new Date().toISOString(),
  };

  const url = supabaseUrl(`${TABLE}?on_conflict=id`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...makeHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  });

  const responseText = await res.text();
  console.log('[stream-settings:upsert:response]', { status: res.status, body: responseText });

  if (!res.ok) {
    throw new Error(`Failed to update ${TABLE}: status=${res.status} body=${responseText}`);
  }

  const rows = JSON.parse(responseText);
  return rows[0] || body;
}
