const $ = (sel) => document.querySelector(sel);

const state = {
  videos: [],
  presets: { muscles: [], equipment: [], exercises: [] },
  filters: { q: '', type: 'all', exercise: '', muscles: new Set(), equipment: new Set() },
  playing: null,
};

// ---------- helpers ----------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c != null) node.append(c instanceof Node ? c : document.createTextNode(c));
  }
  return node;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Preset values first (in preset order), then any custom values already used on videos.
function optionsFor(key, presetKey = key) {
  const used = state.videos.flatMap((v) => (key === 'exercise' ? [v.exercise] : v[key])).filter(Boolean);
  const all = [...state.presets[presetKey], ...used];
  const seen = new Set();
  return all.filter((x) => !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
}

function countBy(key) {
  const counts = new Map();
  for (const v of state.videos) for (const t of v[key]) counts.set(t, (counts.get(t) || 0) + 1);
  return counts;
}

// ---------- filtering & rendering ----------

function matches(v) {
  const f = state.filters;
  if (f.type === 'short' && !v.isShort) return false;
  if (f.type === 'long' && v.isShort) return false;
  if (f.exercise && v.exercise !== f.exercise) return false;
  if (f.muscles.size && !v.muscles.some((m) => f.muscles.has(m))) return false;
  if (f.equipment.size && !v.equipment.some((e) => f.equipment.has(e))) return false;
  if (f.q) {
    const hay = [v.title, v.channel, v.exercise, ...v.muscles, ...v.equipment].join(' ').toLowerCase();
    if (!f.q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}

function renderFilterChips(containerSel, key) {
  const box = $(containerSel);
  const counts = countBy(key);
  const selected = state.filters[key];
  box.replaceChildren(
    ...[...counts.keys()]
      .sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b))
      .map((name) =>
        el('button', {
          class: `chip${selected.has(name) ? ' on' : ''}`,
          onclick: () => {
            selected.has(name) ? selected.delete(name) : selected.add(name);
            render();
          },
        }, name, el('span', { class: 'n' }, String(counts.get(name)))),
      ),
  );
  if (!counts.size) box.append(el('span', { class: 'muted' }, '—'));
}

function renderExerciseFilter() {
  const sel = $('#exercise-filter');
  const names = [...new Set(state.videos.map((v) => v.exercise).filter(Boolean))].sort();
  if (state.filters.exercise && !names.includes(state.filters.exercise)) state.filters.exercise = '';
  sel.replaceChildren(
    el('option', { value: '' }, 'All exercises'),
    ...names.map((n) => el('option', { value: n }, n)),
  );
  sel.value = state.filters.exercise;
}

function card(v) {
  return el('article', { class: 'card', onclick: () => openPlayer(v) },
    el('div', { class: `thumb${v.isShort ? ' short' : ''}` },
      el('img', { src: v.thumbnail, alt: '', loading: 'lazy' }),
      el('span', { class: `badge${v.isShort ? ' short' : ''}` }, v.isShort ? 'Short' : 'Video'),
      el('div', { class: 'play' }, '▶'),
      el('button', {
        class: 'card-delete',
        title: 'Delete',
        'aria-label': 'Delete video',
        onclick: (e) => { e.stopPropagation(); deleteVideo(v); },
      }, '×'),
    ),
    el('div', { class: 'card-body' },
      v.exercise ? el('div', { class: 'card-exercise' }, v.exercise) : null,
      el('div', { class: 'card-title' }, v.title),
      tagList(v),
    ),
  );
}

function tagList(v) {
  return el('div', { class: 'tags' },
    v.muscles.map((m) => el('span', { class: 'tag' }, m)),
    v.equipment.map((e) => el('span', { class: 'tag equip' }, e)),
  );
}

function render() {
  const f = state.filters;
  renderFilterChips('#muscle-chips', 'muscles');
  renderFilterChips('#equipment-chips', 'equipment');
  renderExerciseFilter();
  document.querySelectorAll('#type-filter button').forEach((b) =>
    b.classList.toggle('active', b.dataset.type === f.type));

  const list = state.videos.filter(matches);
  $('#grid').replaceChildren(...list.map(card));

  const anyFilter = f.q || f.type !== 'all' || f.exercise || f.muscles.size || f.equipment.size;
  $('#clear-filters').hidden = !anyFilter;
  $('#count').textContent = `${list.length} of ${state.videos.length}`;

  const empty = $('#empty');
  empty.hidden = list.length > 0;
  empty.replaceChildren(
    state.videos.length
      ? el('div', {}, el('strong', {}, 'No matches'), 'Try removing some filters.')
      : el('div', {}, el('strong', {}, 'Your catalog is empty'), 'Click “+ Add video” and paste a YouTube link.'),
  );
}

// ---------- player ----------

function openPlayer(v) {
  state.playing = v;
  const frame = $('#player-frame');
  frame.className = `player-frame${v.isShort ? ' short' : ''}`;
  frame.replaceChildren(el('iframe', {
    src: `https://www.youtube-nocookie.com/embed/${v.ytId}?autoplay=1&rel=0${v.isShort ? '&loop=1&playlist=' + v.ytId : ''}`,
    allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
    allowfullscreen: '',
    title: v.title,
  }));
  $('#player-title').textContent = v.exercise ? `${v.exercise} — ${v.title}` : v.title;
  const ch = $('#player-channel');
  ch.textContent = v.channel;
  ch.href = v.channelUrl || '#';
  $('#player-tags').replaceChildren(...tagList(v).childNodes);
  $('#player-yt').href = v.isShort
    ? `https://www.youtube.com/shorts/${v.ytId}`
    : `https://www.youtube.com/watch?v=${v.ytId}`;
  $('#player').showModal();
}

$('#player').addEventListener('close', () => {
  $('#player-frame').replaceChildren(); // stop playback
  state.playing = null;
});

$('#player-edit').addEventListener('click', () => {
  const v = state.playing;
  $('#player').close();
  openEditor(v);
});

async function deleteVideo(v) {
  try {
    await api(`/api/videos/${v.id}`, { method: 'DELETE' });
  } catch (err) {
    alert(`Could not delete: ${err.message}`);
    return false;
  }
  state.videos = state.videos.filter((x) => x.id !== v.id);
  render();
  return true;
}

$('#player-delete').addEventListener('click', async () => {
  if (await deleteVideo(state.playing)) $('#player').close();
});

// ---------- editor (add / edit) ----------

const editor = { mode: 'add', video: null, preview: null, suggested: null, muscles: new Set(), equipment: new Set() };

function renderPicker(containerSel, key) {
  const box = $(containerSel);
  const selected = editor[key];
  const options = optionsFor(key);
  for (const s of selected) if (!options.includes(s)) options.push(s);

  const addBtn = el('button', { type: 'button', class: 'chip add' }, '+ new');
  addBtn.addEventListener('click', () => {
    const input = el('input', { class: 'chip-input', placeholder: 'Name…' });
    const commit = () => {
      const val = input.value.trim();
      if (val) {
        const existing = options.find((o) => o.toLowerCase() === val.toLowerCase());
        selected.add(existing || val);
      }
      renderPicker(containerSel, key);
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { e.preventDefault(); renderPicker(containerSel, key); }
    });
    input.addEventListener('blur', commit);
    addBtn.replaceWith(input);
    input.focus();
  });

  box.replaceChildren(
    ...options.map((name) =>
      el('button', {
        type: 'button',
        class: `chip${selected.has(name) ? ' on' : ''}`,
        onclick: () => {
          selected.has(name) ? selected.delete(name) : selected.add(name);
          renderPicker(containerSel, key);
        },
      }, name),
    ),
    addBtn,
  );
}

