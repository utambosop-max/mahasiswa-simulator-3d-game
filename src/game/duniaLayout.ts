// Tata letak dunia "Kampung Mahasiswa": jalan, bangunan, pohon, lampu, NPC & kotak tabrakan.
// Satu sumber data dipakai bersama oleh dunia 3D, minimap, interaksi, dan sistem tabrakan.
import { boxAt, type AABB } from './collision';
import type { AksiId } from './sim';
import f4 from '../data/fitur4.json';

/**
 * Dunia 168 x 124 meter, pusat (0,0). Jaringan jalan 3 x 3 yang diteruskan sampai tepi peta.
 * Rombak dunia (M13): kota lama (± 120 x 84 m) dikelilingi area baru — sungai & jembatan (utara),
 * sawah & kebun (timur), gang kos-kosan (barat), pasar kaget & lapangan kampung (selatan).
 */
export const DUNIA = {
  halfW: 84,
  halfD: 62,
  jalan: 2, // setengah lebar jalan
  trotoar: 1.2,
  /** Posisi z jalan horizontal (timur-barat) */
  jalanH: [-26, 0, 26] as const,
  /** Posisi x jalan vertikal (utara-selatan) */
  jalanV: [-32, 0, 32] as const,
} as const;

/** Lebar pita jalan + trotoar dari garis tengah jalan. */
export const PITA_JALAN = DUNIA.jalan + DUNIA.trotoar;

export type Hadap = '+z' | '-z' | '+x' | '-x';
export type JenisBangunan = 'kos' | 'kampus' | 'warteg' | 'warkop' | 'rumah' | 'toko';

export type Bangunan = {
  id: string;
  jenis: JenisBangunan;
  x: number;
  z: number;
  /** Ukuran di dunia: w = sumbu X, d = sumbu Z */
  w: number;
  d: number;
  /** Arah bagian depan (menghadap jalan) */
  hadap: Hadap;
  /** Tonjolan depan (teras/etalase/pilar) dalam meter */
  depan: number;
  /** Tinggi total (untuk cek kamera tembus pandang) */
  tinggi: number;
  warna: string;
  atap: string;
  nama: string;
  ikon: string;
  /** Keterangan singkat untuk legenda peta */
  ket?: string;
  aksi?: AksiId[];
  // --- Gaya khusus bangunan "toko" ---
  papan?: string;
  aksen?: string;
  kanopi?: boolean;
  lantai?: 1 | 2;
  atapLimas?: boolean;
};

