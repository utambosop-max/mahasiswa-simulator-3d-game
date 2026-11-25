// Tata letak Kamar Kos: posisi perabot + kotak tabrakan.
// Satu tempat untuk semua angka posisi, agar tampilan 3D dan tabrakan selalu cocok.
import { boxAt, type AABB } from './collision';
import type { Level, PerabotId } from './sim';

/** Kamar 8 x 6 meter, pusat di (0, 0). */
export const KAMAR = { halfW: 4, halfD: 3, tinggiDinding: 2.6 } as const;

type Pos = [number, number, number];

export const POSISI = {
  kasur: [-3.2, 0, -1.85] as Pos,
  meja: [0.8, 0, -2.4] as Pos,
  lemari: [3.2, 0, -2.5] as Pos,
  pojokDapur: [-3.55, 0, 0.85] as Pos,
  ember: [3.4, 0, 2.4] as Pos,
  /** Kipas tangan (Lv1) & kipas berdiri (Lv2) di sela kasur–meja */
  kipas: [-1.85, 0, -2.55] as Pos,
  /** AC dinding (Lv3) di atas kasur */
  ac: [-3.1, 2.2, -2.86] as Pos,
  /** Pot tanaman (Dekorasi Lv3) di sela meja–lemari */
  tanaman: [2.15, 0, -2.62] as Pos,
  /** Gitar bersandar di dinding kiri, di sela kasur & pojok dapur (terlihat dari kamera) */
  gitar: [-3.82, 0, -0.48] as Pos,
};

/** Kloset di pojok kamar mandi (sebelah ember, M11) */
export const KLOSET = { x: 2.55, z: 2.6 } as const;

/** Akuarium cupang (barang) di sela kipas & meja, menempel dinding belakang */
export const AKUARIUM = { x: -0.62, z: -2.68 } as const;

/** Titik muncul di kamar: di dekat pintu, menghadap ke dalam kamar. */
export const SPAWN_KAMAR = { x: -2.9, z: 1.6, rotY: Math.PI / 2 } as const;

const T = 1; // ketebalan dinding tabrakan (dibuat tebal agar tidak tembus)
const { halfW, halfD } = KAMAR;

export const KAMAR_COLLIDERS: readonly AABB[] = [
  // Dinding: belakang, depan, kiri, kanan
  { minX: -halfW - T, maxX: halfW + T, minZ: -halfD - T, maxZ: -halfD },
  { minX: -halfW - T, maxX: halfW + T, minZ: halfD, maxZ: halfD + T },
  { minX: -halfW - T, maxX: -halfW, minZ: -halfD - T, maxZ: halfD + T },
  { minX: halfW, maxX: halfW + T, minZ: -halfD - T, maxZ: halfD + T },
  // Perabot
  boxAt(POSISI.kasur[0], POSISI.kasur[2], 1.4, 2.0),
  boxAt(POSISI.meja[0], POSISI.meja[2], 1.25, 0.7),
  boxAt(POSISI.lemari[0], POSISI.lemari[2], 0.85, 0.6),
  boxAt(POSISI.pojokDapur[0], POSISI.pojokDapur[2], 0.6, 1.9),
  boxAt(POSISI.ember[0], POSISI.ember[2], 0.6, 0.6),
  boxAt(KLOSET.x, KLOSET.z, 0.5, 0.6),
  // Sekat kamar mandi
  boxAt(2.08, 2.25, 0.12, 1.5),
];

const KOTAK_KIPAS = boxAt(POSISI.kipas[0], POSISI.kipas[2], 0.5, 0.5);
const KOTAK_TANAMAN = boxAt(POSISI.tanaman[0], POSISI.tanaman[2], 0.5, 0.5);

/** Kotak tabrakan kamar sesuai level perabot (kipas berdiri & pot tanaman ikut menghalangi). */
export function kamarColliders(level: Record<PerabotId, Level>): readonly AABB[] {
  const extra: AABB[] = [];
  if (level.kipas === 2) extra.push(KOTAK_KIPAS);
  if (level.dekorasi === 3) extra.push(KOTAK_TANAMAN);
  return extra.length ? [...KAMAR_COLLIDERS, ...extra] : KAMAR_COLLIDERS;
}
