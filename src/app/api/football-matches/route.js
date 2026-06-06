import { NextResponse } from 'next/server';
import { buildWorldCupMatchesEndpoint, normalizeFootballMatchCandidates, WORLD_CUP_COMPETITION_CODE } from '../../../lib/footballScore.js';

function isValidSeason(value) {
  return !value || /^\d{4}$/.test(value);
}

export async function GET(request) {
  const season = new URL(request.url).searchParams.get('season')?.trim() || '';
  if (!isValidSeason(season)) {
    return NextResponse.json({ ok: false, error: 'season は YYYY 形式で指定してください' }, { status: 400 });
  }

  const apiToken = process.env.FOOTBALL_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json({ ok: false, error: 'FOOTBALL_API_TOKEN が未設定です' }, { status: 500 });
  }

  const { endpoint } = buildWorldCupMatchesEndpoint(season);

  try {
    const footballRes = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'X-Auth-Token': apiToken,
      },
    });

    if (!footballRes.ok) {
      const detail = await footballRes.text();
      return NextResponse.json({ ok: false, error: `football-data.org W杯試合一覧取得失敗 (${footballRes.status}): ${detail}` }, { status: 502 });
    }

    const data = await footballRes.json();
    return NextResponse.json({
      ok: true,
      competitionCode: WORLD_CUP_COMPETITION_CODE,
      season,
      matches: normalizeFootballMatchCandidates(data.matches || []),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'football-data.org W杯試合一覧取得失敗' }, { status: 500 });
  }
}
