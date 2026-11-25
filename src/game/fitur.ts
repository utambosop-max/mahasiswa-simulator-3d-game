// Fitur kehidupan M7: misi harian, pencapaian, tabungan, barang (tas), profil & order ojol.
// Fungsi murni (tanpa React). Angka dari src/data/fitur.json.
import {
  FITUR,
  PERABOT,
  formatRupiah,
  isHariKerja,
  ringkasEfek,
  tambahStat,
  ubahUang,
  KEH,
  F2,
  levelSkill,
  hariMinggu,
  slotWaktu,
  isTanggalTua,
  type Efek,
  type Profil,
  type SaveData,
  type CekAksi,
  type HasilAksi,
} from './sim';
import { PALETTE } from '../three/palette';
import { F3 } from './m11';

// ===== Profil =====
export function profilAcak(nama = ''): Profil {
  const acak = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
  return {
    nama,
    jurusan: acak(FITUR.jurusan).id,
    asal: acak(FITUR.asal).id,
    kulit: Math.floor(Math.random() * PALETTE.kulit.length),
    rambut: acak(FITUR.rambut),
    baju: acak(FITUR.baju),
    ultah: { tanggal: 1 + Math.floor(Math.random() * 30), bulan: 1 + Math.floor(Math.random() * 4) },
  };
}

// ===== Misi harian =====
export type MisiDef = (typeof FITUR.misi)[number] & { hariKerja?: boolean; hadiah: Efek };
const SEMUA_MISI = [...FITUR.misiPertama, ...FITUR.misi] as MisiDef[];
export const cariMisi = (id: string) => SEMUA_MISI.find((m) => m.id === id);

/** Angka acak tetap dari nomor hari (misi sama walau game dimuat ulang). */
function acakHari(hari: number, i: number) {
  let h = ((hari + 1) * 374761393 + i * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h % 100000) / 100000;
}

/** Siapkan 3 misi untuk hari ini (hari pertama = misi tutorial). */
export function siapkanMisi<T extends Pick<SaveData, 'hari' | 'misi' | 'stat'>>(d: T): T {
  if (d.misi.hari === d.hari) return d;
  let pilihan: MisiDef[];
  if (d.hari === 1) pilihan = FITUR.misiPertama as MisiDef[];
  else {
    const calon = (FITUR.misi as MisiDef[]).filter((m) => !m.hariKerja || isHariKerja(d.hari));
    const urut = calon.map((m, i) => ({ m, k: acakHari(d.hari, i) })).sort((a, b) => a.k - b.k);
    pilihan = urut.slice(0, 3).map((x) => x.m);
  }
  return { ...d, misi: { hari: d.hari, dasar: { ...d.stat }, daftar: pilihan.map((m) => ({ id: m.id, klaim: false })), bonus: false } };
}

export const progresMisi = (d: Pick<SaveData, 'stat' | 'misi'>, m: MisiDef) => Math.min(m.target, (d.stat[m.stat] ?? 0) - (d.misi.dasar[m.stat] ?? 0));

// ===== Pencapaian =====
export type PencapaianDef = (typeof FITUR.pencapaian)[number] & { kunci?: string };
export const PENCAPAIAN = FITUR.pencapaian as PencapaianDef[];

export function nilaiPencapaian(d: SaveData, p: PencapaianDef): number {
  switch (p.jenis) {
    case 'stat':
      return d.stat[p.kunci ?? ''] ?? 0;
    case 'ipk':
      return d.ipk;
    case 'uang':
      return d.uang;
    case 'tabungan':
      return d.tabungan;
    case 'hari':
      return d.hari;
    case 'perabot':
      return Math.min(...PERABOT.map((id) => d.level[id]));
    case 'sks':
      return d.sks;
    case 'skripsi':
      return d.skripsi;
    case 'skillMaks':
      return Math.max(...F2.skill.map((s) => levelSkill(d, s.id)));
    case 'relasiMaks':
      return Math.max(0, ...Object.values(d.relasi));
    case 'follower':
      return d.follower;
    case 'motor':
      return d.motorLevel;
    case 'aksesoris':
      return d.aksesoris.length;
    default:
      return 0;
  }
}

