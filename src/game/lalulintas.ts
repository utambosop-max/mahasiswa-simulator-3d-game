// Lalu lintas: kendaraan NPC yang berjalan di lajur KIRI (seperti di Indonesia).
// Logika murni + state bersama (tanpa React) agar bisa dibaca pemain, minimap & tabrakan.
import { DUNIA } from './duniaLayout';
import type { AABB } from './collision';
import f4 from '../data/fitur4.json';
import { sekarangMs } from '../online/jamServer';

// ===================== Lampu lalu lintas (M12) =====================
// Satu siklus: jalan horizontal hijau → kuning → semua merah → jalan vertikal hijau → kuning → semua merah.
// Fase "semua merah" memberi waktu kendaraan yang terlanjur masuk perempatan untuk keluar dulu.
const LALIN = f4.lalin;
const SIKLUS = 2 * (LALIN.hijau + LALIN.kuning + LALIN.semuaMerah);
/**
 * Jam lampu lalu lintas (detik). Diambil dari jam DUNIA NYATA (Date.now) — bukan "sejak game dibuka" —
 * supaya semua pemain online melihat warna lampu yang sama tanpa pesan tambahan ke server
 * (jam HP disinkronkan internet, selisihnya biasanya < 1 detik).
 * Saat online dipakai jam SERVER (sekarangMs) agar HP yang jamnya meleset tetap sama.
 */
export const JAM_LALIN = { t: sekarangMs() / 1000 };
export type WarnaLampu = 'hijau' | 'kuning' | 'merah';
/** Perempatan yang memakai lampu [x, z] */
export const SIMPANG_LALIN = LALIN.simpang as [number, number][];

/** Warna lampu untuk kendaraan yang bergerak di sumbu `sumbu` ('x' = jalan horizontal). */
export function warnaLampu(sumbu: 'x' | 'z', t = sekarangMs() / 1000): WarnaLampu {
  const f = (t + (sumbu === 'z' ? SIKLUS / 2 : 0)) % SIKLUS;
  if (f < LALIN.hijau) return 'hijau';
  if (f < LALIN.hijau + LALIN.kuning) return 'kuning';
  return 'merah';
}

/**
 * Jarak (m) dari posisi `s` ke pusat perempatan searah gerak (positif = belum lewat).
 * null jika lajur ini tidak melewati perempatan tersebut.
 */
export function jarakKeSimpang(sumbu: 'x' | 'z', garis: number, s: number, arah: number, sx: number, sz: number): number | null {
  const pusatJalan = sumbu === 'x' ? sz : sx;
  if (Math.abs(garis - pusatJalan) > DUNIA.jalan + 0.6) return null;
  return ((sumbu === 'x' ? sx : sz) - s) * arah;
}

export type JenisKendaraan = 'mobil' | 'angkot' | 'motor';

type Lajur = {
  /** Sumbu gerak: 'x' = jalan horizontal, 'z' = jalan vertikal */
  sumbu: 'x' | 'z';
  /** Koordinat tetap lajur (z untuk sumbu x, x untuk sumbu z) */
  garis: number;
  arah: 1 | -1;
  /** Jalan horizontal = jalan utama (prioritas di persimpangan) */
  prioritas: boolean;
};

const OFFSET_LAJUR = 1; // jarak lajur dari garis tengah jalan

/** Lajur kiri: arah +x → z − 1, arah −x → z + 1; arah +z → x + 1, arah −z → x − 1. */
function lajurH(z: number, arah: 1 | -1): Lajur {
  return { sumbu: 'x', garis: z - arah * OFFSET_LAJUR, arah, prioritas: true };
}
function lajurV(x: number, arah: 1 | -1): Lajur {
  return { sumbu: 'z', garis: x + arah * OFFSET_LAJUR, arah, prioritas: false };
}

const [H1, H0, H2] = DUNIA.jalanH;
const [V1, V0, V2] = DUNIA.jalanV;

type DefKendaraan = { jenis: JenisKendaraan; lajur: Lajur; s: number; warna: string; kecepatan: number };

