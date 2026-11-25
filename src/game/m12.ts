// M12: aturan tubuh & otak, kampus & karier, ekonomi, kamar, kota — memakai rumus di fisika.ts.
// Seperti m11.ts: hanya mengimpor TIPE dari sim.ts (tidak melingkar); sim.ts & store yang memanggil fungsi di sini.
import f2 from '../data/fitur2.json';
import type { Efek, SaveData, Tunda } from './sim';
import {
  F4,
  acakTetap,
  efisiensiStres,
  hargaEmas,
  kekuatanBaru,
  logistik,
  luruhKafein,
  majemuk,
  pengaliSesiKe,
  retensi,
  suhuUdara,
  tekananTidurBangun,
  tekananTidurTidur,
  kantuk,
} from './fisika';

type Hasil = { data: SaveData; pesan: string[]; ditolak?: boolean; tunda?: Tunda; label?: string };
const T = F4.tubuh;
const K = F4.kampus;
const E = F4.ekonomi;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rp = (n: number) => `${n < 0 ? '−' : ''}Rp${Math.abs(Math.round(n)).toLocaleString('id-ID')}`;
const tambahStat = (d: SaveData, k: string, n = 1): SaveData => ({ ...d, stat: { ...d.stat, [k]: (d.stat[k] ?? 0) + n } });
function ubah(d: SaveData, e: Efek): SaveData {
  return {
    ...d,
    uang: d.uang + (e.uang ?? 0),
    ipk: Math.round(clamp(d.ipk + (e.ipk ?? 0), 0, 4) * 1000) / 1000,
    energi: Math.round(clamp(d.energi + (e.energi ?? 0), 0, 100)),
    stres: Math.round(clamp(d.stres + (e.stres ?? 0), 0, 100)),
  };
}
const tolak = (d: SaveData, alasan: string): Hasil => ({ data: d, pesan: [alasan], ditolak: true });
const hariMingguIdx = (hari: number) => (hari - 1) % 7;
const lvRelasi = (d: SaveData, id: string) => f2.relasiLevel.filter((b) => (d.relasi[id] ?? 0) >= b).length;

// ===================== Nilai awal (dipakai dataAwal & lengkapiSave) =====================
export type MemoriMatkul = { S: number; t: number; hadir: number; bolos: number };
export type Lomba = { bulan: number; skor: number[]; selesai: boolean };
export type Tugas = { mulai: number; tenggat: number; progres: number; matkul: string };
export type Deposito = { jumlah: number; mulai: number };

export function bawaanM12() {
  return {
    tekananTidur: T.tekananAwal,
    kafein: 0,
    hidrasi: 80,
    kebugaran: 20,
    sesiBelajar: { hari: 0, n: 0 },
    matkul: {} as Record<string, MemoriMatkul>,
    buku: [] as string[],
    tugas: null as Tugas | null,
    lomba: null as Lomba | null,
    cv: 0,
    reputasi: K.reputasi.awal,
    karier: null as string | null,
    emas: 0,
    deposito: [] as Deposito[],
    paylater: null as { jumlah: number; tempo: number } | null,
    pinjamWarga: null as { id: string; jumlah: number; tempo: number } | null,
    anggaran: 0,
    belanjaBulan: {} as Record<string, number>,
    autoTabung: false,
    listrikKwh: F4.listrik.awalKwh,
    galonLiter: F4.galon.liter,
    cabai: null as { tanam: number; tumbuh: number; siramHari: number } | null,
    sepraiHari: 1,
    stiker: [] as number[],
    jelajah: 0,
    spotFotoHari: 0,
    fotoBarengHari: 0,
    poster: [] as string[],
    posterPakai: null as string | null,
    matiListrikSampai: 0,
    sepeda: false,
    pakaiSepeda: false,
    rivalIpk: K.rival.ipkAwal,
    punyaSim: false,
    /** Skor terbaik tiap mini-game fisika (0..1) */
    rekorMini: {} as Record<string, number>,
    /** Hari terakhir tiap event random muncul (jeda pengulangan) */
    eventTerakhir: {} as Record<string, number>,
    /** ekonomi-semester C1: hari terakhir kerja sambilan (maks 1 shift/hari) */
    kerjaHariTerakhir: 0,
  };
}
export type DataM12 = ReturnType<typeof bawaanM12>;

/** Lengkapi save lama dengan field M12 (aman dari data rusak). */
export function lengkapiM12(x: Partial<DataM12>): DataM12 {
  const b = bawaanM12();
  const angka = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  const obj = <V extends object>(v: unknown, def: V): V => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as V) : def);
  const arr = <V,>(v: unknown, def: V[]): V[] => (Array.isArray(v) ? (v as V[]) : def);
  return {
    tekananTidur: clamp(angka(x.tekananTidur, b.tekananTidur), 0, 1),
    kafein: angka(x.kafein, 0),
    hidrasi: clamp(angka(x.hidrasi, b.hidrasi), 0, 100),
    kebugaran: clamp(angka(x.kebugaran, b.kebugaran), 0, 100),
    sesiBelajar: obj(x.sesiBelajar, b.sesiBelajar),
    matkul: obj(x.matkul, b.matkul),
    buku: arr(x.buku, b.buku),
    tugas: x.tugas && typeof x.tugas === 'object' ? x.tugas : null,
    lomba: x.lomba && typeof x.lomba === 'object' ? x.lomba : null,
    cv: angka(x.cv, 0),
    reputasi: clamp(angka(x.reputasi, b.reputasi), 0, 100),
    karier: typeof x.karier === 'string' ? x.karier : null,
    emas: Math.max(0, angka(x.emas, 0)),
    deposito: arr(x.deposito, b.deposito),
    paylater: x.paylater && typeof x.paylater === 'object' ? x.paylater : null,
    pinjamWarga: x.pinjamWarga && typeof x.pinjamWarga === 'object' ? x.pinjamWarga : null,
    anggaran: Math.max(0, angka(x.anggaran, 0)),
    belanjaBulan: obj(x.belanjaBulan, b.belanjaBulan),
    autoTabung: !!x.autoTabung,
    listrikKwh: Math.max(0, angka(x.listrikKwh, b.listrikKwh)),
    galonLiter: clamp(angka(x.galonLiter, b.galonLiter), 0, F4.galon.liter),
    cabai: x.cabai && typeof x.cabai === 'object' ? x.cabai : null,
    sepraiHari: angka(x.sepraiHari, 1),
    stiker: arr(x.stiker, b.stiker),
    jelajah: angka(x.jelajah, 0),
    spotFotoHari: angka(x.spotFotoHari, 0),
    fotoBarengHari: angka(x.fotoBarengHari, 0),
    poster: arr(x.poster, b.poster),
    posterPakai: typeof x.posterPakai === 'string' ? x.posterPakai : null,
    matiListrikSampai: angka(x.matiListrikSampai, 0),
    sepeda: !!x.sepeda,
    pakaiSepeda: !!x.pakaiSepeda && !!x.sepeda,
    rivalIpk: angka(x.rivalIpk, b.rivalIpk),
    punyaSim: !!x.punyaSim,
    rekorMini: obj(x.rekorMini, b.rekorMini),
    eventTerakhir: obj(x.eventTerakhir, b.eventTerakhir),
    kerjaHariTerakhir: angka(x.kerjaHariTerakhir, 0),
  };
}

