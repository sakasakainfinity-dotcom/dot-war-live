import test from 'node:test';
import assert from 'node:assert/strict';
import { extractYoutubeVideoId } from '../src/lib/youtubeVideoId.js';

test('extract plain video id', () => {
  assert.deepEqual(extractYoutubeVideoId('NCBNKK-kGZc'), { ok: true, videoId: 'NCBNKK-kGZc' });
});

test('extract from watch url', () => {
  assert.deepEqual(extractYoutubeVideoId('https://www.youtube.com/watch?v=NCBNKK-kGZc'), { ok: true, videoId: 'NCBNKK-kGZc' });
});

test('extract from live url', () => {
  assert.deepEqual(extractYoutubeVideoId('https://youtube.com/live/NCBNKK-kGZc?feature=share'), { ok: true, videoId: 'NCBNKK-kGZc' });
});

test('reject invalid input', () => {
  const result = extractYoutubeVideoId('not-a-video-id');
  assert.equal(result.ok, false);
});
