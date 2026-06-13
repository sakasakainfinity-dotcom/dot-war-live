import { NextResponse } from 'next/server';
import { savePaidEvents, readPaidEventSummary } from '../../../../lib/server/paidEventsStore';
import { readCurrentStreamSettings } from '../../../../lib/server/streamSettingsStore';
import { assertYoutubeApiCallAllowed, getYoutubeApiUsageSnapshot, isMockCommentsEnabled, maybeLogYoutubeApiUsage, recordYoutubeApiCall, recordYoutubeQuotaExceeded } from '../../../../lib/server/youtubeApiUsage';
import { detectCommandCode } from '../../../../lib/youtubeVoteParser';

const MIN_POLLING_INTERVAL_MS = 5_000;
const DEFAULT_POLLING_INTERVAL_MS = 60_000;
const ERROR_BACKOFF_INITIAL_MS = 30_000;
const ERROR_BACKOFF_MAX_MS = 15 * 60_000;
const CACHE_MAX_ITEMS = 120;

const pollerState = globalThis.__fanWarYoutubeCommentsPoller || {
  liveChatId: '',
  videoId: '',
  comments: [],
  nextPageToken: '',
  pollingIntervalMs: DEFAULT_POLLING_INTERVAL_MS,
  nextFetchAt: 0,
  errorBackoffMs: ERROR_BACKOFF_INITIAL_MS,
  inflight: null,
  lastError: '',
  stopped: false,
};
globalThis.__fanWarYoutubeCommentsPoller = pollerState;

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
    user: { id: snippet.authorChannelId || item.etag || 'unknown', name: snippet.authorDisplayName || 'unknown', platform: 'youtube' },
    isSuperChat,
    currency,
    amountMicros,
    amountNumeric,
    amount,
  };
}

function parseAction(commandCode) {
  if (!commandCode) return { actionType: '', actionTarget: '', actionValue: '' };
  if (commandCode === 'A') return { actionType: 'vote', actionTarget: 'blue', actionValue: '1' };
  if (commandCode === 'B') return { actionType: 'vote', actionTarget: 'red', actionValue: '1' };
  if (commandCode === '3A') return { actionType: 'vote', actionTarget: 'blue', actionValue: '3' };
  if (commandCode === '3B') return { actionType: 'vote', actionTarget: 'red', actionValue: '3' };
  if (commandCode === '5A') return { actionType: 'attack', actionTarget: 'red', actionValue: '3' };
  if (commandCode === '5B') return { actionType: 'attack', actionTarget: 'blue', actionValue: '3' };
  return { actionType: '', actionTarget: '', actionValue: '' };
}

function makeMockComments() {
  return [{ id: `mock-${Date.now()}`, text: 'A', createdAt: new Date().toISOString(), user: { id: 'mock-user', name: 'Mock Fan', platform: 'youtube' }, isSuperChat: false, currency: '', amountMicros: 0, amountNumeric: 0, amount: '', commandCode: 'A' }];
}

function mergeComments(items) {
  const existing = new Set(pollerState.comments.map((item) => item.id));
  const newItems = items.filter((item) => item.id && !existing.has(item.id));
  if (newItems.length > 0) pollerState.comments = [...newItems, ...pollerState.comments].slice(0, CACHE_MAX_ITEMS);
  return newItems;
}

async function syncPaidEvents(config, enrichedItems) {
  const paidEvents = enrichedItems.filter((item) => item.isSuperChat).map((item) => {
    const action = parseAction(item.commandCode);
    return { message_id: item.id, stream_video_id: config.current_video_id || '', user_channel_id: item.user.id, user_name: item.user.name, message_text: item.text, currency: item.currency, amount_micros: item.amountMicros, amount_numeric: item.amountNumeric, action_type: action.actionType, action_target: action.actionTarget, action_value: action.actionValue, created_at: item.createdAt };
  });
  if (paidEvents.length > 0) await savePaidEvents(paidEvents);
}

