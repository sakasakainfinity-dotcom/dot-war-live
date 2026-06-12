import { NextResponse } from 'next/server';
import { checkAdminRequest } from '../../../../../lib/server/adminAuth';
import { upsertCurrentStreamSettings } from '../../../../../lib/server/streamSettingsStore';
import { extractYoutubeVideoId } from '../../../../../lib/youtubeVideoId';

export async function POST(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const videoIdOrUrl = `${body.videoIdOrUrl ?? ''}`.trim();
  const extraction = extractYoutubeVideoId(videoIdOrUrl);
  const videoId = extraction.ok ? extraction.videoId : '';

  if (!extraction.ok) {
    console.error('[youtube:set-live-chat:invalid-video-input]', { input: videoIdOrUrl, videoId, error: extraction.error });
    return NextResponse.json(
      {
        ok: false,
        error: `${extraction.error}。動画ID、YouTubeライブURL、watch URL、youtu.be URLを入力してください。`,
        debug: { input: videoIdOrUrl, videoId },
      },
      { status: 400 },
    );
  }

  const missingEnv = ['YOUTUBE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
  if (missingEnv.length > 0) {
    console.error('[youtube:set-live-chat:missing-env]', { input: videoIdOrUrl, videoId, missingEnv });
    return NextResponse.json(
      {
        ok: false,
        error: `環境変数が未設定です: ${missingEnv.join(', ')}`,
        debug: { input: videoIdOrUrl, videoId, missingEnv },
      },
      { status: 500 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  console.log('[youtube:set-live-chat:resolved-video-id]', { input: videoIdOrUrl, videoId });
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'liveStreamingDetails');
  endpoint.searchParams.set('id', videoId);
  endpoint.searchParams.set('key', apiKey);

  try {
    const ytRes = await fetch(endpoint, { cache: 'no-store' });
    if (!ytRes.ok) {
      const detail = await ytRes.text();
      console.error('[youtube:set-live-chat:api-error]', { input: videoIdOrUrl, videoId, status: ytRes.status, detail });
      return NextResponse.json({ ok: false, error: `YouTube APIの呼び出しに失敗しました (${ytRes.status}): ${detail}`, debug: { input: videoIdOrUrl, videoId } }, { status: 502 });
    }

    const data = await ytRes.json();
    const item = data?.items?.[0];
    if (!item) {
      console.error('[youtube:set-live-chat:no-video-item]', { input: videoIdOrUrl, videoId, response: data });
      return NextResponse.json({ ok: false, error: '配信IDが見つかりません', debug: { input: videoIdOrUrl, videoId } }, { status: 404 });
    }

    const details = item.liveStreamingDetails;
    if (!details) {
      console.error('[youtube:set-live-chat:no-live-streaming-details]', { input: videoIdOrUrl, videoId, item });
      return NextResponse.json({ ok: false, error: 'liveStreamingDetails が取得できませんでした', debug: { input: videoIdOrUrl, videoId } }, { status: 400 });
    }

    const liveChatId = details.activeLiveChatId;
    if (!liveChatId) {
      console.error('[youtube:set-live-chat:no-active-live-chat-id]', { input: videoIdOrUrl, videoId, liveStreamingDetails: details });
      return NextResponse.json({ ok: false, error: 'activeLiveChatId が取得できませんでした。ライブ開始前の可能性があります', debug: { input: videoIdOrUrl, videoId } }, { status: 400 });
    }

    await upsertCurrentStreamSettings({ videoId, liveChatId });

    return NextResponse.json({ ok: true, videoId, liveChatId });
  } catch (error) {
    console.error('[youtube:set-live-chat:save-error]', { input: videoIdOrUrl, videoId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: `保存処理に失敗しました: ${error.message}`, debug: { input: videoIdOrUrl, videoId } }, { status: 500 });
  }
}
