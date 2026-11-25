// Objek yang menghalangi pandangan kamera ke pemain otomatis memudar (tembus pandang).
import { useEffect, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Mesh, ShaderMaterial, type Group, type Material, type Object3D } from 'three';
import type { AABB } from '../game/collision';
import { playerPos } from '../game/playerPos';

const OPASITAS_TEMBUS = 0.22;
const rentang = { t0: 0, t1: 1 }; // dipakai ulang tiap frame

/** Satu sumbu uji "slab": persempit rentang t di mana garis berada di dalam [min, max]. */
function slab(p: number, d: number, min: number, max: number): boolean {
  if (Math.abs(d) < 1e-6) return p >= min && p <= max;
  const ta = (min - p) / d;
  const tb = (max - p) / d;
  rentang.t0 = Math.max(rentang.t0, Math.min(ta, tb));
  rentang.t1 = Math.min(rentang.t1, Math.max(ta, tb));
  return rentang.t0 <= rentang.t1;
}

/** Apakah garis dari pemain ke kamera menembus kotak? (uji AABB 3D) */
function menghalangi(cx: number, cy: number, cz: number, k: AABB, tinggi: number): boolean {
  const px = playerPos.x;
  const py = 0.9;
  const pz = playerPos.z;
  rentang.t0 = 0;
  rentang.t1 = 1;
  return slab(px, cx - px, k.minX, k.maxX) && slab(py, cy - py, 0, tinggi) && slab(pz, cz - pz, k.minZ, k.maxZ);
}

/**
 * Pasang pada grup objek besar (bangunan, halte, gerobak).
 * `kotak` = area objek di dunia (sudah diperbesar sedikit), `tinggi` = tinggi total.
 */
export function useTembusPandang(ref: RefObject<Group | null>, kotak: AABB, tinggi: number) {
  const camera = useThree((s) => s.camera);
  const opasitas = useRef(1);
  const bagian = useRef<{ bahan: Material[]; garis: Object3D[] }>({ bahan: [], garis: [] });

  // Kumpulkan semua material sekali saja. Outline (ShaderMaterial) disembunyikan saat tembus.
  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    const bahan: Material[] = [];
    const garis: Object3D[] = [];
    g.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const daftar: Material[] = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of daftar) {
        if (m instanceof ShaderMaterial) garis.push(o);
        else if (!bahan.includes(m)) {
          m.transparent = true; // diset sekali agar tidak kompilasi ulang shader saat memudar
          m.needsUpdate = true;
          bahan.push(m);
        }
      }
    });
    bagian.current = { bahan, garis };
  }, [ref]);

  useFrame((_, dt) => {
    const cx = (kotak.minX + kotak.maxX) / 2;
    const cz = (kotak.minZ + kotak.maxZ) / 2;
    // Lewati objek yang jauh dari pemain (hemat hitungan)
    if (opasitas.current === 1 && (Math.abs(cx - playerPos.x) > 30 || Math.abs(cz - playerPos.z) > 30)) return;
    const halang = menghalangi(camera.position.x, camera.position.y, camera.position.z, kotak, tinggi);
    const target = halang ? OPASITAS_TEMBUS : 1;
    const lama = opasitas.current;
    let baru = lama + (target - lama) * Math.min(1, dt * 8);
    if (Math.abs(target - baru) < 0.002) baru = target;
    if (baru === lama) return;
    opasitas.current = baru;
    const padat = baru > 0.95;
    for (const m of bagian.current.bahan) {
      // Material yang memang transparan (kaca) memakai opasitas aslinya sebagai batas atas
      const asli = (m.userData.opasitasAsli as number | undefined) ?? (m.userData.opasitasAsli = m.opacity);
      m.opacity = asli * baru;
      m.depthWrite = padat;
    }
    for (const o of bagian.current.garis) o.visible = padat;
  });
}

/** Perbesar kotak sedikit agar karakter yang menempel juga terlihat. */
export const perbesar = (k: AABB, m: number): AABB => ({ minX: k.minX - m, maxX: k.maxX + m, minZ: k.minZ - m, maxZ: k.maxZ + m });