export const BANGUNAN: readonly Bangunan[] = [
  // ===== Pusat (dari Milestone 3) =====
  { id: 'kos', jenis: 'kos', x: -12, z: -10, w: 9, d: 8, hadap: '+z', depan: 0.6, tinggi: 7, warna: '#fde8c8', atap: '#e98a6b', nama: 'Kos Melati', ikon: '🏠', ket: 'Kamarmu: tidur, belajar, masak mi', aksi: ['masukKos', 'ngobrolBuKos'] },
  { id: 'kampus', jenis: 'kampus', x: 16, z: -13, w: 18, d: 12, hadap: '+z', depan: 1.9, tinggi: 10.5, warna: '#f4e1c1', atap: '#7fb3e0', nama: 'Kampus', ikon: '🏫', ket: 'Kuliah Pagi & Siang (Sen–Jum)', aksi: ['kuliah', 'ngobrolDosen', 'bimbingan', 'sidang', 'rapatUKM'] },
  { id: 'warteg', jenis: 'warteg', x: -12, z: 8.5, w: 8, d: 6, hadap: '-z', depan: 1.0, tinggi: 4.9, warna: '#fff6e5', atap: '#e98a6b', nama: 'Warteg Barokah', ikon: '🍛', ket: 'Makan (Pagi–Malam) · Kerja (Pagi–Sore)', aksi: ['makanWarteg', 'kerjaWarteg', 'ngobrolSri'] },
  { id: 'warkop', jenis: 'warkop', x: 10, z: 8, w: 7, d: 5, hadap: '-z', depan: 0.7, tinggi: 4.1, warna: '#c48d55', atap: '#9aa3ad', nama: 'Warkop Begadang', ikon: '☕', ket: 'Ngopi 24 jam · Kerja (Sore–Begadang)', aksi: ['ngopi', 'nongkrong', 'kerjaWarkop', 'ngobrolUdin'] },

  // ===== Tempat baru =====
  { id: 'minimarket', jenis: 'toko', x: -46, z: -10, w: 10, d: 8, hadap: '+z', depan: 0.4, tinggi: 4.8, warna: '#fff6e5', atap: '#e9605a', aksen: '#e9605a', papan: 'TOKO SERBA ADA 24', nama: 'Toko Serba Ada 24', ikon: '🏪', ket: 'Jajan roti, susu, es krim (24 jam)', aksi: ['belanja', 'belanjaBarang'] },
  { id: 'perpus', jenis: 'toko', x: 47, z: -12, w: 14, d: 10, hadap: '+z', depan: 0.4, tinggi: 8.6, warna: '#ece0cc', atap: '#a86b3c', aksen: '#7fb3e0', papan: 'PERPUSTAKAAN', lantai: 2, atapLimas: true, nama: 'Perpustakaan', ikon: '📚', ket: 'Belajar fokus (Pagi–Sore)', aksi: ['belajarPerpus', 'lesPrivat'] },
  { id: 'klinik', jenis: 'toko', x: -46, z: 10, w: 10, d: 8, hadap: '-z', depan: 0.4, tinggi: 4.8, warna: '#ffffff', atap: '#5cc8a8', aksen: '#5cc8a8', papan: '✚ KLINIK SEHAT', nama: 'Klinik Sehat', ikon: '🏥', ket: 'Periksa: energi naik, stres turun', aksi: ['periksa'] },
  { id: 'warnet', jenis: 'toko', x: -16, z: -36, w: 10, d: 7, hadap: '+z', depan: 0.4, tinggi: 4.8, warna: '#6f7fb8', atap: '#3b4673', aksen: '#ffb36b', papan: 'WARNET GAMING', nama: 'Warnet Gaming', ikon: '🎮', ket: 'Main game: stres turun (24 jam)', aksi: ['mainGame'] },
  { id: 'fotokopi', jenis: 'toko', x: 10, z: -36, w: 8, d: 6, hadap: '+z', depan: 0.4, tinggi: 4.8, warna: '#fff1c4', atap: '#7cc6a4', aksen: '#7cc6a4', papan: 'FOTOKOPI & PRINT', kanopi: true, nama: 'Fotokopi & Print', ikon: '🖨️', ket: 'Print tugas biar lega', aksi: ['printTugas'] },
  { id: 'laundry', jenis: 'toko', x: 22, z: -36, w: 8, d: 6, hadap: '+z', depan: 0.4, tinggi: 4.8, warna: '#dff1ff', atap: '#7fb3e0', aksen: '#7fb3e0', papan: 'LAUNDRY KILOAN', kanopi: true, nama: 'Laundry Kiloan', ikon: '🧺', ket: 'Cuci baju, hati tenang', aksi: ['laundry'] },
  // M11: kafe untuk WFH & nugas (masuk ke dalam untuk duduk di meja kerja)
  { id: 'kafe', jenis: 'toko', x: 5, z: 35, w: 9, d: 7, hadap: '-z', depan: 0.4, tinggi: 5.2, warna: '#f6e7d4', atap: '#6b4430', aksen: '#a86b3c', papan: 'KAFE RUANG KERJA', kanopi: true, nama: 'Kafe Ruang Kerja', ikon: '💻', ket: 'WFH, nugas & ngopi cantik (Pagi–Malam)', aksi: ['makanKafe'] },

  // ===== M12: 7 gedung baru (posisi dicek: tidak menimpa bangunan, pita jalan, tiang lampu) =====
  { id: 'bank', jenis: 'toko', x: -20, z: -18.8, w: 9, d: 4.6, hadap: '-z', depan: 0.4, tinggi: 5.6, warna: '#fff8e6', atap: '#b8892e', aksen: '#e9b949', papan: 'BANK MAHASISWA', nama: 'Bank Mahasiswa', ikon: '🏦', ket: 'Deposito, emas, paylater (Pagi–Sore)', aksi: ['bukaBank'] },
  { id: 'gor', jenis: 'toko', x: 40, z: 35.5, w: 8, d: 9, hadap: '-z', depan: 0.4, tinggi: 7.5, warna: '#ffe9dc', atap: '#c95a3c', aksen: '#ff7a59', papan: 'GOR SERBAGUNA', lantai: 2, nama: 'GOR Serbaguna', ikon: '🏟️', ket: 'Gym & adu penalti (Pagi–Malam)', aksi: ['latihanGym', 'tendangPenalti'] },
  { id: 'karier', jenis: 'toko', x: 39.5, z: -35.5, w: 7, d: 6, hadap: '+z', depan: 0.4, tinggi: 7.2, warna: '#f1eafb', atap: '#6c55a8', aksen: '#9b7fd1', papan: 'PUSAT KARIER', lantai: 2, atapLimas: true, nama: 'Pusat Karier & Kemahasiswaan', ikon: '🎓', ket: 'Daftar lomba, KHS, lowongan kerja', aksi: ['bukaKarier'] },
  { id: 'tani', jenis: 'toko', x: 13.5, z: 35.5, w: 5, d: 6, hadap: '-z', depan: 0.4, tinggi: 4.5, warna: '#effae6', atap: '#4f9a45', aksen: '#6cbf5a', papan: 'TANI & AIR', kanopi: true, nama: 'Toko Tani & Depot Air', ikon: '🌱', ket: 'Galon, bibit cabai, token listrik', aksi: ['bukaTokoTani'] },
  { id: 'pasar', jenis: 'toko', x: -23, z: 18.2, w: 9, d: 5.6, hadap: '+z', depan: 0.4, tinggi: 4.6, warna: '#fff0dc', atap: '#a5532a', aksen: '#c46a3a', papan: 'PASAR PAGI', kanopi: true, nama: 'Pasar Pagi', ikon: '🥬', ket: 'Jajanan pasar murah (Pagi–Siang)', aksi: ['makanPasar'] },
  { id: 'salon', jenis: 'toko', x: -39.5, z: -35.5, w: 7, d: 6, hadap: '+z', depan: 0.4, tinggi: 4.6, warna: '#fff0f6', atap: '#d0648f', aksen: '#ff9ac1', papan: 'PANGKAS RAMBUT', kanopi: true, nama: 'Pangkas Rambut Bang Cukur', ikon: '💈', ket: 'Ganti gaya & warna rambut', aksi: ['potongRambut'] },
  { id: 'polisi', jenis: 'toko', x: -40, z: 18.2, w: 7, d: 5.6, hadap: '+z', depan: 0.4, tinggi: 4.8, warna: '#eef2fb', atap: '#2f467a', aksen: '#3d5a99', papan: 'POS POLISI', nama: 'Pos Polisi', ikon: '👮', ket: 'Bikin SIM & info tilang (24 jam)', aksi: ['bukaPosPolisi'] },

  // ===== Rumah warga =====
  { id: 'rumah1', jenis: 'rumah', x: -24, z: -11, w: 6, d: 6, hadap: '+z', depan: 0, tinggi: 4.5, warna: '#ffd6a5', atap: '#e98a6b', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah2', jenis: 'rumah', x: -25, z: 10, w: 6, d: 6, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#caffbf', atap: '#7fb3e0', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah3', jenis: 'rumah', x: 7, z: 16, w: 6, d: 6, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#bdb2ff', atap: '#e98a6b', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah4', jenis: 'rumah', x: -12, z: 17.5, w: 6, d: 5, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#a0c4ff', atap: '#ffb36b', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah5', jenis: 'rumah', x: -20, z: 36, w: 6, d: 6, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#ffd6a5', atap: '#7cc6a4', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah6', jenis: 'rumah', x: -9, z: 36, w: 6, d: 5, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#fff1c4', atap: '#e98a6b', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah7', jenis: 'rumah', x: 20, z: 36, w: 6, d: 6, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#caffbf', atap: '#a86b3c', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah8', jenis: 'rumah', x: -48, z: -36, w: 6, d: 6, hadap: '+z', depan: 0, tinggi: 4.5, warna: '#bdb2ff', atap: '#ffb36b', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah9', jenis: 'rumah', x: 48, z: -36, w: 7, d: 6, hadap: '+z', depan: 0, tinggi: 4.5, warna: '#ffd6a5', atap: '#7fb3e0', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah10', jenis: 'rumah', x: -48, z: 36, w: 6, d: 6, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#a0c4ff', atap: '#e98a6b', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah11', jenis: 'rumah', x: 48, z: 36, w: 6, d: 6, hadap: '-z', depan: 0, tinggi: 4.5, warna: '#fff1c4', atap: '#7cc6a4', nama: 'Rumah Warga', ikon: '' },
  { id: 'rumah12', jenis: 'rumah', x: -50, z: 20, w: 6, d: 5, hadap: '+z', depan: 0, tinggi: 4.5, warna: '#ffd6a5', atap: '#a86b3c', nama: 'Rumah Warga', ikon: '' },
];

// ===== Helper arah =====
export const rotasiHadap = (h: Hadap): number => ({ '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 })[h];
const vektorHadap = (h: Hadap): [number, number] => ({ '+z': [0, 1], '-z': [0, -1], '+x': [1, 0], '-x': [-1, 0] })[h] as [number, number];

/** Ukuran lokal (lebar muka depan, kedalaman) untuk komponen 3D yang "menghadap +z". */
export function ukuranLokal(b: Bangunan): { w: number; d: number } {
  return b.hadap === '+x' || b.hadap === '-x' ? { w: b.d, d: b.w } : { w: b.w, d: b.d };
}

export function kotakBangunan(b: Bangunan): AABB {
  const k = { minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 };
  if (b.hadap === '+z') k.maxZ += b.depan;
  if (b.hadap === '-z') k.minZ -= b.depan;
  if (b.hadap === '+x') k.maxX += b.depan;
  if (b.hadap === '-x') k.minX -= b.depan;
  return k;
}

/** Titik di depan bangunan, `jarak` meter dari muka terdepan. */
export function titikDepan(b: Bangunan, jarak: number): [number, number] {
  const [vx, vz] = vektorHadap(b.hadap);
  const setengah = (vx !== 0 ? b.w : b.d) / 2 + b.depan + jarak;
  return [b.x + vx * setengah, b.z + vz * setengah];
}

// ===== Area khusus =====
export const TAMAN = {
  minX: 16,
  maxX: 28,
  minZ: 6,
  maxZ: 20,
  kolam: { x: 24, z: 15, r: 1.8 },
  bangku: { x: 22, z: 10 },
} as const;

export const LAPANGAN = { x: 47, z: 13, w: 20, d: 13 } as const;

export type Halte = { id: 'halteBarat' | 'halteTimur'; x: number; z: number; hadap: Hadap; nama: string };
export const HALTE: readonly Halte[] = [
  { id: 'halteBarat', x: -24, z: -4.4, hadap: '+z', nama: 'Halte Barat' },
  { id: 'halteTimur', x: 48, z: 4.4, hadap: '-z', nama: 'Halte Timur' },
];

export const GEROBAK = { x: 8, z: 21.4, hadap: '+z' as Hadap } as const;

/** Meja-kursi luar warkop. */
export const KURSI_WARKOP = { x: 15.2, z: 7 } as const;
/** Motor hiasan yang diparkir [x, z, rotasiY]. */
export const MOTOR: readonly [number, number, number][] = [
  [-6.6, 6.6, -0.3],
  [5.4, 6.2, 1.2],
  [-39.5, -4.8, 0.2],
  [-9.5, -31.0, -0.5],
];
/** Tempat parkir motor milik pemain (di depan kos). */
export const PARKIR_MOTOR = { x: -8.6, z: -4.6, rotY: 0.4 } as const;
/** Oyen si kucing kos: rebahan di depan kos, sebelah kiri pintu */
export const KUCING = { x: -15.6, z: -5.0 } as const;
/** Kios bensin eceran + bengkel kecil Pak Jo (di samping kos) */
export const PERTAMINI = { x: -6.0, z: -5.8 } as const;
/** Tiang bendera kampus. */
export const BENDERA = { x: 8.5, z: -5.2 } as const;

/**
 * M12: tiang lampu lalu lintas — 4 per perempatan, di pojok KIRI arus yang datang (lajur kiri, Indonesia).
 * `sumbu` = arus yang dilayani ('x' jalan horizontal, 'z' jalan vertikal), kepala lampu menghadap arus itu.
 */
export type TiangLalin = { x: number; z: number; rotY: number; sumbu: 'x' | 'z' };
const POJOK_LALIN = DUNIA.jalan + 0.7;
export const TIANG_LALIN: readonly TiangLalin[] = (f4.lalin.simpang as [number, number][]).flatMap(([sx, sz]): TiangLalin[] => {
  const c = POJOK_LALIN;
  return [
    { x: sx - c, z: sz - c, rotY: -Math.PI / 2, sumbu: 'x' }, // arus +x (datang dari barat)
    { x: sx + c, z: sz + c, rotY: Math.PI / 2, sumbu: 'x' }, // arus −x (datang dari timur)
    { x: sx + c, z: sz - c, rotY: Math.PI, sumbu: 'z' }, // arus +z (datang dari utara)
    { x: sx - c, z: sz + c, rotY: 0, sumbu: 'z' }, // arus −z (datang dari selatan)
  ];
});

/** Titik muncul saat keluar dari kos (di depan pintu kos, menghadap jalan). */
export const SPAWN_DUNIA = { x: -12, z: -4.3, rotY: 0 } as const;

// ===== Pembangkit acak tetap (hasil sama tiap kali dimuat) =====
function acak(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const diPitaJalan = (x: number, z: number, margin: number) =>
  DUNIA.jalanH.some((jz) => Math.abs(z - jz) < PITA_JALAN + margin) ||
  DUNIA.jalanV.some((jx) => Math.abs(x - jx) < PITA_JALAN + margin);

const dalamKotak = (x: number, z: number, k: AABB, m: number) =>
  x > k.minX - m && x < k.maxX + m && z > k.minZ - m && z < k.maxZ + m;

/** Titik-titik penting yang tidak boleh tertutup pohon. */
const TITIK_PENTING: [number, number][] = [
  ...BANGUNAN.filter((b) => b.aksi).map((b) => titikDepan(b, 0.8)),
  ...HALTE.map((h) => [h.x, h.z] as [number, number]),
  [GEROBAK.x, GEROBAK.z],
  [PARKIR_MOTOR.x, PARKIR_MOTOR.z],
  [PERTAMINI.x, PERTAMINI.z],
  [BENDERA.x, BENDERA.z],
  [KURSI_WARKOP.x, KURSI_WARKOP.z],
];

// =====================================================================
// M13 ROMBAK DUNIA — area baru di pinggir kota (semua ditulis tangan, dicek otomatis agar tidak menimpa)
// =====================================================================

/** Ubah titik lokal (lx, lz) sebuah objek yang diputar `rotY` di (cx, cz) menjadi titik dunia. */
export function lokalKeDunia(cx: number, cz: number, rotY: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [cx + lx * c + lz * s, cz - lx * s + lz * c];
}

/** Kotak dari sudut-sudut (x0..x1, z0..z1). */
const kotak = (x0: number, x1: number, z0: number, z1: number): AABB => ({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 });

/** Sungai timur–barat di utara kota. Jembatan otomatis di setiap jalan vertikal. */
export const SUNGAI = { z: -50, setengah: 3 } as const;
/** Setengah lebar jembatan dari garis tengah jalan (pita jalan + pagar). */
export const JEMBATAN_SETENGAH = PITA_JALAN + 0.25;
/** Jalan setapak tepi sungai (khusus pejalan kaki). */
export const JALUR_SUNGAI = { z: -44.5, lebar: 1.8, x0: -80, x1: 80 } as const;
/** Gang kos-kosan di barat (paving, tanpa kendaraan). */
export const GANG = { x: -73, lebar: 2.4, z0: -45.4, z1: 59 } as const;

/** Kos petak / rumah kecil di kiri-kanan gang (filler rendah, tidak bisa dimasuki). */
export type Petak = { x: number; z: number; w: number; d: number; hadap: Hadap; warna: string; atap: string };
const WARNA_PETAK = ['#ffd6a5', '#caffbf', '#bdb2ff', '#a0c4ff', '#fff1c4', '#ffc8dd', '#d8f3dc'];
const ATAP_PETAK = ['#e98a6b', '#7fb3e0', '#7cc6a4', '#a86b3c', '#ffb36b'];
export const KOS_PETAK: readonly Petak[] = (() => {
  const hasil: Petak[] = [];
  let i = 0;
  const baris: [number, Hadap][] = [
    [GANG.x - 6, '+x'],
    [GANG.x + 6, '-x'],
  ];
  for (const [x, hadap] of baris) {
    for (let z = -41; z <= 58.5; z += 6.2) {
      // Lewati pita jalan raya (+ 1 m halaman + setengah lebar rumah)
      if (DUNIA.jalanH.some((jz) => Math.abs(z - jz) < PITA_JALAN + 1 + 2.5)) continue;
      hasil.push({ x, z, w: 4.5, d: 5, hadap, warna: WARNA_PETAK[i % WARNA_PETAK.length], atap: ATAP_PETAK[(i * 3) % ATAP_PETAK.length] });
      i++;
    }
  }
  return hasil;
})();
/** Kotak tabrakan kos petak (tanpa teras). */
export const kotakPetak = (p: Petak): AABB => boxAt(p.x, p.z, p.w, p.d);

/** Gapura gang (khas kampung): 2 tiang + balok bertulisan, di kedua sisi jalan raya. */
export const GAPURA: readonly { x: number; z: number; teks: string }[] = [
  { x: GANG.x, z: -5.4, teks: 'GANG KOS MAWAR' },
  { x: GANG.x, z: 5.4, teks: 'GANG KOS MAWAR' },
];
export const GAPURA_TIANG = GANG.lebar / 2 + 0.45; // jarak tiang dari tengah gang

/** Menara air (tandon) — landmark sedang kawasan barat-selatan (9 m, tetap lebih rendah dari kampus 10.5 m). */
export const MENARA_AIR = { x: -61.5, z: 47.5, tinggi: 9 } as const;

/** Sawah (timur): blok dibagi petak, dipisah pematang yang bisa dilewati. */
export const SAWAH_BLOK = [kotak(64, 82, -21.6, -4.6), kotak(64, 82, 4.6, 21.6)] as const;
export const PEMATANG = 1.1;
export const PETAK_SAWAH: readonly AABB[] = SAWAH_BLOK.flatMap((b) => {
  const kol = 3;
  const brs = 2;
  const pw = (b.maxX - b.minX - (kol - 1) * PEMATANG) / kol;
  const pd = (b.maxZ - b.minZ - (brs - 1) * PEMATANG) / brs;
  const hasil: AABB[] = [];
  for (let i = 0; i < kol; i++)
    for (let j = 0; j < brs; j++) {
      const x0 = b.minX + i * (pw + PEMATANG);
      const z0 = b.minZ + j * (pd + PEMATANG);
      hasil.push(kotak(x0, x0 + pw, z0, z0 + pd));
    }
  return hasil;
});

/** Kebun sayur: deretan bedengan (gundukan tanah) dengan jalan setapak di antaranya. */
export const KEBUN = [kotak(65, 82, 31, 44), kotak(38, 58, 46.5, 57.5)] as const;
export const BEDENGAN: readonly AABB[] = KEBUN.flatMap((k) => {
  const hasil: AABB[] = [];
  for (let z = k.minZ + 0.5; z <= k.maxZ - 0.5; z += 2) hasil.push(kotak(k.minX, k.maxX, z - 0.5, z + 0.5));
  return hasil;
});
/** Kebun pisang (timur laut). */
export const KEBUN_PISANG = kotak(64, 82, -44, -31);

/** Lapangan voli/bola kampung (tanah) di selatan. */
export const LAPANGAN_KAMPUNG = { x: -46, z: 52, w: 18, d: 11 } as const;

/** Pasar kaget / area jajanan di selatan: dua baris lapak mengapit lorong z = 52. */
export const PASAR_KAGET = { z: 52, lorong: 3.8, x0: 5.2, x1: 25 } as const;
export type Lapak = { x: number; z: number; hadap: Hadap; atap: string; jenis: number };
const ATAP_LAPAK = ['#e9605a', '#7fb3e0', '#f2d15c', '#7cc6a4', '#ff9ac1'];
export const LAPAK: readonly Lapak[] = (() => {
  const hasil: Lapak[] = [];
  let i = 0;
  for (const s of [-1, 1])
    for (let k = 0; k < 5; k++)
      for (const zr of [PASAR_KAGET.z - 3, PASAR_KAGET.z + 3]) {
        hasil.push({ x: s * (8.1 + k * 3.6), z: zr, hadap: zr < PASAR_KAGET.z ? '+z' : '-z', atap: ATAP_LAPAK[i % ATAP_LAPAK.length], jenis: i % 4 });
        i++;
      }
  return hasil;
})();
export const LAPAK_UKURAN = { w: 3, d: 2.2 } as const;

/** Saung/gubuk bambu (sawah & kebun). */
export const SAUNG: readonly [number, number][] = [
  [60.8, -13],
  [62, 37.5],
];
/** Warung kecil (dekor: kelontong, kopi, es degan). */
export type Warung = { x: number; z: number; hadap: Hadap; teks: string; warna: string; atap: string };
export const WARUNG: readonly Warung[] = [
  { x: 6.2, z: -41.9, hadap: '+z', teks: 'KOPI TEPI KALI', warna: '#fff1c4', atap: '#6b4430' },
  { x: -62.5, z: 31, hadap: '-z', teks: 'KELONTONG 24 JAM', warna: '#e8f6ff', atap: '#3d7fd1' },
  { x: 60.5, z: -31.6, hadap: '+z', teks: 'ES DEGAN', warna: '#effae6', atap: '#4f9a45' },
];
export const WARUNG_UKURAN = { w: 3, d: 2.4 } as const;
export const kotakWarung = (w: Warung): AABB =>
  w.hadap === '+x' || w.hadap === '-x' ? boxAt(w.x, w.z, WARUNG_UKURAN.d, WARUNG_UKURAN.w) : boxAt(w.x, w.z, WARUNG_UKURAN.w, WARUNG_UKURAN.d);

/** Tembok mural (tekstur kanvas) — rotY 0 = muka menghadap +z. */
export const MURAL: readonly { x: number; z: number; rotY: number; lebar: number; tema: number }[] = [
  { x: -64.5, z: -6.2, rotY: 0, lebar: 5.5, tema: 0 },
  { x: -22, z: -42, rotY: 0, lebar: 7, tema: 1 },
];
/** Spanduk di antara dua tiang bambu. rotY 0 = membentang di sumbu x. */
export const SPANDUK: readonly { x: number; z: number; rotY: number; lebar: number; teks: string; bg: string }[] = [
  { x: -5, z: 52, rotY: Math.PI / 2, lebar: 4.4, teks: 'PASAR KAGET · JAJAN MURAH', bg: '#e9605a' },
  { x: 5, z: 52, rotY: Math.PI / 2, lebar: 4.4, teks: 'PASAR KAGET · JAJAN MURAH', bg: '#e9605a' },
  { x: 26.6, z: -4.1, rotY: 0, lebar: 3.6, teks: 'SELAMAT DATANG MABA!', bg: '#7fb3e0' },
  { x: -46, z: 45.6, rotY: 0, lebar: 5, teks: 'TURNAMEN VOLI ANTAR-RT', bg: '#ffb36b' },
  { x: 72, z: 22.3, rotY: 0, lebar: 4.6, teks: 'KELOMPOK TANI SUBUR MAKMUR', bg: '#6cbf5a' },
  { x: 9.5, z: -46.1, rotY: 0, lebar: 2.8, teks: 'JANGAN BUANG SAMPAH KE KALI!', bg: '#5cc8a8' },
];
/** Posisi dua tiang sebuah spanduk. */
export const tiangSpanduk = (s: (typeof SPANDUK)[number]): [[number, number], [number, number]] => [
  lokalKeDunia(s.x, s.z, s.rotY, -s.lebar / 2, 0),
  lokalKeDunia(s.x, s.z, s.rotY, s.lebar / 2, 0),
];

const AREA_TERLARANG: AABB[] = [
  ...BANGUNAN.map(kotakBangunan),
  { minX: LAPANGAN.x - LAPANGAN.w / 2, maxX: LAPANGAN.x + LAPANGAN.w / 2, minZ: LAPANGAN.z - LAPANGAN.d / 2, maxZ: LAPANGAN.z + LAPANGAN.d / 2 },
  boxAt(TAMAN.kolam.x, TAMAN.kolam.z, TAMAN.kolam.r * 2, TAMAN.kolam.r * 2),
  boxAt(TAMAN.bangku.x, TAMAN.bangku.z - 1, 3, 3),
  // M13: area baru (pohon acak tidak boleh tumbuh di sini)
  kotak(-DUNIA.halfW - 30, DUNIA.halfW + 30, SUNGAI.z - SUNGAI.setengah - 0.6, SUNGAI.z + SUNGAI.setengah + 0.6),
  ...SAWAH_BLOK,
  ...KEBUN,
  KEBUN_PISANG,
  boxAt(LAPANGAN_KAMPUNG.x, LAPANGAN_KAMPUNG.z, LAPANGAN_KAMPUNG.w, LAPANGAN_KAMPUNG.d),
  kotak(-PASAR_KAGET.x1, PASAR_KAGET.x1, PASAR_KAGET.z - 4.4, PASAR_KAGET.z + 4.4),
  ...KOS_PETAK.map(kotakPetak),
  boxAt(MENARA_AIR.x, MENARA_AIR.z, 3, 3),
  ...SAUNG.map(([x, z]) => boxAt(x, z, 3.2, 3.2)),
  ...WARUNG.map(kotakWarung),
];

/** Lampu jalan [x, z] di tepi trotoar, dilewati di sekitar persimpangan. Kisi 14 m (sama seperti kota lama). */
export const LAMPU: readonly [number, number][] = (() => {
  const daftar: [number, number][] = [];
  const tepi = DUNIA.jalan + 1.0;
  const dekatSimpang = (v: number, garis: readonly number[]) => garis.some((g) => Math.abs(v - g) < 5);
  const terhalang = (x: number, z: number) =>
    HALTE.some((h) => Math.abs(x - h.x) < 2.5 && Math.abs(z - h.z) < 2.5) ||
    Math.hypot(x - GEROBAK.x, z - GEROBAK.z) < 3 ||
    Math.hypot(x - PARKIR_MOTOR.x, z - PARKIR_MOTOR.z) < 2.5;
  for (const jz of DUNIA.jalanH) {
    for (let x = -84; x <= 84; x += 14) {
      if (Math.abs(x) > DUNIA.halfW - 6 || dekatSimpang(x, DUNIA.jalanV)) continue;
      for (const s of [-1, 1]) if (!terhalang(x, jz + s * tepi)) daftar.push([x, jz + s * tepi]);
    }
  }
  for (const jx of DUNIA.jalanV) {
    for (let z = -63; z <= 63; z += 14) {
      if (Math.abs(z) > DUNIA.halfD - 6 || dekatSimpang(z, DUNIA.jalanH)) continue;
      for (const s of [-1, 1]) if (!terhalang(jx + s * tepi, z)) daftar.push([jx + s * tepi, z]);
    }
  }
  return daftar;
})();

// ===== Penempatan dekor otomatis: setiap kandidat dicek agar tidak menimpa apa pun =====
const tumpang = (a: AABB, b: AABB) => a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
const kenaPita = (k: AABB) =>
  DUNIA.jalanH.some((jz) => k.maxZ > jz - PITA_JALAN && k.minZ < jz + PITA_JALAN) ||
  DUNIA.jalanV.some((jx) => k.maxX > jx - PITA_JALAN && k.minX < jx + PITA_JALAN);
/** Jalur pejalan kaki & lorong yang harus tetap lega. */
const JALAN_KAKI: AABB[] = [
  kotak(GANG.x - GANG.lebar / 2, GANG.x + GANG.lebar / 2, GANG.z0, GANG.z1),
  kotak(JALUR_SUNGAI.x0, JALUR_SUNGAI.x1, JALUR_SUNGAI.z - JALUR_SUNGAI.lebar / 2, JALUR_SUNGAI.z + JALUR_SUNGAI.lebar / 2),
  kotak(-PASAR_KAGET.x1, PASAR_KAGET.x1, PASAR_KAGET.z - PASAR_KAGET.lorong / 2, PASAR_KAGET.z + PASAR_KAGET.lorong / 2),
];
/** Semua yang sudah "menempati" lantai. Dekor baru ditambahkan ke sini setelah lolos cek. */
const TERISI: AABB[] = [
  ...AREA_TERLARANG,
  ...JALAN_KAKI,
  ...HALTE.map((h) => boxAt(h.x, h.z, 4, 2.2)),
  boxAt(GEROBAK.x, GEROBAK.z, 3, 2.6),
  boxAt(KURSI_WARKOP.x, KURSI_WARKOP.z, 2.2, 2.4),
  boxAt(BENDERA.x, BENDERA.z, 0.8, 0.8),
  boxAt(PERTAMINI.x, PERTAMINI.z, 3, 2.6),
  boxAt(PARKIR_MOTOR.x, PARKIR_MOTOR.z, 1.8, 1.8),
  boxAt(KUCING.x, KUCING.z, 1.6, 1.4),
  ...MOTOR.map(([x, z]) => boxAt(x, z, 1.5, 1.5)),
  ...TIANG_LALIN.map((t) => boxAt(t.x, t.z, 0.8, 0.8)),
  ...LAMPU.map(([x, z]) => boxAt(x, z, 0.8, 0.8)),
  ...SPANDUK.flatMap((s) => tiangSpanduk(s).map(([x, z]) => boxAt(x, z, 0.5, 0.5))),
  ...MURAL.map((m) => (Math.abs(Math.sin(m.rotY)) > 0.5 ? boxAt(m.x, m.z, 0.5, m.lebar) : boxAt(m.x, m.z, m.lebar, 0.5))),
  ...GAPURA.flatMap((g) => [boxAt(g.x - GAPURA_TIANG, g.z, 0.7, 0.7), boxAt(g.x + GAPURA_TIANG, g.z, 0.7, 0.7)]),
];
const TITIK_HINDAR: [number, number][] = [...TITIK_PENTING, ...BANGUNAN.filter((b) => b.jenis === 'rumah').map((b) => titikDepan(b, 0.8))];

/** Coba pasang dekor berkotak `k`. Lolos → dicatat di TERISI & mengembalikan true. */
function pasang(k: AABB, jarakTitik = 1.6): boolean {
  if (kenaPita(k) || TERISI.some((t) => tumpang(k, t))) return false;
  const cx = (k.minX + k.maxX) / 2;
  const cz = (k.minZ + k.maxZ) / 2;
  if (TITIK_HINDAR.some(([px, pz]) => Math.hypot(cx - px, cz - pz) < jarakTitik)) return false;
  TERISI.push(k);
  return true;
}

/** Tiang listrik [x, z, rotY] di sisi jalan (di luar trotoar) + kabel yang menyambung antar tiang. */
export const TIANG_LISTRIK: readonly [number, number, number][] = [];
/** Kabel listrik [x1, z1, x2, z2] (dua utas digambar dari data ini). */
export const KABEL: readonly [number, number, number, number][] = [];
(() => {
  const tiang = TIANG_LISTRIK as [number, number, number][];
  const kabel = KABEL as [number, number, number, number][];
  const OFS = PITA_JALAN + 0.55;
  const dekat = (v: number, garis: readonly number[]) => garis.some((g) => Math.abs(v - g) < 5);
  const sungai = (z: number) => Math.abs(z - SUNGAI.z) < SUNGAI.setengah + 1.6;
  const garisTiang = (titik: [number, number][], rotY: number) => {
    let lalu: [number, number] | null = null;
    for (const [x, z] of titik) {
      if (!pasang(boxAt(x, z, 0.45, 0.45), 2.4)) {
        lalu = null;
        continue;
      }
      tiang.push([x, z, rotY]);
      if (lalu && Math.hypot(x - lalu[0], z - lalu[1]) < 13) kabel.push([lalu[0], lalu[1], x, z]);
      lalu = [x, z];
    }
  };
  for (const jz of DUNIA.jalanH) {
    const titik: [number, number][] = [];
    for (let x = -78; x <= 78; x += 12) if (!dekat(x, DUNIA.jalanV)) titik.push([x, jz - OFS]);
    garisTiang(titik, 0);
  }
  for (const jx of DUNIA.jalanV) {
    const titik: [number, number][] = [];
    for (let z = -58; z <= 58; z += 12) if (!dekat(z, DUNIA.jalanH) && !sungai(z)) titik.push([jx + OFS, z]);
    garisTiang(titik, Math.PI / 2);
  }
})();

/** Jemuran [x, z, rotY] — tali membentang di sumbu x lokal (panjang 2 m). */
export const JEMURAN: readonly [number, number, number][] = [];
/** Pot tanaman [x, z, varian]. */
export const POT: readonly [number, number, number][] = [];
/** Tong sampah [x, z, varian warna]. */
export const TONG: readonly [number, number, number][] = [];
/** Semak [x, z, skala]. */
export const SEMAK: readonly [number, number, number][] = [];
/** Bunga liar [x, z, varian warna]. */
export const BUNGA_LIAR: readonly [number, number, number][] = [];
/** Bangku kayu [x, z, rotY]. */
export const BANGKU: readonly [number, number, number][] = [];
/** Motor parkir tambahan [x, z, rotY] (gang, warung, pasar). */
export const MOTOR_TAMBAHAN: readonly [number, number, number][] = [];
const MOTOR_BARU = MOTOR_TAMBAHAN as [number, number, number][];
(() => {
  const jemuran = JEMURAN as [number, number, number][];
  const pot = POT as [number, number, number][];
  const tong = TONG as [number, number, number][];
  const semak = SEMAK as [number, number, number][];
  const bunga = BUNGA_LIAR as [number, number, number][];
  const bangku = BANGKU as [number, number, number][];
  const r = acak(20261123);
  const pasangJemuran = (x: number, z: number, rotY: number) => {
    const [ax, az] = lokalKeDunia(x, z, rotY, -1.1, 0);
    const [bx, bz] = lokalKeDunia(x, z, rotY, 1.1, 0);
    if (pasang(kotak(Math.min(ax, bx) - 0.25, Math.max(ax, bx) + 0.25, Math.min(az, bz) - 0.25, Math.max(az, bz) + 0.25))) jemuran.push([x, z, rotY]);
  };

  // --- Halaman kos petak di gang: jemuran, motor, pot, bunga ---
  KOS_PETAK.forEach((p, i) => {
    const fx = p.hadap === '+x' ? 1 : -1;
    const muka = p.x + (fx * p.w) / 2;
    if (i % 2 === 0) pasangJemuran(muka + fx * 1.4, p.z + 0.9, Math.PI / 2);
    if (i % 3 === 1 && pasang(boxAt(muka + fx * 1.2, p.z - 1.3, 1.3, 1.3), 0)) MOTOR_BARU.push([muka + fx * 1.2, p.z - 1.3, r() * 0.6 - 0.3]);
    for (const dz of [-2.05, 2.05]) if (pasang(boxAt(muka + fx * 0.35, p.z + dz, 0.5, 0.5), 0)) pot.push([muka + fx * 0.35, p.z + dz, (i + (dz > 0 ? 1 : 0)) % 3]);
    bunga.push([muka + fx * 0.5, p.z + 0.2, i % 4], [muka + fx * 0.5, p.z - 0.35, (i + 2) % 4]);
  });

  // --- Sekitar bangunan kota lama: pot & tong di depan, semak di samping belakang, jemuran rumah warga ---
  for (const b of BANGUNAN) {
    const rot = rotasiHadap(b.hadap);
    const { w, d } = ukuranLokal(b);
    const zDepan = d / 2 + b.depan + 0.45;
    const [px, pz] = lokalKeDunia(b.x, b.z, rot, w / 2 - 0.45, zDepan);
    if (b.jenis !== 'kampus' && pasang(boxAt(px, pz, 0.55, 0.55))) pot.push([px, pz, b.x > 0 ? 1 : 0]);
    if (b.jenis !== 'rumah' && b.jenis !== 'kampus') {
      const [tx, tz] = lokalKeDunia(b.x, b.z, rot, -(w / 2 - 0.45), zDepan);
      if (pasang(boxAt(tx, tz, 0.6, 0.6))) tong.push([tx, tz, b.aksen === '#7cc6a4' ? 1 : 0]);
    } else if (b.jenis === 'rumah') {
      const [qx, qz] = lokalKeDunia(b.x, b.z, rot, -(w / 2 - 0.45), zDepan);
      if (pasang(boxAt(qx, qz, 0.55, 0.55))) pot.push([qx, qz, 2]);
      for (const lx of [0.7, 1.2, 1.7]) {
        const [fx, fz] = lokalKeDunia(b.x, b.z, rot, lx, d / 2 + 0.35);
        bunga.push([fx, fz, Math.floor(r() * 4)]);
      }
      // Jemuran di samping rumah (kiri atau kanan, mana yang muat)
      const [jx, jz] = lokalKeDunia(b.x, b.z, rot, w / 2 + 1.5, 0);
      const [kx, kz] = lokalKeDunia(b.x, b.z, rot, -(w / 2 + 1.5), 0);
      const n = jemuran.length;
      pasangJemuran(jx, jz, rot + Math.PI / 2);
      if (jemuran.length === n) pasangJemuran(kx, kz, rot + Math.PI / 2);
    }
    for (const s of [-1, 1]) {
      const [sx, sz] = lokalKeDunia(b.x, b.z, rot, s * (w / 2 + 0.6), -d / 2 + 0.8);
      if (pasang(boxAt(sx, sz, 1.0, 1.0), 0)) semak.push([sx, sz, 0.8 + r() * 0.4]);
    }
  }
  // Jemuran di samping Kos Melati (khas anak kos)
  pasangJemuran(-18.2, -9, Math.PI / 2);

  // --- Tepi sungai: bangku menghadap kali + tong sampah ---
  for (let x = -76; x <= 76; x += 16) if (pasang(boxAt(x, -46.05, 2.2, 0.7), 0)) bangku.push([x, -46.05, Math.PI]);
  for (let x = -68; x <= 68; x += 24) if (pasang(boxAt(x, -43.1, 0.6, 0.6), 0)) tong.push([x, -43.1, 1]);
  // --- Pasar kaget & lapangan kampung ---
  for (const [x, z, ry] of [
    [-26.2, 52, Math.PI / 2],
    [26.2, 52, -Math.PI / 2],
    [-49, 58.5, Math.PI],
    [-43, 58.5, Math.PI],
  ] as [number, number, number][]) {
    const tegak = Math.abs(Math.sin(ry)) > 0.5;
    if (pasang(tegak ? boxAt(x, z, 0.7, 2.2) : boxAt(x, z, 2.2, 0.7), 0)) bangku.push([x, z, ry]);
  }
  for (const [x, z] of [
    [-25.6, 49.2],
    [25.6, 54.8],
    [-36.2, 47],
  ] as [number, number][])
    if (pasang(boxAt(x, z, 0.6, 0.6), 0)) tong.push([x, z, 0]);
  // Motor pembeli di dekat warung & pasar
  for (const [x, z, ry] of [
    [3.6, -41.6, 0.3],
    [-58.6, 31.4, -0.2],
    [27.6, 49.6, 1.4],
    [-27.4, 54.6, -1.3],
    [57.6, -31.2, 0.2],
  ] as [number, number, number][])
    if (pasang(boxAt(x, z, 1.3, 1.3), 0)) MOTOR_BARU.push([x, z, ry]);
})();

/** Kucing kampung [x, z, rotY] (selain Oyen). */
export const KUCING_KAMPUNG: readonly [number, number, number][] = [
  [-75.6, 11.2, 1.2],
  [-12.6, 50.4, 0.4],
  [13.6, -43.1, -0.8],
  [-6.9, 13.2, 2.4],
  [62.6, -10.6, 0.9],
];
/** Kawanan burung merpati yang mematuk-matuk di tanah [x, z]. */
export const KAWANAN_BURUNG: readonly [number, number][] = [
  [-15, 52.3],
  [21.5, 12.4],
  [-12, -44.3],
  [-44, 50.5],
  [14.5, 52],
];
/** Bebek berenang di sungai: [pusat x, jangkauan]. */
export const BEBEK: readonly [number, number][] = [
  [-16, 9],
  [16, 9],
  [58, 14],
];
/** Pemancing di tanggul sungai [x, z, rotY]. */
export const PEMANCING: readonly [number, number, number][] = [
  [-40, -46.2, Math.PI],
  [44, -46.2, Math.PI],
];

/** Pohon: [x, z, skala]. Pagar pohon di tepi peta + pohon tersebar di lahan kosong. */
export const POHON: readonly [number, number, number][] = (() => {
  const r = acak(20261119);
  const daftar: [number, number, number][] = [];
  const bebas = (x: number, z: number) =>
    !diPitaJalan(x, z, 1.2) &&
    !AREA_TERLARANG.some((k) => dalamKotak(x, z, k, 2.2)) &&
    !TITIK_PENTING.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.2) &&
    // M13: jangan menimpa dekor, gang, jalur tepi sungai, lorong pasar
    !TERISI.some((k) => dalamKotak(x, z, k, 0.9)) &&
    !daftar.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.5);

  // Pagar pohon di tepi peta
  const { halfW, halfD } = DUNIA;
  for (let x = -halfW + 2; x <= halfW - 2; x += 6) {
    for (const z of [-halfD + 1.2, halfD - 1.2]) if (bebas(x, z)) daftar.push([x, z, 0.95 + r() * 0.35]);
  }
  for (let z = -halfD + 7; z <= halfD - 7; z += 6) {
    for (const x of [-halfW + 1.2, halfW - 1.2]) if (bebas(x, z)) daftar.push([x, z, 0.95 + r() * 0.35]);
  }
  // Pohon tersebar
  for (let x = -halfW + 5; x < halfW - 4; x += 6.5) {
    for (let z = -halfD + 5; z < halfD - 4; z += 6.5) {
      if (r() > 0.75) continue; // M13: sedikit lebih rapat (dunia lebih luas, lahan kosong lebih banyak)
      const px = x + (r() - 0.5) * 3;
      const pz = z + (r() - 0.5) * 3;
      if (bebas(px, pz)) daftar.push([px, pz, 0.8 + r() * 0.5]);
    }
  }
  return daftar;
})();

/** Titik pohon jenis lain dicek terhadap pohon bulat & dekor. */
const bebasPohon = (x: number, z: number, jarak: number, sudah: readonly [number, number, number][]) =>
  !diPitaJalan(x, z, 0.8) &&
  !TERISI.some((k) => dalamKotak(x, z, k, 0.6)) &&
  !TITIK_PENTING.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3) &&
  !POHON.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.6) &&
  !sudah.some(([px, pz]) => Math.hypot(x - px, z - pz) < jarak);