export type Kemajuan = { data: SaveData; pesan: string[]; misiBaru: number; pencapaianBaru: PencapaianDef[]; levelNaik: boolean };

/** Dipanggil setiap data berubah: cek misi selesai & pencapaian baru, beri hadiahnya. */
export function cekKemajuan(d0: SaveData): Kemajuan {
  let d = siapkanMisi(d0);
  const pesan: string[] = [];
  let misiBaru = 0;
  let levelNaik = false;
  const daftar = d.misi.daftar.map((it) => {
    const m = cariMisi(it.id);
    if (it.klaim || !m || progresMisi(d, m) < m.target) return it;
    misiBaru++;
    pesan.push(`✅ Misi selesai: ${m.teks}   🎁 ${ringkasEfek(m.hadiah)}`);
    d = terapkanEfek(d, m.hadiah);
    return { ...it, klaim: true };
  });
  if (misiBaru > 0) {
    d = tambahStat({ ...d, misi: { ...d.misi, daftar } }, 'misi', misiBaru);
    if (!d.misi.bonus && daftar.every((x) => x.klaim)) {
      d = { ...ubahUang(d, FITUR.misiBonusLengkap), misi: { ...d.misi, bonus: true } };
      pesan.push(`🌟 Semua misi hari ini beres! Bonus ${formatRupiah(FITUR.misiBonusLengkap)}`);
    }
  }
  // Skill naik level?
  for (const s of F2.skill) {
    const lv = levelSkill(d, s.id);
    if (lv > (d.skillLv[s.id] ?? 0)) {
      d = { ...d, skillLv: { ...d.skillLv, [s.id]: lv } };
      pesan.push(`⭐ Skill ${s.ikon} ${s.nama} naik ke level ${lv}! (${s.bonus})`);
      levelNaik = true;
    }
  }
  // Target tabungan tercapai
  if (d.targetTabungan > 0 && d.tabungan >= d.targetTabungan) {
    pesan.push(`🎯 Target tabungan ${formatRupiah(d.targetTabungan)} tercapai! Hebat!`);
    d = tambahStat({ ...d, targetTabungan: 0 }, 'targetTercapai');
  }
  const pencapaianBaru = PENCAPAIAN.filter((p) => !d.pencapaian.includes(p.id) && nilaiPencapaian(d, p) >= p.min);
  if (pencapaianBaru.length > 0) {
    d = { ...d, pencapaian: [...d.pencapaian, ...pencapaianBaru.map((p) => p.id)] };
    pencapaianBaru.forEach((p) => pesan.push(`🏆 Pencapaian terbuka: ${p.ikon} ${p.nama}!`));
  }
  return { data: d, pesan, misiBaru, pencapaianBaru, levelNaik };
}

/** Terapkan efek hadiah sederhana (uang/stres/energi) tanpa aturan lain. */
function terapkanEfek(d: SaveData, e: Efek): SaveData {
  const cl = (v: number) => Math.round(Math.max(0, Math.min(100, v)));
  return {
    ...d,
    uang: d.uang + (e.uang ?? 0),
    energi: cl(d.energi + (e.energi ?? 0)),
    stres: cl(d.stres + (e.stres ?? 0)),
  };
}