export const DEF_KENDARAAN: readonly DefKendaraan[] = [
  { jenis: 'mobil', lajur: lajurH(H0, 1), s: -40, warna: '#e9605a', kecepatan: 7 },
  { jenis: 'motor', lajur: lajurH(H0, 1), s: 12, warna: '#5a8fe9', kecepatan: 8 },
  { jenis: 'angkot', lajur: lajurH(H0, -1), s: 0, warna: '#4fb35a', kecepatan: 6 },
  { jenis: 'mobil', lajur: lajurH(H0, -1), s: 38, warna: '#7fb3e0', kecepatan: 7 },
  { jenis: 'mobil', lajur: lajurH(H1, 1), s: -12, warna: '#ffe08a', kecepatan: 7.5 },
  { jenis: 'motor', lajur: lajurH(H1, -1), s: 22, warna: '#e9605a', kecepatan: 8 },
  { jenis: 'angkot', lajur: lajurH(H2, 1), s: 30, warna: '#4fb35a', kecepatan: 6 },
  { jenis: 'mobil', lajur: lajurH(H2, -1), s: -25, warna: '#f4f4f4', kecepatan: 7 },
  { jenis: 'motor', lajur: lajurH(H2, -1), s: 8, warna: '#ffb36b', kecepatan: 8.5 },
  { jenis: 'motor', lajur: lajurV(V0, 1), s: -20, warna: '#bdb2ff', kecepatan: 7.5 },
  { jenis: 'mobil', lajur: lajurV(V0, -1), s: 15, warna: '#7cc6a4', kecepatan: 6.5 },
  { jenis: 'mobil', lajur: lajurV(V1, 1), s: 0, warna: '#c48d55', kecepatan: 6.5 },
  { jenis: 'motor', lajur: lajurV(V2, -1), s: -15, warna: '#ff9aa2', kecepatan: 8 },
  { jenis: 'angkot', lajur: lajurV(V2, 1), s: 25, warna: '#4fb35a', kecepatan: 6 },
  // M13 (dunia diperluas 168×124 m): 6 kendaraan tambahan, diselipkan di lajur yang masih sepi
  // dan diberi jarak awal jauh dari kendaraan lain di lajur yang sama agar tidak langsung antre.
  { jenis: 'mobil', lajur: lajurH(H1, -1), s: -50, warna: '#ff9ac1', kecepatan: 7 },
  { jenis: 'motor', lajur: lajurH(H2, 1), s: -60, warna: '#7fb3e0', kecepatan: 8 },
  { jenis: 'angkot', lajur: lajurV(V1, -1), s: 30, warna: '#4fb35a', kecepatan: 6 },
  { jenis: 'motor', lajur: lajurV(V1, 1), s: -45, warna: '#f2d15c', kecepatan: 8 },
  { jenis: 'mobil', lajur: lajurV(V2, -1), s: 45, warna: '#a0c4ff', kecepatan: 6.5 },
  { jenis: 'motor', lajur: lajurV(V0, 1), s: 40, warna: '#e98a6b', kecepatan: 7.5 },
];

/** Setengah panjang & setengah lebar tiap jenis (meter). */
export const UKURAN_KENDARAAN: Record<JenisKendaraan, { panjang: number; lebar: number }> = {
  mobil: { panjang: 2.0, lebar: 0.95 },
  angkot: { panjang: 2.1, lebar: 0.95 },
  motor: { panjang: 0.95, lebar: 0.4 },
};

export type StateKendaraan = {
  def: DefKendaraan;
  s: number;
  v: number;
  x: number;
  z: number;
  rotY: number;
  /** Kotak tabrakan (diperbarui tiap frame, objek dipakai ulang) */
  kotak: AABB;
  klaksonCooldown: number;
};

const BATAS_X = DUNIA.halfW + 12;
const BATAS_Z = DUNIA.halfD + 12;

function posisi(st: StateKendaraan) {
  const { lajur } = st.def;
  if (lajur.sumbu === 'x') {
    st.x = st.s;
    st.z = lajur.garis;
    st.rotY = lajur.arah > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    st.x = lajur.garis;
    st.z = st.s;
    st.rotY = lajur.arah > 0 ? 0 : Math.PI;
  }
  const u = UKURAN_KENDARAAN[st.def.jenis];
  const hx = lajur.sumbu === 'x' ? u.panjang : u.lebar;
  const hz = lajur.sumbu === 'x' ? u.lebar : u.panjang;
  st.kotak.minX = st.x - hx;
  st.kotak.maxX = st.x + hx;
  st.kotak.minZ = st.z - hz;
  st.kotak.maxZ = st.z + hz;
}

