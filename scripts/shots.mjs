// Take the entry's 4 screenshots with headless Chromium, straight from the
// app itself: cover shots render the app's own export drawing at the export
// size, the editor shot shows the app with a photo loaded. Every file must
// stay within the gate caps (<=256 KiB, long side <=1280, short side >=480),
// so the JPEG quality steps down until the file fits.
// Run: node scripts/shots.mjs   (serves app/ on a scratch port itself)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const shotsDir = join(here, 'screenshots');
mkdirSync(shotsDir, { recursive: true });

const SHOTS = [
  {
    name: '1-cover.jpg', w: 1280, h: 720,
    query: '?shot=cover&layout=grid&grade=sunset&photo=boulevard&caption=SUNSET%20HEIST&subtitle=SOLMAR%20BAY&tagline=ONE%20LAST%20SCORE&size=wide',
  },
  {
    name: '2-editor.jpg', w: 1280, h: 900,
    query: '?shot=editor&layout=duo&grade=neon&photo=boulevard&caption=BOULEVARD%20QUEEN&subtitle=NEON%20PIER&tagline=OWN%20THE%20NIGHT&size=square',
  },
  {
    name: '3-cover-portrait.jpg', w: 1024, h: 1280,
    query: '?shot=cover&layout=frame&grade=gold&photo=boulevard&caption=GOLD%20COAST&subtitle=PALM%20SHORES&tagline=GOLDEN%20HOUR%20HEIST&size=portrait',
  },
  {
    name: '4-cover-square.jpg', w: 1280, h: 1280,
    query: '?shot=cover&layout=diagonal&grade=midnight&photo=boulevard&caption=MIDNIGHT%20RUN&subtitle=NEON%20PIER&tagline=NO%20BRAKES%20AFTER%20DARK&size=square',
  },
];

const server = spawn(process.execPath, ['serve.ts', '--port', '8123'], { cwd: here, stdio: 'pipe' });
await new Promise((resolve) => setTimeout(resolve, 1500));

const { chromium } = await import('/home/hatch/workspace/makefun/tools/pw/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:8123/index.html${shot.query}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__viceCoastReady === true, null, { timeout: 15000 });
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (errors.length > 0) throw new Error(`${shot.name}: page errors: ${errors.join(' | ')}`);
    let quality = 85;
    let buf;
    for (;;) {
      buf = await page.screenshot({ type: 'jpeg', quality });
      if (buf.length <= 262144 || quality <= 55) break;
      quality -= 8;
    }
    const out = join(shotsDir, shot.name);
    writeFileSync(out, buf);
    console.log(`[shots] ${shot.name}: ${shot.w}x${shot.h} q${quality}, ${buf.length} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log('[shots] done');