// ===================== Waktu berjalan (dipanggil tiap majukanJam) =====================
const menitMutlak = (d: Pick<SaveData, 'hari' | 'menit'>) => (d.hari - 1) * 1440 + d.menit;
export const listrikMati = (d: SaveData) => d.listrikKwh <= 0 || menitMutlak(d) < d.matiListrikSampai;
export const suhuSekarang = (d: SaveData, hujan: boolean) => suhuUdara(d.menit, hujan);

/**
 * Proses tubuh & rumah selama `n` menit berlalu.
 * `tidur` = sedang tidur; `laptop` = sedang belajar/nugas/kerja di meja; `hujan` & `panas` dari cuaca.
 */
export function jalanWaktu(d: SaveData, n: number, o: { tidur: boolean; laptop: boolean; hujan: boolean }): { data: SaveData; pesan: string[] } {
  const pesan: string[] = [];
  let x = d;
  // Tekanan tidur (Borbély)
  const S = o.tidur ? tekananTidurTidur(x.tekananTidur, n) : tekananTidurBangun(x.tekananTidur, n);
  const kantukLama = kantuk(x.tekananTidur, x.menit);
  x = { ...x, tekananTidur: Math.round(S * 1000) / 1000 };
  if (!o.tidur && kantukLama < T.kantukBatas && kantuk(S, x.menit) >= T.kantukBatas) pesan.push('😪 Mata mulai berat... belajar jadi kurang masuk. Tidur dulu?');
  // Kafein meluruh; turun melewati ambang → "crash"
  const K0 = x.kafein;
  const K1 = luruhKafein(K0, n);
  x = { ...x, kafein: K1 < 1 ? 0 : Math.round(K1 * 10) / 10 };
  if (K0 >= T.kafeinCrash.dari && K1 < T.kafeinCrash.ke && !o.tidur) {
    x = ubah(x, { energi: T.kafeinCrash.energi });
    pesan.push(`☕ Efek kopi habis, badan "anjlok"... ⚡${T.kafeinCrash.energi}`);
  }
  // Hidrasi turun saat terjaga (lebih cepat saat panas)
  if (!o.tidur) {
    const panas = suhuUdara(x.menit, o.hujan) > F4.suhu.panasAmbang;
    const turun = (T.hidrasiTurunPerJam / 60) * n * (panas ? T.hidrasiPanasPengali : 1);
    const h0 = x.hidrasi;
    x = { ...x, hidrasi: Math.max(0, Math.round((h0 - turun) * 10) / 10) };
    if (h0 >= T.hidrasiRendah && x.hidrasi < T.hidrasiRendah) pesan.push('💧 Haus banget! Minum air dulu (galon di kamar) atau beli minuman.');
  }
  // Listrik kamar: kWh = daya (kW) × jam
  if (x.lokasi === 'kamar' && x.listrikKwh > 0) {
    const L = F4.listrik.dayaKw;
    const malam = x.menit >= 780 || x.menit < 60;
    const kw = (malam && !o.tidur ? L.lampu : 0) + (x.level.kipas === 3 ? L.ac : x.level.kipas === 2 ? L.kipas : 0) + (o.laptop ? L.laptop : 0);
    const sisa = Math.max(0, x.listrikKwh - (kw * n) / 60);
    if (x.listrikKwh > 2 && sisa <= 2) pesan.push('🔌 Token listrik tinggal sedikit! Beli token di Toko Tani & Depot Air.');
    if (sisa <= 0) pesan.push('🕯️ Token listrik habis! Lampu, kipas & laptop mati.');
    x = { ...x, listrikKwh: Math.round(sisa * 1000) / 1000 };
  }
  return { data: x, pesan };
}

/** Efek per pergantian fase: panas tanpa kipas & dehidrasi. */
export function fasePasif(d: SaveData, hujan: boolean): Efek {
  const e: Efek = {};
  if (d.lokasi === 'kamar' && d.level.kipas === 1 && suhuUdara(d.menit, hujan) > F4.suhu.panasAmbang) e.stres = F4.suhu.stresPanasPerFase;
  if (d.hidrasi < T.hidrasiRendah) e.energi = T.hidrasiRendahEnergiPerFase;
  return e;
}