// ===== Tabungan (celengan digital di HP) =====
export function setorTabungan(d: SaveData, jumlah: number): HasilAksi {
  if (jumlah <= 0 || d.uang - jumlah < 0) return { data: d, pesan: ['💸 Uang di dompet nggak cukup.'], ditolak: true };
  return { data: tambahStat({ ...d, uang: d.uang - jumlah, tabungan: d.tabungan + jumlah }, 'menabung'), pesan: [`🐷 Menabung ${formatRupiah(jumlah)}. Hebat!`] };
}
export function tarikTabungan(d: SaveData, jumlah: number): HasilAksi {
  const n = Math.min(jumlah, d.tabungan);
  if (n <= 0) return { data: d, pesan: ['🐷 Tabunganmu masih kosong.'], ditolak: true };
  return { data: { ...d, uang: d.uang + n, tabungan: d.tabungan - n }, pesan: [`🏧 Tarik tabungan ${formatRupiah(n)}`] };
}

// ===== Barang (toko serba ada → tas) =====
export type BarangDef = (typeof FITUR.barang)[number] & { permanen?: boolean; isi?: number; efek?: Efek };
export const BARANG = [...FITUR.barang, ...F2.barangKamar] as BarangDef[];

export function cekBeliBarang(d: SaveData, b: BarangDef): CekAksi {
  if (b.permanen && (d.tas[b.id] ?? 0) > 0) return { boleh: false, alasan: `${b.ikon} Kamu sudah punya ${b.nama}.` };
  if (d.uang - b.harga < 0) return { boleh: false, alasan: '💸 Uangnya nggak cukup...' };
  return { boleh: true };
}

export function beliBarang(d: SaveData, id: string): HasilAksi {
  const b = BARANG.find((x) => x.id === id);
  if (!b) return { data: d, pesan: ['Barang tidak ada'], ditolak: true };
  const cek = cekBeliBarang(d, b);
  if (!cek.boleh) return { data: d, pesan: [cek.alasan ?? 'Tidak bisa'], ditolak: true };
  const x = { ...d, uang: d.uang - b.harga, tas: { ...d.tas, [b.id]: (d.tas[b.id] ?? 0) + (b.isi ?? 1) } };
  return { data: tambahStat(x, 'belanjaBarang'), pesan: [`${b.ikon} ${b.nama} masuk tas!  💰 −${formatRupiah(b.harga)}`] };
}

/** Pakai barang dari tas (payung permanen tidak dipakai, cukup dibawa). */
export function pakaiBarang(d: SaveData, id: string): HasilAksi {
  const b = BARANG.find((x) => x.id === id);
  if (!b || b.permanen) return { data: d, pesan: [`${b?.ikon ?? '☂️'} Barang ini otomatis dipakai, tidak perlu ditekan.`], ditolak: true };
  if (id === 'makananKucing') return { data: d, pesan: ['🐱 Berikan langsung ke Oyen di depan kos.'], ditolak: true };
  if ((d.tas[id] ?? 0) <= 0) return { data: d, pesan: ['Barangnya sudah habis.'], ditolak: true };
  if (id === 'obat' && d.sakit === 0) return { data: d, pesan: ['💪 Kamu lagi sehat, simpan obatnya.'], ditolak: true };
  if (id === 'vitamin' && d.vitaminHari === d.hari) return { data: d, pesan: ['💊 Sudah minum vitamin hari ini.'], ditolak: true };
  if (id === 'kopiSachet' && d.porsiFase >= 3) return { data: d, pesan: ['🫃 Kenyang banget! Tunggu fase berikutnya ya.'], ditolak: true };
  let x: SaveData = { ...terapkanEfek(d, b.efek ?? {}), tas: { ...d.tas, [id]: (d.tas[id] ?? 0) - 1 } };
  const pesan = [`${b.ikon} Pakai ${b.nama}   ${ringkasEfek(b.efek ?? {})}`];
  if (id === 'obat') {
    x = { ...x, sakit: 0 };
    pesan.push('💪 Langsung enakan, kamu sembuh!');
  }
  if (id === 'vitamin') x = { ...x, vitaminHari: x.hari };
  if (id === 'kopiSachet') x = tambahStat({ ...x, porsiFase: x.porsiFase + 1 }, 'makan');
  return { data: x, pesan };
}

