// Ukur draw call per titik (dunia luar) siang & malam: node scripts/uji/drawcall.mjs [label]
// Draw call = jumlah drawElements/drawArrays per frame (termasuk pass bayangan), dihitung lewat patch WebGL.
// Hasil: median 6 frame per titik. Screenshot disimpan ke $SS_DC (default scripts/uji/hasil/drawcall).
import { mkdirSync } from 'node:fs';
import { bukaBrowser, halaman, jalankan, mulaiBaru } from './bantu.mjs';

const label = process.argv[2] ?? 'ukur';
const FOLDER = (process.env.SS_DC ?? 'scripts/uji/hasil/drawcall').replace(/\\/g, '/') + '/';
mkdirSync(FOLDER, { recursive: true });
const TITIK = [
  { n: 'pusat', x: -12, z: -4, rotY: Math.PI },
  { n: 'kampus', x: 16, z: -5, rotY: Math.PI },
  { n: 'timur', x: 48, z: 0, rotY: Math.PI },
  { n: 'sawah', x: 72, z: 0, rotY: Math.PI },
  { n: 'pasarKaget', x: 0, z: 52, rotY: Math.PI },
];
// Dipasang sebelum halaman dimuat: hitung draw call per frame requestAnimationFrame
const PATCH = () => {
  const w = window;
  w.__dc = { cur: 0, last: 0, frames: 0 };
  for (const C of [WebGL2RenderingContext, WebGLRenderingContext]) {
    for (const f of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const asli = C.prototype[f];
      if (!asli) continue;
      C.prototype[f] = function (...a) { w.__dc.cur++; return asli.apply(this, a); };
    }
  }
  const raf = w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = (cb) => raf((t) => {
    if (w.__dc.cur > 0) { w.__dc.last = w.__dc.cur; w.__dc.frames++; }
    w.__dc.cur = 0;
    cb(t);
  });
};
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const browser = await bukaBrowser();
try {
  const { p, errors } = await halaman(browser);
  await p.addInitScript(PATCH);
  await mulaiBaru(p);
  // Tutup dialog prolog (kalau ada), lalu pindah ke dunia luar
  const tombol = p.getByRole('button', { name: /Buka Buku Sakti/ });
  if (await tombol.isVisible().catch(() => false)) await tombol.click().catch(() => {});
  await jalankan(p, () => window.__game.setState({ lokasi: 'dunia', gedung: null, transisi: null, toasts: [] }));
  await p.waitForTimeout(800);
  const hasil = [];
  for (const fase of ['siang', 'malam']) {
    for (const t of TITIK) {
      await jalankan(p, (a) => {
        const g = window.__game;
        g.setState({ teleport: { x: a.t.x, z: a.t.z, rotY: a.t.rotY, id: Math.random() }, ...(a.fase === 'malam' ? { fase: 'malam', menit: 900 } : { fase: 'siang', menit: 360 }), toasts: [] });
      }, { t, fase });
      await p.waitForTimeout(1200);
      if (await tombol.isVisible().catch(() => false)) await tombol.click().catch(() => {});
      await p.waitForTimeout(300);
      const nilai = [];
      const w0 = Date.now();
      for (let i = 0; i < 6; i++) {
        await p.screenshot({ type: 'jpeg', quality: 20 });
        nilai.push(await jalankan(p, () => window.__dc.last));
      }
      const f0 = await jalankan(p, () => window.__dc.frames);
      const fpsKasar = 0;
      void f0; void w0; void fpsKasar;
      await p.screenshot({ path: `${FOLDER}${label}-${t.n}-${fase}.png` });
      hasil.push({ titik: t.n, fase, median: median(nilai), min: Math.min(...nilai), max: Math.max(...nilai) });
      console.log(`${t.n.padEnd(11)} ${fase.padEnd(6)} median ${median(nilai)} (min ${Math.min(...nilai)}, max ${Math.max(...nilai)})`);
    }
  }
  console.log('errors:', errors.filter((e) => !e.includes('synchronously unmount')).slice(0, 5));
} finally {
  await browser.close();
}