function showPreview(meta) {
  const p = $('#preview');
  p.hidden = false;
  p.replaceChildren(
    el('img', { src: meta.thumbnail, alt: '' }),
    el('div', {}, el('div', { class: 't' }, meta.title), el('div', { class: 'muted' }, meta.channel)),
  );
}

function setError(msg) {
  const e = $('#editor-error');
  e.hidden = !msg;
  e.textContent = msg || '';
}

function openEditor(video = null) {
  editor.mode = video ? 'edit' : 'add';
  editor.video = video;
  editor.preview = null;
  editor.suggested = null;
  editor.muscles = new Set(video?.muscles || []);
  editor.equipment = new Set(video?.equipment || []);

  $('#editor-heading').textContent = video ? 'Edit video' : 'Add video';
  $('#url-field').hidden = !!video;
  $('#url').value = '';
  $('#exercise').value = video?.exercise || '';
  $('#is-short').checked = !!video?.isShort;
  $('#tag-fields').hidden = !video;
  $('#save-btn').disabled = !video;
  $('#preview').hidden = true;
  setError('');
  $('#exercise-list').replaceChildren(...optionsFor('exercise', 'exercises').map((x) => el('option', { value: x })));
  renderPicker('#muscle-picker', 'muscles');
  renderPicker('#equipment-picker', 'equipment');

  if (video) showPreview(video);
  $('#editor').showModal();
  (video ? $('#exercise') : $('#url')).focus();
}

