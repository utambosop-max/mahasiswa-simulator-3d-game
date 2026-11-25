// Mesin simulasi hidup mahasiswa — fungsi murni (tanpa React), mudah diuji.
// Semua angka diambil dari src/data/*.json (lihat skill mahasiswa-life-balancer).
import balanceJson from '../data/balance.json';
import aksiJson from '../data/aksi.json';
import upgradesJson from '../data/upgrades.json';
import menuJson from '../data/menu.json';
import kerjaJson from '../data/kerja.json';
import eventsJson from '../data/events.json';
import fiturJson from '../data/fitur.json';
import fitur2Json from '../data/fitur2.json';
import areaBaruJson from '../data/areaBaru.json';
import { DAFTAR_KOS, F3, cairBeasiswa, hargaKos, kosDari, pagiM11, stresPasifKos, type Pacar } from './m11';
import {
  OLAHRAGA,
  bawaanM12,
  catatBelajar,
  catatBelanja,
  catatBolos,
  efekKonsumsi,
  energiTidur,
  fasePasif,
  hariBaruM12,
  jalanWaktu,
  catatSesiLomba,
  lengkapiM12,
  listrikMati,
  matkulJadwal,
  matkulTerlemah,
  naikKebugaran,
  pengaliBelajar,
  pengaliHarga,
  rataRetensi,
  type DataM12,
  type KategoriBelanja,
} from './m12';
import { F4, pengaliInflasi, pengaliPengalaman } from './fisika';
import { bawaanCerita, lengkapiCerita, type DataCerita } from './ceritaSave';

// ===== Tipe =====
export type Fase = 'pagi' | 'siang' | 'sore' | 'malam' | 'begadang';
export const URUTAN_FASE: readonly Fase[] = ['pagi', 'siang', 'sore', 'malam', 'begadang'];
export const LABEL_FASE: Record<Fase, string> = {
  pagi: '🌅 Pagi',
  siang: '☀️ Siang',
  sore: '🌇 Sore',
  malam: '🌙 Malam',
  begadang: '🦉 Begadang',
};
export const isMalam = (f: Fase) => f === 'malam' || f === 'begadang';

export type Lokasi = 'kamar' | 'dunia' | 'gedung';
export const LOKASI: readonly Lokasi[] = ['kamar', 'dunia', 'gedung'];
export type TempatMakan = 'warteg' | 'warkop' | 'minimarket' | 'gerobak' | 'pasarMalam' | 'kafe' | 'pasar' | 'cilok' | 'pasarKaget' | 'kopiKali' | 'esDegan';

export type Level = 1 | 2 | 3;
export type PerabotId = 'kasur' | 'meja' | 'kipas' | 'dekorasi';
export const PERABOT: readonly PerabotId[] = ['kasur', 'meja', 'kipas', 'dekorasi'];

export type StatId = 'uang' | 'ipk' | 'energi' | 'stres';
export type Efek = Partial<Record<StatId, number>>;

export type AksiId =
  | 'kuliah'
  | 'belajar'
  | 'nugas'
  | 'tidur'
  | 'rebahan'
  | 'masakMi'
  | 'keluar'
  | 'masukKos'
  | 'makanWarteg'
  | 'ngopi'
  | 'nongkrong'
  | 'santaiTaman'
  | 'kerjaWarteg'
  | 'kerjaWarkop'
  | 'belanja'
  | 'gerobakNasgor'
  | 'belajarPerpus'
  | 'mainFutsal'
  | 'printTugas'
  | 'laundry'
  | 'mainGame'
  | 'periksa'
  | 'naikAngkot'
  | 'naikMotor'
  | 'turunMotor'
  | 'bukaUpgrade'
  | 'mandi'
  | 'bersihKamar'
  | 'mainGitar'
  | 'elusKucing'
  | 'freelance'
  | 'lesPrivat'
  | 'narikOjol'
  | 'belanjaBarang'
  | 'nulisSkripsi'
  | 'bimbingan'
  | 'sidang'
  | 'rapatUKM'
  | 'jogging'
  | 'jajanPasarMalam'
  | 'naikKomidi'
  | 'ngobrolBuKos'
  | 'ngobrolSri'
  | 'ngobrolUdin'
  | 'ngobrolDosen'
  | 'kasihMakanOyen'
  | 'kasihMakanIkan'
  | 'siramTanaman'
  | 'isiBensin'
  | 'bukaBengkel'
  | 'klakson'
  // ===== M11 =====
  | 'buangAir'
  | 'masukGedung'
  | 'keluarGedung'
  | 'wfhKafe'
  | 'nugasKafe'
  | 'makanKafe'
  // ===== M12: gedung baru =====
  | 'bukaBank'
  | 'bukaKarier'
  | 'bukaTokoTani'
  | 'latihanGym'
  | 'tendangPenalti'
  | 'makanPasar'
  | 'potongRambut'
  | 'bukaPosPolisi'
  | 'beliCilok'
  // M12: menyambungkan fitur galon, cabai & lomba
  | 'minum'
  | 'siramCabai'
  | 'panenCabai'
  | 'kerjakanLomba'
  // ===== M13: area baru (kali, sawah, pasar kaget, lapangan kampung) =====
  | 'jajanPasarKaget'
  | 'ngopiTepiKali'
  | 'jajanKopiKali'
  | 'mancing'
  | 'bantuPanen'
  | 'jajanEsDegan'
  | 'mainBolaKampung';

export type JenisAksi =
  | 'belajar'
  | 'tidur'
  | 'santai'
  | 'makan'
  | 'segera'
  | 'pindah'
  | 'menu'
  | 'angkot'
  | 'kendaraan'
  | 'kerja'
  | 'toko'
  | 'kerjaLepas'
  | 'ojol'
  | 'barang'
  | 'skripsi'
  | 'ngobrol';

export type TempatKerja = 'warteg' | 'warkop';

type AksiDef = {
  label: string;
  ikon: string;
  fase: Fase[];
  hariKerja?: boolean;
  jenis: JenisAksi;
  pakaiMeja?: boolean;
  menuId?: string;
  tujuan?: Lokasi;
  tempat?: TempatMakan;
  kerja?: TempatKerja;
  efek: Efek;
  majuFase: number;
  transisi?: string;
  pesan: string;
  alasanTutup?: string;
  /** Hanya di hari tertentu (0 = Senin ... 6 = Minggu) */
  hari?: number[];
  /** Aksi ngobrol: NPC yang diajak bicara */
  npc?: string;
  /** Butuh barang di tas (dipakai 1) */
  butuhBarang?: string;
  /** Jenis 'barang': toko mana yang dibuka */
  toko?: string;
  /** Lama aksi dalam jam game (jam real-time) */
  durasiJam?: number;
};

export type MenuItem = { id: string; nama: string; ikon: string; harga: number; efek: Efek; resep: string[] };
export type LevelDef = { level: Level; label: string; harga: number; deskripsi: string; efek: Record<string, number> };
export type UpgradeDef = { id: PerabotId; nama: string; ikon: string; levels: LevelDef[] };

export type BahanDef = { id: string; nama: string; ikon: string };
export type KerjaDef = {
  nama: string;
  ikon: string;
  bos: string;
  sapaan: string;
  gajiDasar: number;
  bayarPerPesanan: number;
  tipMaks: number;
  jumlahPelanggan: number;
  kesabaranAwal: number;
  kesabaranTurun: number;
  kesabaranMin: number;
  penaltiSalah: number;
  stresPerGagal: number;
  stresSempurna: number;
  bahan: BahanDef[];
  pesanan: string[];
};

/** Data yang disimpan ke localStorage. */
export type SaveData = {
  versi: 1;
  uang: number;
  ipk: number;
  energi: number;
  stres: number;
  hari: number; // hari ke-n sejak mulai (hari 1 = Senin)
  tanggal: number; // 1..30
  bulan: number;
  fase: Fase;
  /** Menit dalam hari game (0 = jam 05.00 … 1439), jam berjalan real-time */
  menit: number;
  lokasi: Lokasi;
  hadir: { pagi: boolean; siang: boolean }; // sudah kuliah di sesi ini hari ini?
  streakMi: number; // makan mi instan berturut-turut
  porsiFase: number; // jumlah makan/minum di fase ini (aturan "kenyang")
  level: Record<PerabotId, Level>;
  kosLunas: boolean; // uang kos bulan ini sudah dibayar?
  hariBelajar: number; // hari terakhir belajar/kuliah (untuk kuis mendadak)
  kuliahLibur: boolean; // dosen batal masuk hari ini
  eventHari: { hari: number; jumlah: number }; // batas event per hari
  kamarBerdua: boolean; // (online) sekamar dengan teman → kos patungan
  // ===== Fitur kehidupan (M7) =====
  profil: Profil | null; // null = belum buat karakter
  stat: Record<string, number>; // statistik hidup (dipakai misi & pencapaian)
  pencapaian: string[];
  misi: { hari: number; dasar: Record<string, number>; daftar: { id: string; klaim: boolean }[]; bonus: boolean };
  tabungan: number;
  tas: Record<string, number>; // barang milik pemain (payung, vitamin, obat, kopi sachet)
  kebersihan: number; // 0–100
  bajuKotor: number; // hari sejak terakhir laundry
  sakit: number; // sisa hari sakit (0 = sehat)
  mandiHari: number;
  vitaminHari: number;
  elusSlot: number; // slot waktu terakhir mengelus Oyen
  semester: number;
  ipkAwalSemester: number;
  rapor: RaporSemester[];
  ujianSelesai: string[];
  belajarLog: number[]; // hari-hari belajar (untuk persiapan ujian)
  kemarin: { uang: number; ipk: number; energi: number; stres: number };
  // ===== M8 =====
  sks: number;
  skripsi: number; // 0–100 %
  lulus: boolean;
  skillLv: Record<string, number>; // level skill terakhir (untuk notifikasi naik level)
  ukm: string | null;
  relasi: Record<string, number>; // pertemanan dengan NPC 0–100
  ngobrolHari: Record<string, number>;
  follower: number;
  milestoneMedsos: number;
  postingSlot: number;
  teleponHari: number;
  bensin: number; // 0–100 %
  motorLevel: number;
  warnaMotor: string;
  aksesoris: string[]; // dimiliki
  pakai: string[]; // sedang dipakai
  catDinding: string;
  ikanHari: number;
  siramHari: number;
  targetTabungan: number;
  riwayatUang: number[]; // uang di akhir tiap hari (30 hari terakhir)
  // ===== M11 =====
  kos: string; // id kos (lihat fitur3.json → kos.daftar)
  kosPindahHari: number;
  jamMalamHari: number; // hari terakhir kena jam malam
  pacar: Pacar | null;
  tinggalBareng: boolean; // pacar NPC tinggal di kos yang sama (sewa patungan)
  beasiswa: { id: string; sejak: number } | null;
  beasiswaTolak: Record<string, number>; // id beasiswa → semester terakhir dicabut/daftar
  toiletSlot: number;
  hantuSlot: number; // slot terakhir melihat hantu (Wisma Kenanga)
  /** Gedung yang sedang dimasuki (lokasi 'gedung') */
  gedung: string | null;
  /** Animasi pembuka sudah ditonton/dilewati (game baru = false; save lama = true) */
  pembukaSelesai: boolean;
} & DataM12 & // ===== M12: tubuh & otak, kampus, ekonomi, kamar, kota (lihat m12.ts) =====
  DataCerita; // ===== Cerita utama "Buku Sakti Ibu" (lihat ceritaSave.ts & cerita.ts) =====

export type Profil = {
  nama: string;
  jurusan: string;
  asal: string;
  kulit: number;
  rambut: string;
  baju: string;
  /** Gaya rambut (fitur3.json → gayaRambut); kosong = pendek */
  gaya?: string;
  /** Ulang tahun: tanggal & bulan ke-(1–4) dalam semester */
  ultah: { tanggal: number; bulan: number };
};
export type RaporSemester = { semester: number; ipk: number; selisih: number; predikat: string; ikon: string };

