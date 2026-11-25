// Tes animasi pembuka: node scripts/uji/pembuka.mjs
// 1) Game baru → buat karakter → pembuka muncul → screenshot tiap shot (+ FPS kasar & draw call)
// 2) Lewati → masuk kamar; reload → pembuka tidak muncul lagi
// 3) Save lama (tanpa field pembukaSelesai) → pembuka tidak muncul
import { mkdirSync, writeFileSync } from 'node:fs';
import { URL, bukaBrowser, cek, halaman, jalankan } from './bantu.mjs';

const FOLDER = (process.env.SS_PEMBUKA ?? 'scripts/uji/hasil/pembuka').replace(/\\/g, '/') + '/';
mkdirSync(FOLDER, { recursive: true });
const PROFIL = { nama: 'Dimas', jurusan: 'teknik', asal: 'jawa', kulit: 1, rambut: '#3b2a20', baju: '#ffb36b', gaya: 'jabrik', ultah: { tanggal: 9, bulan: 2 } };
// Mulai detik tiap shot (harus sama dengan src/data/pembuka.json)
const DURASI = [4, 5, 5, 4.5, 3.5, 6, 4.5, 5, 6.5, 5, 5, 6];
const MULAI = DURASI.reduce((a, d, i) => (a.push(i ? a[i - 1] + DURASI[i - 1] : 0), a), []);
const TOTAL = MULAI.at(-1) + DURASI.at(-1);

async function gameBaru(p) {
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.evaluate(() => localStorage.clear());
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.getState().mulaiMain(true));
  await p.waitForTimeout(300);
  await p.evaluate((pr) => window.__game.getState().simpanProfil(pr), PROFIL);
  await p.waitForTimeout(600);
}
const st = (p) => jalankan(p, () => { const s = window.__game.getState(); return { pembuka: s.pembuka, selesai: s.pembukaSelesai, lokasi: s.lokasi, menit: s.menit, layar: s.layarUtama }; });