const sameSet = (set, list) => set.size === list.length && list.every((x) => set.has(x));

// Fill tag fields from the title-based guess, but only fields the user hasn't changed
// since the last guess (so pasting a different URL re-guesses, while edits are kept).
function applySuggestion(next) {
  const prev = editor.suggested || { exercise: '', muscles: [], equipment: [] };
  if ($('#exercise').value.trim() === prev.exercise) $('#exercise').value = next.exercise;
  if (sameSet(editor.muscles, prev.muscles)) editor.muscles = new Set(next.muscles);
  if (sameSet(editor.equipment, prev.equipment)) editor.equipment = new Set(next.equipment);
  editor.suggested = next;
  renderPicker('#muscle-picker', 'muscles');
  renderPicker('#equipment-picker', 'equipment');
}

let previewSeq = 0;
async function loadPreview() {
  const url = $('#url').value.trim();
  if (!url) return;
  const seq = ++previewSeq;
  setError('');
  $('#save-btn').disabled = true;
  $('#preview').hidden = false;
  $('#preview').replaceChildren(el('span', { class: 'muted' }, 'Looking up video…'));
  try {
    const meta = await api('/api/preview', { method: 'POST', body: { url } });
    if (seq !== previewSeq) return;
    if (meta.duplicateOf) {
      $('#preview').hidden = true;
      setError('That video is already in your catalog.');
      return;
    }
    editor.preview = meta;
    showPreview(meta);
    if (meta.suggested) applySuggestion(meta.suggested);
    $('#is-short').checked = meta.isShort;
    $('#tag-fields').hidden = false;
    $('#save-btn').disabled = false;
    $('#exercise').focus();
  } catch (err) {
    if (seq !== previewSeq) return;
    $('#preview').hidden = true;
    setError(err.message);
  }
}

$('#url').addEventListener('paste', () => setTimeout(loadPreview, 0));
$('#url').addEventListener('change', loadPreview);
$('#url').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); loadPreview(); }
});

$('#editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    exercise: $('#exercise').value.trim(),
    muscles: [...editor.muscles],
    equipment: [...editor.equipment],
    isShort: $('#is-short').checked,
  };
  $('#save-btn').disabled = true;
  try {
    if (editor.mode === 'edit') {
      const updated = await api(`/api/videos/${editor.video.id}`, { method: 'PUT', body });
      state.videos = state.videos.map((v) => (v.id === updated.id ? updated : v));
    } else {
      const created = await api('/api/videos', { method: 'POST', body: { ...body, url: $('#url').value.trim() } });
      state.videos.unshift(created);
    }
    $('#editor').close();
    render();
  } catch (err) {
    setError(err.message);
    $('#save-btn').disabled = false;
  }
});

// ---------- global wiring ----------

document.querySelectorAll('[data-close]').forEach((b) =>
  b.addEventListener('click', () => b.closest('dialog').close()));

// Click on the dim backdrop closes a dialog.
document.querySelectorAll('dialog').forEach((d) =>
  d.addEventListener('mousedown', (e) => { if (e.target === d) d.close(); }));

$('#add-btn').addEventListener('click', () => openEditor());

$('#search').addEventListener('input', (e) => {
  state.filters.q = e.target.value.trim().toLowerCase();
  render();
});

$('#type-filter').addEventListener('click', (e) => {
  const t = e.target.closest('button')?.dataset.type;
  if (t) { state.filters.type = t; render(); }
});

$('#exercise-filter').addEventListener('change', (e) => {
  state.filters.exercise = e.target.value;
  render();
});

$('#clear-filters').addEventListener('click', () => {
  Object.assign(state.filters, { q: '', type: 'all', exercise: '', muscles: new Set(), equipment: new Set() });
  $('#search').value = '';
  render();
});

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement === document.body) {
    e.preventDefault();
    $('#search').focus();
  }
});

const [videos, presets] = await Promise.all([api('/api/videos'), api('/api/presets')]);
state.videos = videos;
state.presets = presets;
render();