// ===== Data =====
export const BAL = balanceJson;

// ===== M13: batas harian aksi area baru =====
// Dicatat di ngobrolHari (Record<string, number> yang sudah ikut save) dengan kunci "area_<aksi>" = hari terakhir
// dan "area_<aksi>_n" = berapa kali hari itu. Tidak perlu field save baru → save lama tetap aman.
const AREA = areaBaruJson;
const BATAS_AREA = AREA.batasHarian as Partial<Record<AksiId, number>>;
/** Berapa kali aksi area baru sudah dilakukan hari ini. */
export function kaliHariIni(d: Pick<SaveData, 'ngobrolHari' | 'hari'>, id: AksiId): number {
  return d.ngobrolHari[`area_${id}`] === d.hari ? (d.ngobrolHari[`area_${id}_n`] ?? 0) : 0;
}
function catatHarian(x: SaveData, id: AksiId): SaveData {
  const n = kaliHariIni(x, id) + 1;
  return { ...x, ngobrolHari: { ...x.ngobrolHari, [`area_${id}`]: x.hari, [`area_${id}_n`]: n } };
}
type HasilMancing = { id: string; peluang: number; efek: Efek; teks: string };
/** Undi hasil mancing berdasar peluang di areaBaru.json (acak bisa diganti untuk tes). */
export function undiMancing(acak: () => number = Math.random): HasilMancing {
  const daftar = AREA.mancing.hasil as HasilMancing[];
  let r = acak();
  for (const h of daftar) {
    if (r < h.peluang) return h;
    r -= h.peluang;
  }
  return daftar[daftar.length - 1];
}
export const AKSI = aksiJson as Record<AksiId, AksiDef>;
export const UPGRADES = upgradesJson as UpgradeDef[];
export const KERJA: Record<TempatKerja, KerjaDef> = { warteg: kerjaJson.warteg, warkop: kerjaJson.warkop };
export const WAJAH_PELANGGAN: readonly string[] = kerjaJson.wajahPelanggan;
const MENU: Record<TempatMakan | 'kamar', MenuItem[]> = {
  warteg: menuJson.warteg as MenuItem[],
  warkop: menuJson.warkop as MenuItem[],
  minimarket: menuJson.minimarket as MenuItem[],
  gerobak: menuJson.gerobak as MenuItem[],
  pasarMalam: menuJson.pasarMalam as MenuItem[],
  kafe: F3.kafe.menu as MenuItem[],
  pasar: menuJson.pasar as MenuItem[],
  cilok: menuJson.cilok as MenuItem[],
  pasarKaget: menuJson.pasarKaget as MenuItem[],
  kopiKali: menuJson.kopiKali as MenuItem[],
  esDegan: menuJson.esDegan as MenuItem[],
  kamar: menuJson.kamar as MenuItem[],
};
export const NAMA_TEMPAT: Record<TempatMakan, string> = {
  warteg: '🍛 Warteg Barokah',
  warkop: '☕ Warkop Begadang',
  minimarket: '🏪 Toko Serba Ada 24',
  gerobak: '🍳 Nasi Goreng Bang Jali',
  pasarMalam: '🎡 Pasar Malam Sabtu',
  kafe: '☕ Kafe Ruang Kerja',
  pasar: '🥬 Pasar Pagi',
  cilok: '🍡 Cilok Mang Ujang',
  pasarKaget: '🏮 Pasar Kaget',
  kopiKali: '☕ Kopi Tepi Kali',
  esDegan: '🥥 Es Degan Pak Kumis',
};

const ALASAN_KENYANG = '🫃 Kenyang banget! Tunggu fase berikutnya ya.';
const kenyang = (d: SaveData) => d.porsiFase >= BAL.kenyang.porsiPerFase;

const NAMA_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const namaHari = (hari: number) => NAMA_HARI[(hari - 1) % 7];
/** Senin–Jumat dan bukan tanggal merah (libur nasional = tidak ada kuliah, tidak bolos). */
export const isHariKerja = (hari: number) => (hari - 1) % 7 < 5 && !tanggalMerah(hari);
export const isTanggalTua = (tanggal: number) => tanggal >= BAL.bulanan.tanggalTuaMulai;

export function efekPerabot(d: SaveData, id: PerabotId, kunci: string): number {
  const def = UPGRADES.find((u) => u.id === id);
  const lv = def?.levels.find((l) => l.level === d.level[id]);
  return lv?.efek[kunci] ?? 0;
}

export function dataAwal(): SaveData {
  const a = BAL.statAwal;
  return {
    versi: 1,
    uang: a.uang,
    ipk: a.ipk,
    energi: a.energi,
    stres: a.stres,
    hari: 1,
    tanggal: a.tanggal,
    bulan: 1,
    fase: 'pagi',
    menit: BAL.jam.mulaiFase.pagi, // jam 06.00
    lokasi: 'kamar',
    hadir: { pagi: false, siang: false },
    streakMi: 0,
    porsiFase: 0,
    level: { kasur: 1, meja: 1, kipas: 1, dekorasi: 1 },
    kosLunas: true, // bulan pertama sudah dibayar saat pindah
    hariBelajar: 0,
    kuliahLibur: false,
    eventHari: { hari: 0, jumlah: 0 },
    kamarBerdua: false,
    ...bawaanFitur(a.ipk, a.uang, a.energi, a.stres),
  };
}

/** Nilai awal semua field fitur M7 (juga dipakai untuk melengkapi save lama). */
function bawaanFitur(ipk: number, uang: number, energi: number, stres: number) {
  return {
    profil: null,
    stat: {},
    pencapaian: [],
    misi: { hari: 0, dasar: {}, daftar: [], bonus: false },
    tabungan: 0,
    tas: {},
    kebersihan: 100,
    bajuKotor: 0,
    sakit: 0,
    mandiHari: 0,
    vitaminHari: 0,
    elusSlot: -1,
    semester: 1,
    ipkAwalSemester: ipk,
    rapor: [],
    ujianSelesai: [],
    belajarLog: [],
    kemarin: { uang, ipk, energi, stres },
    sks: 0,
    skripsi: 0,
    lulus: false,
    skillLv: {},
    ukm: null,
    relasi: {},
    ngobrolHari: {},
    follower: 0,
    milestoneMedsos: 0,
    postingSlot: -1,
    teleponHari: 0,
    bensin: fitur2Json.bensin.awal,
    motorLevel: 1,
    warnaMotor: '#ffb36b',
    aksesoris: [],
    pakai: [],
    catDinding: 'krem',
    ikanHari: 0,
    siramHari: 0,
    targetTabungan: 0,
    riwayatUang: [],
    kos: 'melati',
    kosPindahHari: 0,
    jamMalamHari: 0,
    pacar: null,
    tinggalBareng: false,
    beasiswa: null,
    beasiswaTolak: {},
    toiletSlot: -1,
    hantuSlot: -1,
    gedung: null,
    pembukaSelesai: false, // game baru: pembuka diputar sekali setelah buat karakter
    ...bawaanM12(),
    ...bawaanCerita(),
  } satisfies Partial<SaveData>;
}

/** Lengkapi save lama/luar dengan field baru (aman dari data rusak). */
export function lengkapiSave(d: SaveData): SaveData {
  const x = d as Partial<SaveData> & SaveData;
  const b = bawaanFitur(d.ipk, d.uang, d.energi, d.stres);
  const angka = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
  const obj = <T extends object>(v: unknown, def: T): T => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as T) : def);
  const arr = <T,>(v: unknown, def: T[]): T[] => (Array.isArray(v) ? (v as T[]) : def);
  const p = x.profil;
  return {
    ...d,
    profil: p && typeof p === 'object' && typeof p.nama === 'string' ? p : null,
    stat: obj(x.stat, b.stat),
    pencapaian: arr(x.pencapaian, b.pencapaian),
    misi: x.misi && Array.isArray(x.misi.daftar) ? x.misi : b.misi,
    tabungan: angka(x.tabungan, 0),
    tas: obj(x.tas, b.tas),
    kebersihan: angka(x.kebersihan, 100),
    bajuKotor: angka(x.bajuKotor, 0),
    sakit: angka(x.sakit, 0),
    mandiHari: angka(x.mandiHari, 0),
    vitaminHari: angka(x.vitaminHari, 0),
    elusSlot: angka(x.elusSlot, -1),
    semester: angka(x.semester, 1),
    ipkAwalSemester: angka(x.ipkAwalSemester, d.ipk),
    rapor: arr(x.rapor, b.rapor),
    ujianSelesai: arr(x.ujianSelesai, b.ujianSelesai),
    belajarLog: arr(x.belajarLog, b.belajarLog),
    kemarin: obj(x.kemarin, b.kemarin),
    sks: angka(x.sks, 0),
    skripsi: angka(x.skripsi, 0),
    lulus: !!x.lulus,
    skillLv: obj(x.skillLv, b.skillLv),
    ukm: typeof x.ukm === 'string' ? x.ukm : null,
    relasi: obj(x.relasi, b.relasi),
    ngobrolHari: obj(x.ngobrolHari, b.ngobrolHari),
    follower: angka(x.follower, 0),
    milestoneMedsos: angka(x.milestoneMedsos, 0),
    postingSlot: angka(x.postingSlot, -1),
    teleponHari: angka(x.teleponHari, 0),
    bensin: angka(x.bensin, b.bensin),
    motorLevel: angka(x.motorLevel, 1),
    warnaMotor: typeof x.warnaMotor === 'string' ? x.warnaMotor : b.warnaMotor,
    aksesoris: arr(x.aksesoris, b.aksesoris),
    pakai: arr(x.pakai, b.pakai),
    catDinding: typeof x.catDinding === 'string' ? x.catDinding : 'krem',
    ikanHari: angka(x.ikanHari, 0),
    siramHari: angka(x.siramHari, 0),
    targetTabungan: angka(x.targetTabungan, 0),
    riwayatUang: arr(x.riwayatUang, b.riwayatUang),
    kos: typeof x.kos === 'string' && DAFTAR_KOS.some((k) => k.id === x.kos) ? x.kos : 'melati',
    kosPindahHari: angka(x.kosPindahHari, 0),
    jamMalamHari: angka(x.jamMalamHari, 0),
    pacar: x.pacar && typeof x.pacar === 'object' && typeof x.pacar.id === 'string' ? x.pacar : null,
    tinggalBareng: !!x.tinggalBareng && !!x.pacar,
    beasiswa: x.beasiswa && typeof x.beasiswa === 'object' && typeof x.beasiswa.id === 'string' ? x.beasiswa : null,
    beasiswaTolak: obj(x.beasiswaTolak, {}),
    toiletSlot: angka(x.toiletSlot, -1),
    hantuSlot: angka(x.hantuSlot, -1),
    gedung: typeof x.gedung === 'string' ? x.gedung : null,
    // Save lama belum punya field ini → anggap sudah menonton (tidak dipaksa menonton pembuka)
    pembukaSelesai: typeof x.pembukaSelesai === 'boolean' ? x.pembukaSelesai : true,
    lokasi: x.lokasi === 'gedung' && typeof x.gedung !== 'string' ? 'dunia' : x.lokasi,
    ...lengkapiM12(x),
    ...lengkapiCerita(x),
    // Save lama (sistem fase): jam diset ke awal fase-nya
    menit:
      typeof x.menit === 'number' && x.menit >= 0 && x.menit < 1440 && x.menit >= (x.fase === 'pagi' ? 0 : BAL.jam.batasFase[URUTAN_FASE[URUTAN_FASE.indexOf(x.fase) - 1]]) && x.menit < BAL.jam.batasFase[x.fase]
        ? x.menit
        : BAL.jam.mulaiFase[x.fase],
  };
}

