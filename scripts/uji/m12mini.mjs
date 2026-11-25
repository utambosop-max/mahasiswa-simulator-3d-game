// Tes 8 mini-game fisika (M12): terbuka dari aksi, tampil tanpa error, skor → aksi jalan + bonus,
// Lewati → aksi jalan tanpa bonus, Batal → tidak terjadi apa-apa, ujian SIM wajib lulus.
// Jalankan (dev server harus nyala): node scripts/uji/m12mini.mjs
import { SS, bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

const browser = await bukaBrowser();
const { p, errors } = await halaman(browser);
const hasil = [];
await mulaiBaru(p);
await jalankan(p, () => window.__game.setState({ uang: 1000000, fase: 'sore', menit: 660, bensin: 40 }));

/** Headless Chrome hanya menggambar saat diminta → screenshot berkala agar animasi berjalan */
async function frame(detik, nama) {
  for (let i = 0; i < detik * 4; i++) {
    await p.screenshot({ path: SS + (i === detik * 4 - 1 && nama ? nama : 'm12-frame.png') });
    await p.waitForTimeout(250);
  }
}
const state = () => jalankan(p, () => {
  const s = window.__game.getState();
  return { mini: s.miniFisika?.jenis ?? null, stres: s.stres, sibuk: s.sibuk?.label ?? null, punyaSim: s.punyaSim, uang: s.uang };
});
const bebas = () => jalankan(p, () => window.__game.setState({ sibuk: null, transisi: null, toasts: [] }));

// Aksi kamar: gitar & masak mi
const DI_KAMAR = [['mainGitar', 'gitar'], ['masakMi', 'mi']];
const DI_DUNIA = [['santaiTaman', 'batu'], ['isiBensin', 'bensin'], ['mainFutsal', 'juggling'], ['tendangPenalti', 'penalti'], ['latihanGym', 'beban']];

for (const [aksi, jenis] of [...DI_KAMAR, ...DI_DUNIA]) {
  if (aksi === 'santaiTaman') {
    await jalankan(p, () => window.__game.getState().lakukan('keluar'));
    await p.waitForTimeout(1500);
  }
  await bebas();
  await jalankan(p, (a) => window.__game.getState().lakukan(a), aksi);
  await p.waitForTimeout(300);
  const st = await state();
  cek(hasil, `${aksi} membuka mini-game ${jenis}`, st.mini === jenis, `mini=${st.mini}`);
  // Ketuk HANYA kanvas mini-game (bukan minimap!) & biarkan animasi jalan
  const kanvas = p.locator('div.z-40 canvas');
  const ketuk = async () => {
    if ((await kanvas.count()) > 0) await kanvas.first().dispatchEvent('pointerdown', { clientX: 640, clientY: 300 });
  };
  await ketuk();
  await frame(1.5, `m12-mini-${jenis}.png`);
  await ketuk();
  await frame(0.5);
  // Selesaikan dengan skor penuh → aksi jalan + bonus (toast). Bila sudah selesai sendiri, cukup cek toast bonusnya.
  const masihBuka = (await state()).mini === jenis;
  if (masihBuka) await jalankan(p, () => window.__game.getState().akhiriMini(1));
  await p.waitForTimeout(900);
  const sesudah = await state();
  const t = await toast(p);
  cek(hasil, `${jenis}: tertutup & bonus muncul${masihBuka ? '' : ' (selesai sendiri)'}`, sesudah.mini === null && t.length > 0, t.join(' | '));
  cek(hasil, `${jenis}: peta besar tidak ikut terbuka`, !(await jalankan(p, () => window.__game.getState().petaTerbuka)));
}

// Lewati: aksi tetap jalan (jam & stres direset dulu: GOR tutup saat begadang, stres 0 tidak bisa turun)
await bebas();
await jalankan(p, () => window.__game.setState({ fase: 'sore', menit: 660, stres: 50, energi: 80 }));
await jalankan(p, () => window.__game.getState().lakukan('tendangPenalti'));
await p.waitForTimeout(300);
const buka = (await state()).mini;
await jalankan(p, () => window.__game.getState().akhiriMini('lewati'));
await p.waitForTimeout(600);
const s1 = await state();
cek(hasil, 'Lewati → aksi tetap dijalankan', buka === 'penalti' && s1.mini === null && (s1.sibuk !== null || s1.stres !== 50), `${JSON.stringify(s1)} · ${(await toast(p)).join(' | ')}`);

// Batal: tidak terjadi apa-apa
await bebas();
await jalankan(p, () => window.__game.getState().lakukan('latihanGym'));
await p.waitForTimeout(300);
const u0 = (await state()).uang;
await jalankan(p, () => window.__game.getState().akhiriMini('batal'));
await p.waitForTimeout(600);
const s2 = await state();
cek(hasil, 'Batal → tidak bayar tiket gym', s2.mini === null && s2.uang === u0, `${u0} → ${s2.uang}`);

// Ujian SIM: gagal → belum punya SIM; lulus → SIM jadi
await bebas();
await jalankan(p, () => window.__game.setState({ miniFisika: { jenis: 'sim', aksi: null } }));
await frame(1, 'm12-mini-sim.png');
await jalankan(p, () => window.__game.getState().akhiriMini(1 / 3));
await p.waitForTimeout(300);
cek(hasil, 'SIM gagal (1/3) → belum punya SIM', (await state()).punyaSim === false);
await jalankan(p, () => window.__game.setState({ miniFisika: { jenis: 'sim', aksi: null } }));
await jalankan(p, () => window.__game.getState().akhiriMini(2 / 3));
await p.waitForTimeout(300);
cek(hasil, 'SIM lulus (2/3) → punya SIM', (await state()).punyaSim === true);

cek(hasil, 'Tanpa error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek mini-game lulus');
process.exit(gagal ? 1 : 0);
