const TABLE = 'paid_events';

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

function supabaseUrl(pathAndQuery) {
  const base = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  return `${base}/rest/v1/${pathAndQuery}`;
}

function toAmountLabel(currency, amountNumeric) {
  if (currency === 'JPY') return `¥${Math.round(amountNumeric).toLocaleString('ja-JP')}`;
  if (currency === 'USD') return `$${Number(amountNumeric).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${currency || ''} ${Number(amountNumeric).toLocaleString()}`.trim();
}

export async function savePaidEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return;

  const res = await fetch(supabaseUrl(`${TABLE}?on_conflict=message_id`), {
    method: 'POST',
    headers: {
      ...makeHeaders(),
      Prefer: 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(events),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to save ${TABLE}: ${detail}`);
  }
}

export async function readPaidEventSummary(streamVideoId) {
  if (!streamVideoId) {
    return { topSupporters: [], latestPaidComments: [] };
  }

  const latestRes = await fetch(
    supabaseUrl(
      `${TABLE}?stream_video_id=eq.${encodeURIComponent(streamVideoId)}&select=message_id,user_channel_id,user_name,message_text,currency,amount_numeric,created_at&order=created_at.desc&limit=3`,
    ),
    { headers: makeHeaders(), cache: 'no-store' },
  );
  if (!latestRes.ok) {
    const detail = await latestRes.text();
    throw new Error(`Failed to read latest paid events: ${detail}`);
  }
  const latestRows = await latestRes.json();

  const topRes = await fetch(
    supabaseUrl(
      `${TABLE}?stream_video_id=eq.${encodeURIComponent(streamVideoId)}&select=user_channel_id,user_name,currency,amount_numeric`,
    ),
    { headers: makeHeaders(), cache: 'no-store' },
  );
  if (!topRes.ok) {
    const detail = await topRes.text();
    throw new Error(`Failed to read top paid events: ${detail}`);
  }
  const topRows = await topRes.json();

  const grouped = new Map();
  topRows.forEach((row) => {
    const key = row.user_channel_id || row.user_name || 'unknown';
    const prev = grouped.get(key) || {
      userChannelId: row.user_channel_id || 'unknown',
      userName: row.user_name || 'unknown',
      totalAmountNumeric: 0,
      currency: row.currency || '',
    };
    prev.totalAmountNumeric += Number(row.amount_numeric || 0);
    grouped.set(key, prev);
  });

  const topSupporters = [...grouped.values()]
    .sort((a, b) => b.totalAmountNumeric - a.totalAmountNumeric)
    .slice(0, 3)
    .map((row) => ({
      ...row,
      amountLabel: toAmountLabel(row.currency, row.totalAmountNumeric),
    }));

  const latestPaidComments = latestRows.map((row) => ({
    messageId: row.message_id,
    userChannelId: row.user_channel_id,
    userName: row.user_name,
    messageText: row.message_text,
    currency: row.currency,
    amountNumeric: Number(row.amount_numeric || 0),
    amountLabel: toAmountLabel(row.currency, row.amount_numeric),
    createdAt: row.created_at,
  }));

  return {
    topSupporters,
    latestPaidComments,
  };
}