// ===== M8: data & pembantu =====
export const F2 = fitur2Json;
/** Indeks hari dalam minggu: 0 = Senin ... 6 = Minggu */
export const hariMinggu = (hari: number) => (hari - 1) % 7;
/** Tanggal & bulan dari nomor hari (game selalu mulai tanggal 1 bulan 1). */
const tglDariHari = (hari: number) => ({ tanggal: ((hari - 1) % 30) + 1, bulan: Math.floor((hari - 1) / 30) + 1 });
/** Libur nasional / tanggal merah hari ini (jika ada). */
export function tanggalMerah(hari: number) {
  const { tanggal, bulan } = tglDariHari(hari);
  return fitur2Json.tanggalMerah.find((t) => t.tanggal === tanggal && t.bulan === ((bulan - 1) % 4) + 1) ?? null;
}

/** Level skill (0–4) dari jumlah aktivitas terkait. */
export function levelSkill(d: Pick<SaveData, 'stat'>, id: string): number {
  const s = fitur2Json.skill.find((x) => x.id === id);
  if (!s) return 0;
  const total = s.stat.reduce((n, k) => n + (d.stat[k] ?? 0), 0);
  return fitur2Json.skillLevel.filter((batas) => total >= batas).length;
}
/** Level pertemanan (0–3) dengan NPC. */
export const levelRelasi = (d: Pick<SaveData, 'relasi'>, npc: string) =>
  fitur2Json.relasiLevel.filter((batas) => (d.relasi[npc] ?? 0) >= batas).length;

export type UpgradeMotorDef = (typeof fitur2Json.motorUpgrade)[number];
export const infoMotor = (d: Pick<SaveData, 'motorLevel'>) => {
  const lv = fitur2Json.motorUpgrade.filter((u) => u.level <= d.motorLevel).pop();
  return { kecepatan: lv?.kecepatan ?? 1, hemat: lv?.hemat ?? 1 };
};
export const hargaIsiBensin = (d: Pick<SaveData, 'bensin'>) => Math.round(((100 - d.bensin) * fitur2Json.bensin.hargaPerPersen) / 500) * 500;

// ===== Profil: jurusan & daerah asal =====
export type JurusanDef = (typeof fiturJson.jurusan)[number] & { pengali: Partial<Record<string, number>> };
export type AsalDef = (typeof fiturJson.asal)[number];
export const FITUR = fiturJson;
export const JURUSAN = fiturJson.jurusan as JurusanDef[];
export const ASAL = fiturJson.asal as AsalDef[];
export const KEH = fiturJson.kehidupan;
export const AKADEMIK = fiturJson.akademik;

/** Pengali dari jurusan (1 jika tidak ada / belum punya profil). */
export function pengaliJurusan(d: SaveData, kunci: string, bawaan = 1): number {
  const j = JURUSAN.find((x) => x.id === d.profil?.jurusan);
  return j?.pengali[kunci] ?? bawaan;
}
const asalDari = (d: SaveData) => ASAL.find((a) => a.id === d.profil?.asal) ?? ASAL[0];
/** Kiriman ortu tiap tgl 1 (berhenti setelah punya karier) */
export const kirimanOrtu = (d: SaveData) => (d.karier ? 0 : asalDari(d).kiriman);
export const ongkosPulang = (d: SaveData) => asalDari(d).ongkosPulang;

/** Tambah statistik (untuk misi & pencapaian). */
export const tambahStat = (d: SaveData, kunci: string, n = 1): SaveData => ({
  ...d,
  stat: { ...d.stat, [kunci]: (d.stat[kunci] ?? 0) + n },
});

