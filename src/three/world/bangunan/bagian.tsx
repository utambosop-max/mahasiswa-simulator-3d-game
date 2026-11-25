// Komponen kecil yang dipakai ulang oleh semua bangunan.
import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import { PlaneGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gabung } from '../../lod/bahan';
import { useGame } from '../../../game/store';
import { isMalam } from '../../../game/sim';
import { PALETTE, OUTLINE } from '../../palette';
import { usePapan } from '../../usePapan';

type V3 = [number, number, number];

/** Atap limas: kerucut 4 sisi yang diputar 45° lalu diskalakan ke ukuran bangunan. */
export function AtapLimas({ w, d, tinggi, y, warna }: { w: number; d: number; tinggi: number; y: number; warna: string }) {
  const k = 1.1 / Math.SQRT2;
  return (
    <group position={[0, y + tinggi / 2, 0]} scale={[w * k, 1, d * k]}>
      <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1, tinggi, 4]} />
        <meshToonMaterial color={warna} />
        <Outlines thickness={0.02} color={PALETTE.outline} />
      </mesh>
    </group>
  );
}

/** Jendela yang menyala kuning saat malam. */
export function JendelaBangunan({ posisi, w = 1, h = 1 }: { posisi: V3; w?: number; h?: number }) {
  const malam = useGame((s) => isMalam(s.fase));
  return (
    <group position={posisi}>
      <RoundedBox args={[w + 0.16, h + 0.16, 0.08]} radius={0.03} smoothness={2}>
        <meshToonMaterial color={PALETTE.putih} />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={malam ? '#ffd877' : '#a9d8f5'} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[0.05, h]} />
        <meshBasicMaterial color={PALETTE.putih} />
      </mesh>
    </group>
  );
}

export type DataJendela = { posisi: V3; w?: number; h?: number };

/**
 * Deretan jendela satu bangunan (tampilan sama persis dengan JendelaBangunan), tetapi semua bingkai,
 * kaca, dan tiang tengah masing-masing DIGABUNG jadi 1 mesh → selalu 3 draw call berapa pun jumlah jendelanya
 * (dulu 3 per jendela; Kos Melati 9 jendela = 27 → 3). Material tetap milik bangunan ini sendiri
 * agar efek tembus pandang (useTembusPandang) hanya memudarkan bangunan ini.
 */
export function JendelaDeret({ daftar }: { daftar: DataJendela[] }) {
  const malam = useGame((s) => isMalam(s.fase));
  const kunci = JSON.stringify(daftar);
  const geo = useMemo(() => {
    const d: DataJendela[] = JSON.parse(kunci);
    const p = (j: DataJendela, dz: number): V3 => [j.posisi[0], j.posisi[1], j.posisi[2] + dz];
    return {
      bingkai: gabung(d.map((j) => ({ geo: new RoundedBoxGeometry((j.w ?? 1) + 0.16, (j.h ?? 1) + 0.16, 0.08, 2, 0.03), pos: p(j, 0) }))),
      kaca: gabung(d.map((j) => ({ geo: new PlaneGeometry(j.w ?? 1, j.h ?? 1), pos: p(j, 0.045) }))),
      tiang: gabung(d.map((j) => ({ geo: new PlaneGeometry(0.05, j.h ?? 1), pos: p(j, 0.05) }))),
    };
  }, [kunci]);
  useEffect(
    () => () => {
      geo.bingkai.dispose();
      geo.kaca.dispose();
      geo.tiang.dispose();
    },
    [geo],
  );
  return (
    <group>
      <mesh geometry={geo.bingkai}>
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      <mesh geometry={geo.kaca}>
        <meshBasicMaterial color={malam ? '#ffd877' : '#a9d8f5'} />
      </mesh>
      <mesh geometry={geo.tiang}>
        <meshBasicMaterial color={PALETTE.putih} />
      </mesh>
    </group>
  );
}

/** Pintu kayu dengan gagang. */
export function Pintu({ posisi, w = 1.2, h = 2.1, warna = PALETTE.kayuGelap }: { posisi: V3; w?: number; h?: number; warna?: string }) {
  return (
    <group position={posisi}>
      <RoundedBox args={[w, h, 0.12]} radius={0.04} smoothness={2} position={[0, h / 2, 0]}>
        <meshToonMaterial color={warna} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[w * 0.32, h * 0.48, 0.08]}>
        <sphereGeometry args={[0.06, 10, 8]} />
        <meshToonMaterial color={PALETTE.mentega} />
      </mesh>
    </group>
  );
}

/** Papan nama bertulisan (tekstur kanvas). */
export function PapanNama({ teks, posisi, w, h, bg, fg }: { teks: string; posisi: V3; w: number; h: number; bg: string; fg?: string }) {
  const tex = usePapan(teks, bg, fg);
  return (
    <group position={posisi}>
      <RoundedBox args={[w + 0.15, h + 0.15, 0.12]} radius={0.04} smoothness={2}>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Kanopi bergaris (warteg/warkop), dimiringkan ke depan. */
export function Kanopi({ lebar, y, z, warnaA, warnaB }: { lebar: number; y: number; z: number; warnaA: string; warnaB: string }) {
  // Optimasi: belang berwarna sama digabung → 2 draw call (dulu 1 per belang)
  const geo = useMemo(() => {
    const jumlah = Math.round(lebar / 0.9);
    const lw = lebar / jumlah;
    const belang = (genap: number) =>
      gabung(
        Array.from({ length: jumlah }, (_, i) => i)
          .filter((i) => i % 2 === genap)
          .map((i) => ({ geo: new RoundedBoxGeometry(lw, 0.08, 1.7, 2, 0.03), pos: [-lebar / 2 + lw * (i + 0.5), 0, 0] as V3 })),
      );
    return { a: belang(0), b: jumlah > 1 ? belang(1) : null };
  }, [lebar]);
  useEffect(
    () => () => {
      geo.a.dispose();
      geo.b?.dispose();
    },
    [geo],
  );
  return (
    <group position={[0, y, z]} rotation={[0.3, 0, 0]}>
      <mesh geometry={geo.a} castShadow>
        <meshToonMaterial color={warnaA} />
      </mesh>
      {geo.b && (
        <mesh geometry={geo.b} castShadow>
          <meshToonMaterial color={warnaB} />
        </mesh>
      )}
    </group>
  );
}
