import { NextResponse } from 'next/server';
import { checkAdminRequest } from '../../../../../lib/server/adminAuth';
import { upsertCurrentStreamSettings } from '../../../../../lib/server/streamSettingsStore';

export async function POST(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'YouTube APIキーが未設定です' }, { status: 500 });
  }

  console.log('ENV CHECK', {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV
  });

  const missingSupabaseEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
  if (missingSupabaseEnv.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Supabase環境変数が未設定です (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を使用)',
        debug: {
          missingEnv: missingSupabaseEnv
        }
      },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const videoIdOrUrl = `${body.videoIdOrUrl ?? ''}`;
  let videoId = videoIdOrUrl.trim();

  const liveMatch = videoId.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/);
  const watchMatch = videoId.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  const studioMatch = videoId.match(/studio\.youtube\.com\/video\/([a-zA-Z0-9_-]+)/);
  const plainMatch = videoId.match(/^[a-zA-Z0-9_-]{11}$/);

  console.log('受信した入力:', videoIdOrUrl);
  console.log('liveMatch:', liveMatch);
  console.log('watchMatch:', watchMatch);
  console.log('studioMatch:', studioMatch);

  if (liveMatch) {
    videoId = liveMatch[1];
  } else if (watchMatch) {
    videoId = watchMatch[1];
  } else if (studioMatch) {
    videoId = studioMatch[1];
  } else if (plainMatch) {
    videoId = plainMatch[0];
  } else {
    return NextResponse.json(
      {
        ok: false,
        error: 'YouTube動画IDを抽出できませんでした',
        debug: {
          input: videoIdOrUrl
        }
      },
      { status: 400 }
    );
  }
  console.log('最終videoId:', videoId);
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'liveStreamingDetails');
  endpoint.searchParams.set('id', videoId);
  endpoint.searchParams.set('key', apiKey);

  try {
    const ytRes = await fetch(endpoint, { cache: 'no-store' });
    if (!ytRes.ok) {
      const detail = await ytRes.text();
      return NextResponse.json({ ok: false, error: `YouTube APIの呼び出しに失敗しました (${ytRes.status}): ${detail}` }, { status: 502 });
    }

    const data = await ytRes.json();
    const item = data?.items?.[0];
    if (!item) {
      return NextResponse.json({ ok: false, error: '配信IDが見つかりません' }, { status: 404 });
    }

    const details = item.liveStreamingDetails;
    if (!details) {
      return NextResponse.json({ ok: false, error: 'liveStreamingDetails が取得できませんでした' }, { status: 400 });
    }

    const liveChatId = details.activeLiveChatId;
    if (!liveChatId) {
      return NextResponse.json({ ok: false, error: 'activeLiveChatId が取得できませんでした。ライブ開始前の可能性があります' }, { status: 400 });
    }

    await upsertCurrentStreamSettings({ videoId, liveChatId });

    return NextResponse.json({ ok: true, videoId, liveChatId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: `保存処理に失敗しました: ${error.message}` }, { status: 500 });
  }
}
