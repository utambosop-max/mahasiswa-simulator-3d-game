// M13: warga figuran — berjalan mengikuti jalur, dan di ujung jalur BERHENTI, MENOLEH ke titik minatnya
// (lapak, sawah, sungai, kos) sebelum lanjut. Rutinitas berbeda per peran (riset: warga punya minat & "berpikir" dulu).
// Tidak bisa diajak ngobrol (bukan warga bernama), jadi ringan: tanpa Html, tanpa store.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { FIGURAN, type Figuran, type PeranFiguran } from '../../game/duniaLayout';
import { playerPos } from '../../game/playerPos';
import { Chibi } from '../characters/Chibi';
import { PengukurDev } from '../lod/PengukurDev';

const selisih = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Lama berhenti (detik) per peran: pembeli lama memilih jajan, petani mengamati sawah, anak hampir tidak berhenti. */
const JEDA: Record<PeranFiguran, [number, number]> = {
  pembeli: [2.2, 3.5],
  petani: [2.5, 4],
  anakKos: [1.2, 2.2],
  pejalan: [0.8, 1.6],
  anak: [0.2, 0.5],
  ibu: [1.5, 2.5],
};
const JAUH = 26; // > 26 m dari pemain: disembunyikan & tidak dihitung (hemat CPU & draw call)

function Figur({ f, seed }: { f: Figuran; seed: number }) {
  const ref = useRef<Group>(null);
  const bergerak = useRef(true);
  const st = useRef({ x: f.jalur[0][0], z: f.jalur[0][1], idx: 1, jeda: 0, tatap: 0, acak: seed });

  useFrame((_, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05);
    const s = st.current;
    if (Math.abs(playerPos.x - s.x) > JAUH || Math.abs(playerPos.z - s.z) > JAUH) {
      g.visible = false;
      return;
    }
    g.visible = true;

    // Pemain berdiri sangat dekat → berhenti sebentar & menoleh ke pemain (sopan, khas kampung)
    const dpx = playerPos.x - s.x;
    const dpz = playerPos.z - s.z;
    if (dpx * dpx + dpz * dpz < 1.6 * 1.6) {
      bergerak.current = false;
      g.rotation.y += selisih(g.rotation.y, Math.atan2(dpx, dpz)) * Math.min(1, dt * 6);
      return;
    }

    if (s.jeda > 0) {
      s.jeda -= dt;
      bergerak.current = false;
      // Menatap titik minat; separuh akhir jeda menoleh kiri-kanan (seperti sedang berpikir)
      if (f.lihat) {
        const target = Math.atan2(f.lihat[0] - s.x, f.lihat[1] - s.z) + (s.jeda < s.tatap * 0.5 ? Math.sin(s.jeda * 4) * 0.5 : 0);
        g.rotation.y += selisih(g.rotation.y, target) * Math.min(1, dt * 4);
      }
      return;
    }
    bergerak.current = true;

    const [tx, tz] = f.jalur[s.idx];
    const dx = tx - s.x;
    const dz = tz - s.z;
    const jarak = Math.hypot(dx, dz);
    const langkah = f.kecepatan * dt;
    if (jarak <= langkah) {
      s.x = tx;
      s.z = tz;
      s.idx = f.jalur.length === 2 ? (s.idx === 1 ? 0 : 1) : (s.idx + 1) % f.jalur.length;
      // Angka acak tetap per figuran (LCG) — tanpa Math.random agar ringan & bisa diulang
      s.acak = (s.acak * 1664525 + 1013904223) >>> 0;
      const [a, b] = JEDA[f.peran];
      s.jeda = a + (s.acak / 4294967296) * (b - a);
      s.tatap = s.jeda;
    } else {
      s.x += (dx / jarak) * langkah;
      s.z += (dz / jarak) * langkah;
      g.rotation.y += selisih(g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 8);
    }
    g.position.set(s.x, 0, s.z);
  });

  return (
    <group ref={ref} position={[f.jalur[0][0], 0, f.jalur[0][1]]}>
      <group scale={f.peran === 'anak' ? 0.78 : 1}>
        <Chibi bergerak={bergerak} baju={f.baju} kulit={f.kulit} rambut={f.rambut} gaya={f.gaya} aksesoris={f.aksesoris} tanpaBayangan />
      </group>
    </group>
  );
}

export function WargaFiguran() {
  return (
    <group>
      {import.meta.env.DEV && <PengukurDev />}
      {FIGURAN.map((f, i) => (
        <Figur key={i} f={f} seed={i * 7919 + 13} />
      ))}
    </group>
  );
}