// ===================== Belajar: Yerkes–Dodson, kantuk, kejenuhan, kurva lupa =====================
export const daftarMatkul = (d: SaveData): string[] => (K.matkul as Record<string, string[]>)[d.profil?.jurusan ?? 'teknik'] ?? K.matkul.teknik;
/** Mata kuliah terjadwal untuk hari & sesi kuliah ini */
export function matkulJadwal(d: SaveData, sesi: 'pagi' | 'siang'): string {
  const m = daftarMatkul(d);
  return m[(hariMingguIdx(d.hari) * 2 + (sesi === 'siang' ? 1 : 0)) % m.length];
}
export function memori(d: SaveData, nama: string): MemoriMatkul {
  return d.matkul[nama] ?? { S: T.kekuatanAwal, t: 0, hadir: 0, bolos: 0 };
}
/** Retensi matkul sekarang (0..1); belum pernah dipelajari = 0 */
export const retensiMatkul = (d: SaveData, nama: string) => {
  const m = memori(d, nama);
  return m.t === 0 ? 0 : retensi(d.hari - m.t, m.S);
};
/** Matkul yang paling banyak terlupa (dipilih otomatis saat belajar mandiri) */
export function matkulTerlemah(d: SaveData): string {
  return daftarMatkul(d).reduce((a, b) => (retensiMatkul(d, b) < retensiMatkul(d, a) ? b : a));
}
export const rataRetensi = (d: SaveData) => {
  const m = daftarMatkul(d);
  return m.reduce((s, n) => s + retensiMatkul(d, n), 0) / m.length;
};

/** Pengali IPK belajar dari kondisi tubuh & otak (menggantikan ambang stres kaku). */
export function pengaliBelajar(d: SaveData, matkul: string | null): number {
  let k = efisiensiStres(d.stres);
  const kt = kantuk(d.tekananTidur, d.menit);
  if (kt > T.kantukBatas) k *= Math.max(0.4, 1 - (kt - T.kantukBatas) * T.kantukTurunEfisiensi);
  const n = d.sesiBelajar.hari === d.hari ? d.sesiBelajar.n + 1 : 1;
  k *= pengaliSesiKe(n);
  if (matkul && d.buku.includes(matkul)) k *= K.bukuPengali;
  return k;
}

/** Catat sesi belajar: memori matkul diperkuat (efek jarak), sesi hari ini bertambah. */
export function catatBelajar(d: SaveData, matkul: string, kuliah: boolean, pesan: string[]): SaveData {
  const m = memori(d, matkul);
  const R = m.t === 0 ? 0 : retensi(d.hari - m.t, m.S);
  const S = m.t === 0 ? T.kekuatanAwal : kekuatanBaru(m.S, R);
  const baru: MemoriMatkul = { S: Math.round(S * 100) / 100, t: d.hari, hadir: m.hadir + (kuliah ? 1 : 0), bolos: m.bolos };
  pesan.push(`🧠 ${matkul}: ingatan ${Math.round(R * 100)}% → 100% (tahan ± ${Math.round(S * 10) / 10} hari)`);
  const sesi = d.sesiBelajar.hari === d.hari ? { hari: d.hari, n: d.sesiBelajar.n + 1 } : { hari: d.hari, n: 1 };
  let x: SaveData = { ...d, matkul: { ...d.matkul, [matkul]: baru }, sesiBelajar: sesi };
  // Tugas kelompok ikut maju
  if (x.tugas && x.tugas.progres < 100) {
    const p = Math.min(100, x.tugas.progres + K.tugas.progresBelajar);
    x = { ...x, tugas: { ...x.tugas, progres: p } };
    if (p >= 100) {
      x = ubah(x, K.tugas.selesai);
      pesan.push(`✅ Tugas kelompok ${x.tugas?.matkul} beres sebelum tenggat! 🎓 +${K.tugas.selesai.ipk}`);
    }
  }
  if (kuliah) x = { ...x, reputasi: clamp(x.reputasi + K.reputasi.kuliah, 0, 100) };
  return x;
}
export function catatBolos(d: SaveData, sesi: 'pagi' | 'siang'): SaveData {
  const n = matkulJadwal(d, sesi);
  const m = memori(d, n);
  return { ...d, matkul: { ...d.matkul, [n]: { ...m, bolos: m.bolos + 1 } }, reputasi: clamp(d.reputasi + K.reputasi.bolos, 0, 100) };
}
/** Nilai huruf matkul: 50% ingatan + 30% kehadiran + 20% tidak bolos */
export function nilaiMatkul(d: SaveData, nama: string): { skor: number; huruf: string } {
  const m = memori(d, nama);
  const s = 0.5 * retensiMatkul(d, nama) + 0.3 * Math.min(1, m.hadir / 8) + 0.2 * Math.max(0, 1 - m.bolos / (K.maksBolosMatkul + 1));
  const huruf = s >= 0.85 ? 'A' : s >= 0.7 ? 'B' : s >= 0.55 ? 'C' : s >= 0.4 ? 'D' : 'E';
  return { skor: s, huruf };
}

// ===================== Tidur, kopi, minum, olahraga =====================
/** Energi tidur malam berdasarkan lama tidur nyata (menit) & kondisi (kafein, seprai, kebugaran). */
export function energiTidur(d: SaveData, energiMaks: number, menitTidur: number): number {
  let e = energiMaks * F4.tubuh.skalaTidur * (1 - Math.exp(-menitTidur / T.tauPulihMenit));
  if (d.kafein > T.kafeinTidurBatas) e *= T.kafeinTidurPengali;
  const kotor = Math.max(0, d.hari - d.sepraiHari - F4.seprai.bersihHari);
  e *= 1 - Math.min(F4.seprai.maksTurun, kotor * F4.seprai.turunPerHari);
  e += Math.floor(d.kebugaran / 10) * T.kebugaranEnergiTidurPer10;
  return Math.round(e);
}
const ID_KOPI = ['kopi', 'es_kopi', 'kf_latte'];
const ID_MINUM = ['es_', 'teh', 'susu', 'kopi', 'kf_matcha', 'kf_latte'];
/** Makan/minum: kopi menambah kafein, minuman menambah hidrasi */
export function efekKonsumsi(d: SaveData, idMenu: string): SaveData {
  let x = d;
  if (ID_KOPI.some((k) => idMenu.includes(k))) x = { ...x, kafein: x.kafein + T.kafeinPerKopi };
  if (ID_MINUM.some((k) => idMenu.includes(k))) x = { ...x, hidrasi: Math.min(100, x.hidrasi + T.minumanAir) };
  return x;
}
export const OLAHRAGA = ['mainFutsal', 'jogging', 'latihanGym', 'tendangPenalti', 'mainBolaKampung'];
export const naikKebugaran = (d: SaveData): SaveData => ({ ...d, kebugaran: Math.min(100, d.kebugaran + T.kebugaranNaik) });

