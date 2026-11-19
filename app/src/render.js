// Vice Coast Cover Studio — cover renderer.
// Pure model (layouts, grades, geometry, title fitting) with no DOM access at
// import time, plus drawCover(), the browser-only painter the editor and the
// exporter share, so the preview and the exported PNG are the same pixels.
export const EXPORT_SIZES = [
  { id: 'square', w: 1080, h: 1080, label: '1080 x 1080' },
  { id: 'portrait', w: 1080, h: 1350, label: '1080 x 1350' },
  { id: 'wide', w: 1920, h: 1080, label: '1920 x 1080' },
];

// Panels are normalised polygons ([x, y] in 0..1). The title zone is the free
// band every layout reserves at the bottom; the skyline strip sits at the
// very bottom edge behind nothing. No title text ever overlaps a photo panel.
export const LAYOUTS = [
  {
    id: 'grid', name: 'Sunset Grid',
    blurb: 'Four-panel poster grid, the classic GTA multi-panel look.',
    titleSize: 0.115, titleY: 0.845,
    panels: () => [
      { slot: 0, points: [[0.02, 0.02], [0.494, 0.02], [0.494, 0.36], [0.02, 0.36]] },
      { slot: 1, points: [[0.506, 0.02], [0.98, 0.02], [0.98, 0.36], [0.506, 0.36]] },
      { slot: 2, points: [[0.02, 0.372], [0.494, 0.372], [0.494, 0.71], [0.02, 0.71]] },
      { slot: 3, points: [[0.506, 0.372], [0.98, 0.372], [0.98, 0.71], [0.506, 0.71]] },
    ],
  },
  {
    id: 'solo', name: 'Neon Solo',
    blurb: 'One full-bleed photo, title riding the sky below it.',
    titleSize: 0.125, titleY: 0.875,
    panels: () => [
      { slot: 0, points: [[0, 0], [1, 0], [1, 0.78], [0, 0.78]] },
    ],
  },
  {
    id: 'duo', name: 'Split Duo',
    blurb: 'Two tall photos side by side, split down the middle.',
    titleSize: 0.12, titleY: 0.85,
    panels: () => [
      { slot: 0, points: [[0.02, 0.02], [0.49, 0.02], [0.49, 0.72], [0.02, 0.72]] },
      { slot: 1, points: [[0.51, 0.02], [0.98, 0.02], [0.98, 0.72], [0.51, 0.72]] },
    ],
  },
  {
    id: 'strips', name: 'Strip Trio',
    blurb: 'Three stacked strips, a film-reel cut of the night.',
    titleSize: 0.115, titleY: 0.85,
    panels: () => [
      { slot: 0, points: [[0.02, 0.02], [0.98, 0.02], [0.98, 0.24], [0.02, 0.24]] },
      { slot: 1, points: [[0.02, 0.26], [0.98, 0.26], [0.98, 0.48], [0.02, 0.48]] },
      { slot: 2, points: [[0.02, 0.5], [0.98, 0.5], [0.98, 0.72], [0.02, 0.72]] },
    ],
  },
  {
    id: 'frame', name: 'Poster Frame',
    blurb: 'A single framed shot with a bold title block underneath.',
    titleSize: 0.12, titleY: 0.855,
    panels: () => [
      { slot: 0, points: [[0.05, 0.04], [0.95, 0.04], [0.95, 0.71], [0.05, 0.71]] },
    ],
  },
  {
    id: 'diagonal', name: 'Diagonal Vice',
    blurb: 'Two photos cut on a diagonal, the title slashing across.',
    titleSize: 0.12, titleY: 0.85,
    panels: () => [
      { slot: 0, points: [[0.02, 0.02], [0.62, 0.02], [0.38, 0.72], [0.02, 0.72]] },
      { slot: 1, points: [[0.62, 0.02], [0.98, 0.02], [0.98, 0.72], [0.38, 0.72]] },
    ],
  },
];

