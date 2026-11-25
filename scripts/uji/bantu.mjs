// Pembantu tes otomatis (skill game-qa-automation). Butuh: npm run dev (port 5173) & paket playwright-core.
// Dipakai oleh skrip lain di folder ini.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const URL = process.env.URL_GAME ?? 'http://localhost:5173/';
/** Folder screenshot (tidak ikut build) */
export const SS = resolve('scripts/uji/hasil') + '/';
mkdirSync(SS, { recursive: true });

/** Browser Chrome dengan GPU asli (tanpa GPU hasil FPS & tampilan tidak valid). */
export const bukaBrowser = () =>
  chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

/** Halaman baru + pencatat error (stack trace lengkap). */
export async function halaman(browser, w = 1280, h = 720) {
  const p = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.stack ?? e.message));
  p.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return { p, errors };
}

/** Jalankan fungsi di halaman. ⚠️ Selalu teruskan `arg` (kalau lupa, nilainya undefined). */
export const jalankan = (p, fn, arg) => p.evaluate(fn, arg);

/** Mulai game baru (save dihapus) dengan karakter tes & event acak dimatikan. */
export async function mulaiBaru(p) {
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    const g = window.__game;
    g.setState({ profil: { nama: 'Tester', jurusan: 'teknik', asal: 'jawa', kulit: 1, rambut: '#3b2a20', baju: '#7cc6a4', gaya: 'pendek', ultah: { tanggal: 9, bulan: 2 } } });
    g.getState().mulaiMain(false);
  });
  await p.waitForTimeout(700);
  await p.evaluate(() => window.__game.setState({ eventHari: { hari: 999, jumlah: 99 }, toasts: [] }));
}

/** 3 toast terakhir */
export const toast = (p) => p.evaluate(() => window.__game.getState().toasts.map((t) => t.teks).slice(-3));

/** Catat hasil cek: ✅ / ❌ */
export function cek(hasil, nama, lulus, info = '') {
  hasil.push({ nama, lulus });
  console.log(`${lulus ? '✅' : '❌'} ${nama}${info ? ` — ${info}` : ''}`);
}