// ===== Ojol =====
export type TitikOjol = { x: number; z: number; nama: string };
export type OrderOjol = { jemput: TitikOjol; antar: TitikOjol; bayar: number };

/** Buat order acak: jemput di satu tempat, antar ke tempat lain yang cukup jauh. */
export function buatOrder(tempat: readonly TitikOjol[]): OrderOjol {
  const o = FITUR.ojol;
  const a = tempat[Math.floor(Math.random() * tempat.length)];
  const jauh = tempat.filter((t) => t !== a && Math.hypot(t.x - a.x, t.z - a.z) > 20);
  const pool = jauh.length ? jauh : tempat.filter((t) => t !== a);
  const b = pool[Math.floor(Math.random() * pool.length)] ?? a;
  const jarak = Math.hypot(b.x - a.x, b.z - a.z);
  return { jemput: a, antar: b, bayar: Math.round((o.bayarDasar + jarak * o.bayarPerMeter) / 500) * 500 };
}

/** Status kesehatan & kebersihan singkat (untuk HUD/HP). */
export function statusBadan(d: SaveData): { ikon: string; teks: string }[] {
  const s: { ikon: string; teks: string }[] = [];
  if (d.sakit > 0) s.push({ ikon: '🤒', teks: `Masuk angin (${d.sakit} hari lagi)` });
  if (d.kebersihan < KEH.kebersihanKotor) s.push({ ikon: '🪳', teks: 'Kamar berantakan (stres naik tiap fase)' });
  if (d.bajuKotor >= KEH.bajuKotorBatas - 1) s.push({ ikon: '😷', teks: `Baju kotor ${d.bajuKotor} hari — laundry!` });
  return s;
}

// ===================== M8 =====================

// ===== Medsos (posting dari HP, 1×/fase) =====
export function cekPosting(d: SaveData): CekAksi {
  if (d.postingSlot === slotWaktu(d)) return { boleh: false, alasan: '📸 Sudah posting di fase ini. Jangan spam, nanti di-unfollow!' };
  return { boleh: true };
}
export function postingMedsos(d: SaveData, acak: () => number = Math.random): HasilAksi & { viral?: boolean } {
  const cek = cekPosting(d);
  if (!cek.boleh) return { data: d, pesan: [cek.alasan ?? ''], ditolak: true };
  const m = F2.medsos;
  const viral = acak() < m.viralPeluang;
  const tambah = Math.round((m.followerMin + acak() * (m.followerMaks - m.followerMin)) * (viral ? m.viralKali : 1));
  let x = tambahStat({ ...d, follower: d.follower + tambah, postingSlot: slotWaktu(d), stres: Math.max(0, d.stres + m.stres) }, 'posting');
  const pesan = [viral ? `🔥 VIRAL! Postinganmu dibagikan di mana-mana: +${tambah} follower!` : `📸 Posting foto aktivitas: +${tambah} follower (total ${x.follower})`];
  if (viral) x = tambahStat(x, 'viral');
  // Hadiah tonggak follower (sekali saja per tonggak)
  while (x.milestoneMedsos < m.milestone.length && x.follower >= m.milestone[x.milestoneMedsos]) {
    const hadiah = m.hadiahMilestone[x.milestoneMedsos];
    pesan.push(`🎉 ${m.milestone[x.milestoneMedsos]} follower! Dapat endorse pertama: +${formatRupiah(hadiah)}`);
    x = { ...x, uang: x.uang + hadiah, milestoneMedsos: x.milestoneMedsos + 1 };
  }
  return { data: x, pesan, viral };
}

