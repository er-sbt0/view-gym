import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId, isShortsUrl } from '../lib/youtube.js';

test('parseYouTubeId handles common URL forms', () => {
  const id = 'dQw4w9WgXcQ';
  for (const url of [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?feature=share&v=${id}&t=10s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtube.com/shorts/${id}?feature=share`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
  ]) {
    assert.equal(parseYouTubeId(url), id, url);
  }
});

test('parseYouTubeId rejects non-YouTube input', () => {
  for (const url of ['', 'hello', 'https://vimeo.com/123456', 'https://example.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short']) {
    assert.equal(parseYouTubeId(url), null, url);
  }
});

test('isShortsUrl', () => {
  assert.equal(isShortsUrl('https://youtube.com/shorts/dQw4w9WgXcQ'), true);
  assert.equal(isShortsUrl('https://youtube.com/watch?v=dQw4w9WgXcQ'), false);
});