/** Pohon kelapa [x, z, skala]: berjajar di tepi utara sungai, tepi sawah & ujung pasar. */
export const POHON_KELAPA: readonly [number, number, number][] = (() => {
  const r = acak(777);
  const daftar: [number, number, number][] = [];
  const calon: [number, number][] = [];
  for (let x = -78; x <= 78; x += 9) calon.push([x + (r() - 0.5) * 2, SUNGAI.z - SUNGAI.setengah - 2.6]);
  for (let z = -40; z <= 46; z += 7) calon.push([61.2 + (r() - 0.5), z]);
  calon.push([-27.5, 47.8], [27.5, 56.4], [-58.5, -40], [-66, 58.5], [50, -43]);
  for (const [x, z] of calon) if (bebasPohon(x, z, 3, daftar)) daftar.push([x, z, 0.9 + r() * 0.3]);
  return daftar;
})();

/** Pohon pisang di kebun pisang [x, z, skala]. */
export const POHON_PISANG: readonly [number, number, number][] = (() => {
  const r = acak(4242);
  const daftar: [number, number, number][] = [];
  const k = KEBUN_PISANG;
  for (let x = k.minX + 1.6; x < k.maxX - 1; x += 4.2)
    for (let z = k.minZ + 1.6; z < k.maxZ - 1; z += 3.8) daftar.push([x + (r() - 0.5) * 1.2, z + (r() - 0.5) * 1.2, 0.85 + r() * 0.3]);
  return daftar;
})();

