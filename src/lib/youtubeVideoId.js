const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYoutubeVideoId(input) {
  const raw = `${input ?? ''}`.trim();
  if (!raw) {
    return { ok: false, error: '動画IDまたはURLを入力してください' };
  }

  if (VIDEO_ID_PATTERN.test(raw)) {
    return { ok: true, videoId: raw };
  }

  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtube.com')) {
      const fromWatch = url.searchParams.get('v');
      if (fromWatch && VIDEO_ID_PATTERN.test(fromWatch)) {
        return { ok: true, videoId: fromWatch };
      }

      const segments = url.pathname.split('/').filter(Boolean);
      const liveIndex = segments.indexOf('live');
      if (liveIndex >= 0 && segments[liveIndex + 1] && VIDEO_ID_PATTERN.test(segments[liveIndex + 1])) {
        return { ok: true, videoId: segments[liveIndex + 1] };
      }
    }

    if (url.hostname === 'youtu.be') {
      const shortId = url.pathname.split('/').filter(Boolean)[0];
      if (shortId && VIDEO_ID_PATTERN.test(shortId)) {
        return { ok: true, videoId: shortId };
      }
    }
  } catch {
    return { ok: false, error: '動画IDの形式が正しくありません' };
  }

  return { ok: false, error: 'YouTube動画IDを抽出できませんでした' };
}
