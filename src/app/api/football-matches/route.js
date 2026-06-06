import { NextResponse } from 'next/server';
import { buildWorldCupMatchesEndpoint, getFallbackWorldCupMatches, normalizeFootballMatchCandidates, WORLD_CUP_COMPETITION_CODE } from '../../../lib/footballScore.js';

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function buildResponse({ date, dateTo, matches, warning = '' }) {
  return NextResponse.json({
    ok: true,
    competitionCode: WORLD_CUP_COMPETITION_CODE,
    dateFrom: date,
    dateTo,
    matches,
    warning,
  });
}

export async function GET(request) {
  const date = new URL(request.url).searchParams.get('date')?.trim();
  if (!isValidDate(date)) {
    return NextResponse.json({ ok: false, error: 'date は YYYY-MM-DD 形式で指定してください' }, { status: 400 });
  }

  const { endpoint, dateTo } = buildWorldCupMatchesEndpoint(date);
  const fallbackMatches = getFallbackWorldCupMatches(date, dateTo);
  const apiToken = process.env.FOOTBALL_API_TOKEN;
  if (!apiToken) {
    return buildResponse({ date, dateTo, matches: fallbackMatches, warning: 'FOOTBALL_API_TOKEN が未設定のため、W杯の固定候補を表示しています' });
  }

  try {
    const footballRes = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        'X-Auth-Token': apiToken,
      },
    });

    if (!footballRes.ok) {
      const detail = await footballRes.text();
      return buildResponse({ date, dateTo, matches: fallbackMatches, warning: `football-data.org W杯試合一覧取得失敗 (${footballRes.status}): ${detail}` });
    }

    const data = await footballRes.json();
    const apiMatches = normalizeFootballMatchCandidates(data.matches || []);
    if (apiMatches.length > 0) {
      return buildResponse({ date, dateTo, matches: apiMatches });
    }

    return buildResponse({ date, dateTo, matches: fallbackMatches, warning: 'football-data.org にこの期間のW杯候補が無かったため、W杯の固定候補を表示しています' });
  } catch (error) {
    return buildResponse({ date, dateTo, matches: fallbackMatches, warning: error instanceof Error ? error.message : 'football-data.org W杯試合一覧取得失敗' });
  }
}
