import { NextResponse } from 'next/server';
import { normalizeFootballMatchCandidates } from '../../../lib/footballScore.js';

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

export async function GET(request) {
  const date = new URL(request.url).searchParams.get('date')?.trim();
  if (!isValidDate(date)) {
    return NextResponse.json({ ok: false, error: 'date は YYYY-MM-DD 形式で指定してください' }, { status: 400 });
  }

  const apiToken = process.env.FOOTBALL_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json({ ok: false, error: 'FOOTBALL_API_TOKEN が未設定です' }, { status: 500 });
  }

  const endpoint = new URL('https://api.football-data.org/v4/matches');
  endpoint.searchParams.set('dateFrom', date);
  endpoint.searchParams.set('dateTo', date);

  try {
    const footballRes = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'X-Auth-Token': apiToken,
      },
    });

    if (!footballRes.ok) {
      const detail = await footballRes.text();
      return NextResponse.json({ ok: false, error: `football-data.org 試合一覧取得失敗 (${footballRes.status}): ${detail}` }, { status: 502 });
    }

    const data = await footballRes.json();
    return NextResponse.json({ ok: true, matches: normalizeFootballMatchCandidates(data.matches || []) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'football-data.org 試合一覧取得失敗' }, { status: 500 });
  }
}