/** Lubang tabrakan sungai: sungai diblok, kecuali di jembatan. */
const KOTAK_SUNGAI: AABB[] = (() => {
  const hasil: AABB[] = [];
  const potong = [...DUNIA.jalanV].sort((a, b) => a - b);
  let awal = -DUNIA.halfW - 2;
  for (const jx of potong) {
    hasil.push(kotak(awal, jx - JEMBATAN_SETENGAH, SUNGAI.z - SUNGAI.setengah, SUNGAI.z + SUNGAI.setengah));
    awal = jx + JEMBATAN_SETENGAH;
  }
  hasil.push(kotak(awal, DUNIA.halfW + 2, SUNGAI.z - SUNGAI.setengah, SUNGAI.z + SUNGAI.setengah));
  // Pagar jembatan (kiri-kanan pita jalan)
  for (const jx of DUNIA.jalanV)
    for (const s of [-1, 1]) hasil.push(boxAt(jx + s * (JEMBATAN_SETENGAH - 0.05), SUNGAI.z, 0.2, SUNGAI.setengah * 2 + 1.2));
  return hasil;
})();

/** Jalur jalan kaki NPC (bolak-balik / berputar). Tidak menyeberang jalan raya. */
export const NPC_JALUR: readonly { jalur: [number, number][]; baju: string; kulit: string; rambut: string; kecepatan: number }[] = [
  { jalur: [[3.5, -2.4], [29, -2.4]], baju: '#ff9aa2', kulit: '#f1c08f', rambut: '#3b2a20', kecepatan: 1.5 },
  { jalur: [[-29, -2.4], [-3.5, -2.4]], baju: '#a0c4ff', kulit: '#d9a074', rambut: '#2a1d15', kecepatan: 1.3 },
  { jalur: [[-3.5, 2.4], [-29, 2.4]], baju: '#bdb2ff', kulit: '#ffd7b5', rambut: '#6b4430', kecepatan: 1.3 },
  { jalur: [[2.4, 3.5], [2.4, 22.5]], baju: '#caffbf', kulit: '#d9a074', rambut: '#2a1d15', kecepatan: 1.6 },
  { jalur: [[18.5, 9], [26.5, 9], [26.5, 18], [18.5, 18]], baju: '#ffd6a5', kulit: '#b97f57', rambut: '#3b2a20', kecepatan: 1.1 },
  { jalur: [[8, -4.5], [24, -4.5]], baju: '#a0c4ff', kulit: '#ffd7b5', rambut: '#5a3a2a', kecepatan: 1.4 },
  { jalur: [[-58, -23.6], [-34.5, -23.6]], baju: '#ff9aa2', kulit: '#ffd7b5', rambut: '#3b2a20', kecepatan: 1.4 },
  { jalur: [[34.5, 23.6], [58, 23.6]], baju: '#bdb2ff', kulit: '#f1c08f', rambut: '#2a1d15', kecepatan: 1.2 },
  { jalur: [[-29.6, -22.5], [-29.6, -3.5]], baju: '#ffd6a5', kulit: '#d9a074', rambut: '#6b4430', kecepatan: 1.5 },
  { jalur: [[34.4, 3.5], [34.4, 22.5]], baju: '#caffbf', kulit: '#ffd7b5', rambut: '#3b2a20', kecepatan: 1.3 },
  { jalur: [[37.5, 5.8], [56.5, 5.8], [56.5, 20.3], [37.5, 20.3]], baju: '#e9605a', kulit: '#b97f57', rambut: '#2a1d15', kecepatan: 2.6 },
  { jalur: [[-3.5, -29.4], [-29, -29.4]], baju: '#a0c4ff', kulit: '#f1c08f', rambut: '#3b2a20', kecepatan: 1.4 },
  { jalur: [[3.5, -29.4], [29, -29.4]], baju: '#ff9aa2', kulit: '#ffd7b5', rambut: '#5a3a2a', kecepatan: 1.2 },
];