export const GRADES = [
  {
    id: 'sunset', name: 'Vice Sunset',
    skyTop: '#2b1055', skyMid: '#ff5e7a', skyBot: '#ff9a3c',
    sun: '#ffd76a', ink: '#1c0b2e', accent: '#ffcf4d', tint: '#ff7a3c', tintAlpha: 0.12,
  },
  {
    id: 'neon', name: 'Neon Nights',
    skyTop: '#0a0018', skyMid: '#4b0082', skyBot: '#ff2e88',
    sun: '#00f0ff', ink: '#0a0018', accent: '#00f0ff', tint: '#ff2e88', tintAlpha: 0.14,
  },
  {
    id: 'gold', name: 'Gold Coast',
    skyTop: '#14213d', skyMid: '#ff7b54', skyBot: '#ffb347',
    sun: '#fff3b0', ink: '#14213d', accent: '#ffd166', tint: '#ffb347', tintAlpha: 0.12,
  },
  {
    id: 'midnight', name: 'Midnight Drive',
    skyTop: '#05070f', skyMid: '#1b2a6b', skyBot: '#7b2ff7',
    sun: '#e8ecff', ink: '#05070f', accent: '#8ec5ff', tint: '#3b5bff', tintAlpha: 0.14,
  },
  {
    id: 'palm', name: 'Palm Dusk',
    skyTop: '#042f2e', skyMid: '#0f766e', skyBot: '#fda4af',
    sun: '#fef08a', ink: '#042f2e', accent: '#f472b6', tint: '#2ec4b6', tintAlpha: 0.12,
  },
  {
    id: 'noir', name: 'Noir Heat',
    skyTop: '#0a0a0a', skyMid: '#3f3f46', skyBot: '#a1a1aa',
    sun: '#ffffff', ink: '#000000', accent: '#e10600', tint: '#52525b', tintAlpha: 0.16,
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}
export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}
export function layoutPanels(id) {
  return layoutById(id).panels();
}

// Shrink the title until it fits the zone, never below the floor.
export function fitTitle(text, maxWidth, maxSize, minSize, measure) {
  let size = maxSize;
  while (size > minSize && measure(text, size) > maxWidth) size *= 0.92;
  return Math.max(minSize, Math.floor(size));
}

// --- deterministic pseudo-random (same skyline on every run) ---------------
function xfnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tracePolygon(ctx, points, W, H) {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * W, y * H);
    else ctx.lineTo(x * W, y * H);
  });
  ctx.closePath();
}

function drawPhotoCover(ctx, img, rect, zoom, ox, oy) {
  const { x, y, w, h } = rect;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + ox * w * 0.25;
  const dy = y + (h - dh) / 2 + oy * h * 0.25;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPalm(ctx, x, y, s, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.08, y - s * 0.55, x + s * 0.22, y - s * 0.95);
  ctx.stroke();
  const topX = x + s * 0.22;
  const topY = y - s * 0.95;
  for (let i = 0; i < 6; i += 1) {
    const a = (-0.15 - i * 0.28) * Math.PI;
    const len = s * (0.42 - Math.abs(i - 2.5) * 0.03);
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * len * 0.6, topY + Math.sin(a) * len * 0.45 - s * 0.08,
      topX + Math.cos(a) * len, topY + Math.sin(a) * len * 0.55 + s * 0.16,
    );
    ctx.stroke();
  }
}

function drawSkyline(ctx, W, H, grade, seedKey) {
  const rnd = mulberry32(xfnv1a(seedKey));
  const baseY = H * 0.99;
  ctx.fillStyle = grade.ink;
  let x = 0;
  while (x < W) {
    const bw = W * (0.03 + rnd() * 0.05);
    const bh = H * (0.005 + rnd() * 0.009);
    ctx.fillRect(x, baseY - bh, bw, bh + H * 0.015);
    x += bw + W * 0.004;
  }
  drawPalm(ctx, W * 0.03, baseY + H * 0.005, H * 0.055, grade.ink);
  drawPalm(ctx, W * 0.965, baseY + H * 0.005, H * 0.048, grade.ink);
}

