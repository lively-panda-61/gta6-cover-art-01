// Vice Coast Cover Studio — the editor.
// Loads the sample photos, builds the pickers, renders the live preview with
// drawCover() (the same painter the exporter uses), and lets the user crop
// and position each panel's photo, edit the caption, and export a PNG.
import { drawCover, EXPORT_SIZES, GRADES, LAYOUTS, gradeById, layoutById, layoutPanels } from './render.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);

const SAMPLES = [
  { id: 'boulevard', name: 'Sunset Boulevard', src: './samples/boulevard.png' },
  { id: 'pier', name: 'Neon Pier', src: './samples/pier.png' },
];

const state = {
  layout: 'grid',
  grade: 'sunset',
  size: 'square',
  title: 'SUNSET HEIST',
  subtitle: 'SOLMAR BAY',
  tagline: 'ONE LAST SCORE',
  photos: [], // { id, name, src, img }
  slots: [], // per layout slot: { photoId, zoom, ox, oy }
  selectedSlot: 0,
};
let uploadCount = 0;
let drag = null;

function log(msg) {
  console.info(`[vice-coast] ${msg}`);
}

function sizeDef() {
  return EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
}

function ensureSlots() {
  const maxSlots = Math.max(...LAYOUTS.map((l) => l.panels().length));
  while (state.slots.length < maxSlots) {
    const i = state.slots.length;
    const photo = state.photos[i % Math.max(1, state.photos.length)];
    state.slots.push({ photoId: photo ? photo.id : null, zoom: 1, ox: 0, oy: 0 });
  }
}

function slotImage(slot) {
  const photo = state.photos.find((p) => p.id === slot.photoId);
  return photo ? photo.img : null;
}

function renderState() {
  const size = sizeDef();
  const slots = layoutPanels(state.layout).map((panel) => {
    const slot = state.slots[panel.slot] || { photoId: null, zoom: 1, ox: 0, oy: 0 };
    return { ...slot, img: slotImage(slot) };
  });
  drawCover(ctx, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    tagline: state.tagline,
    slots,
  }, canvas.width, canvas.height);
}

function fitPreviewCanvas() {
  const size = sizeDef();
  const scale = Math.min(1, 900 / Math.max(size.w, size.h));
  const shotCover = params.get('shot') === 'cover';
  if (shotCover) {
    canvas.width = size.w;
    canvas.height = size.h;
  } else {
    canvas.width = Math.round(size.w * scale);
    canvas.height = Math.round(size.h * scale);
  }
}

function render() {
  fitPreviewCanvas();
  renderState();
}

// --- pickers ---------------------------------------------------------------
function buildPickers() {
  const layoutPick = $('layout-pick');
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = layout.id;
    b.setAttribute('aria-pressed', String(layout.id === state.layout));
    b.innerHTML = `<span></span><small></small>`;
    b.querySelector('span').textContent = layout.name;
    b.querySelector('small').textContent = layout.blurb;
    b.addEventListener('click', () => setLayout(layout.id));
    layoutPick.appendChild(b);
  }
  const gradePick = $('grade-pick');
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = grade.id;
    b.setAttribute('aria-pressed', String(grade.id === state.grade));
    const swatch = document.createElement('div');
    swatch.className = 'grade-swatch';
    swatch.style.background = `linear-gradient(135deg, ${grade.skyTop}, ${grade.skyMid} 55%, ${grade.skyBot})`;
    b.appendChild(swatch);
    b.appendChild(document.createTextNode(grade.name));
    b.addEventListener('click', () => setGrade(grade.id));
    gradePick.appendChild(b);
  }
  const sizePick = $('size-pick');
  for (const size of EXPORT_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = size.id;
    b.setAttribute('aria-pressed', String(size.id === state.size));
    b.textContent = size.label;
    b.addEventListener('click', () => setSize(size.id));
    sizePick.appendChild(b);
  }
}

function refreshPickers() {
  for (const b of document.querySelectorAll('#layout-pick button')) {
    b.setAttribute('aria-pressed', String(b.dataset.id === state.layout));
  }
  for (const b of document.querySelectorAll('#grade-pick button')) {
    b.setAttribute('aria-pressed', String(b.dataset.id === state.grade));
  }
  for (const b of document.querySelectorAll('#size-pick button')) {
    b.setAttribute('aria-pressed', String(b.dataset.id === state.size));
  }
}

