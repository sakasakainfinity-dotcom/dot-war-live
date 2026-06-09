import { NextResponse } from 'next/server';
import { checkAdminRequest } from '../../../../lib/server/adminAuth';
import { listLiveMatches, upsertLiveMatch } from '../../../../lib/server/matchesStore';
import { sanitizeMatchId } from '../../../../lib/matchId';

export async function GET(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  try {
    const matches = await listLiveMatches();
    return NextResponse.json({ ok: true, matches });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const matchId = sanitizeMatchId(body.matchId || body.settings?.matchId);
  if (!matchId) {
    return NextResponse.json({ ok: false, error: 'matchId が必要です' }, { status: 400 });
  }

  try {
    const match = await upsertLiveMatch({ matchId, settings: body.settings || {} });
    return NextResponse.json({ ok: true, match });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