async function fetchLatestComments(config) {
  assertYoutubeApiCallAllowed('liveChatMessages.list');
  const endpoint = new URL('https://www.googleapis.com/youtube/v3/liveChat/messages');
  endpoint.searchParams.set('part', 'snippet,authorDetails');
  endpoint.searchParams.set('liveChatId', config.current_live_chat_id);
  endpoint.searchParams.set('maxResults', '50');
  endpoint.searchParams.set('key', process.env.YOUTUBE_API_KEY);
  if (pollerState.nextPageToken) endpoint.searchParams.set('pageToken', pollerState.nextPageToken);

  recordYoutubeApiCall('liveChatMessages.list');
  const ytRes = await fetch(endpoint, { cache: 'no-store' });
  const responseText = await ytRes.text();
  if (!ytRes.ok) {
    if (ytRes.status === 403 && responseText.includes('quotaExceeded')) recordYoutubeQuotaExceeded('liveChatMessages.list', responseText);
    throw new Error(`YouTubeコメント取得失敗 (${ytRes.status}): ${responseText}`);
  }

  const data = JSON.parse(responseText);
  pollerState.nextPageToken = data.nextPageToken || pollerState.nextPageToken || '';
  pollerState.pollingIntervalMs = Math.max(Number(data.pollingIntervalMillis || DEFAULT_POLLING_INTERVAL_MS), MIN_POLLING_INTERVAL_MS);
  const allItems = (data.items || []).map(normalizeYouTubeItem);
  const enrichedItems = allItems.map((item) => {
    const detection = detectCommandCode(item);
    if (detection.ignoreReason) console.log('[youtube:ignored-comment]', { rawText: item.text, normalizedText: detection.normalizedText, authorChannelId: item.user.id, messageId: item.id, ignoreReason: detection.ignoreReason });
    return { ...item, commandCode: detection.commandCode };
  });
  const newItems = mergeComments(enrichedItems);
  await syncPaidEvents(config, newItems);
  pollerState.lastError = '';
  pollerState.errorBackoffMs = ERROR_BACKOFF_INITIAL_MS;
  pollerState.nextFetchAt = Date.now() + pollerState.pollingIntervalMs;
}

async function ensureFreshComments(config) {
  if (isMockCommentsEnabled()) {
    pollerState.comments = makeMockComments();
    pollerState.nextFetchAt = Date.now() + DEFAULT_POLLING_INTERVAL_MS;
    return;
  }
  if (pollerState.liveChatId !== config.current_live_chat_id || pollerState.videoId !== config.current_video_id) {
    Object.assign(pollerState, { liveChatId: config.current_live_chat_id, videoId: config.current_video_id || '', comments: [], nextPageToken: '', pollingIntervalMs: DEFAULT_POLLING_INTERVAL_MS, nextFetchAt: 0, errorBackoffMs: ERROR_BACKOFF_INITIAL_MS, lastError: '', stopped: false });
  }
  if (pollerState.stopped || Date.now() < pollerState.nextFetchAt) return;
  if (!pollerState.inflight) {
    pollerState.inflight = fetchLatestComments(config).catch((error) => {
      pollerState.lastError = error.message;
      pollerState.nextFetchAt = Date.now() + pollerState.errorBackoffMs;
      pollerState.errorBackoffMs = Math.min(pollerState.errorBackoffMs * 2, ERROR_BACKOFF_MAX_MS);
      if (error.message.includes('quotaExceeded') || error.message.includes('daily app limit') || error.message.includes('stopped')) pollerState.stopped = true;
      console.error('[youtube:comments:poll-error]', { error: error.message, nextRetryAt: new Date(pollerState.nextFetchAt).toISOString(), errorBackoffMs: pollerState.errorBackoffMs });
    }).finally(() => { pollerState.inflight = null; });
  }
  await pollerState.inflight;
}

export async function GET() {
  maybeLogYoutubeApiUsage();
  if (!isMockCommentsEnabled()) {
    const missingEnv = ['YOUTUBE_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((name) => !process.env[name]);
    if (missingEnv.length > 0) return NextResponse.json({ ok: false, error: `環境変数が未設定です: ${missingEnv.join(', ')}`, debug: { missingEnv } }, { status: 500 });
  }

  let config = null;
  if (isMockCommentsEnabled()) {
    config = { current_video_id: 'mock', current_live_chat_id: 'mock' };
  } else {
    try { config = await readCurrentStreamSettings(); } catch (error) { return NextResponse.json({ ok: false, error: `配信設定を取得できませんでした: ${error.message}` }, { status: 500 }); }
    if (!config?.current_live_chat_id) return NextResponse.json({ ok: false, error: 'current_live_chat_id が未設定です', debug: { videoId: config?.current_video_id || '' } }, { status: 400 });
  }

  await ensureFreshComments(config);
  let summary = { topSupporters: [], latestPaidComments: [] };
  let paidEventsWarning = '';
  try { summary = await readPaidEventSummary(config?.current_video_id || ''); } catch (error) { paidEventsWarning = error instanceof Error ? error.message : 'Failed to read paid events'; }
  return NextResponse.json({ ok: true, comments: pollerState.comments, commandComments: pollerState.comments.filter((item) => item.commandCode), nextPageToken: '', pollingIntervalMs: pollerState.pollingIntervalMs, nextFetchAt: pollerState.nextFetchAt, lastError: pollerState.lastError, youtubeApiUsage: getYoutubeApiUsageSnapshot(), source: { videoId: config?.current_video_id || '', liveChatId: config?.current_live_chat_id || '' }, topSupporters: summary.topSupporters, latestPaidComments: summary.latestPaidComments, paidEventsWarning });
}