// ===== Cuaca: ditentukan dari nomor hari (sama untuk semua pemain online) =====
export type CuacaId = 'cerah' | 'berawan' | 'hujan';
export function cuacaHari(hari: number): (typeof fiturJson.cuaca)[number] & { id: CuacaId } {
  const daftar = fiturJson.cuaca as ((typeof fiturJson.cuaca)[number] & { id: CuacaId })[];
  if (hari <= 2) return daftar[0]; // 2 hari pertama selalu cerah (masa adaptasi)
  // Angka acak "tetap" dari nomor hari (hash pengaduk ala MurmurHash → sebaran merata 0..1)
  let h = Math.imul(hari ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  const r = (h >>> 0) / 4294967296;
  let acc = 0;
  for (const c of daftar) {
    acc += c.peluang;
    if (r < acc) return c;
  }
  return daftar[0];
}

// ===== Ujian (UTS/UAS) & semester =====
export const bulanSemester = (bulan: number) => ((bulan - 1) % 4) + 1;
export type UjianDef = (typeof fiturJson.akademik.ujian)[number];
/** Ujian yang sedang berlangsung hari ini (dan belum diikuti), atau null. */
export function ujianAktif(d: SaveData): (UjianDef & { kunci: string }) | null {
  const u = AKADEMIK.ujian.find(
    (x) => x.bulanSemester === bulanSemester(d.bulan) && d.tanggal >= x.tanggalMulai && d.tanggal <= x.tanggalSelesai,
  );
  if (!u) return null;
  const kunci = `${u.id}-${d.semester}`;
  return d.ujianSelesai.includes(kunci) ? null : { ...u, kunci };
}
/** Persiapan ujian 0–1: jumlah hari belajar/kuliah dalam 7 hari terakhir. */
/** Persiapan ujian 0–1: separuh dari rutinitas belajar 7 hari, separuh dari ingatan materi (kurva lupa). */
export const persiapanUjian = (d: SaveData) =>
  0.5 * Math.min(1, d.belajarLog.filter((h) => h > d.hari - 7).length / AKADEMIK.ujianBelajarPenuh) + 0.5 * rataRetensi(d);

/** Mata kuliah yang dipelajari oleh sebuah aksi (kuliah = sesuai jadwal; belajar mandiri = yang paling terlupa). */
export function matkulAksi(d: SaveData, id: AksiId): string | null {
  if (id === 'kuliah') return d.fase === 'siang' ? matkulJadwal(d, 'siang') : matkulJadwal(d, 'pagi');
  if (AKSI[id].jenis === 'belajar') return matkulTerlemah(d);
  return null;
}
export const predikatIpk = (ipk: number) => AKADEMIK.predikat.find((p) => ipk >= p.min) ?? AKADEMIK.predikat[AKADEMIK.predikat.length - 1];

/** Biaya kos bulanan (patungan jika sekamar berdua saat online). */
export const biayaKos = (d: SaveData) => hargaKos(d);

// ===== Format teks =====
export const formatRupiah = (n: number) => `${n < 0 ? '−' : ''}Rp${Math.abs(Math.round(n)).toLocaleString('id-ID')}`;
const tanda = (n: number) => (n > 0 ? '+' : '−');

export function ringkasEfek(e: Efek): string {
  const bagian: string[] = [];
  if (e.uang) bagian.push(`💰 ${tanda(e.uang)}${formatRupiah(Math.abs(e.uang))}`);
  if (e.ipk) bagian.push(`🎓 ${tanda(e.ipk)}${Math.abs(e.ipk).toFixed(3)}`);
  if (e.energi) bagian.push(`⚡ ${tanda(e.energi)}${Math.abs(e.energi)}`);
  if (e.stres) bagian.push(`😵 ${tanda(e.stres)}${Math.abs(e.stres)}`);
  return bagian.join('  ');
}

// ===== Aturan =====
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function terapkan(d: SaveData, e: Efek): SaveData {
  return {
    ...d,
    uang: d.uang + (e.uang ?? 0),
    ipk: Math.round(clamp(d.ipk + (e.ipk ?? 0), 0, 4) * 1000) / 1000,
    energi: Math.round(clamp(d.energi + (e.energi ?? 0), 0, 100)),
    stres: Math.round(clamp(d.stres + (e.stres ?? 0), 0, 100)),
  };
}

/** Skor mini-game soal ujian (0–1) untuk ujian berikutnya; null = tidak dimainkan. */
let skorKuis: number | null = null;
export const setSkorKuis = (n: number | null) => {
  skorKuis = n;
};

/** Efek akhir sebuah aksi setelah semua pengali (lemas, stres, level perabot, dll). */
export function efekAksi(d: SaveData, id: AksiId): Efek {
  const a = AKSI[id];
  const e: Efek = { ...a.efek };

  if (a.menuId) {
    const m = MENU.kamar.find((x) => x.id === a.menuId);
    if (m) {
      Object.assign(e, m.efek);
      e.uang = (e.uang ?? 0) - m.harga;
    }
    // Kebanyakan mi instan → perut protes
    if (a.menuId === 'mi_instan' && d.streakMi >= BAL.miInstan.batasBeruntun) {
      e.energi = Math.round((e.energi ?? 0) * BAL.miInstan.pengaliEnergi);
      e.stres = (e.stres ?? 0) + BAL.miInstan.stresTambahan;
    }
  }

  // Ujian (UTS/UAS): kuliah di minggu ujian = ikut ujian. Nilai tergantung persiapan 7 hari terakhir.
  const ujian = id === 'kuliah' ? ujianAktif(d) : null;
  if (ujian) {
    // Nilai = gabungan persiapan belajar & hasil menjawab soal ujian (jika mini-game dimainkan)
    const p = persiapanUjian(d);
    const b = F2.kuisUjian.bobotPersiapan;
    const s = skorKuis === null ? p : b * p + (1 - b) * skorKuis;
    e.ipk = Math.round((AKADEMIK.ujianIpkMin + (AKADEMIK.ujianIpkMaks - AKADEMIK.ujianIpkMin) * s) * 1000) / 1000;
    e.stres = (e.stres ?? 0) + AKADEMIK.ujianStres;
  }

  if (a.jenis === 'belajar' && e.ipk && !ujian) {
    let k = 1;
    if (a.pakaiMeja) k *= (efekPerabot(d, 'meja', 'pengaliBelajar') || 1) * kosDari(d).efek.pengaliBelajar; // kos tenang = belajar lebih masuk
    if (d.energi < BAL.ambang.energiLemas) k *= BAL.pengali.ipkSaatLemas;
    // M12: Yerkes–Dodson (stres sedang = optimum), kantuk (Borbély), kejenuhan sesi, buku matkul
    k *= pengaliBelajar(d, matkulAksi(d, id));
    // Jurusan: kuliah vs belajar mandiri
    k *= id === 'kuliah' ? pengaliJurusan(d, 'ipkKuliah') : pengaliJurusan(d, 'ipkBelajar');
    if (d.sakit > 0) k *= KEH.sakitPengaliIpk; // sakit → susah fokus
    e.ipk = Math.round(e.ipk * k * 1000) / 1000;
  }
  if (id === 'kuliah') e.stres = (e.stres ?? 0) + pengaliJurusan(d, 'stresKuliah', 0);

  // Jurusan seni: aktivitas santai lebih menenangkan
  if (a.jenis === 'santai' && (e.stres ?? 0) < 0) e.stres = Math.round((e.stres ?? 0) * pengaliJurusan(d, 'stresSantai'));
  // Jurusan kedokteran: diskon klinik
  if (id === 'periksa' && e.uang) e.uang = Math.round(e.uang * pengaliJurusan(d, 'hargaKlinik'));
  // Freelance dibayar lebih untuk anak IT & desain
  if (id === 'freelance' && e.uang) e.uang = Math.round((e.uang * pengaliJurusan(d, 'gajiFreelance')) / 500) * 500;
  // Mandi pagi = ekstra segar
  if (id === 'mandi' && d.fase === 'pagi') e.energi = (e.energi ?? 0) + KEH.mandi.bonusPagiEnergi;
  // Kamar mandi kos: shower air panas (kos mewah) lebih segar, kamar mandi jongkok sempit kurang
  if (id === 'mandi') e.energi = (e.energi ?? 0) + kosDari(d).efek.mandiEnergi;

  // ===== M8: skill, pertemanan, bensin, CFD =====
  if (id === 'freelance' && e.uang) e.uang = Math.round((e.uang * (1 + 0.1 * levelSkill(d, 'pemrograman'))) / 500) * 500;
  if (id === 'masakMi') e.energi = (e.energi ?? 0) + 2 * levelSkill(d, 'memasak');
  if (id === 'mainGitar') e.stres = (e.stres ?? 0) - 2 * levelSkill(d, 'musik');
  if ((id === 'mainFutsal' || id === 'jogging' || id === 'mainBolaKampung') && e.energi) e.energi = Math.min(0, e.energi + 2 * levelSkill(d, 'olahraga'));
  if (id === 'kuliah' && e.ipk && !ujian && levelRelasi(d, 'pakDosen') >= 1) e.ipk = Math.round(e.ipk * 1.1 * 1000) / 1000;
  if (id === 'nongkrong' && levelRelasi(d, 'bangUdin') >= 2) e.energi = 0;
  if (id === 'elusKucing' && levelRelasi(d, 'oyen') >= 1) e.stres = (e.stres ?? 0) - 3;
  if (id === 'isiBensin') e.uang = -hargaIsiBensin(d);
  if (id === 'jogging' && hariMinggu(d.hari) === 6) e.stres = (e.stres ?? 0) + F2.jogging.bonusCfdStres; // Car Free Day

  if (a.jenis === 'tidur') {
    if (isMalam(d.fase)) {
      // M12: pemulihan eksponensial menurut lama tidur nyata (jam pertama paling memulihkan)
      e.energi = energiTidur(d, efekPerabot(d, 'kasur', 'energiTidurMalam'), lamaTidur(d));
      e.stres = efekPerabot(d, 'kasur', 'stresTidur') + efekPerabot(d, 'dekorasi', 'stresTidur');
    } else {
      e.energi = efekPerabot(d, 'kasur', 'energiTidurSiang');
      e.stres = BAL.tidurSiang.stres;
    }
    if (d.sakit > 0) e.energi = Math.round(e.energi * KEH.sakitPengaliTidur);
    if (levelRelasi(d, 'oyen') >= 2) e.stres = (e.stres ?? 0) - 3; // Oyen ikut nemenin tidur 🐱
    // Jam weker saat tidur begadang: tidak kesiangan, tapi tidurnya lebih pendek
    if (d.fase === 'begadang' && d.tas.weker) e.energi = (e.energi ?? 0) + F2.weker.energi;
    // Kos: kasur & suasana (mewah lebih nyenyak, kos berisik/angker kurang)
    if (isMalam(d.fase)) e.energi = (e.energi ?? 0) + kosDari(d).efek.energiTidur;
    if (d.tinggalBareng) e.stres = (e.stres ?? 0) + F3.sosial.tidurBarengStres;
  }
  // ekonomi-semester A1: makin dekat 4,0 makin sulit naik
  if ((e.ipk ?? 0) > 0) e.ipk = Math.round((e.ipk ?? 0) * pengaliIpkAtas(d.ipk) * 1000) / 1000;
  return e;
}

/**
 * ekonomi-semester (A1): pengali kenaikan IPK. 1 sampai IPK `mulai`, lalu turun lurus ke 0 di IPK 4,0
 * (dibatasi `minimal`). Contoh: 3,5 → 0,5 · 3,8 → 0,2 · 3,95 → 0,05.
 */
export function pengaliIpkAtas(ipk: number): number {
  const { mulai, minimal } = BAL.ipkAtas;
  if (ipk <= mulai) return 1;
  return Math.max(minimal, (4 - ipk) / (4 - mulai));
}

export type CekAksi = { boleh: boolean; alasan?: string };

export function cekAksi(d: SaveData, id: AksiId): CekAksi {
  const a = AKSI[id];
  if (a.jenis === 'segera') return { boleh: false, alasan: a.pesan };
  if (!a.fase.includes(d.fase)) {
    return {
      boleh: false,
      alasan: a.alasanTutup ?? `${a.ikon} ${a.label} hanya bisa saat ${a.fase.map((f) => LABEL_FASE[f]).join(' / ')}`,
    };
  }
  if (a.hariKerja && !isHariKerja(d.hari)) return { boleh: false, alasan: '🎉 Hari ini libur kuliah!' };
  if (a.jenis === 'makan' && kenyang(d)) return { boleh: false, alasan: ALASAN_KENYANG };
  if (id === 'kuliah' && d.kuliahLibur) return { boleh: false, alasan: '🎉 Dosen berhalangan, kuliah hari ini kosong!' };
  if (id === 'kuliah' && (d.fase === 'pagi' || d.fase === 'siang') && d.hadir[d.fase]) {
    return { boleh: false, alasan: 'Kamu sudah kuliah di sesi ini.' };
  }
  // Jadwal kuliah (jam real-time): sesi pagi 07.00–10.00, sesi siang 12.00–15.00
  if (id === 'kuliah' && (d.fase === 'pagi' || d.fase === 'siang')) {
    const [buka, tutup] = JAM.kuliah[d.fase];
    if (d.menit < buka || d.menit >= tutup) {
      return { boleh: false, alasan: `🏫 Kelas ${d.fase} jam ${teksJam(buka)}–${teksJam(tutup)}. Sekarang jam ${teksJam(d.menit)}.` };
    }
  }
  // M12: laptop & lampu butuh listrik (token habis / mati listrik saat badai)
  if ((id === 'nugas' || id === 'freelance' || id === 'nulisSkripsi') && d.lokasi === 'kamar' && listrikMati(d)) {
    return { boleh: false, alasan: '🕯️ Listrik mati! Laptop nggak bisa dicas. Beli token / tunggu listrik nyala.' };
  }
  // ekonomi-semester (C1): maks 1 shift kerja sambilan per hari
  if ((id === 'kerjaWarteg' || id === 'kerjaWarkop') && d.kerjaHariTerakhir === d.hari && BAL.kerja.maksShiftPerHari <= 1) {
    return { boleh: false, alasan: '💼 Sudah kerja hari ini. Badan butuh istirahat — besok lagi ya!' };
  }
  if (id === 'buangAir' && d.toiletSlot === slotWaktu(d)) return { boleh: false, alasan: '🚽 Belum kebelet lagi kok.' };
  if (id === 'mandi' && d.mandiHari === d.hari) return { boleh: false, alasan: '🧼 Sudah mandi hari ini, masih wangi kok!' };
  if (id === 'bersihKamar' && d.kebersihan >= 95) return { boleh: false, alasan: '✨ Kamar masih bersih kinclong.' };
  if (id === 'elusKucing' && d.elusSlot === slotWaktu(d)) return { boleh: false, alasan: '😺 Oyen lagi tidur, jangan diganggu dulu.' };
  // M13: anti-spam aksi area baru (batas per hari) + kopi tepi kali dihitung "kenyang"
  const batas = BATAS_AREA[id];
  if (batas !== undefined && kaliHariIni(d, id) >= batas) {
    return { boleh: false, alasan: (AREA.alasanBatas as Record<string, string>)[id] ?? 'Cukup untuk hari ini.' };
  }
  if (id === 'ngopiTepiKali' && AREA.ngopiKenyang && kenyang(d)) return { boleh: false, alasan: ALASAN_KENYANG };
  // ===== M8 =====
  if (a.hari && !a.hari.includes(hariMinggu(d.hari))) return { boleh: false, alasan: a.alasanTutup ?? 'Belum waktunya.' };
  if (a.jenis === 'skripsi') {
    if (d.lulus) return { boleh: false, alasan: '🎓 Kamu sudah lulus! Selamat, Sarjana!' };
    if (d.sks < F2.sks.skripsiMinSks) return { boleh: false, alasan: `📘 Skripsi bisa dimulai setelah ${F2.sks.skripsiMinSks} SKS (sekarang ${d.sks}).` };
    if (id === 'sidang' && (d.skripsi < 100 || d.sks < F2.sks.lulus)) {
      return { boleh: false, alasan: `🎓 Syarat sidang: skripsi 100% (${d.skripsi}%) & ${F2.sks.lulus} SKS (${d.sks}).` };
    }
    if (id !== 'sidang' && d.skripsi >= 100) return { boleh: false, alasan: '📄 Skripsi sudah 100%! Daftar sidang di kampus (Pagi).' };
  }
  if (id === 'rapatUKM' && !d.ukm) return { boleh: false, alasan: '🎪 Kamu belum ikut UKM. Daftar di 📱 HP → Kampus.' };
  if (a.npc && d.ngobrolHari[a.npc] === d.hari) return { boleh: false, alasan: '💬 Sudah ngobrol hari ini. Besok lagi ya!' };
  if (a.butuhBarang && (d.tas[a.butuhBarang] ?? 0) <= 0) return { boleh: false, alasan: '🐟 Belum punya makanan kucing. Beli di Toko Serba Ada!' };
  if (id === 'kasihMakanIkan' && d.ikanHari === d.hari) return { boleh: false, alasan: '🐠 Ikannya sudah kenyang hari ini.' };
  if (id === 'siramTanaman' && d.siramHari === d.hari) return { boleh: false, alasan: '🪴 Sudah disiram hari ini. Jangan kebanyakan air!' };
  if (id === 'isiBensin' && d.bensin >= 97) return { boleh: false, alasan: '⛽ Tangki masih penuh.' };
  if (id === 'lesPrivat' && d.ipk < AKADEMIK.lesIpkMin) {
    return { boleh: false, alasan: `👩‍🏫 Ortu murid minta guru les ber-IPK ≥ ${AKADEMIK.lesIpkMin.toFixed(2)}.` };
  }
  const e = efekAksi(d, id);
  if ((e.uang ?? 0) < 0 && d.uang + (e.uang ?? 0) < BAL.batas.uangMin) {
    return { boleh: false, alasan: '💸 Uangnya nggak cukup...' };
  }
  if ((e.energi ?? 0) < 0 && d.energi + (e.energi ?? 0) < 0) {
    return { boleh: false, alasan: '😮‍💨 Terlalu capek. Makan atau tidur dulu!' };
  }
  return { boleh: true };
}

/** Pindah ke hari berikutnya (fase Pagi). Mengurus pergantian bulan. */
function hariBaru(d: SaveData, pesan: string[]): SaveData {
  let x: SaveData = {
    ...d,
    hari: d.hari + 1,
    tanggal: d.tanggal + 1,
    fase: 'pagi',
    hadir: { pagi: false, siang: false },
    porsiFase: 0,
    kuliahLibur: false,
  };
  const b = BAL.bulanan;

  // Laporan harian: bandingkan dengan awal hari kemarin
  const k = d.kemarin;
  const lap = ringkasEfek({ uang: d.uang - k.uang, ipk: Math.round((d.ipk - k.ipk) * 1000) / 1000 });
  if (lap) pesan.push(`📊 Laporan kemarin: ${lap}`);

  // Kamar makin berantakan & baju kotor menumpuk
  x = { ...x, kebersihan: Math.max(0, Math.round(x.kebersihan - KEH.kebersihanTurunPerHari * kosDari(x).efek.kebersihanTurun)), bajuKotor: x.bajuKotor + 1 };
  if (x.kebersihan < KEH.kebersihanKotor && d.kebersihan >= KEH.kebersihanKotor) pesan.push('🪳 Kamarmu mulai berantakan... ada kecoa lewat! Sapu dulu (di lemari).');
  if (x.bajuKotor >= KEH.bajuKotorBatas) {
    x = terapkan(x, { stres: KEH.stresBajuKotor });
    pesan.push(`😷 Baju bersih habis, terpaksa pakai yang bau... 😵+${KEH.stresBajuKotor}. Ke laundry yuk!`);
  }

  // Sakit: sembuh pelan-pelan; badan lemas bisa bikin masuk angin
  if (x.sakit > 0) {
    x = { ...x, sakit: x.sakit - 1 };
    if (x.sakit === 0) pesan.push('💪 Badan sudah enakan, kamu sembuh!');
  } else if (x.energi < 15 && x.vitaminHari !== d.hari && Math.random() < KEH.peluangSakitLemas) {
    x = tambahStat({ ...x, sakit: KEH.sakitHari }, 'sakit');
    pesan.push('🤒 Kecapekan, kamu masuk angin! Belajar & tidur kurang efektif. Minum obat atau ke klinik.');
  }

  if (x.tanggal > b.hariPerBulan) {
    // Tanggal 1: kiriman masuk. Kos ditagih Ibu Kos (event) sampai tanggal 5.
    const kirim = kirimanOrtu(x);
    x = { ...x, tanggal: 1, bulan: x.bulan + 1, uang: x.uang + kirim, kosLunas: false };
    if (kirim > 0) pesan.push(`💌 Kiriman ortu masuk ${formatRupiah(kirim)}! Jangan lupa bayar kos sebelum tanggal ${b.batasBayarKos}.`);
    // M12: tabung otomatis sebagian kiriman (opsi di HP → Bank)
    if (x.autoTabung && kirim > 0) {
      const t = Math.round((kirim * F4.ekonomi.autoTabung) / 1000) * 1000;
      x = { ...x, uang: x.uang - t, tabungan: x.tabungan + t };
      pesan.push(`🐷 Tabung otomatis ${formatRupiah(t)} dari kiriman.`);
    }
    // Bunga tabungan
    if (x.tabungan > 0) {
      const bunga = Math.round(x.tabungan * FITUR.tabungan.bungaPerBulan * pengaliJurusan(x, 'bungaTabungan'));
      if (bunga > 0) {
        x = { ...x, tabungan: x.tabungan + bunga };
        pesan.push(`🐷 Bunga tabungan bulan ini +${formatRupiah(bunga)}`);
      }
    }
    // Beasiswa yang didaftar lewat HP (KIP, Cendekia, dll.)
    x = cairBeasiswa(x, pesan);
    // Beasiswa prestasi
    if (x.ipk >= AKADEMIK.beasiswaIpk) {
      x = tambahStat({ ...x, uang: x.uang + AKADEMIK.beasiswaUang }, 'beasiswa');
      pesan.push(`🏆 Beasiswa prestasi cair ${formatRupiah(AKADEMIK.beasiswaUang)}! (IPK ≥ ${AKADEMIK.beasiswaIpk.toFixed(2)})`);
    }
    // Semester baru setiap 4 bulan → rapor
    if (bulanSemester(x.bulan) === 1) {
      const pr = predikatIpk(x.ipk);
      const rapor: RaporSemester = {
        semester: x.semester,
        ipk: x.ipk,
        selisih: Math.round((x.ipk - x.ipkAwalSemester) * 1000) / 1000,
        predikat: pr.nama,
        ikon: pr.ikon,
      };
      x = { ...x, rapor: [...x.rapor, rapor], semester: x.semester + 1, ipkAwalSemester: x.ipk, ujianSelesai: [] };
      pesan.push(`${pr.ikon} Semester ${rapor.semester} selesai! IPK ${x.ipk.toFixed(2)} — ${pr.nama}`);
      if (x.ipk >= AKADEMIK.predikat[0].min) {
        x = { ...x, uang: x.uang + AKADEMIK.cumLaudeHadiah };
        pesan.push(`🎁 Ortu bangga! Hadiah ${formatRupiah(AKADEMIK.cumLaudeHadiah)}`);
      }
    }
  }

  // Tidak ikut ujian sampai minggu ujian lewat → nilai kosong
  for (const u of AKADEMIK.ujian) {
    const kunci = `${u.id}-${x.semester}`;
    if (bulanSemester(x.bulan) === u.bulanSemester && x.tanggal === u.tanggalSelesai + 1 && !x.ujianSelesai.includes(kunci)) {
      x = terapkan({ ...x, ujianSelesai: [...x.ujianSelesai, kunci] }, { ipk: AKADEMIK.absenUjianIpk });
      pesan.push(`😱 Kamu tidak ikut ${u.nama}! Nilai kosong 🎓 ${AKADEMIK.absenUjianIpk}`);
    }
    if (bulanSemester(x.bulan) === u.bulanSemester && x.tanggal === u.tanggalMulai) {
      pesan.push(`📝 Minggu ${u.nama} dimulai (tgl ${u.tanggalMulai}–${u.tanggalSelesai})! Kuliah = ikut ujian. Sudah belajar belum?`);
    }
  }

  // Ulang tahun 🎂
  const ut = x.profil?.ultah;
  if (ut && ut.tanggal === x.tanggal && ut.bulan === bulanSemester(x.bulan)) {
    const u = KEH.ulangTahun;
    x = tambahStat(terapkan(x, { uang: u.uang, stres: u.stres }), 'ulangTahun');
    pesan.push(`🎂 Selamat ulang tahun, ${x.profil?.nama}! Ortu transfer ${formatRupiah(u.uang)} & anak kos bawa kue 🎉`);
  }

  // ===== M8: tagihan, UKM, endorse, kebaikan Bu Kos & Oyen =====
  const tg = F2.tagihan;
  if (x.tanggal === tg.tanggal) {
    // M12: listrik kini token prabayar (kWh = kW × jam), tagihan bulanan tinggal WiFi
    x = catatBelanja({ ...x, uang: x.uang - tg.wifi }, 'kamar', tg.wifi);
    pesan.push(`🧾 Tagihan WiFi ${formatRupiah(tg.wifi)} terpotong.`);
  }
  if (x.tanggal === 1 && d.tanggal !== 1) {
    if (x.ukm) {
      x = { ...x, uang: x.uang - F2.ukmIuran };
      pesan.push(`🎪 Iuran UKM bulan ini −${formatRupiah(F2.ukmIuran)}`);
    }
    const endorse = Math.floor(x.follower / 100) * F2.medsos.endorsePer100;
    if (endorse > 0) {
      x = { ...x, uang: x.uang + endorse };
      pesan.push(`📸 Uang endorse dari ${x.follower} follower: +${formatRupiah(endorse)}`);
    }
  }
  if (levelRelasi(x, 'buKos') >= 3 && Math.random() < 0.1) {
    x = terapkan(x, { energi: 15 });
    pesan.push('🍲 Bu Kos mengantar sarapan: "Buat anak kos kesayangan!" ⚡+15');
  }
  if (levelRelasi(x, 'oyen') >= 3 && Math.random() < 0.2) {
    x = { ...x, uang: x.uang + 5000 };
    pesan.push('🐱 Oyen meletakkan uang Rp5.000 di depan pintumu. Dari mana dia dapat?!');
  }
  x = { ...x, riwayatUang: [...x.riwayatUang, d.uang].slice(-30) };

  x = { ...x, kemarin: { uang: x.uang, ipk: x.ipk, energi: x.energi, stres: x.stres } };
  // Akrab dengan Bu Kos: batas bayar +3 hari (lv1), bebas denda (lv2)
  const lvBuKos = levelRelasi(x, 'buKos');
  if (x.tanggal === b.batasBayarKos + 1 + (lvBuKos >= 1 ? 3 : 0) && !x.kosLunas) {
    // Lewat batas → dipotong otomatis + denda
    const total = biayaKos(x) + (lvBuKos >= 2 ? 0 : b.dendaKos);
    x = { ...x, uang: x.uang - total, kosLunas: true };
    pesan.push(`😠 ${kosDari(x).pemilik} menagih langsung: kos + denda −${formatRupiah(total)}`);
  }
  if (x.tanggal === BAL.bulanan.tanggalTuaMulai) pesan.push('😱 Tanggal tua dimulai! Hemat-hemat ya...');
  // M11: sarapan dari kos & kabar dari pacar
  x = pagiM11(x, pesan);
  // M12: kebugaran, rival, deposito, paylater, tugas, lomba, cabai, gaji karier
  x = hariBaruM12(x, pesan);
  return x;
}

/**
 * Maju satu fase waktu. Mengurus bolos kuliah & stres pasif.
 * Opsi (dipakai mode online): `tidur` = tidak ada pesan "nggak tidur sampai pagi",
 * `absen` = sedang pulang kampung → tidak dihitung bolos & tanpa stres pasif.
 */
function majuSatuFase(d: SaveData, pesan: string[], opsi: { tidur?: boolean; absen?: boolean } = {}): SaveData {
  let x = d;
  if (!opsi.absen) {
    // Meninggalkan sesi kuliah tanpa hadir di hari kerja = bolos
    const sesi = x.fase;
    if ((sesi === 'pagi' || sesi === 'siang') && isHariKerja(x.hari) && !x.hadir[sesi] && !x.kuliahLibur) {
      x = catatBolos(tambahStat(terapkan(x, { ipk: BAL.bolos.ipk }), 'bolos'), sesi);
      pesan.push(`😬 Kamu bolos ${matkulJadwal(x, sesi)}! 🎓 ${BAL.bolos.ipk}`);
    }
    const stresPasif =
      efekPerabot(x, 'kipas', 'stresPerFase') + (x.kebersihan < KEH.kebersihanKotor ? KEH.stresKamarKotorPerFase : 0) + stresPasifKos(x);
    if (stresPasif) x = terapkan(x, { stres: stresPasif });
    // M12: kamar panas tanpa kipas & kurang minum
    const pasif = fasePasif(x, cuacaHari(x.hari).id === 'hujan');
    if (pasif.stres || pasif.energi) x = terapkan(x, pasif);
  }

  if (x.fase === 'begadang') {
    if (!opsi.tidur && !opsi.absen) pesan.push('🌅 Nggak tidur sampai pagi...');
    return hariBaru(x, pesan);
  }
  return { ...x, fase: URUTAN_FASE[URUTAN_FASE.indexOf(x.fase) + 1], porsiFase: 0 };
}

// ===== Jam real-time (1 detik nyata = 1 menit game) =====
// `menit` = menit dalam hari game, dihitung dari jam 05.00 (0) sampai 05.00 besok (1440).
// Fase tetap ada (pagi 05–11, siang 11–15, sore 15–18, malam 18–23, begadang 23–05) karena
// jam buka tempat, kuliah, event & bolos memakainya — tapi sekarang berganti mengikuti jam.
export const JAM = BAL.jam;

/** Nomor "slot fase" mutlak (hari 1 pagi = 0, siang = 1, ...): dipakai batas 1×/fase (elus kucing, posting). */
export const slotWaktu = (d: Pick<SaveData, 'hari' | 'fase'>) => (d.hari - 1) * 5 + URUTAN_FASE.indexOf(d.fase);
/** Menit mutlak sejak awal game (dipakai jam bersama online & sibuk-sampai). */
export const menitMutlak = (d: Pick<SaveData, 'hari' | 'menit'>) => (d.hari - 1) * 1440 + d.menit;
/** "07:35" dari menit hari. */
export function teksJam(menit: number): string {
  const total = (JAM.mulaiHariJam * 60 + Math.floor(menit)) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export type JenisSibuk = 'aksi' | 'tidur' | 'pulang';
/** Aksi memakan waktu: pemain "sibuk" selama `menit` menit game (waktu dipercepat jika semua pemain sibuk). */
export type Tunda = { menit: number; jenis: JenisSibuk };

/**
 * Majukan jam sebanyak `n` menit. Setiap melewati batas fase, aturan pergantian fase dijalankan
 * (bolos kuliah, stres pasif, porsi makan, hari baru). `jenis` = sedang tidur/pulang kampung?
 */
export function majuMenit(d: SaveData, n: number, jenis: JenisSibuk | null, laptop = false): { data: SaveData; pesan: string[]; gantiFase: number } {
  const pesan: string[] = [];
  let x = d;
  let sisa = Math.max(0, Math.floor(n));
  let gantiFase = 0;
  // M12: tubuh & rumah ikut berjalan (kantuk, kafein, hidrasi, listrik) — dihitung per potongan waktu
  const tubuh = (y: SaveData, menit: number) => {
    if (menit <= 0 || jenis === 'pulang') return y; // pulang kampung: tidak di kos
    const r = jalanWaktu(y, menit, { tidur: jenis === 'tidur', laptop, hujan: cuacaHari(y.hari).id === 'hujan' });
    pesan.push(...r.pesan);
    return r.data;
  };
  for (let i = 0; sisa > 0 && i < 400; i++) {
    const akhir = JAM.batasFase[x.fase];
    const ke = akhir - x.menit;
    if (sisa < ke) {
      x = tubuh({ ...x, menit: x.menit + sisa }, sisa);
      sisa = 0;
    } else {
      sisa -= Math.max(0, ke);
      x = tubuh(x, Math.max(0, ke));
      x = majuSatuFase({ ...x, menit: akhir }, pesan, { tidur: jenis === 'tidur', absen: jenis === 'pulang' });
      x = { ...x, menit: akhir % 1440 };
      gantiFase++;
    }
  }
  return { data: x, pesan, gantiFase };
}

/** Samakan waktu save dengan jam server (pemain yang lama tidak online): tanpa bolos/stres pasif. */
export function sinkronWaktu(d: SaveData, menitTarget: number): { data: SaveData; pesan: string[] } {
  const selisih = menitTarget - menitMutlak(d);
  if (selisih <= 0) return { data: d, pesan: [] };
  const r = majuMenit(d, Math.min(selisih, 1440 * 200), 'pulang');
  return { data: r.data, pesan: r.pesan };
}

/** Menit sampai jam `tujuan` (menit hari) berikutnya, dihitung dari `dari`. */
const menitSampai = (dari: number, tujuan: number) => (tujuan - dari + 1440) % 1440 || 1440;

/** Lama tidur (menit): sampai 06.00; tidur sangat larut → kesiangan 10.00 (kecuali punya weker → 07.00). */
function lamaTidur(d: SaveData): number {
  if (!isMalam(d.fase)) return JAM.tidurSiangMenit;
  const larut = d.menit >= JAM.tidurLarutMulai || d.menit < JAM.bangunPagi;
  const bangun = larut ? (d.tas.weker ? JAM.bangunWeker : JAM.bangunKesiangan) : JAM.bangunPagi;
  return menitSampai(d.menit, bangun);
}
/** Lama sebuah aksi berwaktu (menit). */
export const lamaAksi = (id: AksiId) => Math.round((AKSI[id].durasiJam ?? AKSI[id].majuFase * 2) * 60);

export type HasilAksi = { data: SaveData; pesan: string[]; transisi?: string; ditolak?: boolean; tunda?: Tunda; /** label sibuk (aksi non-AksiId, mis. kencan) */ label?: string };

export const TRANSISI_PULANG = '🚌 Pulang kampung dulu...';

/**
 * Stres penuh → pulang kampung sebentar.
 * Mode online: waktu tidak dilompati, pemain "sibuk pulang kampung" sampai Pagi berikutnya.
 */
function cekPulangKampung(
  x: SaveData,
  pesan: string[],
  online = false,
  sudahMaju = 0,
): { data: SaveData; transisi?: string; tunda?: Tunda } {
  if (x.stres < 100) return { data: x };
  const pk = { ...BAL.pulangKampung, ongkos: ongkosPulang(x) };
  x = tambahStat(x, 'pulangKampung');
  pesan.push(`🚌 Stres berat! Kamu pulang kampung sebentar (ongkos −${formatRupiah(pk.ongkos)})`);
  if (online) {
    // Pulang kampung sampai jam 07.00 besok (dihitung setelah aksi yang sedang dilakukan selesai)
    const y: SaveData = { ...x, stres: pk.stres, energi: pk.energi, uang: x.uang - pk.ongkos, lokasi: 'kamar' };
    const n = sudahMaju + menitSampai((x.menit + sudahMaju) % 1440, JAM.pulangKampungBangun);
    return { data: y, transisi: TRANSISI_PULANG, tunda: { menit: n, jenis: 'pulang' } };
  }
  let y = hariBaru(x, pesan);
  y = { ...y, stres: pk.stres, energi: pk.energi, uang: y.uang - pk.ongkos, lokasi: 'kamar' };
  return { data: y, transisi: TRANSISI_PULANG };
}

/** Apakah aksi ini memakan waktu (fase)? Dipakai mode online: hanya 1 aksi berwaktu per fase. */
export const pakaiWaktu = (id: AksiId) => AKSI[id].majuFase > 0 || AKSI[id].jenis === 'tidur' || AKSI[id].jenis === 'kerja';

/** Kategori statistik tambahan per aksi (untuk misi "belajar apa saja" / "santai apa saja"). */
const KATEGORI_STAT: Partial<Record<AksiId, string>> = {
  belajar: 'belajarApa',
  nugas: 'belajarApa',
  belajarPerpus: 'belajarApa',
  santaiTaman: 'santai',
  mainFutsal: 'santai',
  latihanGym: 'santai',
  tendangPenalti: 'santai',
  nongkrong: 'santai',
  mainGame: 'santai',
  mainGitar: 'santai',
  ngopiTepiKali: 'santai',
  mancing: 'santai',
  mainBolaKampung: 'santai',
};

/** Kategori pengeluaran sebuah aksi (laporan keuangan & anggaran). */
function kategoriBelanja(id: AksiId): KategoriBelanja {
  const j = AKSI[id].jenis;
  if (j === 'makan') return 'makan';
  if (id === 'naikAngkot' || id === 'isiBensin') return 'transport';
  if (j === 'santai' || id === 'mainGame' || id === 'naikKomidi' || id === 'nongkrong') return 'hiburan';
  return 'lainnya';
}

/** Efek "fitur kehidupan" sebuah aksi: statistik, mandi, sapu, laundry, ujian, kehujanan. */
function efekKhusus(d: SaveData, x0: SaveData, id: AksiId, pesan: string[]): SaveData {
  const a = AKSI[id];
  let x = tambahStat(x0, id);
  const kat = KATEGORI_STAT[id];
  if (kat) x = tambahStat(x, kat);
  if (a.jenis === 'makan') x = tambahStat(x, 'makan');
  if (a.jenis === 'belajar') x = { ...x, belajarLog: [...x.belajarLog.filter((h) => h > x.hari - 14), x.hari] };
  // M12: kurva lupa per mata kuliah, olahraga → kebugaran, catat pengeluaran
  const mk = matkulAksi(d, id);
  if (mk && !ujianAktif(d)) x = catatBelajar(x, mk, id === 'kuliah', pesan);
  if (OLAHRAGA.includes(id)) x = naikKebugaran(x);
  const keluar = -(efekAksi(d, id).uang ?? 0);
  if (keluar > 0) x = catatBelanja(x, kategoriBelanja(id), keluar, pesan);
  if (id === 'mandi') x = { ...x, mandiHari: x.hari };
  if (id === 'buangAir') {
    x = { ...x, toiletSlot: slotWaktu(x) };
    // Kamar mandi jongkok di kos murah: sering macet airnya / antre
    if (kosDari(x).toilet === 'jongkok' && Math.random() < F3.toilet.antreJongkokPeluang) {
      x = terapkan(x, { stres: F3.toilet.antreStres });
      pesan.push(`🪣 Airnya macet, harus nimba dulu... 😵+${F3.toilet.antreStres}`);
    }
  }
  if (id === 'bersihKamar') x = { ...x, kebersihan: 100 };
  if (id === 'laundry') x = { ...x, bajuKotor: 0 };
  // M12: sesi lomba dinilai dari keadaan SEBELUM aksi (stres & energi saat mulai mengerjakan)
  if (id === 'kerjakanLomba') x = { ...x, lomba: catatSesiLomba(d, pesan).lomba };
  if (id === 'periksa' && x.sakit > 0) {
    x = { ...x, sakit: 0 };
    pesan.push('💊 Dokter kasih obat — kamu langsung sembuh!');
  }
  if (id === 'elusKucing') x = { ...x, elusSlot: slotWaktu(x) };
  const ujian = id === 'kuliah' ? ujianAktif(d) : null;
  if (ujian) {
    x = tambahStat({ ...x, ujianSelesai: [...x.ujianSelesai, ujian.kunci] }, 'ujian');
    const s = persiapanUjian(d);
    pesan.push(`📝 ${ujian.nama} selesai! Persiapan ${Math.round(s * 100)}% → ${s >= 0.8 ? '😎 Lancar!' : s >= 0.4 ? '😅 Lumayan...' : '😵 Banyak yang kosong...'}`);
  }
  // Keluar kos saat hujan tanpa payung → kehujanan (bisa masuk angin)
  if (id === 'keluar' && cuacaHari(x.hari).id === 'hujan' && !x.tas.payung) {
    x = tambahStat(terapkan(x, { stres: KEH.stresKehujanan }), 'kehujanan');
    pesan.push(`🌧️ Hujan deras & kamu tidak bawa payung! Basah kuyup 😵+${KEH.stresKehujanan}`);
    if (x.sakit === 0 && x.vitaminHari !== x.hari && Math.random() < KEH.peluangSakitHujan) {
      x = tambahStat({ ...x, sakit: KEH.sakitHari }, 'sakit');
      pesan.push('🤧 Hatchiii! Kamu masuk angin...');
    }
  } else if (id === 'keluar' && cuacaHari(x.hari).id === 'hujan') pesan.push('☂️ Untung bawa payung!');

  // ===== M8 =====
  // SKS: tiap kuliah +1; ujian +4 jika persiapan cukup
  if (id === 'kuliah') {
    const tambah = ujian ? (persiapanUjian(d) >= 0.4 ? F2.sks.perUjian : 0) : F2.sks.perKuliah;
    x = { ...x, sks: Math.min(F2.sks.lulus + 20, x.sks + tambah) };
    if (x.sks >= F2.sks.skripsiMinSks && d.sks < F2.sks.skripsiMinSks) pesan.push(`📄 ${F2.sks.skripsiMinSks} SKS tercapai! Sekarang kamu boleh mulai skripsi (meja belajar).`);
  }
  if (id === 'nulisSkripsi' || id === 'bimbingan') {
    const dasar = id === 'nulisSkripsi' ? F2.skripsi.nulis.progres + levelSkill(d, 'pemrograman') * F2.skripsi.bonusSkillPerLevel : F2.skripsi.bimbingan.progres;
    const k = id === 'bimbingan' && levelRelasi(d, 'pakDosen') >= 2 ? F2.skripsi.pengaliDosenAkrab : 1;
    const naik = Math.round(dasar * k * (d.sakit > 0 ? KEH.sakitPengaliIpk : 1));
    x = tambahStat({ ...x, skripsi: Math.min(100, x.skripsi + naik) }, 'skripsiApa');
    pesan.push(`📄 Skripsi ${x.skripsi}% (+${naik}%)${x.skripsi >= 100 ? ' — selesai! Daftar sidang di kampus 🎓' : ''}`);
  }
  if (id === 'sidang') {
    x = tambahStat({ ...x, lulus: true, uang: x.uang + F2.wisuda.hadiahOrtu }, 'wisuda');
    pesan.push(`🎓 LULUS! Selamat, kamu resmi jadi Sarjana! Ortu kirim hadiah ${formatRupiah(F2.wisuda.hadiahOrtu)} 🎉`);
  }
  const npc = AKSI[id].npc;
  if (npc) {
    const n = id === 'kasihMakanOyen' ? F2.relasiMakanKucing : F2.relasiNgobrol;
    const lvLama = levelRelasi(x, npc);
    x = tambahStat({ ...x, relasi: { ...x.relasi, [npc]: Math.min(100, (x.relasi[npc] ?? 0) + n) }, ngobrolHari: { ...x.ngobrolHari, [npc]: x.hari } }, 'ngobrol');
    if (id === 'kasihMakanOyen') x = { ...x, tas: { ...x.tas, makananKucing: (x.tas.makananKucing ?? 1) - 1 } };
    const kalimat = (F2.dialog as Record<string, string[]>)[npc];
    if (kalimat) pesan.push(kalimat[Math.floor(Math.random() * kalimat.length)]);
    const lv = levelRelasi(x, npc);
    const def = F2.npc.find((p) => p.id === npc);
    if (def && lv > lvLama) pesan.push(`🤝 Pertemanan dengan ${def.nama} naik ke level ${lv}! Bonus: ${def.perk[lv - 1]}`);
  }
  if (id === 'rapatUKM' && x.ukm) {
    x = tambahStat(x, `ukm_${x.ukm}`);
    if (x.ukm === 'pers') x = { ...x, follower: x.follower + 30 };
  }
  if (id === 'kasihMakanIkan') x = { ...x, ikanHari: x.hari };
  if (id === 'siramTanaman') x = { ...x, siramHari: x.hari };
  if (id === 'isiBensin') x = { ...x, bensin: 100 };
  if (id === 'jogging' && hariMinggu(x.hari) === 6) pesan.push('🚴 Car Free Day! Jalanan ramai orang olahraga, makin semangat.');

  // ===== M13: area baru =====
  if (BATAS_AREA[id] !== undefined) x = catatHarian(x, id);
  if (id === 'ngopiTepiKali') {
    // Kopi = 1 porsi (aturan kenyang), kafein & hidrasi seperti kopi lain, dan tercatat untuk cerita
    x = tambahStat(efekKonsumsi({ ...x, porsiFase: x.porsiFase + 1 }, AREA.ngopiIdKonsumsi), 'makan_kopiKali');
  }
  if (id === 'mancing') {
    const h = undiMancing();
    x = tambahStat(tambahStat(terapkan(x, h.efek), `mancing_${h.id}`), 'mancingApa');
    pesan.push(`${h.teks}${ringkasEfek(h.efek) ? `   ${ringkasEfek(h.efek)}` : ''}`);
  }
  if (id === 'bantuPanen') {
    // Kerja ringan: dicatat sebagai kerja_sawah & uangKerja, TAPI bukan shift (kerjaHariTerakhir tidak diubah)
    x = tambahStat(tambahStat(x, AREA.panen.statKerja), 'uangKerja', efekAksi(d, id).uang ?? 0);
    pesan.push(AREA.panen.pesanSelesai);
  }
  return x;
}

export function jalankanAksi(d: SaveData, id: AksiId, online = false): HasilAksi {
  const cek = cekAksi(d, id);
  if (!cek.boleh) return { data: d, pesan: [cek.alasan ?? 'Tidak bisa sekarang'], ditolak: true };

  const a = AKSI[id];
  // "menu", "kerja" (mini-game) & "toko" (upgrade) dibuka oleh UI; "kendaraan" diurus store
  if (a.jenis === 'menu' || a.jenis === 'kendaraan' || a.jenis === 'kerja' || a.jenis === 'toko' || a.jenis === 'ojol' || a.jenis === 'barang') {
    return { data: d, pesan: [], ditolak: true };
  }

  const e = efekAksi(d, id);
  const ringkas = ringkasEfek(e);
  const pesan: string[] = [`${a.ikon} ${a.pesan}${ringkas ? `   ${ringkas}` : ''}`];
  let transisi = a.transisi;
  let x = terapkan(d, e);

  if (a.jenis === 'pindah' && a.tujuan) x = { ...x, lokasi: a.tujuan };
  if (id === 'kuliah' && (x.fase === 'pagi' || x.fase === 'siang')) x = { ...x, hadir: { ...x.hadir, [x.fase]: true } };
  if (a.jenis === 'belajar') x = { ...x, hariBelajar: x.hari }; // dicatat untuk kuis mendadak
  x = efekKhusus(d, x, id, pesan);
  if (a.jenis === 'makan') {
    x = { ...x, streakMi: a.menuId === 'mi_instan' ? x.streakMi + 1 : 0, porsiFase: x.porsiFase + 1 };
  }
  if (a.menuId === 'mi_instan' && d.streakMi >= BAL.miInstan.batasBeruntun) pesan.push('🤢 Perutmu protes, kebanyakan mi instan!');

  if (online) {
    // Mode online: efek sudah diterapkan, waktu maju nanti bersama teman-teman
    let tunda: Tunda | undefined;
    if (a.jenis === 'tidur') {
      // Tidur malam → bangun 06.00; tidur sangat larut (≥ 01.00) → kesiangan 10.00 (weker: 07.00); siang hari: 2 jam
      const lama = lamaTidur(d);
      tunda = { menit: lama, jenis: 'tidur' };
      const larut = isMalam(d.fase) && (d.menit >= JAM.tidurLarutMulai || d.menit < JAM.bangunPagi);
      if (larut && d.tas.weker) pesan.push('⏰ Weker disetel jam 07.00!');
      else if (larut) pesan.push('⏰ Tidur larut banget... bakal bangun kesiangan!');
      pesan.push(`😴 Tidur sampai jam ${teksJam((d.menit + lama) % 1440)}`);
    } else if (a.majuFase > 0) tunda = { menit: lamaAksi(id), jenis: 'aksi' };
    const pk = cekPulangKampung(x, pesan, true, tunda?.menit ?? 0);
    return { data: pk.data, pesan, transisi: pk.transisi ?? (a.jenis === 'tidur' ? undefined : transisi), tunda: pk.tunda ?? tunda };
  }

  if (a.jenis === 'tidur') {
    if (isMalam(d.fase)) {
      x = hariBaru(x, pesan);
      if (d.fase === 'begadang' && d.tas.weker) {
        pesan.push('⏰ Kriiing! Weker membangunkanmu tepat waktu (tapi masih ngantuk).');
      } else if (d.fase === 'begadang') {
        pesan.push('⏰ Bangun kesiangan!');
        x = majuSatuFase(x, pesan); // fase Pagi terlewat
      }
    } else {
      x = majuSatuFase(x, pesan);
      transisi = '😴 Tidur siang...';
    }
  } else {
    for (let i = 0; i < a.majuFase; i++) x = majuSatuFase(x, pesan);
  }

  const pk = cekPulangKampung(x, pesan);
  return { data: pk.data, pesan, transisi: pk.transisi ?? transisi };
}

// ===== Warung (warteg / warkop) =====
export const daftarMenu = (tempat: TempatMakan): readonly MenuItem[] => MENU[tempat];

/** Harga warteg naik saat tanggal tua. */
export function hargaMenu(d: SaveData, tempat: TempatMakan, item: MenuItem): number {
  const naik = tempat === 'warteg' && isTanggalTua(d.tanggal) ? menuJson.catatan.kenaikanHargaTanggalTua : 0;
  // Diskon langganan dari teman akrab (Mbak Sri di warteg, Bang Udin di warkop)
  const lvSri = levelRelasi(d, 'mbakSri');
  const diskon = tempat === 'warteg' ? (lvSri >= 2 ? 2000 : lvSri >= 1 ? 1000 : 0) : tempat === 'warkop' && levelRelasi(d, 'bangUdin') >= 1 ? 1000 : 0;
  // M12: inflasi (1+i)^(bulan−1), jam ramai, diskon tanggal muda — dibulatkan ke Rp500
  // ekonomi-semester (B1): harga makan ×1,2
  const k = pengaliInflasi(d.bulan) * pengaliHarga(d, tempat) * BAL.hargaMakan.pengali;
  return Math.max(1000, Math.round(((item.harga + naik - diskon) * k) / 500) * 500);
}

export function cekBeli(d: SaveData, tempat: TempatMakan, item: MenuItem): CekAksi {
  if (kenyang(d)) return { boleh: false, alasan: ALASAN_KENYANG };
  if (d.uang - hargaMenu(d, tempat, item) < BAL.batas.uangMin) return { boleh: false, alasan: '💸 Uangnya nggak cukup...' };
  return { boleh: true };
}

export function beliMakanan(d: SaveData, tempat: TempatMakan, itemId: string, online = false): HasilAksi {
  const item = MENU[tempat].find((m) => m.id === itemId);
  if (!item) return { data: d, pesan: ['Menu tidak ditemukan'], ditolak: true };
  const cek = cekBeli(d, tempat, item);
  if (!cek.boleh) return { data: d, pesan: [cek.alasan ?? 'Tidak bisa'], ditolak: true };

  const e: Efek = { ...item.efek, uang: -hargaMenu(d, tempat, item) };
  // `makan_<tempat>` dipakai tujuan cerita (mis. "makan di warteg")
  let x: SaveData = tambahStat(tambahStat({ ...terapkan(d, e), porsiFase: d.porsiFase + 1 }, 'makan'), `makan_${tempat}`);
  // M12: kopi → kafein, minuman → hidrasi; catat pengeluaran makan
  x = catatBelanja(efekKonsumsi(x, item.id), 'makan', -(e.uang ?? 0));
  if (tempat === 'warteg' || tempat === 'gerobak') x = { ...x, streakMi: 0 }; // makan bergizi → perut lega
  const pesan = [`${item.ikon} ${item.nama}   ${ringkasEfek(e)}`];
  const pk = cekPulangKampung(x, pesan, online);
  return { data: pk.data, pesan, transisi: pk.transisi, tunda: pk.tunda };
}

// ===== Kerja sambilan (mini-game meracik pesanan) =====
const AKSI_KERJA: Record<TempatKerja, AksiId> = { warteg: 'kerjaWarteg', warkop: 'kerjaWarkop' };

/** Daftar pesanan mini-game: diambil dari menu warung (resep = urutan bahan). */
export const pesananKerja = (tempat: TempatKerja): MenuItem[] =>
  KERJA[tempat].pesanan
    .map((id) => MENU[tempat].find((m) => m.id === id))
    .filter((m): m is MenuItem => !!m && m.resep.length > 0);

/** Hasil satu shift: pesanan benar, pelanggan kecewa (salah/kelamaan), dan total tip. */
export type HasilKerja = { benar: number; gagal: number; tips: number };

export type RincianGaji = { dasar: number; bonus: number; tips: number; total: number; efek: Efek; lemas: boolean };

/**
 * Hitung gaji & efek stat satu shift.
 * Gaji dasar dibayar sebanding jumlah pelanggan yang dilayani (berhenti di tengah = dibayar sebagian),
 * dan dipotong setengah saat lemas (energi < 20).
 */
export function hitungGaji(d: SaveData, tempat: TempatKerja, h: HasilKerja): RincianGaji {
  const k = KERJA[tempat];
  const dilayani = Math.min(k.jumlahPelanggan, h.benar + h.gagal);
  const lemas = d.energi < BAL.ambang.energiLemas;
  // M12: pengalaman kerja menaikkan gaji secara logaritmik 1 + a·log₂(1 + n/b)
  const pengali = (lemas ? kerjaJson.pengaliGajiSaatLemas : 1) * pengaliJurusan(d, 'gajiKerja') * pengaliPengalaman(d.stat.kerja ?? 0);
  const dasar = Math.round((k.gajiDasar * pengali * dilayani) / k.jumlahPelanggan / 500) * 500;
  const bonus = Math.round((h.benar * k.bayarPerPesanan * pengaliJurusan(d, 'gajiKerja')) / 100) * 100;
  const tips = Math.max(0, Math.round(h.tips));
  // Bos akrab (pertemanan lv3) → bonus Rp5.000
  const akrab = levelRelasi(d, tempat === 'warteg' ? 'mbakSri' : 'bangUdin') >= 3 && h.benar > 0 ? 5000 : 0;
  const total = dasar + bonus + tips + akrab;
  const efekDasar = AKSI[AKSI_KERJA[tempat]].efek;
  let stres = (efekDasar.stres ?? 0) + h.gagal * k.stresPerGagal;
  if (h.gagal === 0 && h.benar > 0) stres += k.stresSempurna; // shift sempurna → puas
  return { dasar, bonus, tips, total, lemas, efek: { uang: total, energi: efekDasar.energi ?? 0, stres } };
}

/** Terapkan hasil shift: uang masuk, energi/stres berubah, waktu maju 1 fase. */
export function selesaiKerja(d: SaveData, tempat: TempatKerja, h: HasilKerja, online = false): HasilAksi {
  const id = AKSI_KERJA[tempat];
  const cek = cekAksi(d, id);
  if (!cek.boleh) return { data: d, pesan: [cek.alasan ?? 'Tidak bisa kerja sekarang'], ditolak: true };
  const a = AKSI[id];
  const r = hitungGaji(d, tempat, h);
  const pesan = [`${a.ikon} ${a.pesan} ✅${h.benar} ❌${h.gagal}   ${ringkasEfek(r.efek)}`];
  if (r.lemas) pesan.push('😮‍💨 Kerja sambil lemas, gaji dasar dipotong setengah.');
  let x = tambahStat(tambahStat({ ...terapkan(d, r.efek), kerjaHariTerakhir: d.hari }, 'kerja'), 'uangKerja', r.total);
  x = tambahStat(x, `kerja_${tempat}`); // dipakai tujuan cerita (mis. Bab 4 "kerja di warkop")
  if (h.gagal === 0 && h.benar > 0) x = tambahStat(x, 'shiftSempurna');
  if (online) {
    const pk = cekPulangKampung(x, pesan, true, lamaAksi(id));
    return { data: pk.data, pesan, transisi: pk.transisi, tunda: pk.tunda ?? { menit: lamaAksi(id), jenis: 'aksi' } };
  }
  for (let i = 0; i < a.majuFase; i++) x = majuSatuFase(x, pesan);
  const pk = cekPulangKampung(x, pesan);
  return { data: pk.data, pesan, transisi: pk.transisi ?? a.transisi };
}

// ===== Ojol (antar penumpang/paket pakai motor) =====
/** Selesai narik ojol: uang dari order yang berhasil, energi/stres dari aksi, 1 fase. */
export function selesaiOjol(d: SaveData, total: number, selesai: number, online = false): HasilAksi {
  const a = AKSI.narikOjol;
  const efek: Efek = { ...a.efek, uang: total };
  const pesan = [`${a.ikon} ${a.pesan}: ${selesai} order ✅   ${ringkasEfek(efek)}`];
  let x = tambahStat(tambahStat(terapkan(d, efek), 'ojol', selesai), 'uangKerja', total);
  if (online) {
    const pk = cekPulangKampung(x, pesan, true, lamaAksi('narikOjol'));
    return { data: pk.data, pesan, transisi: pk.transisi, tunda: pk.tunda ?? { menit: lamaAksi('narikOjol'), jenis: 'aksi' } };
  }
  for (let i = 0; i < a.majuFase; i++) x = majuSatuFase(x, pesan);
  const pk = cekPulangKampung(x, pesan);
  return { data: pk.data, pesan, transisi: pk.transisi ?? '🛵 Pulang narik...' };
}

// ===== Event random =====
export type PilihanEvent = {
  label: string;
  efek: Efek;
  hasil: string;
  bayarKos?: boolean;
  liburKuliah?: boolean;
  kuis?: boolean;
  /** Tambahan follower medsos */
  follower?: number;
  /** Cerita utama: pilihan ke-`pilihan` dari dialog `dialog` (diproses cerita.ts setelah efek) */
  cerita?: { dialog: string; pilihan: number };
  /** Pilihan dikunci + alasannya (mis. relasi belum cukup) — tampil abu-abu */
  terkunci?: string;
};
export type EventDef = {
  id: string;
  ikon: string;
  judul: string;
  teks: string;
  syarat: {
    tanggalMin?: number;
    tanggalMax?: number;
    fase?: string[];
    hariKerja?: boolean;
    kosBelumLunas?: boolean;
    /** M11: hanya di kos tertentu / kos berhantu / kos bebas, saat punya pacar, saat di kamar */
    kos?: string[];
    berhantu?: boolean;
    kosBebas?: boolean;
    punyaPacar?: boolean;
    diKamar?: boolean;
  };
  peluang: number;
  pilihan: PilihanEvent[];
};
export const EVENTS = eventsJson as EventDef[];

function syaratEvent(d: SaveData, ev: EventDef): boolean {
  const s = ev.syarat;
  if (s.tanggalMin !== undefined && d.tanggal < s.tanggalMin) return false;
  if (s.tanggalMax !== undefined && d.tanggal > s.tanggalMax) return false;
  if (s.fase && !s.fase.includes(d.fase)) return false;
  if (s.hariKerja && !isHariKerja(d.hari)) return false;
  if (s.kosBelumLunas && d.kosLunas) return false;
  const kos = kosDari(d);
  if (s.kos && !s.kos.includes(kos.id)) return false;
  if (s.berhantu && !kos.berhantu) return false;
  if (s.kosBebas && !kos.bebas) return false;
  if (s.punyaPacar && !d.pacar) return false;
  if (s.diKamar && d.lokasi !== 'kamar') return false;
  return true;
}

/**
 * Dipanggil setiap waktu maju satu fase. Maks 1 event per fase & `maksPerHari` per hari,
 * agar kejadian terasa spesial (tidak membanjiri pemain).
 * `acak` disuntikkan agar bisa diuji (default Math.random).
 */
export function pilihEvent(d: SaveData, acak: () => number = Math.random): EventDef | null {
  const jumlahHariIni = d.eventHari.hari === d.hari ? d.eventHari.jumlah : 0;
  if (jumlahHariIni >= BAL.event.maksPerHari) return null;
  // Urutan diacak agar event berpeluang besar tidak selalu menang
  // Event yang sama tidak terulang dalam `jedaHariSama` hari
  const calon = EVENTS.filter((ev) => syaratEvent(d, ev) && !(d.hari - (d.eventTerakhir[ev.id] ?? -999) < BAL.event.jedaHariSama))
    .map((ev) => ({ ev, k: acak() }))
    .sort((a, b) => a.k - b.k);
  for (const { ev } of calon) if (acak() < ev.peluang) return ev;
  return null;
}

/** Catat bahwa satu event muncul hari ini (+ hari terakhir event itu muncul, untuk jeda pengulangan). */
export const catatEvent = (d: SaveData, idEvent?: string): SaveData => ({
  ...d,
  eventHari: { hari: d.hari, jumlah: (d.eventHari.hari === d.hari ? d.eventHari.jumlah : 0) + 1 },
  eventTerakhir: idEvent ? { ...d.eventTerakhir, [idEvent]: d.hari } : d.eventTerakhir,
});

/** Efek akhir sebuah pilihan (kuis dihitung dari rajin belajar 2 hari terakhir). */
export function efekPilihan(d: SaveData, p: PilihanEvent): { efek: Efek; hasil: string } {
  if (p.kuis) {
    const rajin = d.hari - d.hariBelajar <= BAL.kuis.rajinDalamHari && d.hariBelajar > 0;
    return rajin
      ? { efek: BAL.kuis.lulus, hasil: '😎 Soalnya pernah dipelajari! Lancar jaya.' }
      : { efek: BAL.kuis.gagal, hasil: '😵 Blank total... nulis nama doang.' };
  }
  if (p.bayarKos) {
    // Harga sesuai kos yang ditempati; patungan jika sekamar / tinggal bareng
    const patungan = d.kamarBerdua || d.tinggalBareng;
    return { efek: { ...p.efek, uang: -biayaKos(d) }, hasil: `${p.hasil.replace('Ibu Kos', kosDari(d).pemilik)}${patungan ? ' (patungan)' : ''}` };
  }
  // ekonomi-semester A1: hadiah IPK dari event juga makin kecil dekat 4,0
  if ((p.efek.ipk ?? 0) > 0) return { efek: { ...p.efek, ipk: Math.round((p.efek.ipk ?? 0) * pengaliIpkAtas(d.ipk) * 1000) / 1000 }, hasil: p.hasil };
  return { efek: p.efek, hasil: p.hasil };
}

export function cekPilihan(d: SaveData, p: PilihanEvent): CekAksi {
  if (p.terkunci) return { boleh: false, alasan: p.terkunci };
  const u = efekPilihan(d, p).efek.uang ?? 0;
  if (u < 0 && d.uang + u < BAL.batas.uangMin) return { boleh: false, alasan: '💸 Uangnya nggak cukup...' };
  return { boleh: true };
}

export function jalankanPilihan(d: SaveData, p: PilihanEvent, online = false): HasilAksi {
  const cek = cekPilihan(d, p);
  if (!cek.boleh) return { data: d, pesan: [cek.alasan ?? 'Tidak bisa'], ditolak: true };
  const { efek, hasil } = efekPilihan(d, p);
  let x = terapkan(d, efek);
  if (p.bayarKos) x = { ...x, kosLunas: true };
  if (p.liburKuliah) x = { ...x, kuliahLibur: true };
  if (p.follower) x = { ...x, follower: x.follower + p.follower };
  const baris = [hasil, ringkasEfek(efek)].filter(Boolean).join('   ');
  const pesan = baris ? [baris] : [];
  const pk = cekPulangKampung(x, pesan, online); // bisa menambah pesan "pulang kampung"
  return { data: pk.data, pesan, transisi: pk.transisi, tunda: pk.tunda };
}

// ===== Bonus aktivitas bareng (online) =====
export type KategoriBareng = keyof typeof BAL.online.bareng;
export const KATEGORI_BARENG = Object.keys(BAL.online.bareng) as KategoriBareng[];

/** Kategori bareng sebuah aksi (belajar/nongkrong/tidur), atau null. */
export function kategoriBareng(id: AksiId): KategoriBareng | null {
  for (const k of KATEGORI_BARENG) if ((BAL.online.bareng[k].aksi as string[]).includes(id)) return k;
  return null;
}

export function terapkanBonusBareng(d: SaveData, k: KategoriBareng): { data: SaveData; pesan: string } {
  const b = BAL.online.bareng[k];
  const e = b.efek as Efek;
  return { data: terapkan(d, e), pesan: `${b.pesan}   ${ringkasEfek(e)}` };
}

/** Transfer uang ke teman (traktir). Tidak boleh sampai minus. */
export function cekTraktir(d: SaveData, jumlah: number): CekAksi {
  if (jumlah <= 0) return { boleh: false, alasan: 'Jumlah tidak valid' };
  if (d.uang - jumlah < 0) return { boleh: false, alasan: '💸 Uangmu sendiri nggak cukup...' };
  return { boleh: true };
}
export const ubahUang = (d: SaveData, delta: number): SaveData => terapkan(d, { uang: delta });

// ===== Upgrade kamar =====
export type InfoUpgrade = { def: UpgradeDef; sekarang: LevelDef; berikut: LevelDef | null };

export function infoUpgrade(d: SaveData): InfoUpgrade[] {
  return UPGRADES.map((def) => {
    const sekarang = def.levels.find((l) => l.level === d.level[def.id]) ?? def.levels[0];
    const berikut = def.levels.find((l) => l.level === sekarang.level + 1) ?? null;
    return { def, sekarang, berikut };
  });
}

export function cekUpgrade(d: SaveData, id: PerabotId): CekAksi {
  const info = infoUpgrade(d).find((i) => i.def.id === id);
  if (!info?.berikut) return { boleh: false, alasan: '✨ Sudah level maksimal!' };
  const batas = BAL.upgrade.bolehUtang ? BAL.batas.uangMin : 0;
  if (d.uang - info.berikut.harga < batas) return { boleh: false, alasan: '💸 Uangnya belum cukup. Kerja sambilan dulu yuk!' };
  return { boleh: true };
}

export function beliUpgrade(d: SaveData, id: PerabotId): HasilAksi {
  const cek = cekUpgrade(d, id);
  const info = infoUpgrade(d).find((i) => i.def.id === id);
  if (!cek.boleh || !info?.berikut) return { data: d, pesan: [cek.alasan ?? 'Tidak bisa'], ditolak: true };
  const b = info.berikut;
  const x: SaveData = { ...d, uang: d.uang - b.harga, level: { ...d.level, [id]: b.level } };
  return { data: x, pesan: [`✨ ${info.def.ikon} ${b.label} terpasang!  💰 −${formatRupiah(b.harga)}`, `👉 ${b.deskripsi}`] };
}
