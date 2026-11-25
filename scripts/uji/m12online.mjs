// Tes 2 pemain online (M12): lampu lalu lintas & gerobak cilok sinkron, rekor mini-game & harta di peringkat.
// Butuh: npm run dev (port 5173) + server online jalan di port 8787 dengan KODE_SERVER (lihat KODE di bawah).
// Contoh: (di folder data kosong)  $env:KODE_SERVER='uji123456'; node <proyek>/dist-server/server.mjs
import { bukaBrowser, cek, halaman, jalankan } from './bantu.mjs';

const KODE = process.env.KODE_UJI ?? 'uji123456';
const URL = process.env.URL_GAME ?? 'http://localhost:5173/';
const browser = await bukaBrowser();
const hasil = [];

/** URL modul yang dipakai aplikasi (Vite kadang menambah ?t=...) */
const urlModul = (p, nama) =>
  jalankan(p, (n) => performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes(`/src/${n}`)) ?? `/src/${n}`, nama);

async function pemain(nama, warna) {
  const { p, errors } = await halaman(browser);
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  const klien = await urlModul(p, 'online/klien.ts');
  await jalankan(p, async ([u, n, w, k]) => (await import(u)).mulaiSambung('localhost:8787', n, w, k), [klien, nama, warna, KODE]);
  await p.waitForFunction(() => window.__online.getState().status === 'lobi', null, { timeout: 15000 });
  await jalankan(p, async (u) => (await import(u)).gabung(null), klien);
  await p.waitForFunction(() => window.__online.getState().status === 'main', null, { timeout: 15000 });
  await p.waitForTimeout(800);
  // Profil sederhana agar tidak tertahan layar buat karakter
  await jalankan(p, () => {
    const g = window.__game;
    if (!g.getState().profil) g.setState({ profil: { nama: 'Uji', jurusan: 'teknik', asal: 'jawa', kulit: 1, rambut: '#3b2a20', baju: '#7cc6a4', gaya: 'pendek', ultah: { tanggal: 9, bulan: 2 } } });
    g.setState({ buatKarakter: false, layarUtama: false });
  });
  return { p, errors };
}

// Nama unik tiap tes: server menolak nama yang sudah dipakai HP (token) lain — fitur keamanan
const akhiran = String(Math.floor(Math.random() * 1000));
const NAMA_A = `Ayu${akhiran}`;
const A = await pemain(NAMA_A, '#ff9aa2');
const B = await pemain(`Budi${akhiran}`, '#a0c4ff');
cek(hasil, 'Dua pemain tersambung', (await jalankan(B.p, () => window.__online.getState().pemain.length)) >= 2);

// 1) Sinkron: lampu & cilok dibaca hampir bersamaan di kedua HP
const bacaDunia = async (x) => {
  const ul = await urlModul(x.p, 'game/lalulintas.ts');
  const uc = await urlModul(x.p, 'game/cilok.ts');
  return jalankan(x.p, async ([a, b]) => {
    const l = await import(a);
    const c = await import(b);
    c.langkahCilok();
    return { x: l.warnaLampu('x'), z: l.warnaLampu('z'), cilok: c.CILOK.x };
  }, [ul, uc]);
};
let samaLampu = 0;
let selisihCilok = 0;
for (let i = 0; i < 5; i++) {
  const [a, b] = await Promise.all([bacaDunia(A), bacaDunia(B)]);
  if (a.x === b.x && a.z === b.z) samaLampu++;
  selisihCilok = Math.max(selisihCilok, Math.abs(a.cilok - b.cilok));
  await A.p.waitForTimeout(1300);
}
cek(hasil, 'Lampu lalu lintas sama di kedua HP', samaLampu >= 4, `${samaLampu}/5 sampel sama`);
cek(hasil, 'Gerobak cilok di posisi sama', selisihCilok < 0.3, `selisih maks ${selisihCilok.toFixed(2)} m`);

// 2) Rekor mini-game Ayu muncul di peringkat Budi
const um12 = await urlModul(A.p, 'game/m12.ts');
await jalankan(A.p, async (u) => {
  const m = await import(u);
  window.__game.getState().fitur((d) => m.bonusMini(d, 'penalti', 1), 'pop');
}, um12);
await B.p.waitForFunction((n) => (window.__online.getState().pemain.find((x) => x.nama === n)?.rekor ?? 0) >= 100, NAMA_A, { timeout: 10000 }).catch(() => {});
const ayu = await jalankan(B.p, (n) => window.__online.getState().pemain.find((x) => x.nama === n), NAMA_A);
cek(hasil, 'Rekor mini-game Ayu terlihat di HP Budi', (ayu?.rekor ?? 0) === 100, `rekor=${ayu?.rekor}`);
cek(hasil, 'Harta Ayu terhitung', typeof ayu?.harta === 'number' && ayu.harta >= (ayu.uang ?? 0), `harta=${ayu?.harta} uang=${ayu?.uang}`);

// 3) Tab Peringkat tampil di HP Budi
// UI HP baru: Peringkat = tab di aplikasi KTM
await jalankan(B.p, () => window.__game.getState().setHP(true, 'ktm'));
await B.p.waitForTimeout(300);
await B.p.getByRole('button', { name: /Peringkat/ }).first().click();
await B.p.waitForTimeout(300);
cek(hasil, 'Tab Peringkat menampilkan rekor mini-game', (await B.p.getByText('Rekor mini-game').count()) > 0);
await B.p.screenshot({ path: 'scripts/uji/hasil/m12-online-peringkat.png' });

cek(hasil, 'Tanpa error konsol (Ayu)', A.errors.length === 0, A.errors.slice(0, 2).join(' | '));
cek(hasil, 'Tanpa error konsol (Budi)', B.errors.length === 0, B.errors.slice(0, 2).join(' | '));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek online M12 lulus');
process.exit(gagal ? 1 : 0);