// ===================== Hari baru =====================
export function hariBaruM12(d: SaveData, pesan: string[], acak: () => number = Math.random): SaveData {
  let x: SaveData = { ...d, kebugaran: Math.max(0, d.kebugaran - T.kebugaranTurunPerHari) };
  // Rival akademik (Dimas): IPK naik pelan & acak
  x = { ...x, rivalIpk: Math.min(K.rival.maks, Math.round((x.rivalIpk + K.rival.naikPerHari * (0.4 + acak() * 1.2)) * 1000) / 1000) };
  // Deposito jatuh tempo: bunga majemuk bulanan
  const cair = x.deposito.filter((p) => x.hari - p.mulai >= E.deposito.tenorHari);
  if (cair.length) {
    const total = cair.reduce((s, p) => s + Math.round(majemuk(p.jumlah, E.deposito.bungaBulanan, 1)), 0);
    x = { ...x, deposito: x.deposito.filter((p) => !cair.includes(p)), tabungan: x.tabungan + total };
    pesan.push(`🏦 Deposito jatuh tempo: ${rp(total)} masuk ke tabungan (termasuk bunga).`);
  }
  // Paylater jatuh tempo
  if (x.paylater && x.hari > x.paylater.tempo) {
    const tagihan = x.paylater.jumlah + E.paylater.denda;
    x = ubah({ ...x, paylater: null }, { uang: -tagihan, stres: E.paylater.stresTelat });
    pesan.push(`📛 Paylater telat bayar! Ditagih paksa ${rp(tagihan)} (termasuk denda). 😵+${E.paylater.stresTelat}`);
  }
  // Pinjaman ke warga jatuh tempo
  if (x.pinjamWarga && x.hari > x.pinjamWarga.tempo) {
    const id = `w_${x.pinjamWarga.id}`;
    x = { ...x, relasi: { ...x.relasi, [id]: clamp((x.relasi[id] ?? 0) + E.pinjamWarga.relasiTelat, 0, 100) } };
    pesan.push('😒 Kamu lupa balikin pinjaman ke teman... hubungan jadi canggung. Bayar lewat 📱 HP → Bank.');
  }
  // Tugas kelompok: tenggat & tugas baru tiap 14 hari
  if (x.tugas && x.tugas.progres < 100 && x.hari > x.tugas.tenggat) {
    x = ubah({ ...x, tugas: null }, K.tugas.telat);
    pesan.push(`⏰ Tugas kelompok lewat tenggat! 🎓 ${K.tugas.telat.ipk}  😵+${K.tugas.telat.stres}`);
  } else if (x.tugas && x.tugas.progres >= 100 && x.hari > x.tugas.tenggat) x = { ...x, tugas: null };
  if (!x.lulus && x.hari >= K.tugas.mulaiHari && (x.hari - K.tugas.mulaiHari) % K.tugas.tiapHari === 0 && !x.tugas) {
    const m = daftarMatkul(x);
    const mk = m[Math.floor(acak() * m.length)];
    x = { ...x, tugas: { mulai: x.hari, tenggat: x.hari + K.tugas.tenggatHari, progres: 0, matkul: mk } };
    pesan.push(`📋 Tugas kelompok ${mk} baru! Tenggat ${K.tugas.tenggatHari} hari. Belajar/nugas akan menyicilnya.`);
  }
  // Lomba: pengumuman tanggal 25
  if (x.lomba && !x.lomba.selesai && x.tanggal === K.lomba.tanggalUmum) x = umumkanLomba(x, pesan, acak);
  // Cabai tumbuh (logistik): dN/dt = r·N·(1 − N), disiram = laju penuh
  if (x.cabai && x.cabai.tumbuh < 1) {
    const r = x.cabai.siramHari >= x.hari - 1 ? F4.cabai.laju : F4.cabai.lajuTanpaSiram;
    const N = x.cabai.tumbuh;
    const N1 = Math.min(1, N + r * N * (1 - N) + 0.005);
    x = { ...x, cabai: { ...x.cabai, tumbuh: Math.round(N1 * 1000) / 1000 } };
    if (N < 0.95 && N1 >= 0.95) pesan.push('🌶️ Cabai di pot sudah merah! Siap dipanen.');
  }
  // Tanggal 1: reset anggaran, karier gaji, auto-tabung
  if (x.tanggal === 1 && d.tanggal !== 1) {
    x = { ...x, belanjaBulan: {} };
    if (x.karier) {
      const g = gajiKarier(x, x.karier);
      const def = K.karier.find((k) => k.id === x.karier);
      x = ubah(x, { uang: g, stres: def?.stresBulanan ?? 0 });
      pesan.push(`💼 Gaji ${def?.nama ?? 'kerja'} masuk ${rp(g)}!`);
    }
  }
  return x;
}

// ===================== Ekonomi: harga, anggaran, bank =====================
/** Pengali harga makanan: jam ramai (+10%) & diskon tanggal muda minimarket */
export function pengaliHarga(d: SaveData, tempat: string): number {
  let k = 1;
  if ((tempat === 'warteg' || tempat === 'kafe' || tempat === 'kantin') && E.jamRamai.some(([a, b]) => d.menit >= a && d.menit < b)) k += E.naikRamai;
  if (tempat === 'minimarket' && d.tanggal <= E.diskonTanggalMuda.sampaiTanggal) k -= E.diskonTanggalMuda.persen;
  return k;
}
export const jamRamai = (d: SaveData) => E.jamRamai.some(([a, b]) => d.menit >= a && d.menit < b);

