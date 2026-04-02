import { NextResponse } from 'next/server';
import { checkAdminRequest } from '../../../../../lib/server/adminAuth';
import { upsertCurrentStreamSettings } from '../../../../../lib/server/streamSettingsStore';
import { extractYoutubeVideoId } from '../../../../../lib/youtubeVideoId';

export async function POST(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'YouTube APIキーが未設定です' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = extractYoutubeVideoId(body.videoIdOrUrl);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const videoId = parsed.videoId;
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