// ===== Telepon ortu (1×/hari) =====
export function teleponOrtu(d: SaveData, acak: () => number = Math.random): HasilAksi {
  if (d.teleponHari === d.hari) return { data: d, pesan: ['📞 Sudah telepon hari ini. Ortu lagi sibuk.'], ditolak: true };
  const t = F2.teleponOrtu;
  let x = tambahStat({ ...d, teleponHari: d.hari, stres: Math.max(0, d.stres + t.stres) }, 'teleponOrtu');
  const pesan = [`📞 Ngobrol dengan ortu: "Jaga kesehatan ya, Nak!"   😵 ${t.stres}`];
  if (isTanggalTua(d.tanggal) && d.uang < t.daruratBatas && acak() < t.daruratPeluang) {
    x = { ...x, uang: x.uang + t.daruratUang };
    pesan.push(`💸 Ortu: "Uangmu menipis? Ini tambahan, hemat-hemat ya." +${formatRupiah(t.daruratUang)}`);
  }
  return { data: x, pesan };
}

// ===== UKM =====
export function gabungUKM(d: SaveData, id: string | null): HasilAksi {
  const u = F2.ukm.find((x) => x.id === id);
  if (id && !u) return { data: d, pesan: ['UKM tidak ada'], ditolak: true };
  if (!id) return { data: { ...d, ukm: null }, pesan: ['🎪 Kamu keluar dari UKM.'] };
  return {
    data: { ...d, ukm: id },
    pesan: [`🎪 Selamat bergabung di ${u?.ikon} ${u?.nama}! Rapat tiap Rabu Sore di Kampus. Iuran ${formatRupiah(F2.ukmIuran)}/bulan.`],
  };
}

// ===== Aksesoris & barang kamar =====
export type AksesorisDef = (typeof F2.aksesoris)[number];
/** Semua aksesoris (M8 + tas & aksesoris baru M11) */
export const SEMUA_AKSESORIS: readonly AksesorisDef[] = [...F2.aksesoris, ...F3.aksesorisBaru];

// ===== Salon: gaya & warna rambut (M11) =====
export function potongRambut(d: SaveData, gaya: string): HasilAksi {
  const g = F3.gayaRambut.find((x) => x.id === gaya);
  if (!g || !d.profil) return { data: d, pesan: ['Tidak ada'], ditolak: true };
  if ((d.profil.gaya ?? 'pendek') === gaya) return { data: d, pesan: ['💇 Rambutmu sudah gaya ini.'], ditolak: true };
  if (d.uang < g.harga) return { data: d, pesan: ['💸 Uangnya nggak cukup...'], ditolak: true };
  return {
    data: tambahStat({ ...d, uang: d.uang - g.harga, profil: { ...d.profil, gaya } }, 'salon'),
    pesan: [`💇 Gaya baru: ${g.nama}! Makin kece 😎${g.harga ? `  💰 −${formatRupiah(g.harga)}` : ''}`],
  };
}
export function catRambut(d: SaveData, warna: string): HasilAksi {
  if (!d.profil || !F3.warnaRambut.includes(warna)) return { data: d, pesan: ['Tidak ada'], ditolak: true };
  if (d.profil.rambut === warna) return { data: d, pesan: ['🎨 Warnanya sama.'], ditolak: true };
  if (d.uang < F3.hargaCatRambut) return { data: d, pesan: ['💸 Uangnya nggak cukup...'], ditolak: true };
  return {
    data: tambahStat({ ...d, uang: d.uang - F3.hargaCatRambut, profil: { ...d.profil, rambut: warna } }, 'salon'),
    pesan: [`🎨 Rambut dicat warna baru!  💰 −${formatRupiah(F3.hargaCatRambut)}`],
  };
}

