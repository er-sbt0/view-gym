import express from 'express';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchVideoMeta, parseYouTubeId } from './lib/youtube.js';
import { inferTags } from './lib/infer.js';
import { PRESETS } from './lib/presets.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || join(ROOT, 'data', 'videos.json');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';

let videos = [];

async function load() {
  try {
    videos = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    videos = [];
  }
}

async function save() {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(videos, null, 2));
  await rename(tmp, DATA_FILE);
}

function cleanList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const v = String(item).trim();
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase());
      out.push(v);
    }
  }
  return out;
}

function tagFields(body) {
  const fields = {
    muscles: cleanList(body.muscles),
    equipment: cleanList(body.equipment),
    exercise: String(body.exercise || '').trim(),
  };
  if (typeof body.isShort === 'boolean') fields.isShort = body.isShort;
  return fields;
}

const app = express();
app.use(express.json());
app.use(express.static(join(ROOT, 'public')));

app.get('/api/videos', (_req, res) => res.json(videos));

app.get('/api/presets', (_req, res) => res.json(PRESETS));

app.post('/api/preview', async (req, res) => {
  try {
    const meta = await fetchVideoMeta(req.body.url);
    const existing = videos.find((v) => v.ytId === meta.ytId);
    res.json({ ...meta, suggested: inferTags(meta.title), duplicateOf: existing?.id ?? null });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/videos', async (req, res) => {
  const ytId = parseYouTubeId(req.body.url);
  if (!ytId) return res.status(400).json({ error: 'Not a recognizable YouTube URL' });
  if (videos.some((v) => v.ytId === ytId)) {
    return res.status(409).json({ error: 'That video is already in the catalog' });
  }
  try {
    const meta = await fetchVideoMeta(req.body.url);
    const video = { id: randomUUID(), ...meta, ...tagFields(req.body), addedAt: new Date().toISOString() };
    videos.unshift(video);
    await save();
    res.status(201).json(video);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/videos/:id', async (req, res) => {
  const video = videos.find((v) => v.id === req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  Object.assign(video, tagFields(req.body));
  await save();
  res.json(video);
});

app.delete('/api/videos/:id', async (req, res) => {
  const idx = videos.findIndex((v) => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  videos.splice(idx, 1);
  await save();
  res.status(204).end();
});

await load();
app.listen(PORT, HOST, () => {
  console.log(`View Gym running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