function refreshPhotoRow() {
  const row = $('photo-row');
  row.replaceChildren();
  for (const photo of state.photos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = photo.name;
    b.setAttribute('aria-pressed', String(state.slots[state.selectedSlot]?.photoId === photo.id));
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      setSlotPhoto(state.selectedSlot, photo.id);
      refreshPhotoRow();
    });
    row.appendChild(b);
  }
  const select = $('slot-photo');
  select.replaceChildren();
  for (const photo of state.photos) {
    const opt = document.createElement('option');
    opt.value = photo.id;
    opt.textContent = photo.name;
    select.appendChild(opt);
  }
  const current = state.slots[state.selectedSlot];
  if (current) {
    select.value = current.photoId || '';
    $('slot-zoom').value = String(current.zoom);
    $('slot-note').textContent = `Panel ${state.selectedSlot + 1} selected — ${layoutById(state.layout).name}, photo ${current.photoId || 'none'}.`;
  }
}

// --- state setters (also the test/shots API) --------------------------------
function setLayout(id) {
  if (!LAYOUTS.some((l) => l.id === id)) return;
  state.layout = id;
  state.selectedSlot = 0;
  refreshPickers();
  refreshPhotoRow();
  render();
  log(`layout: ${id}`);
}
function setGrade(id) {
  if (!GRADES.some((g) => g.id === id)) return;
  state.grade = id;
  refreshPickers();
  render();
  log(`grade: ${id}`);
}
function setSize(id) {
  if (!EXPORT_SIZES.some((s) => s.id === id)) return;
  state.size = id;
  refreshPickers();
  render();
  log(`size: ${id}`);
}
function setCaption(title, subtitle, tagline) {
  if (title !== undefined) state.title = title;
  if (subtitle !== undefined) state.subtitle = subtitle;
  if (tagline !== undefined) state.tagline = tagline;
  $('caption-title').value = state.title;
  $('caption-sub').value = state.subtitle;
  $('caption-tag').value = state.tagline;
  render();
}
function setSlotPhoto(slotIndex, photoId) {
  const slot = state.slots[slotIndex];
  if (!slot || !state.photos.some((p) => p.id === photoId)) return;
  slot.photoId = photoId;
  slot.zoom = 1;
  slot.ox = 0;
  slot.oy = 0;
  refreshPhotoRow();
  render();
  log(`panel ${slotIndex + 1} photo: ${photoId}`);
}

async function exportCover() {
  const size = sizeDef();
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  const offCtx = off.getContext('2d');
  const slots = layoutPanels(state.layout).map((panel) => {
    const slot = state.slots[panel.slot] || { photoId: null, zoom: 1, ox: 0, oy: 0 };
    return { ...slot, img: slotImage(slot) };
  });
  drawCover(offCtx, {
    layout: state.layout, grade: state.grade,
    title: state.title, subtitle: state.subtitle, tagline: state.tagline, slots,
  }, size.w, size.h);
  log(`exported ${size.w}x${size.h} (${state.layout} / ${state.grade})`);
  return off.toDataURL('image/png');
}

function previewHash() {
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let h = 2166136261;
  for (let i = 0; i < data.length; i += 401) {
    h ^= data[i];
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

// --- panel picking, pan and zoom -------------------------------------------
function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const nx = (clientX - rect.left) / rect.width;
  const ny = (clientY - rect.top) / rect.height;
  const panels = layoutPanels(state.layout);
  for (let i = panels.length - 1; i >= 0; i -= 1) {
    if (pointInPolygon(nx, ny, panels[i].points)) return panels[i].slot;
  }
  return null;
}
function bindCanvas() {
  const wrap = $('canvas-wrap');
  canvas.addEventListener('pointerdown', (e) => {
    const slot = panelAt(e.clientX, e.clientY);
    if (slot === null) return;
    state.selectedSlot = slot;
    refreshPhotoRow();
    drag = { x: e.clientX, y: e.clientY, slot };
    canvas.setPointerCapture(e.pointerId);
    wrap.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const slot = state.slots[drag.slot];
    if (!slot) return;
    const rect = canvas.getBoundingClientRect();
    slot.ox += (e.clientX - drag.x) / rect.width;
    slot.oy += (e.clientY - drag.y) / rect.height;
    slot.ox = Math.max(-2, Math.min(2, slot.ox));
    slot.oy = Math.max(-2, Math.min(2, slot.oy));
    drag.x = e.clientX;
    drag.y = e.clientY;
    render();
  });
  const endDrag = () => { drag = null; wrap.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const slot = state.slots[state.selectedSlot];
    if (!slot) return;
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * Math.exp(-e.deltaY * 0.001)));
    $('slot-zoom').value = String(slot.zoom);
    render();
  }, { passive: false });
  // Drop photos straight onto the cover.
  wrap.addEventListener('dragover', (e) => e.preventDefault());
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  });
}