// The cover painter. state: { layout, grade, title, subtitle, tagline, slots }
// slots[i] = { img, zoom, ox, oy } — img is an HTMLImageElement (or null).
export function drawCover(ctx, state, W, H) {
  const layout = layoutById(state.layout);
  const grade = gradeById(state.grade);

  // Sky: three-stop vertical gradient, then the sun and its glow.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(0.55, grade.skyMid);
  sky.addColorStop(1, grade.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  // Sun (or moon) tucked in the bottom-right corner, clear of the title.
  const sunX = W * 0.93;
  const sunY = H * 0.9;
  const sunR = Math.min(W, H) * 0.035;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 4);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(0.25, grade.sun);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 4, sunY - sunR * 4, sunR * 8, sunR * 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Photo panels, each clipped to its polygon, tinted by the grade.
  const panels = layout.panels();
  panels.forEach((panel, i) => {
    const slot = (state.slots && state.slots[panel.slot]) || null;
    const xs = panel.points.map(([x]) => x * W);
    const ys = panel.points.map(([, y]) => y * H);
    const rect = {
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
    };
    // Drop shadow under the panel.
    ctx.save();
    ctx.translate(Math.max(3, W * 0.004), Math.max(3, H * 0.004));
    tracePolygon(ctx, panel.points, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.restore();
    ctx.save();
    tracePolygon(ctx, panel.points, W, H);
    ctx.clip();
    if (slot && slot.img && slot.img.naturalWidth > 0) {
      drawPhotoCover(ctx, slot.img, rect, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    } else {
      // Empty slot: a dark plate with the slot number, never a hole.
      ctx.fillStyle = grade.ink;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `900 ${Math.round(Math.min(rect.w, rect.h) * 0.3)}px 'Archivo Black', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(panel.slot + 1), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Grade tint + a dark foot so panel bottoms read as one poster.
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = grade.tintAlpha;
    ctx.fillStyle = grade.tint;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const foot = ctx.createLinearGradient(0, rect.y + rect.h * 0.55, 0, rect.y + rect.h);
    foot.addColorStop(0, 'rgba(0,0,0,0)');
    foot.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = foot;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    // Panel border.
    ctx.save();
    tracePolygon(ctx, panel.points, W, H);
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.strokeStyle = grade.ink;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  });

  // Skyline strip along the very bottom edge.
  drawSkyline(ctx, W, H, grade, `${layout.id}:${grade.id}`);

  // Title block: Anton, gradient fill, ink outline, hard offset shadow.
  const title = (state.title || '').toUpperCase();
  const zoneW = W * 0.92;
  const measure = (text, size) => {
    ctx.font = `${size}px Anton, 'Archivo Black', Impact, sans-serif`;
    return ctx.measureText(text).width;
  };
  const cy = H * layout.titleY;
  const cx = W / 2;
  // The title scales with the shorter side, and the whole title stack
  // (title + subtitle + tagline) must fit between its centre and the bottom
  // edge, whatever the export shape: wide covers have a short band.
  const bandCap = Math.floor((H * 0.985 - cy) / 1.02);
  const titleSize = Math.min(
    fitTitle(title, zoneW, Math.round(Math.min(W, H) * layout.titleSize), Math.round(Math.min(W, H) * 0.045), measure),
    bandCap,
  );
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.025);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${titleSize}px Anton, 'Archivo Black', Impact, sans-serif`;
  // Hard offset shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(title, titleSize * 0.03, titleSize * 0.045);
  // Outline, then gradient fill.
  ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = grade.ink;
  ctx.strokeText(title, 0, 0);
  const tg = ctx.createLinearGradient(0, -titleSize * 0.55, 0, titleSize * 0.55);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.55, grade.sun);
  tg.addColorStop(1, grade.accent);
  ctx.fillStyle = tg;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Subtitle and tagline under the title.
  const sub = (state.subtitle || '').toUpperCase();
  if (sub) {
    const subSize = Math.round(titleSize * 0.26);
    ctx.save();
    ctx.font = `${subSize}px 'Archivo Black', 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, subSize * 0.12);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grade.ink;
    ctx.strokeText(sub, cx, cy + titleSize * 0.6);
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub, cx, cy + titleSize * 0.6);
    ctx.restore();
  }
  const tag = (state.tagline || '').toUpperCase();
  if (tag) {
    const tagSize = Math.round(titleSize * 0.15);
    ctx.save();
    try { ctx.letterSpacing = `${Math.round(tagSize * 0.35)}px`; } catch { /* older canvas */ }
    ctx.font = `700 ${tagSize}px 'Archivo Black', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(tag, cx, cy + titleSize * 0.82);
    ctx.restore();
  }

  // Vignette: darken the corners so the poster holds together.
  const vg = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
