// Membuat semua ikon & splash dari SVG maskot (src/ui/maskotSvg.ts) memakai Chrome headless.
// Jalankan: node scripts/buat-ikon.mjs   (butuh Google Chrome terpasang; Node ≥ 23 untuk import .ts)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { svgIkon, svgMaskot } from '../src/ui/maskotSvg.ts';

const ROOT = resolve(import.meta.dirname, '..');
const RES = join(ROOT, 'android/app/src/main/res');
const CHROME = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error('Google Chrome tidak ditemukan (atur variabel CHROME).');

const KERJA = join(tmpdir(), 'mahasiswa-ikon');
mkdirSync(KERJA, { recursive: true });

/** Render HTML berisi SVG ke PNG ukuran w×h (latar transparan). */
function render(nama, w, h, isiBody, latar = 'transparent') {
  const html = join(KERJA, `${nama}.html`);
  writeFileSync(
    html,
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${latar}}svg{display:block}</style></head><body>${isiBody}</body></html>`,
  );
  const out = join(KERJA, `${nama}.png`);
  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${w},${h}`,
    `--screenshot=${out}`,
    pathToFileURL(html).href,
  ], { stdio: 'ignore' });
  return out;
}

function simpan(dari, ke) {
  mkdirSync(join(ke, '..'), { recursive: true });
  execFileSync(process.execPath, ['-e', `require('fs').copyFileSync(${JSON.stringify(dari)}, ${JSON.stringify(ke)})`]);
}

const penuh = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `);

// ===== Ikon launcher (legacy + bulat) & foreground ikon adaptif =====
const DPI = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DPI)) {
  const s = Math.round(48 * k);
  const f = Math.round(108 * k);
  simpan(render(`kotak-${d}`, s, s, penuh(svgIkon('kotak'), s, s)), join(RES, `mipmap-${d}/ic_launcher.png`));
  simpan(render(`bulat-${d}`, s, s, penuh(svgIkon('bulat'), s, s)), join(RES, `mipmap-${d}/ic_launcher_round.png`));
  simpan(render(`depan-${d}`, f, f, penuh(svgIkon('polos'), f, f)), join(RES, `mipmap-${d}/ic_launcher_foreground.png`));
}
console.log('✅ Ikon launcher (5 ukuran × 3 jenis)');

// Warna latar ikon adaptif
writeFileSync(
  join(RES, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFC97F</color>\n</resources>\n`,
);
// Hapus foreground vektor bawaan Capacitor (kalau ada) agar yang dipakai PNG maskot
const vektor = join(RES, 'drawable-v24/ic_launcher_foreground.xml');
if (existsSync(vektor)) rmSync(vektor);

// ===== Splash screen: maskot + judul di latar krem =====
const SPLASH = {
  land: { mdpi: [480, 320], hdpi: [800, 480], xhdpi: [1280, 720], xxhdpi: [1600, 960], xxxhdpi: [1920, 1280] },
  port: { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] },
};
const isiSplash = (w, h) => {
  const tinggiMaskot = Math.round(Math.min(w, h) * 0.55);
  const huruf = Math.round(Math.min(w, h) * 0.075);
  return `<div style="width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(huruf * 0.4)}px;background:radial-gradient(circle at 50% 42%,#fff8ea,#ffe2b5 70%,#ffcf8f);font-family:'Segoe UI Rounded','Segoe UI',system-ui,sans-serif">
    <div style="height:${tinggiMaskot}px">${svgMaskot().replace('<svg ', `<svg height="${tinggiMaskot}" `)}</div>
    <div style="font-weight:900;font-size:${huruf}px;color:#ea580c;text-shadow:0 ${Math.round(huruf / 10)}px 0 #fff">Mahasiswa Simulator 3D</div>
  </div>`;
};
for (const [arah, daftar] of Object.entries(SPLASH)) {
  for (const [d, [w, h]] of Object.entries(daftar)) {
    simpan(render(`splash-${arah}-${d}`, w, h, isiSplash(w, h)), join(RES, `drawable-${arah}-${d}/splash.png`));
  }
}
simpan(render('splash-dasar', 480, 320, isiSplash(480, 320)), join(RES, 'drawable/splash.png'));
console.log('✅ Splash screen (11 ukuran)');

// ===== Favicon web & pratinjau =====
mkdirSync(join(ROOT, 'public'), { recursive: true });
writeFileSync(join(ROOT, 'public/ikon.svg'), svgIkon('kotak'));
simpan(render('pratinjau-ikon', 512, 512, penuh(svgIkon('kotak'), 512, 512)), join(ROOT, 'rilis/pratinjau-ikon.png'));
simpan(render('pratinjau-splash', 1280, 720, isiSplash(1280, 720)), join(ROOT, 'rilis/pratinjau-splash.png'));
console.log('✅ public/ikon.svg + pratinjau di rilis/');
