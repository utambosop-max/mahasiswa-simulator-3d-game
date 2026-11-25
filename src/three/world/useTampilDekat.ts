// M13: sembunyikan satu kawasan (grup) saat pemain jauh darinya.
// Instances yang tersebar luas (kos petak, lapak, padi) punya bola batas besar sehingga three.js
// hampir tidak pernah membuangnya (frustum culling) — padahal kamera hanya melihat ± 25 m di sekitar pemain.
// Cek ini murah: 1 perbandingan kotak per frame, tanpa alokasi.
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { AABB } from '../../game/collision';
import { playerPos } from '../../game/playerPos';

/** Grup terlihat hanya jika pemain berada ≤ `jarak` meter dari kotak kawasan. */
export function useTampilDekat(ref: RefObject<Group | null>, kotak: AABB, jarak = 24) {
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const dx = Math.max(kotak.minX - playerPos.x, 0, playerPos.x - kotak.maxX);
    const dz = Math.max(kotak.minZ - playerPos.z, 0, playerPos.z - kotak.maxZ);
    const tampil = dx < jarak && dz < jarak;
    if (g.visible !== tampil) g.visible = tampil;
  });
}