/** State semua kendaraan (dipakai bersama). */
export const KENDARAAN: StateKendaraan[] = DEF_KENDARAAN.map((def) => {
  const st: StateKendaraan = {
    def,
    s: def.s,
    v: def.kecepatan,
    x: 0,
    z: 0,
    rotY: 0,
    kotak: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 },
    klaksonCooldown: 0,
  };
  posisi(st);
  return st;
});

/** Daftar kotak kendaraan untuk tabrakan pemain (referensi tetap). */
export const KOTAK_KENDARAAN: readonly AABB[] = KENDARAAN.map((k) => k.kotak);

/** Apakah titik (px, pz) berada di "kerucut depan" kendaraan dalam jarak tertentu? */
function diDepan(st: StateKendaraan, px: number, pz: number, jarak: number, lebar: number): boolean {
  const { lajur } = st.def;
  const fx = lajur.sumbu === 'x' ? lajur.arah : 0;
  const fz = lajur.sumbu === 'z' ? lajur.arah : 0;
  const rx = px - st.x;
  const rz = pz - st.z;
  const maju = rx * fx + rz * fz;
  const samping = Math.abs(rx * fz - rz * fx);
  return maju > 0 && maju < jarak && samping < lebar;
}

/**
 * Gerakkan semua kendaraan satu langkah.
 * Berhenti jika ada pemain atau kendaraan lain di depan. Kendaraan di jalan vertikal
 * mengalah pada jalan horizontal di persimpangan (mencegah saling tunggu).
 * Mengembalikan true jika ada kendaraan yang ingin membunyikan klakson ke pemain.
 */
export function langkahLaluLintas(dt: number, pemainX: number, pemainZ: number): boolean {
  let klakson = false;
  JAM_LALIN.t = sekarangMs() / 1000;
  for (const st of KENDARAAN) {
    const u = UKURAN_KENDARAAN[st.def.jenis];
    let harusBerhenti = diDepan(st, pemainX, pemainZ, u.panjang + 2.5, 1.4);
    const halangiPemain = harusBerhenti;

    // Lampu merah/kuning: berhenti di garis henti (moncong kendaraan = s + panjang)
    const { lajur } = st.def;
    if (!harusBerhenti && warnaLampu(lajur.sumbu) !== 'hijau') {
      for (const [sx, sz] of SIMPANG_LALIN) {
        const d = jarakKeSimpang(lajur.sumbu, lajur.garis, st.s, lajur.arah, sx, sz);
        if (d === null) continue;
        const depan = d - u.panjang;
        if (depan > LALIN.garisHenti - 0.4 && depan < LALIN.garisHenti + 3.5) {
          harusBerhenti = true;
          break;
        }
      }
    }

    if (!harusBerhenti) {
      for (const lain of KENDARAAN) {
        if (lain === st) continue;
        const a = st.def.lajur;
        const b = lain.def.lajur;
        const sejalur = a.sumbu === b.sumbu && a.garis === b.garis && a.arah === b.arah;
        const memotong = a.sumbu !== b.sumbu;
        // Abaikan lajur berlawanan di jalan yang sama; jalan utama hanya peduli lajurnya sendiri
        if (!sejalur && (!memotong || a.prioritas)) continue;
        const ul = UKURAN_KENDARAAN[lain.def.jenis];
        if (diDepan(st, lain.x, lain.z, u.panjang + ul.panjang + 1.6, sejalur ? 0.8 : 2.2)) {
          harusBerhenti = true;
          break;
        }
      }
    }

    const target = harusBerhenti ? 0 : st.def.kecepatan;
    const perubahan = (harusBerhenti ? 14 : 4) * dt; // rem lebih cepat dari gas
    st.v += Math.max(-perubahan, Math.min(perubahan, target - st.v));
    st.s += st.def.lajur.arah * st.v * dt;

    // Keluar ujung peta → muncul lagi dari ujung seberang
    const batas = st.def.lajur.sumbu === 'x' ? BATAS_X : BATAS_Z;
    if (st.s > batas) st.s = -batas;
    if (st.s < -batas) st.s = batas;
    posisi(st);

    st.klaksonCooldown -= dt;
    if (halangiPemain && st.klaksonCooldown <= 0) {
      st.klaksonCooldown = 2.5;
      klakson = true;
    }
  }
  return klakson;
}
