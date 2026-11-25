// Interior gedung (semua bangunan bisa dimasuki). Satu ruangan 10 x 7 m dengan perabot sesuai jenis gedung.
// Data posisi dipakai bersama oleh tampilan 3D (InteriorGedung.tsx), tabrakan, dan interaksi.
import { boxAt, type AABB } from './collision';
import { BANGUNAN, type Bangunan } from './duniaLayout';
import type { AksiId } from './sim';

export const RUANG = { halfW: 5, halfD: 3.5, tinggi: 2.8 } as const;
/** Muncul di dekat pintu (dinding kiri), menghadap ke dalam ruangan */
export const SPAWN_GEDUNG = { x: -4.1, z: 2.2, rotY: Math.PI / 2 } as const;
export const PINTU_GEDUNG = { x: -RUANG.halfW, z: 2.2 } as const;

/** Satu perabot: `jenis` menentukan bentuk 3D-nya; w/d = ukuran tabrakan (0 = tanpa tabrakan). */
export type PerabotGedung = { jenis: string; x: number; z: number; w: number; d: number; rot?: number; warna?: string };

/** Penghuni rumah warga (id warga di fitur3.json) */
export const PENGHUNI_RUMAH: Record<string, string> = {
  rumah1: 'pakRT',
  rumah2: 'ani',
  rumah3: 'bayu',
  rumah4: 'joko',
  rumah5: 'rina',
  rumah6: 'dimas',
  rumah7: 'laras',
  rumah8: 'sinta',
  rumah9: 'kevin',
  rumah10: 'yoga',
  rumah11: 'putri',
  rumah12: 'nadia',
};

/** Penjaga/pemilik di balik konter (tampil sebagai chibi). */
export const PENJAGA: Record<string, { nama: string; baju: string; rambut: string }> = {
  warteg: { nama: 'Mbak Sri', baju: '#7cc6a4', rambut: '#2a1d15' },
  warkop: { nama: 'Bang Udin', baju: '#6b4430', rambut: '#2a1d15' },
  kampus: { nama: 'Pak Dosen Budiman', baju: '#7fb3e0', rambut: '#9aa3ad' },
  minimarket: { nama: 'Kasir', baju: '#e9605a', rambut: '#3b2a20' },
  perpus: { nama: 'Bu Pustakawan', baju: '#a86b3c', rambut: '#3b2a20' },
  klinik: { nama: 'Dokter Rani', baju: '#ffffff', rambut: '#2a1d15' },
  warnet: { nama: 'Operator', baju: '#3b4673', rambut: '#2a1d15' },
  fotokopi: { nama: 'Mas Fotokopi', baju: '#7cc6a4', rambut: '#3b2a20' },
  laundry: { nama: 'Mbak Laundry', baju: '#7fb3e0', rambut: '#6b4430' },
  kafe: { nama: 'Barista Dita', baju: '#3b2a20', rambut: '#a0522d' },
  // M12
  bank: { nama: 'Teller Mbak Wulan', baju: '#e9b949', rambut: '#2a1d15' },
  gor: { nama: 'Coach Bambang', baju: '#ff7a59', rambut: '#2a1d15' },
  karier: { nama: 'Bu Konselor Ayu', baju: '#9b7fd1', rambut: '#3b2a20' },
  tani: { nama: 'Pak Tani Karto', baju: '#6cbf5a', rambut: '#9aa3ad' },
  pasar: { nama: 'Mbok Darmi', baju: '#c46a3a', rambut: '#3b2a20' },
  salon: { nama: 'Bang Cukur', baju: '#ff9ac1', rambut: '#2a1d15' },
  polisi: { nama: 'Pak Polisi Hendra', baju: '#3d5a99', rambut: '#2a1d15' },
};

const KONTER: PerabotGedung = { jenis: 'konter', x: 0, z: -2.55, w: 3.4, d: 0.8 };