// --- uploads ----------------------------------------------------------------
function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (files.length === 0) return;
  let loaded = 0;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        uploadCount += 1;
        state.photos.push({ id: `up-${uploadCount}`, name: file.name, src: reader.result, img });
        loaded += 1;
        log(`photo added: ${file.name} (${img.naturalWidth}x${img.naturalHeight})`);
        if (loaded === files.length) {
          refreshPhotoRow();
          render();
          $('status').textContent = `${files.length} photo(s) added.`;
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function init() {
  buildPickers();
  bindCanvas();
  // Fonts first: the title is drawn with them, so wait before the first paint.
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px "Archivo Black"'),
      document.fonts.ready,
    ]);
    log('fonts loaded: Anton, Archivo Black');
  } catch (e) {
    log(`font load fell back to system fonts: ${e}`);
  }
  for (const sample of SAMPLES) {
    const img = await loadImage(sample.src);
    state.photos.push({ ...sample, img });
  }
  log(`samples loaded: ${state.photos.map((p) => p.id).join(', ')}`);
  ensureSlots();
  // Shot parameters (used by the screenshot script and by shared links).
  if (params.get('layout')) state.layout = params.get('layout');
  if (params.get('grade')) state.grade = params.get('grade');
  if (params.get('size')) state.size = params.get('size');
  if (params.get('caption')) state.title = params.get('caption');
  if (params.get('subtitle')) state.subtitle = params.get('subtitle');
  if (params.get('tagline')) state.tagline = params.get('tagline');
  if (params.get('photo')) {
    // The shot photo goes in the first panel only; the other panels keep
    // their alternating defaults, so a multi-panel cover shows variety.
    const wanted = params.get('photo');
    if (state.photos.some((p) => p.id === wanted) && state.slots[0]) {
      state.slots[0].photoId = wanted;
    }
  }
  if (params.get('shot') === 'cover') document.body.classList.add('shot-cover');
  $('caption-title').value = state.title;
  $('caption-sub').value = state.subtitle;
  $('caption-tag').value = state.tagline;
  $('caption-title').addEventListener('input', (e) => { state.title = e.target.value.toUpperCase(); render(); });
  $('caption-sub').addEventListener('input', (e) => { state.subtitle = e.target.value.toUpperCase(); render(); });
  $('caption-tag').addEventListener('input', (e) => { state.tagline = e.target.value.toUpperCase(); render(); });
  $('photo-input').addEventListener('change', (e) => addFiles(e.target.files));
  $('slot-photo').addEventListener('change', (e) => setSlotPhoto(state.selectedSlot, e.target.value));
  $('slot-zoom').addEventListener('input', (e) => {
    const slot = state.slots[state.selectedSlot];
    if (!slot) return;
    slot.zoom = Number(e.target.value);
    render();
  });
  $('slot-reset').addEventListener('click', () => {
    const slot = state.slots[state.selectedSlot];
    if (!slot) return;
    slot.zoom = 1; slot.ox = 0; slot.oy = 0;
    $('slot-zoom').value = '1';
    render();
  });
  $('export').addEventListener('click', async () => {
    const dataUrl = await exportCover();
    const size = sizeDef();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `vice-coast-${state.layout}-${size.w}x${size.h}.png`;
    a.click();
    $('status').textContent = `Exported ${size.label} PNG.`;
  });
  refreshPickers();
  refreshPhotoRow();
  render();
  window.__viceCoast = {
    layouts: LAYOUTS, grades: GRADES, state,
    setLayout, setGrade, setSize, setCaption, setSlotPhoto, previewHash, exportCover,
  };
  window.__viceCoastReady = true;
  log('ready');
}

init();
