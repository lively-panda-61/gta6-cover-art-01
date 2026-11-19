// Procedural "photos" for Vice Coast: two illustrated scenes painted on a
// canvas, used as the app's built-in sample photos. Everything here is drawn
// from code (seeded, so the same scene paints the same pixels every run);
// no external image is ever fetched or copied in.
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

function palm(ctx, x, y, s, color, lean) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3, s * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.1 * lean, y - s * 0.55, x + s * 0.28 * lean, y - s * 0.95);
  ctx.stroke();
  const tx = x + s * 0.28 * lean;
  const ty = y - s * 0.95;
  for (let i = 0; i < 6; i += 1) {
    const a = (-0.2 - i * 0.27) * Math.PI;
    const len = s * (0.45 - Math.abs(i - 2.5) * 0.03);
    ctx.lineWidth = Math.max(2, s * 0.032);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(
      tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.45 - s * 0.08,
      tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.55 + s * 0.18,
    );
    ctx.stroke();
  }
}

function grain(ctx, w, h, rnd, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  const n = Math.floor(w * h / 900);
  for (let i = 0; i < n; i += 1) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
  }
  ctx.restore();
}

function paintBoulevard(ctx, w, h) {
  const rnd = mulberry32(xfnv1a('boulevard'));
  // Sunset sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.5, '#c2437a');
  sky.addColorStop(1, '#ff9a3c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.62);
  // Sun with glow.
  const sx = w * 0.68;
  const sy = h * 0.4;
  const sr = w * 0.085;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
  glow.addColorStop(0, 'rgba(255,214,106,0.9)');
  glow.addColorStop(1, 'rgba(255,214,106,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, Math.PI * 2);
  ctx.fill();
  // Birds.
  ctx.strokeStyle = 'rgba(20,8,40,0.8)';
  ctx.lineWidth = Math.max(2, w * 0.002);
  for (let i = 0; i < 5; i += 1) {
    const bx = w * (0.12 + rnd() * 0.5);
    const by = h * (0.08 + rnd() * 0.18);
    const bs = w * 0.012;
    ctx.beginPath();
    ctx.moveTo(bx - bs, by);
    ctx.quadraticCurveTo(bx - bs * 0.4, by - bs * 0.7, bx, by);
    ctx.quadraticCurveTo(bx + bs * 0.4, by - bs * 0.7, bx + bs, by);
    ctx.stroke();
  }
  // Distant skyline, windows drawn inside their own building so none floats.
  const horizon = h * 0.62;
  ctx.fillStyle = '#3d1458';
  let x = 0;
  while (x < w) {
    const bw = w * (0.04 + rnd() * 0.07);
    const bh = h * (0.03 + rnd() * 0.09);
    ctx.fillStyle = '#3d1458';
    ctx.fillRect(x, horizon - bh, bw, bh);
    ctx.fillStyle = '#ffd76a';
    const wins = Math.floor(rnd() * 5);
    for (let i = 0; i < wins; i += 1) {
      ctx.globalAlpha = 0.35 + rnd() * 0.6;
      ctx.fillRect(x + bw * (0.12 + rnd() * 0.7), horizon - bh + h * 0.006 + rnd() * bh * 0.75,
        Math.max(2, w * 0.004), Math.max(2, h * 0.004));
    }
    ctx.globalAlpha = 1;
    x += bw + w * 0.006;
  }
  // Ground first (sidewalk colour), then the road on top: no gap wedges.
  ctx.fillStyle = '#241640';
  ctx.fillRect(0, horizon, w, h - horizon);
  // Road: perspective trapezoid to the vanishing point.
  ctx.fillStyle = '#1a0f2e';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.42, horizon);
  ctx.lineTo(w * 0.58, horizon);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Centre dashes, shrinking toward the horizon.
  ctx.fillStyle = '#ffd76a';
  for (let i = 0; i < 7; i += 1) {
    const t = i / 7;
    const y = horizon + (h - horizon) * t * t;
    const dw = w * 0.004 * (1 + t * 3);
    const dh = h * 0.012 * (1 + t * 3);
    ctx.fillRect(w / 2 - dw / 2, y, dw, dh);
  }
  // Low sports car, centre-bottom.
  const carY = h * 0.88;
  const carW = w * 0.42;
  const carX = w / 2 - carW / 2;
  ctx.fillStyle = '#0d0518';
  ctx.beginPath();
  ctx.moveTo(carX, carY);
  ctx.lineTo(carX + carW * 0.06, carY - h * 0.035);
  ctx.lineTo(carX + carW * 0.3, carY - h * 0.055);
  ctx.lineTo(carX + carW * 0.62, carY - h * 0.055);
  ctx.lineTo(carX + carW * 0.9, carY - h * 0.03);
  ctx.lineTo(carX + carW, carY);
  ctx.closePath();
  ctx.fill();
  // Cabin glass.
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.moveTo(carX + carW * 0.34, carY - h * 0.05);
  ctx.lineTo(carX + carW * 0.6, carY - h * 0.05);
  ctx.lineTo(carX + carW * 0.56, carY - h * 0.028);
  ctx.lineTo(carX + carW * 0.38, carY - h * 0.028);
  ctx.closePath();
  ctx.fill();
  // Wheels + headlight glow.
  ctx.fillStyle = '#000000';
  for (const wx of [carX + carW * 0.2, carX + carW * 0.8]) {
    ctx.beginPath();
    ctx.arc(wx, carY, h * 0.016, 0, Math.PI * 2);
    ctx.fill();
  }
  const hl = ctx.createRadialGradient(carX + carW * 0.97, carY - h * 0.01, 0, carX + carW * 0.97, carY - h * 0.01, w * 0.06);
  hl.addColorStop(0, 'rgba(255,240,180,0.9)');
  hl.addColorStop(1, 'rgba(255,240,180,0)');
  ctx.fillStyle = hl;
  ctx.fillRect(carX + carW * 0.9, carY - h * 0.07, w * 0.12, h * 0.12);
  // Foreground palms.
  palm(ctx, w * 0.06, h * 1.0, h * 0.34, '#160a24', 1);
  palm(ctx, w * 0.94, h * 1.0, h * 0.3, '#160a24', -1);
  grain(ctx, w, h, rnd, 0.03);
}

function paintPier(ctx, w, h) {
  const rnd = mulberry32(xfnv1a('pier'));
  // Night sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, '#05070f');
  sky.addColorStop(0.6, '#1b2a6b');
  sky.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.55);
  // Stars.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 130; i += 1) {
    ctx.globalAlpha = 0.25 + rnd() * 0.7;
    const r = rnd() < 0.12 ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h * 0.5, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Moon.
  const mx = w * 0.22;
  const my = h * 0.18;
  const mr = w * 0.045;
  const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 3.5);
  mg.addColorStop(0, 'rgba(232,236,255,0.85)');
  mg.addColorStop(1, 'rgba(232,236,255,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(mx - mr * 3.5, my - mr * 3.5, mr * 7, mr * 7);
  ctx.fillStyle = '#e8ecff';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  // Sea.
  const sea = ctx.createLinearGradient(0, h * 0.55, 0, h);
  sea.addColorStop(0, '#16224d');
  sea.addColorStop(1, '#05070f');
  ctx.fillStyle = sea;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  // Neon reflections: wobbly horizontal streaks.
  const streak = (x, y, len, color, alpha) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i += 1) {
      const yy = y + (rnd() - 0.5) * h * 0.012;
      ctx.fillRect(x + (rnd() - 0.5) * len * 0.2, yy, len * (0.5 + rnd() * 0.5), Math.max(2, h * 0.003));
    }
    ctx.restore();
  };
  for (let i = 0; i < 26; i += 1) {
    const colors = ['#ff2e88', '#00f0ff', '#ffd166'];
    streak(w * (0.1 + rnd() * 0.8), h * (0.58 + rnd() * 0.36), w * (0.04 + rnd() * 0.12),
      colors[Math.floor(rnd() * 3)], 0.25 + rnd() * 0.45);
  }
  // Ferris wheel, right side.
  const fx = w * 0.72;
  const fy = h * 0.36;
  const fr = w * 0.19;
  const neon = ['#ff2e88', '#00f0ff', '#ffd166', '#7b2ff7'];
  ctx.strokeStyle = '#0a0018';
  ctx.lineWidth = Math.max(4, w * 0.006);
  ctx.beginPath();
  ctx.arc(fx, fy, fr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(fx, fy, fr * 0.55, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr);
    ctx.stroke();
  }
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    ctx.fillStyle = neon[i % neon.length];
    ctx.beginPath();
    ctx.arc(fx + Math.cos(a) * fr, fy + Math.sin(a) * fr, Math.max(3, w * 0.006), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(fx, fy, Math.max(4, w * 0.008), 0, Math.PI * 2);
  ctx.fill();
  // Wheel legs.
  ctx.strokeStyle = '#0a0018';
  ctx.lineWidth = Math.max(5, w * 0.008);
  ctx.beginPath();
  ctx.moveTo(fx - fr * 0.5, fy + fr * 0.85);
  ctx.lineTo(fx, fy);
  ctx.lineTo(fx + fr * 0.5, fy + fr * 0.85);
  ctx.stroke();
  // Pier deck with string lights.
  const deckY = h * 0.62;
  ctx.fillStyle = '#120a24';
  ctx.fillRect(0, deckY, w, h * 0.05);
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 24; i += 1) {
    const px = (i / 24) * w;
    ctx.beginPath();
    ctx.moveTo(px, deckY);
    ctx.lineTo(px, deckY + h * 0.05);
    ctx.stroke();
  }
  // String lights sagging between posts.
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.beginPath();
  ctx.moveTo(0, deckY - h * 0.02);
  ctx.quadraticCurveTo(w * 0.25, deckY + h * 0.02, w * 0.5, deckY - h * 0.02);
  ctx.quadraticCurveTo(w * 0.75, deckY + h * 0.02, w, deckY - h * 0.02);
  ctx.stroke();
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const lx = t * w;
    const ly = deckY - h * 0.02 + Math.sin(t * Math.PI * 2) * h * 0.014 + h * 0.008;
    ctx.fillStyle = neon[i % neon.length];
    ctx.beginPath();
    ctx.arc(lx, ly, Math.max(2.5, w * 0.004), 0, Math.PI * 2);
    ctx.fill();
  }
  // Neon sign.
  const signW = w * 0.3;
  const signH = h * 0.07;
  const signX = w * 0.06;
  const signY = h * 0.5;
  const sg = ctx.createRadialGradient(signX + signW / 2, signY + signH / 2, 0, signX + signW / 2, signY + signH / 2, signW * 0.7);
  sg.addColorStop(0, 'rgba(255,46,136,0.55)');
  sg.addColorStop(1, 'rgba(255,46,136,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(signX - signW * 0.3, signY - signH, signW * 1.6, signH * 3);
  ctx.fillStyle = '#1a0530';
  ctx.strokeStyle = '#ff2e88';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.beginPath();
  ctx.roundRect(signX, signY, signW, signH, signH * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#00f0ff';
  ctx.font = `900 ${Math.round(signH * 0.52)}px 'Archivo Black', Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NEON PIER', signX + signW / 2, signY + signH / 2 + 1);
  // Foreground palms.
  palm(ctx, w * 0.05, h * 1.0, h * 0.3, '#05070f', 1);
  palm(ctx, w * 0.95, h * 1.0, h * 0.26, '#05070f', -1);
  grain(ctx, w, h, rnd, 0.03);
}

export function paintScene(ctx, w, h, sceneId) {
  if (sceneId === 'pier') paintPier(ctx, w, h);
  else paintBoulevard(ctx, w, h);
}
export const SCENES = [
  { id: 'boulevard', name: 'Sunset Boulevard' },
  { id: 'pier', name: 'Neon Pier' },
];