/** Perabot per gedung (id bangunan); rumah warga memakai satu tata letak yang sama. */
function perabotUntuk(b: Bangunan): PerabotGedung[] {
  switch (b.id) {
    case 'warteg':
      return [
        { ...KONTER, jenis: 'etalase' },
        { jenis: 'mejaPanjang', x: 0.6, z: 0.9, w: 4, d: 0.9 },
        { jenis: 'bangku', x: 0.6, z: 0.15, w: 4, d: 0.35 },
        { jenis: 'bangku', x: 0.6, z: 1.65, w: 4, d: 0.35 },
        { jenis: 'termos', x: 4.4, z: -2.9, w: 0.6, d: 0.6 },
      ];
    case 'warkop':
      return [
        { ...KONTER, jenis: 'konterKopi' },
        { jenis: 'mejaBulat', x: -1.6, z: 0.8, w: 1, d: 1 },
        { jenis: 'mejaBulat', x: 1.4, z: 0.9, w: 1, d: 1 },
        { jenis: 'mejaBulat', x: 3.6, z: -0.6, w: 1, d: 1 },
        { jenis: 'tv', x: 3.2, z: -3.38, w: 0, d: 0 },
      ];
    case 'kampus':
      return [
        { jenis: 'papanTulis', x: 0, z: -3.38, w: 0, d: 0 },
        { ...KONTER, jenis: 'mejaDosen', w: 2.2, d: 0.8, z: -2.2 },
        ...[-2.6, 0, 2.6].flatMap((x) => [0.2, 1.8].map((z): PerabotGedung => ({ jenis: 'mejaKuliah', x, z, w: 1.6, d: 0.7 }))),
      ];
    case 'minimarket':
      return [
        { ...KONTER, jenis: 'kasir' },
        { jenis: 'rak', x: -2.3, z: 0.7, w: 2.6, d: 0.6, warna: '#e9605a' },
        { jenis: 'rak', x: 1.6, z: 0.7, w: 2.6, d: 0.6, warna: '#7fb3e0' },
        { jenis: 'kulkas', x: 4.45, z: -0.6, w: 0.8, d: 1.8 },
      ];
    case 'perpus':
      return [
        { ...KONTER, jenis: 'mejaPustakawan', w: 2.4 },
        { jenis: 'rakBuku', x: -3.4, z: -3.05, w: 2.4, d: 0.6 },
        { jenis: 'rakBuku', x: 3.4, z: -3.05, w: 2.4, d: 0.6 },
        { jenis: 'rakBuku', x: 4.6, z: 0.3, w: 0.6, d: 2.4, rot: Math.PI / 2 },
        { jenis: 'mejaBaca', x: -1.8, z: 0.9, w: 2.2, d: 1.1 },
        { jenis: 'mejaBaca', x: 1.8, z: 0.9, w: 2.2, d: 1.1 },
      ];
    case 'klinik':
      return [
        { ...KONTER, jenis: 'resepsionis' },
        { jenis: 'ranjang', x: 3.4, z: 0.4, w: 1.1, d: 2.1 },
        { jenis: 'kursiTunggu', x: -1.6, z: 1.9, w: 2.6, d: 0.5 },
        { jenis: 'tanaman', x: 4.4, z: -2.9, w: 0.6, d: 0.6 },
      ];
    case 'warnet':
      return [
        { ...KONTER, jenis: 'kasir', x: -2.6, w: 2.4 },
        ...[-1.8, 1.4].flatMap((x) => [0.1, 1.9].map((z): PerabotGedung => ({ jenis: 'mejaPC', x, z, w: 2.4, d: 0.7 }))),
        { jenis: 'mejaPC', x: 3.3, z: -2.6, w: 2.4, d: 0.7 },
      ];
    case 'fotokopi':
      return [
        { ...KONTER },
        { jenis: 'mesinFotokopi', x: -3.2, z: -0.4, w: 1.2, d: 0.9 },
        { jenis: 'mesinFotokopi', x: 3.2, z: -0.4, w: 1.2, d: 0.9 },
        { jenis: 'rakKertas', x: 4.5, z: 1.6, w: 0.6, d: 1.4 },
      ];
    case 'laundry':
      return [
        { ...KONTER },
        ...[-2.6, -1.3, 1.3, 2.6].map((x): PerabotGedung => ({ jenis: 'mesinCuci', x, z: 0.8, w: 1.05, d: 0.95 })),
        { jenis: 'keranjang', x: 4.4, z: -2.9, w: 0.7, d: 0.7 },
      ];
    case 'kafe':
      return [
        { ...KONTER, jenis: 'konterKafe' },
        { jenis: 'mejaKafe', x: -2.6, z: 0.5, w: 1.1, d: 1.1 },
        { jenis: 'mejaKafe', x: 0.2, z: 1.3, w: 1.1, d: 1.1 },
        { jenis: 'mejaKafe', x: 2.9, z: 0.5, w: 1.1, d: 1.1 },
        { jenis: 'sofa', x: 3.9, z: 2.4, w: 2, d: 0.8, rot: Math.PI },
        { jenis: 'tanaman', x: -4.4, z: -2.9, w: 0.6, d: 0.6 },
        { jenis: 'tanaman', x: 4.4, z: -2.9, w: 0.6, d: 0.6 },
      ];
    // ===== M12 =====
    case 'bank':
      return [
        { ...KONTER, jenis: 'resepsionis', w: 3.6 },
        { jenis: 'brankas', x: 4.2, z: -2.8, w: 1.0, d: 0.8 },
        { jenis: 'kursiTunggu', x: -1.2, z: 1.9, w: 2.6, d: 0.5 },
        { jenis: 'kursiTunggu', x: 2.2, z: 1.9, w: 2.6, d: 0.5 },
        { jenis: 'tanaman', x: -4.4, z: -2.9, w: 0.6, d: 0.6 },
      ];
    case 'gor':
      return [
        { ...KONTER, jenis: 'resepsionis', x: -2.4, w: 2.4 },
        { jenis: 'matras', x: 1.8, z: 0.8, w: 0, d: 0, warna: '#ff7a59' },
        { jenis: 'alatGym', x: 1.0, z: 0.8, w: 0.5, d: 1.4 },
        { jenis: 'alatGym', x: 3.0, z: 0.8, w: 0.5, d: 1.4 },
        { jenis: 'matras', x: 2.6, z: -2.3, w: 0, d: 0, warna: '#7fb3e0' },
        { jenis: 'keranjang', x: 4.4, z: 2.8, w: 0.7, d: 0.7 },
      ];
    case 'karier':
      return [
        { ...KONTER, jenis: 'mejaPustakawan', w: 2.6 },
        { jenis: 'papanTulis', x: 2.6, z: -3.38, w: 0, d: 0 },
        { jenis: 'kursiTunggu', x: -1.4, z: 1.9, w: 2.6, d: 0.5 },
        { jenis: 'mejaBaca', x: 2.6, z: 0.9, w: 2.2, d: 1.1 },
        { jenis: 'rakBuku', x: 4.6, z: -1.2, w: 0.6, d: 2.0, rot: Math.PI / 2 },
      ];
    case 'tani':
      return [
        { ...KONTER, jenis: 'kasir', w: 3.0 },
        { jenis: 'galonRak', x: 3.6, z: 0.6, w: 1.8, d: 0.7 },
        { jenis: 'rak', x: -2.2, z: 0.7, w: 2.4, d: 0.6, warna: '#6cbf5a' },
        { jenis: 'tanaman', x: 4.4, z: -2.9, w: 0.6, d: 0.6 },
        { jenis: 'tanaman', x: 1.0, z: 2.8, w: 0.6, d: 0.6 },
      ];
    case 'pasar':
      return [
        { ...KONTER, jenis: 'etalase' },
        { jenis: 'lapak', x: -1.8, z: 0.8, w: 2.0, d: 0.9 },
        { jenis: 'lapak', x: 1.6, z: 0.8, w: 2.0, d: 0.9 },
        { jenis: 'keranjang', x: 4.3, z: -0.4, w: 0.7, d: 0.7 },
        { jenis: 'keranjang', x: 4.3, z: 1.0, w: 0.7, d: 0.7 },
      ];
    case 'salon':
      return [
        { ...KONTER, x: -2.6, w: 2.2 },
        { jenis: 'cermin', x: 1.2, z: -3.4, w: 0, d: 0 },
        { jenis: 'cermin', x: 3.6, z: -3.4, w: 0, d: 0 },
        { jenis: 'kursiCukur', x: 1.2, z: -2.4, w: 0.7, d: 0.7 },
        { jenis: 'kursiCukur', x: 3.6, z: -2.4, w: 0.7, d: 0.7 },
        { jenis: 'kursiTunggu', x: 1.8, z: 1.9, w: 2.6, d: 0.5 },
      ];
    case 'polisi':
      return [
        { ...KONTER, jenis: 'resepsionis', w: 3.0 },
        { jenis: 'papanTulis', x: 2.8, z: -3.38, w: 0, d: 0 },
        { jenis: 'kursiTunggu', x: 0.4, z: 1.9, w: 2.6, d: 0.5 },
        { jenis: 'mejaDosen', x: 3.4, z: 0.4, w: 1.6, d: 0.8 },
        { jenis: 'tanaman', x: -4.4, z: -2.9, w: 0.6, d: 0.6 },
      ];
    default:
      // Rumah warga: ruang tamu
      return [
        { jenis: 'sofa', x: -1.2, z: -2.75, w: 2.8, d: 0.9 },
        { jenis: 'mejaTamu', x: -1.2, z: -1.45, w: 1.5, d: 0.75 },
        { jenis: 'tv', x: 2.8, z: -3.38, w: 0, d: 0 },
        { jenis: 'lemariTv', x: 2.8, z: -3.05, w: 2, d: 0.6 },
        { jenis: 'karpet', x: -0.4, z: -0.6, w: 0, d: 0 },
        { jenis: 'tanaman', x: 4.4, z: 2.8, w: 0.6, d: 0.6 },
      ];
  }
}

