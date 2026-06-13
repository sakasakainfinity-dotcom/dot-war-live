const TABLE = 'stream_settings';
const SINGLETON_ID = 1;

export class StreamSettingsStoreError extends Error {
  constructor(message, { detail, status, cause } = {}) {
    super(message, { cause });
    this.name = 'StreamSettingsStoreError';
    this.step = 'save_db';
    this.detail = detail;
    this.status = status;
  }
}

function getServiceRoleKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new StreamSettingsStoreError('SUPABASE_SERVICE_ROLE_KEY is missing');
  }
  return value;
}

function getSupabaseProjectUrl() {
  const rawValue = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawValue) {
    throw new StreamSettingsStoreError('Supabase URL is missing');
  }

  const value = rawValue.replace(/\/+$/, '');
  if (!value.startsWith('https://')) {
    throw new StreamSettingsStoreError('Supabase URL must start with https://', { detail: rawValue });
  }

  return value;
}

function makeHeaders() {
  const supabaseKey = getServiceRoleKey();
  return {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  };
}

function makeSupabaseRestUrl(pathAndQuery) {
  const base = getSupabaseProjectUrl();
  return `${base}/rest/v1/${pathAndQuery.replace(/^\/+/, '')}`;
}

function logSupabaseEndpoint(url) {
  const parsedUrl = new URL(url);
  const supabaseUrl = parsedUrl.origin;
  const endpoint = `${parsedUrl.origin}${parsedUrl.pathname}`;
  console.log('[save_db] supabaseUrl', supabaseUrl);
  console.log('[save_db] endpoint', endpoint);
  console.log('[save_db] requestUrl', url);
}

function describeFetchError(error) {
  return JSON.stringify({
    name: error instanceof Error ? error.name : undefined,
    message: error instanceof Error ? error.message : String(error),
    cause: String(error?.cause ?? ''),
  });
}

export async function readCurrentStreamSettings() {
  const url = makeSupabaseRestUrl(`${TABLE}?id=eq.${SINGLETON_ID}&select=id,current_video_id,current_live_chat_id,updated_at`);
  logSupabaseEndpoint(url);

  const res = await fetch(url, {
    headers: makeHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new StreamSettingsStoreError(`Failed to read ${TABLE}: status=${res.status}`, { detail, status: res.status });
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

  const url = makeSupabaseRestUrl(`${TABLE}?on_conflict=id`);
  logSupabaseEndpoint(url);

  const headers = {
    ...makeHeaders(),
    Prefer: 'resolution=merge-duplicates,return=representation',
  };

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('[save_db] fetch failed', {
      name: error instanceof Error ? error.name : undefined,
      message: error instanceof Error ? error.message : String(error),
      cause: error?.cause,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new StreamSettingsStoreError(error instanceof Error ? error.message : String(error), {
      detail: describeFetchError(error),
      cause: error,
    });
  }

  const saveResponseText = await res.text();
  console.log('[stream-settings:upsert:response]', { status: res.status, body: saveResponseText });

  const responseText = await res.text();
  console.log('[stream-settings:upsert:response]', { status: res.status, body: responseText });

  if (!res.ok) {
    throw new StreamSettingsStoreError(`Supabase REST API returned status=${res.status}`, {
      detail: saveResponseText,
      status: res.status,
    });
  }

  const rows = JSON.parse(saveResponseText);
  return rows[0] || body;
}