export function beliAksesoris(d: SaveData, id: string): HasilAksi {
  const a = SEMUA_AKSESORIS.find((x) => x.id === id);
  if (!a) return { data: d, pesan: ['Tidak ada'], ditolak: true };
  if (d.aksesoris.includes(id)) return pakaiAksesoris(d, id);
  if (d.uang < a.harga) return { data: d, pesan: ['💸 Uangnya nggak cukup...'], ditolak: true };
  return {
    data: tambahStat({ ...d, uang: d.uang - a.harga, aksesoris: [...d.aksesoris, id], pakai: [...d.pakai, id] }, 'belanjaBarang'),
    pesan: [`${a.ikon} ${a.nama} dibeli & langsung dipakai!  💰 −${formatRupiah(a.harga)}`],
  };
}
/** Pakai / lepas aksesoris yang sudah dimiliki. */
export function pakaiAksesoris(d: SaveData, id: string): HasilAksi {
  if (!d.aksesoris.includes(id)) return { data: d, pesan: ['Belum punya'], ditolak: true };
  const dipakai = d.pakai.includes(id);
  const a = SEMUA_AKSESORIS.find((x) => x.id === id);
  return { data: { ...d, pakai: dipakai ? d.pakai.filter((x) => x !== id) : [...d.pakai, id] }, pesan: [`${a?.ikon} ${a?.nama} ${dipakai ? 'dilepas' : 'dipakai'}`] };
}
export function catDinding(d: SaveData, id: string): HasilAksi {
  const c = F2.catDinding.find((x) => x.id === id);
  if (!c) return { data: d, pesan: ['Tidak ada'], ditolak: true };
  if (d.catDinding === id) return { data: d, pesan: ['🎨 Dinding sudah warna ini.'], ditolak: true };
  if (d.uang < c.harga) return { data: d, pesan: ['💸 Uangnya nggak cukup...'], ditolak: true };
  return { data: { ...d, uang: d.uang - c.harga, catDinding: id }, pesan: [`🎨 Kamar dicat ${c.nama}!${c.harga ? `  💰 −${formatRupiah(c.harga)}` : ''}`] };
}

// ===== Bengkel motor =====
export function upgradeMotor(d: SaveData): HasilAksi {
  const u = F2.motorUpgrade.find((x) => x.level === d.motorLevel + 1);
  if (!u) return { data: d, pesan: ['🏍️ Motormu sudah paling kencang!'], ditolak: true };
  if (d.uang < u.harga) return { data: d, pesan: ['💸 Uangnya nggak cukup...'], ditolak: true };
  return { data: { ...d, uang: d.uang - u.harga, motorLevel: u.level }, pesan: [`🔧 ${u.nama} terpasang! Motor ×${u.kecepatan} lebih kencang & irit.  💰 −${formatRupiah(u.harga)}`] };
}
export function catMotor(d: SaveData, warna: string): HasilAksi {
  const c = F2.catMotor;
  if (d.warnaMotor === warna) return { data: d, pesan: ['🎨 Motor sudah warna ini.'], ditolak: true };
  if (d.uang < c.harga) return { data: d, pesan: ['💸 Uangnya nggak cukup...'], ditolak: true };
  return { data: { ...d, uang: d.uang - c.harga, warnaMotor: warna }, pesan: [`🎨 Motor dicat ulang! Kinclong.  💰 −${formatRupiah(c.harga)}`] };
}

// ===== Target tabungan =====
export const setTarget = (d: SaveData, n: number): HasilAksi => ({
  data: { ...d, targetTabungan: n },
  pesan: [n ? `🎯 Target tabungan: ${formatRupiah(n)}` : '🎯 Target tabungan dihapus'],
});

// ===== Soal ujian (mini-game) =====
export type Soal = (typeof F2.soal)[number];
/** Ambil N soal acak berbeda. */
export function ambilSoal(n = F2.kuisUjian.jumlahSoal, acak: () => number = Math.random): Soal[] {
  return [...F2.soal]
    .map((s) => ({ s, k: acak() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.s);
}

/** Acara kampus/kota hari ini untuk kalender & HUD. */
export function acaraHari(hari: number): string[] {
  const a: string[] = [];
  const h = hariMinggu(hari);
  if (h === F2.pasarMalam.hari) a.push('🎡 Pasar malam (malam, lapangan)');
  if (h === 6) a.push('🚴 Car Free Day (pagi, taman)');
  if (h === F2.ukmHariRapat) a.push('🎪 Rapat UKM (sore, kampus)');
  return a;
}
