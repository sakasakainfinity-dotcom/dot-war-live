import { NextResponse } from 'next/server';
import { readCurrentStreamSettings } from '../../../../lib/server/streamSettingsStore';

function mapItem(item) {
  const snippet = item?.snippet || {};
  const details = snippet?.superChatDetails;
  const amountMicros = Number(details?.amountMicros || 0);
  const isSuperChat = amountMicros > 0;
  const amount = isSuperChat ? `${details.currency || ''} ${(amountMicros / 1_000_000).toLocaleString()}`.trim() : '';

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
    amount,
  };
}

function detectCommandCode(text = '', isSuperChat = false, amount = '') {
  const upper = text.toUpperCase();
  const team = upper.includes('R') ? 'R' : upper.includes('B') ? 'B' : '';
  if (!team) return '';
  if (!isSuperChat) return team;

  if (/(^|\D)(5|500)(\D|$)/.test(text) || /\b5(\.0+)?\b/.test(amount)) return `5${team}`;
  if (/(^|\D)(3|300)(\D|$)/.test(text) || /\b3(\.0+)?\b/.test(amount)) return `3${team}`;
  return team;
}

export async function GET(request) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'YouTube APIキーが未設定です' }, { status: 500 });
  }

  const config = await readCurrentStreamSettings().catch(() => null);
  if (!config?.current_live_chat_id) {
    return NextResponse.json({ ok: false, error: 'current_live_chat_id が未設定です' }, { status: 400 });
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
    return NextResponse.json({ ok: false, error: `YouTubeコメント取得失敗 (${ytRes.status}): ${detail}` }, { status: 502 });
  }

  const data = await ytRes.json();
  const comments = (data.items || [])
    .map(mapItem)
    .map((item) => ({ ...item, commandCode: detectCommandCode(item.text, item.isSuperChat, item.amount) }))
    .filter((item) => item.commandCode);

  return NextResponse.json({
    ok: true,
    comments,
    nextPageToken: data.nextPageToken || '',
    pollingIntervalMs: data.pollingIntervalMillis || 5000,
    source: {
      videoId: config.current_video_id || '',
      liveChatId: config.current_live_chat_id,
    },
  });
}