// Peringatan LAMA (bukan dari pembuka): label nama <Html> di Player.tsx saat GameCanvas dipasang dengan profil
// yang sudah ada — muncul juga saat reload biasa. Dicatat terpisah, dilaporkan ke 12/14.
const LAMA = 'Attempted to synchronously unmount a root while React was already rendering';
const bersih = (errors) => {
  const lama = errors.filter((e) => e.includes(LAMA)).length;
  if (lama) console.log(`ℹ️ ${lama}× peringatan lama Html/Player (bukan dari pembuka) diabaikan`);
  return errors.filter((e) => !e.includes(LAMA));
};
const browser = await bukaBrowser();
const hasil = [];
try {
// ===== 1. Game baru → pembuka + screenshot tiap shot =====
{
  const { p, errors } = await halaman(browser);
  p.on('crash', () => console.log('💥 halaman crash'));
  p.on('close', () => console.log('halaman ditutup; error:', errors.slice(0, 3)));
  await gameBaru(p);
  const a = await st(p);
  cek(hasil, 'Pembuka muncul setelah buat karakter', a.pembuka === true && a.selesai === false);
  cek(hasil, 'Tombol Lewati terlihat sejak awal', await p.getByRole('button', { name: 'Lewati pembuka' }).isVisible());
  // FPS kasar: hitung frame selama 3 dtk (headless hanya menggambar saat screenshot → diambil berkala)
  const f0 = await jalankan(p, () => window.__pembuka?.frame ?? 0);
  const w0 = Date.now();
  while (Date.now() - w0 < 3000) await p.screenshot({ type: 'jpeg', quality: 30 });
  const f1 = await jalankan(p, () => window.__pembuka?.frame ?? 0);
  console.log(`ℹ️ FPS headless (dibatasi screenshot): ${((f1 - f0) / ((Date.now() - w0) / 1000)).toFixed(1)}`);
  const tersimpan = new Set();
  let calls = 0;
  const batas = Date.now() + (TOTAL + 15) * 1000;
  while (Date.now() < batas) {
    const buf = await p.screenshot();
    const info = await jalankan(p, () => ({ t: window.__pembuka?.t ?? 0, calls: window.__pembuka?.calls ?? 0, aktif: window.__game.getState().pembuka }));
    if (!info.aktif) break;
    calls = Math.max(calls, info.calls);
    let i = 0;
    while (i + 1 < MULAI.length && info.t >= MULAI[i + 1]) i++;
    const f = (info.t - MULAI[i]) / DURASI[i];
    // Simpan 1 gambar per shot di ± 60% shot (shot terakhir: 2 gambar, TANGGAL TUA & judul)
    const kunci = i === 11 ? (f < 0.55 ? (f > 0.35 ? '12a' : null) : f > 0.7 ? '12b' : null) : f > 0.6 ? String(i + 1).padStart(2, '0') : null;
    if (kunci && !tersimpan.has(kunci)) {
      tersimpan.add(kunci);
      writeFileSync(`${FOLDER}shot${kunci}.png`, buf);
    }
    await p.waitForTimeout(150);
  }
  cek(hasil, 'Screenshot tiap shot', tersimpan.size >= 12, `${tersimpan.size} gambar → ${FOLDER}`);
  console.log(`ℹ️ Draw call maks: ${calls}`);
  await p.waitForTimeout(1500);
  const b = await st(p);
  cek(hasil, 'Selesai → kamar & pembukaSelesai', !b.pembuka && b.selesai && b.lokasi === 'kamar');
  cek(hasil, 'Jam tidak maju selama pembuka', b.menit - a.menit <= 3, `${a.menit} → ${b.menit}`);
  await p.screenshot({ path: `${FOLDER}setelah-selesai.png` });
  cek(hasil, 'Tes 1 tanpa error konsol', bersih(errors).length === 0, bersih(errors).slice(0, 2).join(' | '));
  await p.context().close();
}

// ===== 2. Lewati → kamar; reload → tidak muncul lagi =====
{
  const { p, errors } = await halaman(browser);
  await gameBaru(p);
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: 'Lewati pembuka' }).dispatchEvent('pointerdown');
  await p.waitForTimeout(1200);
  const a = await st(p);
  cek(hasil, 'Lewati → kamar', !a.pembuka && a.selesai && a.lokasi === 'kamar');
  await p.screenshot({ path: `${FOLDER}setelah-lewati.png` });
  const m0 = a.menit;
  await p.waitForTimeout(2200);
  cek(hasil, 'Setelah lewati jam jalan (bisa main)', (await st(p)).menit > m0);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.getState().mulaiMain(false));
  await p.waitForTimeout(800);
  const b = await st(p);
  cek(hasil, 'Reload → pembuka tidak muncul', !b.pembuka && b.selesai);
  cek(hasil, 'Tes 2 tanpa error konsol', bersih(errors).length === 0, bersih(errors).slice(0, 2).join(' | '));
  await p.context().close();
}

// ===== 3. Save lama tanpa field pembukaSelesai =====
{
  const { p, errors } = await halaman(browser);
  await gameBaru(p);
  await p.getByRole('button', { name: 'Lewati pembuka' }).dispatchEvent('pointerdown');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    const k = 'mahasiswa-sim-save-v1';
    const d = JSON.parse(localStorage.getItem(k));
    delete d.pembukaSelesai; // tiru save sebelum fitur ini
    localStorage.setItem(k, JSON.stringify(d));
  });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate(() => window.__game.getState().mulaiMain(false));
  await p.waitForTimeout(800);
  const a = await st(p);
  cek(hasil, 'Save lama → pembuka tidak muncul', !a.pembuka && a.selesai === true);
  // Tonton ulang dari pengaturan
  await p.evaluate(() => window.__game.getState().setMenu(true));
  await p.waitForTimeout(300);
  await p.getByText('Tonton ulang pembuka').click();
  await p.waitForTimeout(800);
  cek(hasil, 'Tonton ulang dari Pengaturan', (await st(p)).pembuka === true);
  await p.getByRole('button', { name: 'Lewati pembuka' }).dispatchEvent('pointerdown');
  await p.waitForTimeout(800);
  cek(hasil, 'Tonton ulang → lewati → kembali main', !(await st(p)).pembuka);
  cek(hasil, 'Tes 3 tanpa error konsol', bersih(errors).length === 0, bersih(errors).slice(0, 2).join(' | '));
  await p.context().close();
}

} finally {
  await browser.close(); // selalu tutup browser (hemat RAM)
}
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek pembuka lulus');
process.exit(gagal ? 1 : 0);