export type TataGedung = {
  bangunan: Bangunan;
  perabot: PerabotGedung[];
  colliders: AABB[];
  /** Titik interaksi konter (aksi gedung) */
  konter: { x: number; z: number } | null;
  /** Posisi penjaga / tuan rumah */
  penjaga: { x: number; z: number };
  /** Rumah warga: id warga tuan rumah */
  tuanRumah: string | null;
  /** Kafe: titik meja kerja */
  meja: { x: number; z: number } | null;
};

const cache = new Map<string, TataGedung>();

/** Tata letak lengkap gedung (dihitung sekali per gedung). */
export function tataGedung(id: string): TataGedung | null {
  const ada = cache.get(id);
  if (ada) return ada;
  const b = BANGUNAN.find((x) => x.id === id);
  if (!b) return null;
  const perabot = perabotUntuk(b);
  const { halfW, halfD } = RUANG;
  const T = 1;
  const colliders: AABB[] = [
    { minX: -halfW - T, maxX: halfW + T, minZ: -halfD - T, maxZ: -halfD },
    { minX: -halfW - T, maxX: halfW + T, minZ: halfD, maxZ: halfD + T },
    { minX: -halfW - T, maxX: -halfW, minZ: -halfD - T, maxZ: halfD + T },
    { minX: halfW, maxX: halfW + T, minZ: -halfD - T, maxZ: halfD + T },
    ...perabot.filter((p) => p.w > 0 && p.d > 0).map((p) => boxAt(p.x, p.z, p.w, p.d)),
  ];
  const rumah = b.jenis === 'rumah';
  const k = perabot.find((p) => p.z < -1.5 && ['konter', 'etalase', 'konterKopi', 'mejaDosen', 'kasir', 'mejaPustakawan', 'resepsionis', 'konterKafe'].includes(p.jenis));
  const meja = perabot.find((p) => p.jenis === 'mejaKafe' && p.x > -1 && p.x < 1);
  const hasil: TataGedung = {
    bangunan: b,
    perabot,
    colliders,
    konter: k ? { x: k.x, z: k.z + k.d / 2 + 0.75 } : null,
    penjaga: k ? { x: k.x, z: k.z - k.d / 2 - 0.45 } : { x: 1.4, z: -2.4 },
    tuanRumah: rumah ? (PENGHUNI_RUMAH[b.id] ?? null) : null,
    meja: meja ? { x: meja.x, z: meja.z + 1.1 } : null,
  };
  cache.set(id, hasil);
  return hasil;
}

/** Aksi di konter = aksi gedung kecuali "masuk". */
export const aksiKonter = (b: Bangunan): AksiId[] => (b.aksi ?? []).filter((a) => a !== 'masukGedung');
