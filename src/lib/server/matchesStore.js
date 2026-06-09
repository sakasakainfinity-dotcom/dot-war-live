import { normalizeLiveSettings } from '../liveSettings';
import { sanitizeMatchId } from '../matchId';

const TABLE = 'live_matches';

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

function makeMatchSummary(row) {
  const settings = normalizeLiveSettings(row.settings || {});
  return {
    matchId: row.match_id,
    title: settings.title || `${settings.sideAName} vs ${settings.sideBName}`,
    mode: settings.mode,
    sideAName: settings.sideAName,
    sideBName: settings.sideBName,
    footballMatchId: settings.footballMatchId || '',
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

export async function readLiveMatch(matchId) {
  const safeMatchId = sanitizeMatchId(matchId);
  if (!safeMatchId) return null;

  const res = await fetch(
    supabaseUrl(`${TABLE}?match_id=eq.${encodeURIComponent(safeMatchId)}&select=match_id,settings,created_at,updated_at`),
    { headers: makeHeaders(), cache: 'no-store' },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to read ${TABLE}: ${detail}`);
  }

  const rows = await res.json();
  const row = rows[0];
  if (!row) return null;

  return {
    matchId: row.match_id,
    settings: normalizeLiveSettings({ ...(row.settings || {}), matchId: row.match_id }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLiveMatches(limit = 30) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30));
  const res = await fetch(
    supabaseUrl(`${TABLE}?select=match_id,settings,created_at,updated_at&order=updated_at.desc&limit=${safeLimit}`),
    { headers: makeHeaders(), cache: 'no-store' },
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to list ${TABLE}: ${detail}`);
  }

  const rows = await res.json();
  return rows.map(makeMatchSummary);
}

export async function upsertLiveMatch({ matchId, settings }) {
  const safeMatchId = sanitizeMatchId(matchId || settings?.matchId);
  if (!safeMatchId) {
    throw new Error('matchId is required');
  }

  const normalizedSettings = normalizeLiveSettings({ ...settings, matchId: safeMatchId });
  const now = new Date().toISOString();
  const body = {
    match_id: safeMatchId,
    settings: normalizedSettings,
    updated_at: now,
  };

  const res = await fetch(supabaseUrl(TABLE), {
    method: 'POST',
    headers: {
      ...makeHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to upsert ${TABLE}: ${detail}`);
  }

  const rows = await res.json();
  const row = rows[0] || body;
  return {
    matchId: row.match_id,
    settings: normalizeLiveSettings({ ...(row.settings || normalizedSettings), matchId: row.match_id }),
    createdAt: row.created_at || now,
    updatedAt: row.updated_at || now,
  };
}
