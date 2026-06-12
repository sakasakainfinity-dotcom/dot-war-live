import { NextResponse } from 'next/server';
import { savePaidEvents, readPaidEventSummary } from '../../../../lib/server/paidEventsStore';
import { readCurrentStreamSettings } from '../../../../lib/server/streamSettingsStore';
import { detectCommandCode } from '../../../../lib/youtubeVoteParser';

const POLLING_INTERVAL_MS = 60_000;

function normalizeYouTubeItem(item) {
  const snippet = item?.snippet || {};
  const details = snippet?.superChatDetails;
  const amountMicros = Number(details?.amountMicros || 0);
  const isSuperChat = amountMicros > 0;
  const amountNumeric = isSuperChat ? amountMicros / 1_000_000 : 0;
  const currency = details?.currency || '';
  const amount = isSuperChat ? `${currency} ${amountNumeric.toLocaleString()}`.trim() : '';

  return {
    id: item.id,
    text: snippet.displayMessage || '',
    createdAt: snippet.publishedAt || new Date().toISOString(),
    user: {
      id: snippet.authorChannelId || item.etag || 'unknown',
      name: snippet.authorDisplayName || 'unknown',
      platform: 'youtube',
    },
    isSuperChat,
    currency,
    amountMicros,
    amountNumeric,
    amount,
  };
}

function parseAction(commandCode) {
  if (!commandCode) {
    return { actionType: '', actionTarget: '', actionValue: '' };
  }

  if (commandCode === 'A') return { actionType: 'vote', actionTarget: 'blue', actionValue: '1' };
  if (commandCode === 'B') return { actionType: 'vote', actionTarget: 'red', actionValue: '1' };
  if (commandCode === '3A') return { actionType: 'vote', actionTarget: 'blue', actionValue: '3' };
  if (commandCode === '3B') return { actionType: 'vote', actionTarget: 'red', actionValue: '3' };
  if (commandCode === '5A') return { actionType: 'attack', actionTarget: 'red', actionValue: '3' };
  if (commandCode === '5B') return { actionType: 'attack', actionTarget: 'blue', actionValue: '3' };

  return { actionType: '', actionTarget: '', actionValue: '' };
}

export async function GET(request) {
  const missingEnv = ['YOUTUBE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
  if (missingEnv.length > 0) {
    console.error('[youtube:comments:missing-env]', { missingEnv });
    return NextResponse.json({ ok: false, error: `環境変数が未設定です: ${missingEnv.join(', ')}`, debug: { missingEnv } }, { status: 500 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  let config = null;
  try {
    config = await readCurrentStreamSettings();
  } catch (error) {
    console.error('[youtube:comments:settings-read-error]', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ ok: false, error: `配信設定を取得できませんでした: ${error.message}` }, { status: 500 });
  }

  if (!config?.current_live_chat_id) {
    console.error('[youtube:comments:missing-live-chat-id]', { input: config?.current_video_id || '', videoId: config?.current_video_id || '', liveChatId: config?.current_live_chat_id || '' });
    return NextResponse.json({ ok: false, error: 'current_live_chat_id が未設定です', debug: { videoId: config?.current_video_id || '' } }, { status: 400 });
  }

  const pageToken = new URL(request.url).searchParams.get('pageToken');
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
  endpoint.searchParams.set('part', 'snippet,authorDetails');
  endpoint.searchParams.set('liveChatId', config.current_live_chat_id);
  endpoint.searchParams.set('maxResults', '50');
  endpoint.searchParams.set('key', apiKey);
  if (pageToken) endpoint.searchParams.set('pageToken', pageToken);

  const ytRes = await fetch(endpoint, { cache: 'no-store' });
  if (!ytRes.ok) {
    const detail = await ytRes.text();
    console.error('[youtube:comments:api-error]', {
      input: config.current_video_id || '',
      videoId: config.current_video_id || '',
      liveChatId: config.current_live_chat_id,
      status: ytRes.status,
      detail,
    });
    return NextResponse.json({ ok: false, error: `YouTubeコメント取得失敗 (${ytRes.status}): ${detail}`, debug: { videoId: config.current_video_id || '', liveChatId: config.current_live_chat_id } }, { status: 502 });
  }

  const data = await ytRes.json();
  const allItems = (data.items || []).map(normalizeYouTubeItem);
  const enrichedItems = allItems.map((item) => {
    const detection = detectCommandCode(item);
    if (detection.ignoreReason) {
      console.log('[youtube:ignored-comment]', {
        rawText: item.text,
        normalizedText: detection.normalizedText,
        authorChannelId: item.user.id,
        messageId: item.id,
        ignoreReason: detection.ignoreReason,
      });
    }
    return { ...item, commandCode: detection.commandCode };
  });
  const commandItems = enrichedItems.filter((item) => item.commandCode);

  const paidEvents = enrichedItems
    .filter((item) => item.isSuperChat)
    .map((item) => {
      const action = parseAction(item.commandCode);
      return {
        message_id: item.id,
        stream_video_id: config.current_video_id || '',
        user_channel_id: item.user.id,
        user_name: item.user.name,
        message_text: item.text,
        currency: item.currency,
        amount_micros: item.amountMicros,
        amount_numeric: item.amountNumeric,
        action_type: action.actionType,
        action_target: action.actionTarget,
        action_value: action.actionValue,
        created_at: item.createdAt,
      };
    });

  let summary = { topSupporters: [], latestPaidComments: [] };
  let paidEventsWarning = '';
  try {
    if (paidEvents.length > 0) {
      await savePaidEvents(paidEvents);
    }
    summary = await readPaidEventSummary(config.current_video_id || '');
  } catch (error) {
    paidEventsWarning = error instanceof Error ? error.message : 'Failed to sync paid events';
  }

  return NextResponse.json({
    ok: true,
    comments: enrichedItems,
    commandComments: commandItems,
    nextPageToken: data.nextPageToken || '',
    pollingIntervalMs: POLLING_INTERVAL_MS,
    source: {
      videoId: config.current_video_id || '',
      liveChatId: config.current_live_chat_id,
    },
    topSupporters: summary.topSupporters,
    latestPaidComments: summary.latestPaidComments,
    paidEventsWarning,
  });
}
