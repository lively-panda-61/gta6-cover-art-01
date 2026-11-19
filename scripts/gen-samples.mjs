// Render the procedural sample scenes to app/samples/*.png with headless
// Chromium. Run: node scripts/gen-samples.mjs
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const samplesDir = join(here, 'app', 'samples');
mkdirSync(samplesDir, { recursive: true });

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const path = join(here, url.replace(/^\/+/, ''));
  if (!path.startsWith(here) || !existsSync(path) || statSync(path).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

const { chromium } = await import('/home/hatch/workspace/makefun/tools/pw/node_modules/playwright-core/index.mjs');
const browser = await chromium.launch();
try {
  for (const scene of ['boulevard', 'pier']) {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
    await page.goto(`http://127.0.0.1:${port}/scripts/harness.html?scene=${scene}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__sceneDone === true, null, { timeout: 15000 });
    const dataUrl = await page.evaluate(() => document.getElementById('scene').toDataURL('image/png'));
    const out = join(samplesDir, `${scene}.png`);
    writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`[gen-samples] ${scene}.png: ${statSync(out).size} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