/**
 * M13: warga figuran (tanpa nama, tidak bisa diajak ngobrol) yang menghidupkan area baru & kota.
 * Sengaja TERPISAH dari NPC_JALUR agar urutan NPC_JALUR ↔ fitur3.json warga tidak bergeser.
 * `peran` menentukan rutinitas di ujung jalur (riset: rutinitas sesuai minat + berhenti/menoleh dulu).
 * `lihat` = titik yang ditatap saat berhenti (lapak, sawah, sungai...).
 */
export type PeranFiguran = 'pembeli' | 'petani' | 'anakKos' | 'pejalan' | 'anak' | 'ibu';
export type Figuran = { jalur: [number, number][]; peran: PeranFiguran; baju: string; kulit: string; rambut: string; kecepatan: number; lihat?: [number, number]; gaya?: string; aksesoris?: string[] };
export const FIGURAN: readonly Figuran[] = [
  { jalur: [[-73, -43], [-73, -30.6]], peran: 'anakKos', baju: '#ffd6a5', kulit: '#f1c08f', rambut: '#2a1d15', kecepatan: 1.2, lihat: [-79, -34.8], gaya: 'jabrik' },
  { jalur: [[-73, -21.8], [-73, -7]], peran: 'anakKos', baju: '#a0c4ff', kulit: '#d9a074', rambut: '#3b2a20', kecepatan: 1.3, lihat: [-67, -16.2], aksesoris: ['tasPunggung'] },
  { jalur: [[-73, 30.6], [-73, 57]], peran: 'ibu', baju: '#ff9ac1', kulit: '#ffd7b5', rambut: '#3b2a20', kecepatan: 1.0, lihat: [-79, 45.8], gaya: 'hijab' },
  { jalur: [[-28, -44.5], [-4.8, -44.5]], peran: 'pejalan', baju: '#caffbf', kulit: '#b97f57', rambut: '#2a1d15', kecepatan: 1.4, lihat: [-16, -50] },
  { jalur: [[4.8, -44.5], [30, -44.5]], peran: 'pejalan', baju: '#bdb2ff', kulit: '#ffd7b5', rambut: '#6b4430', kecepatan: 1.1, lihat: [16, -50], gaya: 'kuncir' },
  { jalur: [[-23.5, 52], [-5.8, 52]], peran: 'pembeli', baju: '#ff9aa2', kulit: '#f1c08f', rambut: '#3b2a20', kecepatan: 0.9, lihat: [-15.3, 49], gaya: 'panjang' },
  { jalur: [[5.8, 52], [23.5, 52]], peran: 'pembeli', baju: '#7fb3e0', kulit: '#d9a074', rambut: '#2a1d15', kecepatan: 1.0, lihat: [15.3, 55] },
  { jalur: [[69.8, -21.2], [69.8, -5]], peran: 'petani', baju: '#a5532a', kulit: '#b97f57', rambut: '#2a1d15', kecepatan: 0.8, lihat: [73, -13], aksesoris: ['topi'] },
  { jalur: [[76.2, 5], [76.2, 21.2]], peran: 'petani', baju: '#6cbf5a', kulit: '#d9a074', rambut: '#3b2a20', kecepatan: 0.8, lihat: [79, 13], aksesoris: ['topi'] },
  { jalur: [[-53.5, 47.5], [-38.5, 47.5], [-38.5, 56.5], [-53.5, 56.5]], peran: 'anak', baju: '#ffe08a', kulit: '#f1c08f', rambut: '#3b2a20', kecepatan: 2.4, gaya: 'pendek' },
  { jalur: [[-38.5, 56.5], [-53.5, 56.5], [-53.5, 47.5], [-38.5, 47.5]], peran: 'anak', baju: '#e9605a', kulit: '#d9a074', rambut: '#2a1d15', kecepatan: 2.2, gaya: 'poni' },
  { jalur: [[38, 45], [58, 45]], peran: 'petani', baju: '#ffb36b', kulit: '#b97f57', rambut: '#6b4430', kecepatan: 0.9, lihat: [48, 50], gaya: 'cepol' },
  { jalur: [[-3.6, 28.4], [-29, 28.4]], peran: 'pejalan', baju: '#7cc6a4', kulit: '#ffd7b5', rambut: '#2a1d15', kecepatan: 1.3 },
  { jalur: [[3.6, -23.6], [29, -23.6]], peran: 'pejalan', baju: '#e9b949', kulit: '#f1c08f', rambut: '#3b2a20', kecepatan: 1.4, aksesoris: ['tasPunggung'] },
  { jalur: [[-58, 23.6], [-35.4, 23.6]], peran: 'ibu', baju: '#bdb2ff', kulit: '#d9a074', rambut: '#3b2a20', kecepatan: 1.0, gaya: 'hijab' },
];

