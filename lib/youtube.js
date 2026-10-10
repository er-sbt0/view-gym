const ID_RE = /^[A-Za-z0-9_-]{11}$/;

// Extracts the 11-char video ID from any common YouTube URL form, or a bare ID.
export function parseYouTubeId(input) {
  const raw = String(input || '').trim();
  if (ID_RE.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, '');

  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1];
    return ID_RE.test(id) ? id : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = url.searchParams.get('v');
    if (v && ID_RE.test(v)) return v;
    const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  }
  return null;
}

export function isShortsUrl(input) {
  return /youtube\.com\/shorts\//i.test(String(input || ''));
}

// youtube.com/shorts/<id> answers 200 for a Short and redirects to /watch for a regular video.
async function probeIsShort(id) {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    if (res.status === 200) return true;
    if (res.status >= 300 && res.status < 400) return false;
  } catch {
    // network trouble: fall through to unknown
  }
  return null;
}

export async function fetchVideoMeta(input) {
  const id = parseYouTubeId(input);
  if (!id) throw new Error('Not a recognizable YouTube URL');

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`,
    { signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'This video does not allow embedding'
        : 'Video not found (private or deleted?)',
    );
  }
  const data = await res.json();

  let isShort = isShortsUrl(input) ? true : await probeIsShort(id);
  if (isShort === null) isShort = data.height > data.width;

  return {
    ytId: id,
    title: data.title,
    channel: data.author_name,
    channelUrl: data.author_url,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    isShort,
  };
}
