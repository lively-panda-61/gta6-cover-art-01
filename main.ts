// Vice Coast — the program that hands the cover maker in (Node 22, standard
// library only). It assembles /output from this repository: a fresh copy of
// app/ and screenshots/, then the dossier the judge reads, written by the
// vendored make.fun library from vendor/makefun-app.ts.
//
// Usage:
//   MAKEFUN_OUTPUT_DIR=out node main.ts        (the grader leaves it unset,
//                                               so /output is used there)
//   node main.ts --out <dir>                   (local runs and the test suite)
// The output directory is emptied by removing its contents only, never the
// directory itself: on the grader /output is a mounted volume, and removing
// a mount point fails the run. The dossier step runs last, on the finished
// tree — the gate compares dossier.json against exactly these bytes.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const outFlag = args.indexOf('--out');
const outDir = outFlag === -1 ? (process.env.MAKEFUN_OUTPUT_DIR ?? '/output') : args[outFlag + 1];
if (!outDir) {
  console.error('[vice-coast] --out needs a directory');
  process.exit(2);
}
const out = resolve(outDir);

function listFiles(dir, base = dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...listFiles(path, base));
    else if (entry.isFile()) found.push(relative(base, path));
  }
  return found.sort();
}

function emptyDirContents(dir) {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    rmSync(join(dir, entry.name), { recursive: true, force: true });
  }
}

function copyTree(srcDir, destDir, label) {
  const files = existsSync(srcDir) ? listFiles(srcDir) : [];
  let bytes = 0;
  for (const rel of files) {
    const src = join(srcDir, rel);
    const dest = join(destDir, rel);
    mkdirSync(join(dest, '..'), { recursive: true });
    cpSync(src, dest);
    bytes += statSync(src).size;
  }
  console.log(`[vice-coast] ${label}: ${files.length} files, ${bytes} bytes -> ${destDir}`);
  return { files: files.length, bytes };
}

// A clean output: remove whatever an earlier run left inside it, then rebuild.
emptyDirContents(out);
const app = copyTree(join(here, 'app'), join(out, 'app'), 'app');
const shots = copyTree(join(here, 'screenshots'), join(out, 'screenshots'), 'screenshots');
if (app.files === 0) {
  console.error('[vice-coast] app/ is empty — nothing to hand in');
  process.exit(1);
}
if (shots.files < 3 || shots.files > 4) {
  console.error(`[vice-coast] screenshots/ must hold 3 or 4 images, found ${shots.files}`);
  process.exit(1);
}

// The scorer's caps for this competition (gate.json): text budget for the
// dossier, screenshot count/size, and the app tree limits.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`[vice-coast] dossier.json: ${dossier.length} bytes — entry ready in ${out}`);