/** Sandal di depan pintu & kardus mi instan (cerita kecil anak kos) [x, z, rotY]. */
export const SANDAL: readonly [number, number, number][] = KOS_PETAK.filter((_, i) => i % 3 !== 2).map((p, i) => {
  const fx = p.hadap === '+x' ? 1 : -1;
  return [p.x + fx * (p.w / 2 + 0.3), p.z - 0.8 + (i % 2) * 0.15, (fx > 0 ? Math.PI / 2 : -Math.PI / 2) + (i % 3) * 0.3];
});
export const KARDUS: readonly [number, number, number][] = KOS_PETAK.filter((_, i) => i % 4 === 1).map((p) => {
  const fx = p.hadap === '+x' ? 1 : -1;
  return [p.x + fx * (p.w / 2 + 0.35), p.z + 1.25, 0.3];
});
/** Papan kecil di dinding kos petak (indeks petak → teks). */
export const PAPAN_KOS: readonly { petak: number; teks: string; bg: string }[] = [
  { petak: 0, teks: 'KOS PUTRA · BAYAR TGL 5', bg: '#e98a6b' },
  { petak: 4, teks: 'KOS PUTRI · TAMU LAPOR', bg: '#d0648f' },
  { petak: 13, teks: 'TERIMA KOS · ADA KAMAR', bg: '#4f9a45' },
  { petak: 18, teks: 'KOS PUTRA · BAYAR TGL 5', bg: '#e98a6b' },
];

