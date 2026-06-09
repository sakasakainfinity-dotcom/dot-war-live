import { NextResponse } from 'next/server';
import { readLiveMatch } from '../../../../lib/server/matchesStore';
import { sanitizeMatchId } from '../../../../lib/matchId';

export async function GET(_request, { params }) {
  const { matchId } = await params;
  const safeMatchId = sanitizeMatchId(matchId);
  if (!safeMatchId) {
    return NextResponse.json({ ok: false, error: 'matchId が不正です' }, { status: 400 });
  }

  try {
    const match = await readLiveMatch(safeMatchId);
    if (!match) {
      return NextResponse.json({ ok: false, error: '指定された試合が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, match });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