export type KategoriBelanja = 'makan' | 'hiburan' | 'transport' | 'kos' | 'kamar' | 'lainnya';
export function catatBelanja(d: SaveData, kat: KategoriBelanja, jumlah: number, pesan?: string[]): SaveData {
  if (jumlah <= 0) return d;
  const total = (d.belanjaBulan[kat] ?? 0) + jumlah;
  const x = { ...d, belanjaBulan: { ...d.belanjaBulan, [kat]: total } };
  if (pesan && d.anggaran > 0 && (kat === 'makan' || kat === 'hiburan')) {
    const pakai = (x.belanjaBulan.makan ?? 0) + (x.belanjaBulan.hiburan ?? 0);
    const lama = pakai - jumlah;
    if (lama < d.anggaran * E.anggaranPeringatan && pakai >= d.anggaran * E.anggaranPeringatan) pesan.push(`📊 Belanja makan & hiburan sudah ${Math.round((pakai / d.anggaran) * 100)}% dari anggaran bulan ini!`);
    if (lama < d.anggaran && pakai >= d.anggaran) pesan.push('🚨 Anggaran bulan ini terlampaui! Hemat dulu ya...');
  }
  return x;
}

export const hargaEmasBeli = (hari: number) => Math.round(hargaEmas(hari) * (1 + E.emas.spread / 2));
export const hargaEmasJual = (hari: number) => Math.round(hargaEmas(hari) * (1 - E.emas.spread / 2));
export function beliEmas(d: SaveData): Hasil {
  const h = hargaEmasBeli(d.hari);
  if (d.uang < h) return tolak(d, '💸 Uangnya belum cukup untuk 0,1 gram.');
  return { data: tambahStat({ ...d, uang: d.uang - h, emas: d.emas + 1 }, 'beliEmas'), pesan: [`🪙 Beli 0,1 g emas ${rp(h)}. Punya ${(d.emas + 1) / 10} g.`] };
}
export function jualEmas(d: SaveData): Hasil {
  if (d.emas <= 0) return tolak(d, 'Belum punya emas.');
  const h = hargaEmasJual(d.hari);
  return { data: { ...d, uang: d.uang + h, emas: d.emas - 1 }, pesan: [`🪙 Jual 0,1 g emas ${rp(h)}.`] };
}
export function setorDeposito(d: SaveData, jumlah: number): Hasil {
  if (jumlah < E.deposito.minimal) return tolak(d, `Minimal ${rp(E.deposito.minimal)}.`);
  if (d.uang < jumlah) return tolak(d, '💸 Uangnya nggak cukup...');
  return {
    data: tambahStat({ ...d, uang: d.uang - jumlah, deposito: [...d.deposito, { jumlah, mulai: d.hari }] }, 'deposito'),
    pesan: [`🏦 Deposito ${rp(jumlah)} selama ${E.deposito.tenorHari} hari → cair ${rp(majemuk(jumlah, E.deposito.bungaBulanan, 1))}.`],
  };
}
export function pinjamPaylater(d: SaveData, jumlah: number): Hasil {
  if (d.paylater) return tolak(d, 'Lunasi paylater sebelumnya dulu.');
  if (jumlah <= 0 || jumlah > E.paylater.limit) return tolak(d, `Limit ${rp(E.paylater.limit)}.`);
  const tagihan = Math.round(jumlah * (1 + E.paylater.bunga));
  return {
    data: tambahStat({ ...d, uang: d.uang + jumlah, paylater: { jumlah: tagihan, tempo: d.hari + E.paylater.tempoHari } }, 'paylater'),
    pesan: [`💳 Paylater cair ${rp(jumlah)}. Tagihan ${rp(tagihan)} (bunga ${E.paylater.bunga * 100}%) jatuh tempo ${E.paylater.tempoHari} hari lagi.`],
  };
}
export function bayarPaylater(d: SaveData): Hasil {
  if (!d.paylater) return tolak(d, 'Tidak ada tagihan paylater.');
  if (d.uang < d.paylater.jumlah) return tolak(d, `💸 Butuh ${rp(d.paylater.jumlah)}.`);
  return { data: { ...d, uang: d.uang - d.paylater.jumlah, paylater: null }, pesan: [`✅ Paylater lunas ${rp(d.paylater.jumlah)}.`] };
}
export function pinjamKeWarga(d: SaveData, id: string, nama: string): Hasil {
  if (d.pinjamWarga) return tolak(d, 'Kamu masih punya pinjaman yang belum dibayar.');
  if ((d.relasi[`w_${id}`] ?? 0) < E.pinjamWarga.minRelasi) return tolak(d, `Belum cukup akrab untuk pinjam uang (pertemanan ≥ ${E.pinjamWarga.minRelasi}).`);
  return {
    data: { ...d, uang: d.uang + E.pinjamWarga.jumlah, pinjamWarga: { id, jumlah: E.pinjamWarga.jumlah, tempo: d.hari + E.pinjamWarga.tempoHari } },
    pesan: [`🤝 ${nama}: "Nih, pakai dulu. Balikin ${E.pinjamWarga.tempoHari} hari lagi ya!" +${rp(E.pinjamWarga.jumlah)}`],
  };
}
export function bayarWarga(d: SaveData): Hasil {
  if (!d.pinjamWarga) return tolak(d, 'Tidak ada pinjaman.');
  if (d.uang < d.pinjamWarga.jumlah) return tolak(d, '💸 Uangnya belum cukup.');
  return { data: { ...d, uang: d.uang - d.pinjamWarga.jumlah, pinjamWarga: null }, pesan: [`✅ Pinjaman ${rp(d.pinjamWarga.jumlah)} lunas. Makasih sudah amanah!`] };
}