/** "Kejutan kecil" (momen Where's Waldo): kucing tidur di atap kos petak — indeks petak. */
export const KUCING_ATAP: readonly number[] = [3, 9, 16];
/** Layangan nyangkut di kabel listrik — indeks kabel (setiap ± 4 kabel satu). */
export const LAYANGAN: readonly number[] = KABEL.map((_, i) => i).filter((i) => i % 4 === 2);

// ===== Kotak tabrakan statis =====
const T = 2; // tebal dinding batas peta
const { halfW, halfD } = DUNIA;

function kotakHalte(h: Halte): AABB {
  // Hanya dinding belakang + bangku yang menghalangi; atap di atas kepala
  const [vx, vz] = vektorHadap(h.hadap);
  const cx = h.x - vx * 0.45;
  const cz = h.z - vz * 0.45;
  return vx !== 0 ? boxAt(cx, cz, 0.6, 3.4) : boxAt(cx, cz, 3.4, 0.6);
}

export const DUNIA_COLLIDERS: readonly AABB[] = [
  // Batas peta
  { minX: -halfW - T, maxX: halfW + T, minZ: -halfD - T, maxZ: -halfD },
  { minX: -halfW - T, maxX: halfW + T, minZ: halfD, maxZ: halfD + T },
  { minX: -halfW - T, maxX: -halfW, minZ: -halfD - T, maxZ: halfD + T },
  { minX: halfW, maxX: halfW + T, minZ: -halfD - T, maxZ: halfD + T },
  ...BANGUNAN.map(kotakBangunan),
  ...POHON.map(([x, z]) => boxAt(x, z, 0.7, 0.7)),
  ...LAMPU.map(([x, z]) => boxAt(x, z, 0.35, 0.35)),
  ...HALTE.map(kotakHalte),
  boxAt(GEROBAK.x, GEROBAK.z, 2.2, 1.2),
  boxAt(TAMAN.bangku.x, TAMAN.bangku.z, 2.2, 0.7),
  boxAt(TAMAN.kolam.x, TAMAN.kolam.z, TAMAN.kolam.r * 2, TAMAN.kolam.r * 2),
  boxAt(KURSI_WARKOP.x, KURSI_WARKOP.z, 1.8, 1.6),
  ...MOTOR.map(([x, z]) => boxAt(x, z, 1.3, 1.3)),
  boxAt(BENDERA.x, BENDERA.z, 0.4, 0.4),
  ...TIANG_LALIN.map((t) => boxAt(t.x, t.z, 0.3, 0.3)),
  // Gawang futsal
  boxAt(LAPANGAN.x - LAPANGAN.w / 2 + 0.5, LAPANGAN.z, 1, 3.2),
  boxAt(LAPANGAN.x + LAPANGAN.w / 2 - 0.5, LAPANGAN.z, 1, 3.2),

  // ===== M13: area baru =====
  ...KOTAK_SUNGAI,
  ...KOS_PETAK.map(kotakPetak),
  ...GAPURA.flatMap((g) => [boxAt(g.x - GAPURA_TIANG, g.z, 0.45, 0.45), boxAt(g.x + GAPURA_TIANG, g.z, 0.45, 0.45)]),
  boxAt(MENARA_AIR.x, MENARA_AIR.z, 2.4, 2.4),
  ...PETAK_SAWAH,
  ...BEDENGAN,
  ...SAUNG.map(([x, z]) => boxAt(x, z, 2.8, 2.8)),
  ...WARUNG.map(kotakWarung),
  ...LAPAK.map((l) => boxAt(l.x, l.z, LAPAK_UKURAN.w, LAPAK_UKURAN.d)),
  ...MURAL.map((m) => (Math.abs(Math.sin(m.rotY)) > 0.5 ? boxAt(m.x, m.z, 0.3, m.lebar) : boxAt(m.x, m.z, m.lebar, 0.3))),
  ...SPANDUK.flatMap((s) => tiangSpanduk(s).map(([x, z]) => boxAt(x, z, 0.25, 0.25))),
  ...TIANG_LISTRIK.map(([x, z]) => boxAt(x, z, 0.35, 0.35)),
  ...JEMURAN.flatMap(([x, z, r]) => [-1.1, 1.1].map((lx) => {
    const [px, pz] = lokalKeDunia(x, z, r, lx, 0);
    return boxAt(px, pz, 0.2, 0.2);
  })),
  ...TONG.map(([x, z]) => boxAt(x, z, 0.5, 0.5)),
  ...BANGKU.map(([x, z, r]) => (Math.abs(Math.sin(r)) > 0.5 ? boxAt(x, z, 0.6, 2.0) : boxAt(x, z, 2.0, 0.6))),
  ...MOTOR_TAMBAHAN.map(([x, z]) => boxAt(x, z, 1.2, 1.2)),
  ...POHON_KELAPA.map(([x, z]) => boxAt(x, z, 0.6, 0.6)),
  ...POHON_PISANG.map(([x, z]) => boxAt(x, z, 0.5, 0.5)),
  // Gawang bambu lapangan kampung
  boxAt(LAPANGAN_KAMPUNG.x - LAPANGAN_KAMPUNG.w / 2 + 0.4, LAPANGAN_KAMPUNG.z, 0.6, 3.2),
  boxAt(LAPANGAN_KAMPUNG.x + LAPANGAN_KAMPUNG.w / 2 - 0.4, LAPANGAN_KAMPUNG.z, 0.6, 3.2),
];
