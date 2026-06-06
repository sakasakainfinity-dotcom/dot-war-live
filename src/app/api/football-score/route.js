import { NextResponse } from 'next/server';
import { findFallbackWorldCupMatch, normalizeFootballMatchScore } from '../../../lib/footballScore.js';

export async function GET(request) {
  const matchId = new URL(request.url).searchParams.get('matchId')?.trim();
  if (!matchId) {
    return NextResponse.json({ ok: false, error: 'matchId が未設定です' }, { status: 400 });
  }

  const fallbackMatch = findFallbackWorldCupMatch(matchId);
  if (fallbackMatch) {
    return NextResponse.json({ ok: true, ...fallbackMatch });
  }

  const apiToken = process.env.FOOTBALL_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json({ ok: false, error: 'FOOTBALL_API_TOKEN が未設定です' }, { status: 500 });
  }

  const endpoint = new URL(`https://api.football-data.org/v4/matches/${encodeURIComponent(matchId)}`);

  try {
    const footballRes = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'X-Auth-Token': apiToken,
      },
    });

    if (!footballRes.ok) {
      const detail = await footballRes.text();
      return NextResponse.json({ ok: false, error: `football-data.org スコア取得失敗 (${footballRes.status}): ${detail}` }, { status: 502 });
    }

    const data = await footballRes.json();
    return NextResponse.json({ ok: true, ...normalizeFootballMatchScore(data) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'football-data.org スコア取得失敗' }, { status: 500 });
  }
}