// ===================== Kampus: lomba, karier =====================
export function daftarLomba(d: SaveData): Hasil {
  const L = K.lomba;
  if (d.lomba && d.lomba.bulan === d.bulan) return tolak(d, 'Kamu sudah terdaftar lomba bulan ini.');
  if (d.tanggal < L.tanggalBuka || d.tanggal > L.tanggalTutup) return tolak(d, `Pendaftaran lomba dibuka tgl ${L.tanggalBuka}–${L.tanggalTutup}.`);
  if (d.uang < L.biaya) return tolak(d, '💸 Uangnya nggak cukup untuk biaya daftar.');
  return {
    data: { ...d, uang: d.uang - L.biaya, lomba: { bulan: d.bulan, skor: [], selesai: false } },
    pesan: [`🏆 Terdaftar Lomba Coding & Karya Tulis! Kerjakan ${L.sesi}× di meja belajar sebelum tgl ${L.tanggalUmum}.`],
  };
}
/** Lomba yang sedang berjalan & masih boleh dikerjakan (terdaftar bulan ini, belum diumumkan, sesi belum penuh). */
export const lombaBisaDikerjakan = (d: SaveData) => !!d.lomba && d.lomba.bulan === d.bulan && !d.lomba.selesai && d.lomba.skor.length < K.lomba.sesi && d.tanggal < K.lomba.tanggalUmum;

/**
 * Satu sesi mengerjakan karya lomba (aksi "Kerjakan Lomba" di meja). Kualitas sesi 0..1:
 * stres ideal (Yerkes–Dodson) × segar (energi) × pemahaman (IPK) × sedikit keberuntungan.
 */
export function catatSesiLomba(d: SaveData, pesan: string[], acak: () => number = Math.random): SaveData {
  if (!lombaBisaDikerjakan(d) || !d.lomba) return d;
  const segar = d.energi < 20 ? 0.6 : 1;
  const paham = 0.6 + 0.4 * (d.ipk / 4);
  const skor = clamp(efisiensiStres(d.stres) * segar * paham * (0.8 + 0.2 * acak()), 0, 1);
  const lomba = { ...d.lomba, skor: [...d.lomba.skor, Math.round(skor * 100) / 100] };
  pesan.push(`🏆 Sesi lomba ${lomba.skor.length}/${K.lomba.sesi}: kualitas ${Math.round(skor * 100)}%${lomba.skor.length >= K.lomba.sesi ? ' — karya terkirim! Tunggu pengumuman tgl ' + K.lomba.tanggalUmum : ''}`);
  return { ...d, lomba };
}

/** Pengumuman: peluang juara dari fungsi logistik atas skor rata-rata, IPK & jumlah sesi. */
export function umumkanLomba(d: SaveData, pesan: string[], acak: () => number): SaveData {
  const L = K.lomba;
  const l = d.lomba;
  if (!l) return d;
  const rata = l.skor.length ? l.skor.reduce((a, b) => a + b, 0) / L.sesi : 0;
  // Makin besar `kesulitan`, makin ketat persaingan (juara 1 butuh karya bagus + IPK tinggi)
  const z = 6 * rata + 2 * (d.ipk - 3) - L.kesulitan;
  const r = acak();
  const juara = r < logistik(z - 2) ? 0 : r < logistik(z - 1) ? 1 : r < logistik(z) ? 2 : -1;
  let x: SaveData = { ...d, lomba: { ...l, selesai: true } };
  if (juara < 0) {
    pesan.push(`🏆 Pengumuman lomba: belum juara kali ini (skor ${Math.round(rata * 100)}). Coba lagi bulan depan!`);
    return x;
  }
  x = tambahStat({ ...x, uang: x.uang + L.hadiah[juara], cv: x.cv + L.cv[juara], reputasi: clamp(x.reputasi + K.reputasi.juara, 0, 100) }, 'juaraLomba');
  pesan.push(`🥇 JUARA ${juara + 1} lomba! Hadiah ${rp(L.hadiah[juara])}, CV +${L.cv[juara]}. Keren!`);
  return x;
}
export const gajiKarier = (d: SaveData, id: string) => {
  const def = K.karier.find((k) => k.id === id);
  const dasar = K.gajiDasar + K.gajiPerIpk * (d.ipk - 2.5) + K.gajiPerCv * d.cv + K.gajiPerReputasi * (d.reputasi - 50);
  return Math.round((Math.max(2500000, dasar) * (def?.pengali ?? 1)) / 50000) * 50000;
};
export function pilihKarier(d: SaveData, id: string): Hasil {
  if (!d.lulus) return tolak(d, '🎓 Lulus dulu baru bisa melamar kerja!');
  if (d.karier) return tolak(d, 'Kamu sudah bekerja.');
  const def = K.karier.find((k) => k.id === id);
  if (!def) return tolak(d, 'Tidak ada');
  return { data: tambahStat({ ...d, karier: id }, 'karier'), pesan: [`💼 Diterima di ${def.ikon} ${def.nama}! Gaji ${rp(gajiKarier(d, id))} tiap tanggal 1. Kiriman ortu berhenti — kamu sudah mandiri! 🎉`] };
}

// ===================== Kamar: galon, token, cabai, seprai, poster =====================
// ----- Toko Tani & Depot Air (M12) -----
export function beliGalon(d: SaveData): Hasil {
  if (d.galonLiter >= F4.galon.liter - 0.5) return tolak(d, '🫙 Galon di kamar masih penuh.');
  if (d.uang < F4.galon.harga) return tolak(d, '💸 Uangnya nggak cukup...');
  return {
    data: catatBelanja({ ...d, uang: d.uang - F4.galon.harga, galonLiter: F4.galon.liter }, 'kamar', F4.galon.harga),
    pesan: [`💧 Galon baru ${F4.galon.liter} L diantar ke kamar! −${rp(F4.galon.harga)}`],
  };
}
export function beliBibitCabai(d: SaveData): Hasil {
  if (d.cabai) return tolak(d, '🌱 Pot cabai di kamar masih terisi. Panen dulu ya.');
  if (d.uang < F4.cabai.hargaBibit) return tolak(d, '💸 Uangnya nggak cukup...');
  return {
    data: tanamCabai(catatBelanja({ ...d, uang: d.uang - F4.cabai.hargaBibit }, 'kamar', F4.cabai.hargaBibit)),
    pesan: [`🌱 Bibit cabai ditanam di pot kamar! Jangan lupa disiram tiap hari. −${rp(F4.cabai.hargaBibit)}`],
  };
}
export function beliToken(d: SaveData): Hasil {
  const L = F4.listrik;
  if (d.uang < L.tokenHarga) return tolak(d, '💸 Uangnya nggak cukup...');
  return {
    data: catatBelanja({ ...d, uang: d.uang - L.tokenHarga, listrikKwh: Math.round((d.listrikKwh + L.tokenKwh) * 10) / 10 }, 'kamar', L.tokenHarga),
    pesan: [`⚡ Token listrik +${L.tokenKwh} kWh (sekarang ${Math.round(d.listrikKwh + L.tokenKwh)} kWh). −${rp(L.tokenHarga)}`],
  };
}

