// Tes asap (smoke test) — jalankan setelah setiap build: node scripts/uji/asap.mjs
// Cek hal esensial: game bisa dimulai, jam jalan, keluar kos, masuk & keluar gedung, HP terbuka, tanpa error konsol.
import { SS, bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

const browser = await bukaBrowser();
const { p, errors } = await halaman(browser);
const hasil = [];
await mulaiBaru(p);

const m0 = await jalankan(p, () => window.__game.getState().menit);
await p.waitForTimeout(2200);
const m1 = await jalankan(p, () => window.__game.getState().menit);
cek(hasil, 'Jam berjalan', m1 - m0 >= 2, `${m0} → ${m1}`);

await jalankan(p, () => window.__game.getState().lakukan('keluar'));
await p.waitForTimeout(1500);
cek(hasil, 'Keluar kos', (await jalankan(p, () => window.__game.getState().lokasi)) === 'dunia');

await jalankan(p, (id) => {
  window.__game.setState({ dekat: id, transisi: null });
  window.__game.getState().lakukan('masukGedung');
}, 'warteg');
await p.waitForTimeout(1600);
cek(hasil, 'Masuk warteg', (await jalankan(p, () => window.__game.getState().gedung)) === 'warteg');
await p.screenshot({ path: SS + 'asap-warteg.png' });

await jalankan(p, () => {
  window.__game.setState({ transisi: null });
  window.__game.getState().lakukan('keluarGedung');
});
await p.waitForTimeout(1600);
cek(hasil, 'Keluar gedung', (await jalankan(p, () => window.__game.getState().lokasi)) === 'dunia');

await jalankan(p, () => {
  const g = window.__game;
  g.setState({ event: null, cerita: { ...g.getState().cerita, antrean: [] } });
  g.getState().setHP(true);
});
await p.waitForTimeout(300);
// Rombak UI (tema HP): layar utama berisi ikon aplikasi → cek ikon To-Do, lalu buka aplikasi "Anak Kos"
const adaKategori = (await p.getByRole('button', { name: /^To-Do/ }).count()) > 0;
await p.getByRole('button', { name: /^Anak Kos/ }).first().click();
await p.waitForTimeout(300);
cek(hasil, 'HP terbuka (ikon aplikasi & aplikasi Kos)', adaKategori && (await jalankan(p, () => window.__game.getState().hpApp)) === 'kos');
await jalankan(p, () => window.__game.getState().setHP(false));

cek(hasil, 'Tanpa error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log('Toast terakhir:', await toast(p));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek asap lulus');
process.exit(gagal ? 1 : 0);
