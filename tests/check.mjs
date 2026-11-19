// Vice Coast Cover Studio — test suite (TDD: written before the implementation).
// Run: node tests/check.mjs
// Checks the pure layout/grade model, the hand-in program's determinism,
// the gate caps, the no-network rule, and the app in a real headless browser.
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
const kitDir = join(here, '..', 'gta6-cover-art-01-kit');
let passed = 0;
const jobs = [];
function ok(name, fn) {
  jobs.push(Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok ${name}`);
    }));
}

// --- PNG / JPEG dimension readers (no dependencies) -----------------------
function pngSize(buf) {
  assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG magic');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
function jpegSize(buf) {
  assert.equal(buf[0], 0xff, 'JPEG magic');
  assert.equal(buf[1], 0xd8, 'JPEG magic');
  let off = 2;
  while (off < buf.length) {
    assert.equal(buf[off], 0xff, 'JPEG marker');
    const marker = buf[off + 1];
    const len = buf.readUInt16BE(off + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { w: buf.readUInt16BE(off + 7), h: buf.readUInt16BE(off + 5) };
    }
    off += 2 + len;
  }
  throw new Error('no SOF marker in JPEG');
}
function imageSize(file) {
  const buf = readFileSync(file);
  return extname(file).toLowerCase() === '.png' ? pngSize(buf) : jpegSize(buf);
}

// --- 1. Pure model: layouts and grades ------------------------------------
const render = await import('../app/src/render.js');

ok('six distinct layouts', () => {
  assert.ok(Array.isArray(render.LAYOUTS));
  assert.ok(render.LAYOUTS.length >= 6, `need 6+ layouts, got ${render.LAYOUTS.length}`);
  const ids = render.LAYOUTS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'layout ids unique');
  for (const l of render.LAYOUTS) {
    assert.ok(l.name && l.name.length > 2, `${l.id} has a name`);
    assert.ok(l.blurb && l.blurb.length > 10, `${l.id} has a blurb`);
  }
});

ok('six distinct grades', () => {
  assert.ok(Array.isArray(render.GRADES));
  assert.ok(render.GRADES.length >= 6, `need 6+ grades, got ${render.GRADES.length}`);
  const ids = render.GRADES.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'grade ids unique');
  for (const g of render.GRADES) {
    for (const key of ['skyTop', 'skyMid', 'skyBot', 'sun', 'ink', 'accent']) {
      assert.match(g[key], /^#[0-9a-f]{6}$/i, `${g.id}.${key} is a hex colour`);
    }
  }
});

function polygonArea(points) {
  let a = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

ok('every layout covers the cover with in-bounds panels', () => {
  for (const layout of render.LAYOUTS) {
    const panels = render.layoutPanels(layout.id, 1080, 1080);
    assert.ok(panels.length >= 1, `${layout.id} has panels`);
    let area = 0;
    for (const p of panels) {
      assert.ok(p.points.length >= 3, `${layout.id} panel is a polygon`);
      for (const [x, y] of p.points) {
        assert.ok(x >= -0.001 && x <= 1.001 && y >= -0.001 && y <= 1.001,
          `${layout.id} panel point in bounds`);
      }
      area += polygonArea(p.points);
    }
    assert.ok(area >= 0.55, `${layout.id} covers >=55% of the cover (got ${area.toFixed(2)})`);
  }
});

ok('export sizes are the three post sizes', () => {
  assert.deepEqual(render.EXPORT_SIZES, [
    { id: 'square', w: 1080, h: 1080, label: '1080 x 1080' },
    { id: 'portrait', w: 1080, h: 1350, label: '1080 x 1350' },
    { id: 'wide', w: 1920, h: 1080, label: '1920 x 1080' },
  ]);
});

ok('title fitting shrinks long captions instead of overflowing', () => {
  const measure = (text, size) => text.length * size * 0.62; // fake monospace-ish measure
  const short = render.fitTitle('HEIST', 1000, 200, 48, measure);
  assert.ok(short >= 150, 'short title stays big');
  const long = render.fitTitle('THE LONGEST HEIST IN LEONIDA BAY', 1000, 200, 48, measure);
  assert.ok(long < short, 'long title shrinks');
  assert.ok(long >= 48, 'long title never goes below the floor');
});

// --- 2. Hand-in program: determinism and dossier --------------------------
function treeHash(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(`${relative(dir, p)}:${createHash('sha256').update(readFileSync(p)).digest('hex')}`);
    }
  };
  walk(dir);
  return out.join('\n');
}

ok('main.ts runs twice byte-identical and writes a dossier', () => {
  const outA = join(here, '.test-out-a');
  const outB = join(here, '.test-out-b');
  for (const out of [outA, outB]) {
    rmSync(out, { recursive: true, force: true });
    execFileSync(process.execPath, ['main.ts'], {
      cwd: here, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, stdio: 'pipe',
    });
    assert.ok(existsSync(join(out, 'dossier.json')), 'dossier.json written');
    assert.ok(existsSync(join(out, 'app', 'index.html')), 'app/ copied');
    assert.ok(existsSync(join(out, 'screenshots')), 'screenshots/ copied');
  }
  assert.equal(treeHash(outA), treeHash(outB), 'two runs are byte-identical');
  rmSync(outA, { recursive: true, force: true });
  rmSync(outB, { recursive: true, force: true });
});

ok('vendor library is the kit copy byte-for-byte', () => {
  const mine = readFileSync(join(here, 'vendor', 'makefun-app.ts'));
  const kit = readFileSync(join(kitDir, 'starter', 'vendor', 'makefun-app.ts'));
  assert.ok(mine.equals(kit), 'vendor/makefun-app.ts unchanged from the kit');
});

// --- 3. Gate caps ----------------------------------------------------------
function listFiles(dir, base = dir) {
  const found = [];
  for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, name.name);
    if (name.isDirectory()) found.push(...listFiles(p, base));
    else if (name.isFile()) found.push(relative(base, p));
  }
  return found;
}

ok('app/ fits the gate caps and index.html is small', () => {
  const files = listFiles(appDir);
  assert.ok(files.length <= 993, `app files ${files.length} <= 993`);
  const bytes = files.reduce((n, f) => n + statSync(join(appDir, f)).size, 0);
  assert.ok(bytes <= 48 * 1024 * 1024, `app bytes ${bytes} <= 48 MiB`);
  assert.ok(statSync(join(appDir, 'index.html')).size <= 1024 * 1024, 'index.html <= 1 MiB');
  for (const f of files) {
    assert.ok(Buffer.byteLength(f, 'utf8') <= 1000, `path ${f} <= 1000 bytes`);
  }
});

ok('screenshots follow the caps: 3-4 files, <=256 KiB, long <=1280, short >=480', () => {
  const files = listFiles(shotsDir).filter((f) => !f.startsWith('.'));
  assert.ok(files.length >= 3 && files.length <= 4, `need 3-4 screenshots, got ${files.length}`);
  assert.ok(files[0].startsWith('1-'), 'first screenshot by name is the cover');
  for (const f of files) {
    assert.match(f, /^[A-Za-z0-9._-]+$/, `name ${f} uses allowed characters`);
    const full = join(shotsDir, f);
    assert.ok(statSync(full).size <= 262144, `${f} <= 256 KiB`);
    const { w, h } = imageSize(full);
    assert.ok(Math.max(w, h) <= 1280, `${f} long side ${Math.max(w, h)} <= 1280`);
    assert.ok(Math.min(w, h) >= 480, `${f} short side ${Math.min(w, h)} >= 480`);
  }
});

ok('no network references anywhere in the app', () => {
  const bad = [];
  for (const f of listFiles(appDir)) {
    if (!/\.(html|js|mjs|css|json)$/.test(f)) continue;
    const text = readFileSync(join(appDir, f), 'utf8');
    if (/https?:\/\//.test(text) || /(src|href)\s*=\s*["']\/\//.test(text)) bad.push(f);
  }
  assert.deepEqual(bad, [], `files with network references: ${bad.join(', ')}`);
});

ok('two sample photos ship with the app', () => {
  const samples = listFiles(join(appDir, 'samples'));
  assert.ok(samples.length >= 2, `need 2+ sample photos, got ${samples.length}`);
  for (const f of samples) {
    const { w, h } = imageSize(join(appDir, 'samples', f));
    assert.ok(w >= 800 && h >= 800, `${f} is at least 800x800`);
  }
});

ok('shipped fonts are OFL-licensed files under app/', () => {
  const fonts = listFiles(join(appDir, 'fonts')).filter((f) => /\.ttf$/.test(f));
  assert.ok(fonts.length >= 1, 'at least one font file ships under app/fonts/');
  assert.ok(existsSync(join(appDir, 'fonts', 'OFL.txt')), 'OFL.txt ships beside the fonts');
});

// --- 4. Browser probe ------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
};
function serveApp() {
  return createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const path = join(appDir, url === '/' ? 'index.html' : url.replace(/^\/+/, ''));
    if (!path.startsWith(appDir) || !existsSync(path) || statSync(path).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(readFileSync(path));
  });
}

ok('browser: app loads, edits, exports, no console errors, no network', async () => {
  const { chromium } = await import('/home/hatch/workspace/makefun/tools/pw/node_modules/playwright-core/index.mjs');
  const server = serveApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    const external = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith('data:') && !u.startsWith('blob:')) {
        external.push(u);
      }
    });
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__viceCoastReady === true, null, { timeout: 15000 });
    assert.deepEqual(external, [], `no external requests: ${external.join(', ')}`);
    assert.deepEqual(errors, [], `no console errors: ${errors.join(' | ')}`);

    // Every layout and every grade renders and changes the preview pixels.
    const hashes = await page.evaluate(async () => {
      const out = {};
      for (const layout of window.__viceCoast.layouts) {
        window.__viceCoast.setLayout(layout.id);
        await new Promise((r) => setTimeout(r, 60));
        out[`layout:${layout.id}`] = await window.__viceCoast.previewHash();
      }
      for (const grade of window.__viceCoast.grades) {
        window.__viceCoast.setGrade(grade.id);
        await new Promise((r) => setTimeout(r, 60));
        out[`grade:${grade.id}`] = await window.__viceCoast.previewHash();
      }
      return out;
    });
    // Each layout renders distinctly from the other layouts, and each grade
    // distinctly from the other grades. (The first grade entry, sunset, is
    // the state the layout loop already ended in, so it is not compared
    // across the two groups.)
    const layoutHashes = Object.entries(hashes).filter(([k]) => k.startsWith('layout:')).map(([, v]) => v);
    const gradeHashes = Object.entries(hashes).filter(([k]) => k.startsWith('grade:')).map(([, v]) => v);
    assert.equal(new Set(layoutHashes).size, layoutHashes.length, 'each layout renders a distinct preview');
    assert.equal(new Set(gradeHashes).size, gradeHashes.length, 'each grade renders a distinct preview');

    // Caption edit updates the preview; export yields the right PNG size.
    await page.evaluate(() => {
      window.__viceCoast.setCaption('MIDNIGHT RUN', 'Solmar Bay', 'One last score');
      window.__viceCoast.setSize('wide');
    });
    const exported = await page.evaluate(async () => {
      const dataUrl = await window.__viceCoast.exportCover();
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
      return { w: img.naturalWidth, h: img.naturalHeight, bytes: Math.round(dataUrl.length * 0.75) };
    });
    assert.deepEqual([exported.w, exported.h], [1920, 1080], 'export is 1920x1080');
    assert.ok(exported.bytes > 50000, 'export PNG is a real image, not blank');
    assert.deepEqual(errors, [], `still no console errors: ${errors.join(' | ')}`);
  } finally {
    await browser.close();
    server.close();
  }
});

await Promise.all(jobs);
console.log(`\n${passed} checks passed`);