// ----- Mini-game fisika (M12): aksi yang disela mini-game & bonus dari skornya -----
export type JenisMini = 'penalti' | 'beban' | 'gitar' | 'batu' | 'bensin' | 'mi' | 'juggling' | 'sim';
/** Aksi → mini-game yang muncul sebelum aksi dijalankan */
export const MINI_UNTUK: Partial<Record<string, JenisMini>> = {
  tendangPenalti: 'penalti',
  latihanGym: 'beban',
  mainGitar: 'gitar',
  santaiTaman: 'batu',
  isiBensin: 'bensin',
  masakMi: 'mi',
  mainFutsal: 'juggling',
};
const MF = F4.miniFisika;
/** Bonus (atau sedikit hukuman) dari skor mini-game 0..1, diberikan SETELAH aksi biasanya selesai. */
export function bonusMini(d0: SaveData, jenis: JenisMini, skor: number): Hasil {
  const s = clamp(skor, 0, 1);
  const r = Math.round;
  // Catat rekor pribadi (dipakai papan peringkat online)
  const d: SaveData = s > (d0.rekorMini[jenis] ?? 0) ? { ...d0, rekorMini: { ...d0.rekorMini, [jenis]: s } } : d0;
  switch (jenis) {
    case 'penalti': {
      const gol = r(s * MF.penalti.tembakan);
      return { data: ubah(d, { stres: gol * MF.penalti.stresPerGol }), pesan: [`⚽ ${gol}/${MF.penalti.tembakan} gol! ${gol >= 4 ? 'Calon timnas!' : gol >= 2 ? 'Lumayan!' : 'Kipernya kayak tembok...'} 😌${gol * MF.penalti.stresPerGol}`] };
    }
    case 'beban': {
      const kb = r(s * MF.beban.kebugaranMaks);
      return { data: ubah({ ...d, kebugaran: Math.min(100, d.kebugaran + kb) }, { stres: r(s * MF.beban.stresMaks) }), pesan: [`🏋️ Barbel stabil ${r(s * 100)}% — kebugaran +${kb}`] };
    }
    case 'gitar':
      return { data: ubah(d, { stres: r(s * MF.gitar.stresMaks) }), pesan: [s >= 0.8 ? '🎸 Senarnya pas banget! Suaranya merdu~' : s >= 0.4 ? '🎸 Agak fals dikit, tapi masih enak didengar.' : '🎸 Fals parah... tetangga kos mengetuk dinding 😅'] };
    case 'batu': {
      const n = r(s * MF.batu.target);
      return { data: ubah(d, { stres: n * MF.batu.stresPerPantul }), pesan: [`🪨 Batu memantul ${n}× di kolam!${n >= 5 ? ' Rekor taman!' : ''}`] };
    }
    case 'bensin':
      if (s < 0.2) return { data: ubah(d, { uang: MF.bensin.tumpahUang, stres: MF.bensin.tumpahStres }), pesan: [`⛽ Waduh, bensinnya tumpah! Ganti rugi ke Pak Jo ${rp(-MF.bensin.tumpahUang)}`] };
      return { data: s >= 0.85 ? ubah(d, { stres: MF.bensin.pasStres }) : d, pesan: [s >= 0.85 ? '⛽ Pas di garis! Pak Jo acungi jempol 👍' : '⛽ Tangki terisi.'] };
    case 'mi':
      if (s < 0.3) return { data: ubah(d, { stres: MF.mi.lembekStres }), pesan: ['🍜 Yah, minya lembek/keras... tetap dimakan sih.'] };
      return { data: ubah(d, { energi: r(s * MF.mi.energiMaks) }), pesan: [s >= 0.8 ? '🍜 Mi al dente sempurna! Chef kos!' : '🍜 Mi matang, lumayan.'] };
    case 'juggling':
      return { data: ubah(d, { stres: r(s * MF.juggling.stresMaks) }), pesan: [`⚽ Juggling ${r(s * MF.juggling.target)} kali! ${s >= 1 ? 'Freestyler kampung!' : ''}`] };
    case 'sim':
      return { data: d, pesan: [] };
  }
}

/**
 * Ringkasan untuk papan peringkat online (dipakai SERVER juga — save dari HP tidak dipercaya,
 * jadi setiap angka diperiksa & dibatasi).
 *  harta = uang + tabungan + deposito + nilai jual emas · rekor = jumlah rekor mini-game × 100 (maks 800)
 */
export function ringkasPeringkat(save: Partial<SaveData> | null | undefined): { harta?: number; rekor?: number } {
  if (!save || typeof save !== 'object') return {};
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  // Batasi panjang array & nilai per item (save rusak/curang tidak boleh membuat server lambat)
  const depo = Array.isArray(save.deposito) ? save.deposito.slice(0, 50).reduce((a, p) => a + clamp(n(p?.jumlah), 0, 1e12), 0) : 0;
  // hargaEmas() mengulang sebanyak `hari` → hari WAJIB dibatasi (hari 10^15 = server macet)
  const gram = clamp(n(save.emas), 0, 1e5);
  const emas = gram > 0 ? gram * hargaEmasJual(clamp(Math.floor(n(save.hari)), 1, 20000)) : 0;
  const harta = Math.round(n(save.uang) + Math.max(0, n(save.tabungan)) + depo + emas);
  const rek = save.rekorMini && typeof save.rekorMini === 'object' ? Object.values(save.rekorMini) : [];
  const rekor = Math.round(rek.slice(0, 8).reduce((a, v) => a + clamp(n(v), 0, 1), 0) * 100);
  return { harta: clamp(harta, -1e12, 1e12), rekor };
}

