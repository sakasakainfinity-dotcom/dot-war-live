import { NextResponse } from 'next/server';
import { checkAdminRequest } from '../../../../../lib/server/adminAuth';
import { readCurrentStreamSettings, upsertCurrentStreamSettings } from '../../../../../lib/server/streamSettingsStore';
import { extractYoutubeVideoId } from '../../../../../lib/youtubeVideoId';

function jsonError({ step, message, detail, status = 500, videoId = '', youtubeStatus, saveStatus }) {
  return NextResponse.json(
    { ok: false, step, message, detail, videoId, status: youtubeStatus ?? saveStatus, youtubeStatus, saveStatus },
    { status },
  );
}

function redactApiKey(url) {
  const safeUrl = new URL(url.toString());
  if (safeUrl.searchParams.has('key')) {
    safeUrl.searchParams.set('key', '[REDACTED]');
  }
  return safeUrl.toString();
}

function logCaughtError(label, error, extra = {}) {
  console.error(label, {
    ...extra,
    name: error instanceof Error ? error.name : undefined,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

function explainYoutubeFailure(status, body) {
  if (status === 400) return 'YouTube APIリクエストが不正です。videoIdまたはAPIキー設定を確認してください。';
  if (status === 403 && `${body}`.includes('quotaExceeded')) {
    return 'YouTube APIの1日あたりの割り当て上限に達しています。コメント取得は1分に1回ですが、この保存処理ではliveChatId確認のため動画情報APIを1回呼び出します。日次クォータ回復後に再実行してください。';
  }
  if (status === 403) return 'YouTube API key is invalid, quota exceeded, or permission is denied.';
  if (status === 404) return 'videoIdが間違っているか、動画が見つかりません。';
  return `YouTube APIの呼び出しに失敗しました (status=${status})`;
}

export async function POST(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return jsonError({ step: 'auth', message: auth.error, status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch (error) {
    logCaughtError('[youtube:set-live-chat:parse-body-error]', error);
    return jsonError({ step: 'parse_video_id', message: 'JSONリクエスト本文を解析できませんでした', detail: error.message, status: 400 });
  }

  const videoIdOrUrl = `${body.videoIdOrUrl ?? body.videoId ?? ''}`.trim();
  const extraction = extractYoutubeVideoId(videoIdOrUrl);
  const videoId = extraction.ok ? extraction.videoId : '';

  if (!extraction.ok) {
    console.error('[youtube:set-live-chat:parse-video-id:failed]', { input: videoIdOrUrl, videoId, message: extraction.error });
    return jsonError({
      step: 'parse_video_id',
      message: `${extraction.error}。動画ID、YouTubeライブURL、watch URL、youtu.be URLを入力してください。`,
      detail: JSON.stringify({ input: videoIdOrUrl }),
      status: 400,
      videoId,
    });
  }

  console.log('[youtube:set-live-chat:parse-video-id:success]', { input: videoIdOrUrl, videoId });

  let currentSettings = null;
  try {
    currentSettings = await readCurrentStreamSettings();
  } catch (error) {
    logCaughtError('[youtube:set-live-chat:read-current-settings:caught]', error, { videoId });
  }

  if (currentSettings?.current_video_id === videoId && currentSettings?.current_live_chat_id) {
    console.log('[youtube:set-live-chat:reuse-current-settings]', { videoId, liveChatId: currentSettings.current_live_chat_id });
    return NextResponse.json({ ok: true, videoId, liveChatId: currentSettings.current_live_chat_id, reused: true });
  }

  if (!process.env.YOUTUBE_API_KEY) {
    console.error('[youtube:set-live-chat:youtube-fetch:missing-env]', { videoId, missingEnv: ['YOUTUBE_API_KEY'] });
    return jsonError({ step: 'youtube_fetch', message: 'APIキーが未設定です: YOUTUBE_API_KEY', status: 500, videoId });
  }

  const endpoint = new URL('https://www.googleapis.com/youtube/v3/videos');
  endpoint.searchParams.set('part', 'liveStreamingDetails,snippet');
  endpoint.searchParams.set('id', videoId);
  endpoint.searchParams.set('key', process.env.YOUTUBE_API_KEY);
  const safeApiUrl = redactApiKey(endpoint);
  console.log('[youtube:set-live-chat:youtube-fetch:request]', { videoId, apiUrl: safeApiUrl });

  let data;
  try {
    const ytRes = await fetch(endpoint, { cache: 'no-store' });
    const responseText = await ytRes.text();
    console.log('[youtube:set-live-chat:youtube-fetch:response]', { videoId, apiUrl: safeApiUrl, status: ytRes.status, body: responseText });

    if (!ytRes.ok) {
      if (ytRes.status === 403 && responseText.includes('quotaExceeded') && currentSettings?.current_video_id === videoId && currentSettings?.current_live_chat_id) {
        console.warn('[youtube:set-live-chat:youtube-fetch:quota-reuse-current-settings]', { videoId, liveChatId: currentSettings.current_live_chat_id });
        return NextResponse.json({ ok: true, videoId, liveChatId: currentSettings.current_live_chat_id, reused: true, warning: explainYoutubeFailure(ytRes.status, responseText) });
      }
      return jsonError({ step: 'youtube_fetch', message: explainYoutubeFailure(ytRes.status, responseText), detail: responseText, status: 502, videoId, youtubeStatus: ytRes.status });
    }

    data = JSON.parse(responseText);
  } catch (error) {
    logCaughtError('[youtube:set-live-chat:youtube-fetch:caught]', error, { videoId, apiUrl: safeApiUrl });
    return jsonError({ step: 'youtube_fetch', message: error.message, detail: error.stack, status: 502, videoId });
  }

  const item = data?.items?.[0];
  if (!Array.isArray(data?.items) || !item) {
    console.error('[youtube:set-live-chat:youtube-fetch:no-items]', { videoId, response: data });
    return jsonError({ step: 'youtube_fetch', message: 'YouTube APIレスポンスに items がない、または動画が見つかりません。videoIdが間違っている可能性があります。', detail: JSON.stringify(data), status: 404, videoId });
  }

  const liveChatId = item.liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) {
    console.error('[youtube:set-live-chat:youtube-fetch:no-active-live-chat-id]', { videoId, liveStreamingDetails: item.liveStreamingDetails, snippet: item.snippet });
    return jsonError({ step: 'youtube_fetch', message: 'activeLiveChatIdを取得できません。ライブ配信中ではない、チャットが無効、または配信が終了している可能性があります。', detail: JSON.stringify({ liveStreamingDetails: item.liveStreamingDetails, liveBroadcastContent: item.snippet?.liveBroadcastContent }), status: 400, videoId });
  }

  console.log('[youtube:set-live-chat:youtube-fetch:success]', { videoId, liveChatId });

  try {
    console.log('[youtube:set-live-chat:save-db:request]', { videoId, liveChatId });
    const saved = await upsertCurrentStreamSettings({ videoId, liveChatId });
    console.log('[youtube:set-live-chat:save-db:success]', { videoId, liveChatId, saved });
    return NextResponse.json({ ok: true, videoId, liveChatId });
  } catch (error) {
    logCaughtError('[youtube:set-live-chat:save-db:caught]', error, { videoId, liveChatId });
    return jsonError({ step: 'save_db', message: error.message, detail: error.stack, status: 500, videoId });
  }
}
