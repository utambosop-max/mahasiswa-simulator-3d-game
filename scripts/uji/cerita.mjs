// Tes cerita utama "Buku Sakti Ibu": prolog → bab 1 → bab 2 (Rencana B) → bab 3 + misi nabung → reload → ending.
// Jalankan (dev server harus nyala): node scripts/uji/cerita.mjs
// Catatan: headless Chrome hanya menggambar frame saat screenshot → ambil screenshot berkala sambil menunggu.
import { SS, bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

const browser = await bukaBrowser();
// Browser SELALU ditutup walau tes gagal di tengah (hemat RAM)
const tutup = () => browser.close().catch(() => {});
process.on('uncaughtException', async (e) => {
  console.error(e);
  await tutup();
  process.exit(1);
});
process.on('unhandledRejection', async (e) => {
  console.error(e);
  await tutup();
  process.exit(1);
});
const { p, errors } = await halaman(browser);
const hasil = [];
await mulaiBaru(p);

const cerita = () => jalankan(p, () => window.__game.getState().cerita);
/** Ubah state lalu picu terapkanData (jam maju 1 menit) agar cekCerita jalan */
const atur = (fn) =>
  jalankan(p, (src) => {
    const g = window.__game;
    // eslint-disable-next-line no-new-func
    g.setState(new Function('s', `return (${src})(s)`)(g.getState()));
    g.getState().majukanJam(1);
  }, fn.toString());
const tambahStat = (obj) => atur(new Function(`return (s) => ({ stat: Object.fromEntries([...Object.entries(s.stat), ...Object.entries(${JSON.stringify(obj)}).map(([k, n]) => [k, (s.stat[k] ?? 0) + n])]) })`)());

/** Tunggu dialog cerita tertentu tampil (event random lain disingkirkan). */
async function tungguDialog(id, ms = 9000) {
  for (let t = 0; t < ms; t += 500) {
    const ev = await jalankan(p, (target) => {
      const s = window.__game.getState();
      if (s.event && !s.event.id.startsWith('cerita:')) window.__game.setState({ event: null });
      // Dialog cerita lain yang muncul lebih dulu (mis. adegan sampingan) → pilih opsi pertama
      else if (s.event && s.event.id !== target) s.pilihEventIni(0);
      if (s.sibuk) window.__game.setState({ sibuk: null, terkunci: false });
      s.majukanJam(1);
      return window.__game.getState().event?.id ?? null;
    }, `cerita:${id}`);
    if (ev === `cerita:${id}`) return true;
    await p.screenshot({ path: SS + 'cerita-tunggu.png' }).catch(() => {});
    await p.waitForTimeout(500);
  }
  return false;
}
const pilih = (i) => jalankan(p, (n) => window.__game.getState().pilihEventIni(n), i);
const modul = (fn) =>
  jalankan(p, async (nama) => {
    const u = performance.getEntriesByType('resource').map((e) => e.name).find((x) => x.includes('/src/game/cerita.ts')) ?? '/src/game/cerita.ts';
    const m = await import(u);
    return window.__game.getState().fitur(m[nama], 'koin');
  }, fn);

// ===== Prolog =====
cek(hasil, 'Prolog: WA Ibu muncul setelah pembuka', await tungguDialog('d_prolog_wa'));
await p.screenshot({ path: SS + 'cerita-prolog.png' });
await pilih(0);
await tambahStat({ belajar: 1, masakMi: 1, tidur: 1 });
let c = await cerita();
cek(hasil, 'Prolog selesai setelah 3 tujuan', c.bab.prolog?.s === 'selesai', JSON.stringify(c.bab.prolog));
cek(hasil, 'Dialog penutup prolog tampil', await tungguDialog('d_prolog_selesai'));
await pilih(0);

// ===== Bab 1 (pemicu hari 2, pagi) =====
await atur((s) => ({ hari: 2, tanggal: 2, fase: 'pagi', menit: 180, lokasi: 'dunia', gedung: null }));
cek(hasil, 'Bab 1 dimulai hari 2 pagi', await tungguDialog('d_bab1_awal'));
await pilih(0);
await tambahStat({ makan_warteg: 1 });
cek(hasil, 'Adegan Raka di warteg tampil', await tungguDialog('d_raka_warteg'));
await p.screenshot({ path: SS + 'cerita-raka.png' });
await pilih(0); // traktir telur
c = await cerita();
const relRaka = await jalankan(p, () => window.__game.getState().relasi.w_raka ?? 0);
cek(hasil, 'Pilihan traktir: flag rakaTeman & relasi Raka +15', 'rakaTeman' in c.flag && relRaka >= 15, `relasi ${relRaka}`);
await tambahStat({ kuliah: 3, ngobrolWarga: 3 });
c = await cerita();
cek(hasil, 'Bab 1 selesai', c.bab.bab1?.s === 'selesai');
await tungguDialog('d_bab1_selesai');
await pilih(0);

// ===== Bab 2 (tanggal tua, di kamar malam) lalu tenggat lewat → Rencana B =====
await atur((s) => ({ hari: 21, tanggal: 21, fase: 'malam', menit: 900, lokasi: 'kamar', uang: 600000 }));
cek(hasil, 'Bab 2: Raka mengetuk pintu (tanggal tua, kamar, malam)', await tungguDialog('d_raka_pinjam'));
const uang0 = await jalankan(p, () => window.__game.getState().uang);
await pilih(0); // pinjami 50 rb
const uang1 = await jalankan(p, () => window.__game.getState().uang);
cek(hasil, 'Pinjami Raka: uang −50.000 & flag rakaHutang', uang0 - uang1 === 50000 && 'rakaHutang' in (await cerita()).flag, `${uang0}→${uang1}`);
await atur((s) => ({ hari: 45, tanggal: 15, bulan: 2 }));
c = await cerita();
cek(hasil, 'Tenggat lewat → Rencana B tanpa hukuman', c.bab.bab2?.s === 'rencanaB');

// ===== Bab 3 + misi nabung sukarela =====
await atur((s) => ({ hari: 33, tanggal: 3, bulan: 2, fase: 'siang', menit: 400, uang: 800000 }));
// (urutan: sampingan "Raka bayar utang" bisa muncul lebih dulu — dialihkan oleh tungguDialog)
const ok3 = await tungguDialog('d_ibu_telepon');
cek(hasil, 'Bab 3: telepon Ibu (kiriman tidak dipotong)', ok3);
const kirimanSama = await jalankan(p, () => window.__game.getState().uang);
await pilih(1); // jujur
cek(hasil, 'Lanjut ke tawaran celengan', await tungguDialog('d_ibu_nabung'));
await pilih(0); // ikut nabung
c = await cerita();
cek(hasil, 'Flag jujur & celengan aktif', 'jujur' in c.flag && c.nabung?.status === 'aktif', JSON.stringify(c.nabung));
cek(hasil, 'Uang tidak dipotong saat ditelepon', (await jalankan(p, () => window.__game.getState().uang)) === kirimanSama);
for (let i = 0; i < 6; i++) await modul('setorNabung');
c = await cerita();
cek(hasil, 'Celengan terisi Rp300.000', c.nabung?.terkumpul === 300000, String(c.nabung?.terkumpul));
await modul('kirimNabung');
c = await cerita();
cek(hasil, 'Kirim ke Ibu: status terkirim + flag bantuWarung', c.nabung?.status === 'terkirim' && 'bantuWarung' in c.flag);
cek(hasil, 'Adegan terima kasih Ibu tampil', await tungguDialog('d_nabung_terkirim'));
await pilih(0);

// ===== Tersimpan setelah reload =====
await p.waitForTimeout(500);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
c = await cerita();
cek(hasil, 'Reload: progres cerita tersimpan', c.bab.bab1?.s === 'selesai' && c.bab.bab2?.s === 'rencanaB' && c.nabung?.status === 'terkirim' && 'jujur' in c.flag, Object.keys(c.bab).join(','));
await jalankan(p, () => window.__game.getState().mulaiMain(false));
await p.waitForTimeout(500);

// ===== Ending saat wisuda =====
await atur((s) => ({
  lulus: true,
  relasi: { ...s.relasi, w_raka: 80, mbakSri: 70, bangUdin: 65 },
  cerita: { ...s.cerita, flag: { ...s.cerita.flag, warkopSelamat: 50, rakaBertahan: 60 } },
}));
c = await cerita();
cek(hasil, 'Ending "Toga & Rantang" terpilih', c.ending === 'end_toga_rantang', String(c.ending));
cek(hasil, 'Bab yang belum mulai dilewati setelah lulus', c.bab.bab7?.s === 'lewat');
cek(hasil, 'Adegan ending tampil', await tungguDialog('end:end_toga_rantang'));
await p.screenshot({ path: SS + 'cerita-ending.png' });
await pilih(0);
cek(hasil, 'Halaman terakhir (epilog) tampil', await tungguDialog('epilog'));
await pilih(0);

// ===== Tab Buku Sakti di HP =====
await jalankan(p, () => window.__game.getState().setHP(true));
await p.waitForTimeout(300);
// Rombak UI: Buku Sakti = ikon aplikasi di layar utama HP (label bisa diikuti ", baru")
await p.getByRole('button', { name: /^Buku Sakti/ }).first().click();
await p.waitForTimeout(300);
await p.screenshot({ path: SS + 'cerita-bukusakti.png' });
cek(hasil, 'Tab Buku Sakti tampil', (await p.getByText('Toga & Rantang').count()) > 0);
await jalankan(p, () => window.__game.getState().setHP(false));

// Peringatan React "synchronously unmount a root" muncul dari reload halaman itu sendiri (terulang tanpa cerita,
// lihat 03-teknis.md) → tidak dihitung; error lain tetap gagal.
const errLain = errors.filter((e) => !e.includes('synchronously unmount a root'));
cek(hasil, 'Tanpa error konsol', errLain.length === 0, errLain.slice(0, 2).join(' | '));
console.log('Toast terakhir:', await toast(p));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek cerita lulus');
process.exit(gagal ? 1 : 0);