// ----- Pos Polisi: SIM & tilang (M12) -----
const LALIN = F4.lalin;
export function bikinSim(d: SaveData): Hasil {
  if (d.punyaSim) return tolak(d, '🪪 Kamu sudah punya SIM C. Simpan baik-baik!');
  if (d.uang < LALIN.hargaSim) return tolak(d, `💸 Biaya SIM ${rp(LALIN.hargaSim)}.`);
  return {
    data: tambahStat(catatBelanja({ ...d, uang: d.uang - LALIN.hargaSim, punyaSim: true }, 'transport', LALIN.hargaSim), 'bikinSim'),
    pesan: [`🪪 Lulus ujian praktik zig-zag! SIM C jadi. Denda tilang sekarang lebih ringan. −${rp(LALIN.hargaSim)}`],
  };
}
/** Kena tilang menerobos lampu merah. Denda langsung dipotong (boleh minus = utang ke negara 😅). */
export function kenaTilang(d: SaveData): Hasil {
  const denda = d.punyaSim ? LALIN.denda : LALIN.dendaTanpaSim;
  const x = tambahStat(catatBelanja(ubah({ ...d }, { uang: -denda, stres: LALIN.stresTilang }), 'transport', denda), 'tilang');
  return {
    data: x,
    pesan: [`👮 PRIIIT! Menerobos lampu merah. Tilang ${rp(denda)}${d.punyaSim ? '' : ' (tanpa SIM, denda dobel!)'} 😵+${LALIN.stresTilang}`],
  };
}

export function minumAir(d: SaveData): Hasil {
  if (d.galonLiter < F4.galon.literPerMinum) return tolak(d, '🫙 Galon kosong! Beli galon di Toko Tani & Depot Air.');
  if (d.hidrasi >= 95) return tolak(d, '💧 Belum haus kok.');
  return { data: { ...d, galonLiter: Math.round((d.galonLiter - F4.galon.literPerMinum) * 10) / 10, hidrasi: Math.min(100, d.hidrasi + T.minumAir) }, pesan: [`💧 Glek glek... segar! Galon tinggal ${Math.round((d.galonLiter - F4.galon.literPerMinum) * 10) / 10} L`] };
}
export function tanamCabai(d: SaveData): SaveData {
  return { ...d, cabai: { tanam: d.hari, tumbuh: 0.02, siramHari: d.hari } };
}
export function siramCabai(d: SaveData): Hasil {
  if (!d.cabai) return tolak(d, 'Belum ada pot cabai. Beli bibit di Toko Tani.');
  if (d.cabai.siramHari === d.hari) return tolak(d, '🌱 Sudah disiram hari ini.');
  return { data: { ...d, cabai: { ...d.cabai, siramHari: d.hari } }, pesan: [`🌱 Cabai disiram. Pertumbuhan ${Math.round(d.cabai.tumbuh * 100)}%`] };
}
export function panenCabai(d: SaveData): Hasil {
  if (!d.cabai || d.cabai.tumbuh < 0.95) return tolak(d, `🌱 Belum siap panen (${Math.round((d.cabai?.tumbuh ?? 0) * 100)}%).`);
  return { data: tambahStat({ ...d, cabai: null, tas: { ...d.tas, bahanNasgor: (d.tas.bahanNasgor ?? 0) + 1, cabai: (d.tas.cabai ?? 0) + F4.cabai.panen } }, 'panenCabai'), pesan: [`🌶️ Panen ${F4.cabai.panen} cabai! Masakan jadi lebih mantap.`] };
}

// ===================== Kota: stiker, jelajah =====================
export function selJelajah(x: number, z: number): number {
  const [gx, gz] = F4.kota.gridJelajah;
  const cx = clamp(Math.floor(((x + 60) / 120) * gx), 0, gx - 1);
  const cz = clamp(Math.floor(((z + 42) / 84) * gz), 0, gz - 1);
  return cz * gx + cx;
}
export const persenJelajah = (bitmask: number) => {
  const total = F4.kota.gridJelajah[0] * F4.kota.gridJelajah[1];
  let n = 0;
  for (let i = 0; i < total; i++) if (bitmask & (1 << i)) n++;
  return Math.round((n / total) * 100);
};
export function ambilStiker(d: SaveData, i: number): Hasil {
  if (d.stiker.includes(i)) return { data: d, pesan: [] };
  const stiker = [...d.stiker, i];
  let x: SaveData = tambahStat({ ...d, stiker }, 'stiker');
  const pesan = [`✨ Stiker kampus ditemukan! (${stiker.length}/${F4.kota.stiker.length})`];
  if (stiker.length % F4.kota.stikerHadiahTiap === 0) {
    x = { ...x, uang: x.uang + F4.kota.stikerHadiah };
    pesan.push(`🎁 Koleksi ${stiker.length} stiker! Hadiah ${rp(F4.kota.stikerHadiah)}`);
  }
  return { data: x, pesan };
}

// ===================== Sosial: mood & ulang tahun warga =====================
export function moodWarga(hari: number, idx: number): 'senang' | 'biasa' | 'bete' {
  const r = acakTetap(hari * 13 + idx, 55);
  const p = F4.sosial.moodPeluang;
  return r < p.bete ? 'bete' : r < p.bete + p.biasa ? 'biasa' : 'senang';
}
export const ultahWarga = (idx: number) => ({ tanggal: 1 + Math.floor(acakTetap(idx, 77) * 30), bulan: 1 + Math.floor(acakTetap(idx, 78) * 4) });
export const pesanGrupKelas = (hari: number): string[] => {
  const g = F4.sosial.grupKelas;
  return [0, 1, 2, 3].map((i) => g[Math.floor(acakTetap(hari, 300 + i) * g.length)]);
};

// ===================== Relasi untuk asisten dosen =====================
export const bolehAsisten = (d: SaveData) => d.ipk >= K.asisten.minIpk && lvRelasi(d, 'pakDosen') >= K.asisten.minRelasiLv;
export const bolehMagang = (d: SaveData) => d.sks >= K.magang.minSks && d.ipk >= K.magang.minIpk;
