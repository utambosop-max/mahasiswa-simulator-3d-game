// LOD (level of detail) berdasarkan jarak: 0 = sangat dekat (pemain sendiri / lawan bicara: semua bagian berbayangan),
// 1 = dekat (tampilan penuh, hanya badan+kepala ikut pass bayangan), 2 = jauh (tanpa outline/bayangan/detail kecil),
// 3 = sangat jauh (siluet sederhana). Jarak = MIN(jarak ke pemain, jarak ke kamera) di bidang datar, sehingga:
// - di dunia: warga dekat pemain selalu detail penuh;
// - di layar buat karakter / animasi pembuka: karakter dekat kamera tetap detail penuh.
// Hanya memicu render ulang React saat level BERUBAH (pakai histeresis 1 m agar tidak berkedip di batas).
import { useRef, useState, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Object3D } from 'three';
import { playerPos } from '../../game/playerPos';

export const LOD_UTAMA = 4; // m — di bawah ini semua anggota badan ikut bayangan
export const LOD_JAUH = 13; // m — mulai tanpa outline, alis, kilau mata, bayangan
export const LOD_SILUET = 22; // m — siluet sederhana
const HISTERESIS = 1;

export type LevelLod = 0 | 1 | 2 | 3;

export function useLodJarak(ref: RefObject<Object3D | null>, paksa?: LevelLod): LevelLod {
  const [level, setLevel] = useState<LevelLod>(paksa ?? 0);
  const levelRef = useRef<LevelLod>(level);
  const tunggu = useRef(Math.floor(Math.random() * 8)); // cek tiap 8 frame, disebar acak antar-karakter

  useFrame(({ camera }) => {
    if (paksa !== undefined) return;
    if (++tunggu.current < 8) return;
    tunggu.current = 0;
    const o = ref.current;
    if (!o) return;
    // Posisi dunia dari matriks frame lalu (tanpa alokasi)
    const e = o.matrixWorld.elements;
    const x = e[12];
    const z = e[14];
    const dp = Math.hypot(x - playerPos.x, z - playerPos.z);
    const dk = Math.hypot(x - camera.position.x, z - camera.position.z, e[13] - camera.position.y) - 6;
    const d = Math.min(dp, dk);
    const l = levelRef.current;
    let baru: LevelLod = l;
    if (d > LOD_SILUET + (l === 3 ? -HISTERESIS : 0)) baru = 3;
    else if (d > LOD_JAUH + (l >= 2 ? -HISTERESIS : 0)) baru = 2;
    else if (d > LOD_UTAMA + (l >= 1 ? -HISTERESIS : 0)) baru = 1;
    else baru = 0;
    if (baru !== l) {
      levelRef.current = baru;
      setLevel(baru);
    }
  });
  return paksa ?? level;
}
