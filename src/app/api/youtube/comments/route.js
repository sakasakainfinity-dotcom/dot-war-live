import { NextResponse } from 'next/server';
import { savePaidEvents, readPaidEventSummary } from '../../../../lib/server/paidEventsStore';
import { readCurrentStreamSettings } from '../../../../lib/server/streamSettingsStore';

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

function detectCommandCode(text = '', isSuperChat = false, amount = '') {
  const upper = text.toUpperCase();
  const team = upper.includes('R') ? 'R' : upper.includes('B') ? 'B' : '';
  if (!team) return '';
  if (!isSuperChat) return team;

  if (/(^|\D)(5|500)(\D|$)/.test(text) || /\b5(\.0+)?\b/.test(amount)) return `5${team}`;
  if (/(^|\D)(3|300)(\D|$)/.test(text) || /\b3(\.0+)?\b/.test(amount)) return `3${team}`;
  return team;
}

function parseAction(commandCode) {
  if (!commandCode) {
    return { actionType: '', actionTarget: '', actionValue: '' };
  }

  if (commandCode === 'B') return { actionType: 'vote', actionTarget: 'blue', actionValue: '1' };
  if (commandCode === 'R') return { actionType: 'vote', actionTarget: 'red', actionValue: '1' };
  if (commandCode === '3B') return { actionType: 'vote', actionTarget: 'blue', actionValue: '3' };
  if (commandCode === '3R') return { actionType: 'vote', actionTarget: 'red', actionValue: '3' };
  if (commandCode === '5B') return { actionType: 'attack', actionTarget: 'red', actionValue: '3' };
  if (commandCode === '5R') return { actionType: 'attack', actionTarget: 'blue', actionValue: '3' };

  return { actionType: '', actionTarget: '', actionValue: '' };
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
  const allItems = (data.items || []).map(normalizeYouTubeItem);
  const enrichedItems = allItems.map((item) => ({ ...item, commandCode: detectCommandCode(item.text, item.isSuperChat, item.amount) }));
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
    comments: commandItems,
    nextPageToken: data.nextPageToken || '',
    pollingIntervalMs: data.pollingIntervalMillis || 5000,
    source: {
      videoId: config.current_video_id || '',
      liveChatId: config.current_live_chat_id,
    },
    topSupporters: summary.topSupporters,
    latestPaidComments: summary.latestPaidComments,
    paidEventsWarning,
  });
}
