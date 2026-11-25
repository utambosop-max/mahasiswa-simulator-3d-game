// M12: tiang lampu lalu lintas di perempatan. Warna mengikuti warnaLampu() di lalulintas.ts.
// Hemat: semua tiang yang melayani arus sama memakai material yang SAMA (6 material total),
// jadi tiap frame cukup mengganti warna 6 material — tanpa alokasi baru.
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { CircleGeometry, CylinderGeometry, MeshBasicMaterial } from 'three';
import { gabung } from '../lod/bahan';
import { TIANG_LALIN } from '../../game/duniaLayout';
import { warnaLampu, type WarnaLampu } from '../../game/lalulintas';
import { PALETTE, OUTLINE } from '../palette';

const URUTAN: readonly WarnaLampu[] = ['merah', 'kuning', 'hijau'];
const NYALA: Record<WarnaLampu, number> = { merah: 0xff4d4d, kuning: 0xffd23f, hijau: 0x4ce07a };
const PADAM: Record<WarnaLampu, number> = { merah: 0x5a3434, kuning: 0x5a5034, hijau: 0x2f4a38 };

type SetMaterial = Record<WarnaLampu, MeshBasicMaterial>;

// Optimasi 2026-11-23 (20): geometri gabungan dibuat sekali (posisi dunia dihitung dari posisi + rotasi tiang).
const GEO = (() => {
  const bulat = (sumbu: 'x' | 'z', j: number) =>
    gabung(
      TIANG_LALIN.filter((t) => t.sumbu === sumbu).map((t) => ({
        geo: new CircleGeometry(0.13, 14),
        pos: [t.x + Math.sin(t.rotY) * 0.17, 3.35 - j * 0.34, t.z + Math.cos(t.rotY) * 0.17] as [number, number, number],
        rot: [0, t.rotY, 0] as [number, number, number],
      })),
    );
  const set = (sumbu: 'x' | 'z') => ({ merah: bulat(sumbu, 0), kuning: bulat(sumbu, 1), hijau: bulat(sumbu, 2) });
  return {
    tiang: gabung(TIANG_LALIN.map((t) => ({ geo: new CylinderGeometry(0.08, 0.1, 3, 8), pos: [t.x, 1.5, t.z] as [number, number, number] }))),
    bulat: { x: set('x'), z: set('z') },
  };
})();

export function LampuLalin() {
  // Material per arus: 'x' (jalan horizontal) & 'z' (jalan vertikal)
  const mat = useMemo(() => {
    const buat = (): SetMaterial => ({
      merah: new MeshBasicMaterial({ color: PADAM.merah }),
      kuning: new MeshBasicMaterial({ color: PADAM.kuning }),
      hijau: new MeshBasicMaterial({ color: PADAM.hijau }),
    });
    return { x: buat(), z: buat() };
  }, []);
  const terakhir = useMemo(() => ({ x: '' as string, z: '' as string }), []);

  useFrame(() => {
    for (const sumbu of ['x', 'z'] as const) {
      const w = warnaLampu(sumbu);
      if (terakhir[sumbu] === w) continue; // hanya ganti saat berubah
      terakhir[sumbu] = w;
      for (const k of URUTAN) mat[sumbu][k].color.setHex(k === w ? NYALA[k] : PADAM[k]);
    }
  });

  return (
    <group>
      {/* Semua tiang = 1 mesh gabungan; bulatan lampu digabung per (arus, warna) = 6 mesh untuk semua perempatan */}
      <mesh geometry={GEO.tiang} castShadow>
        <meshToonMaterial color="#5b6170" />
      </mesh>
      {(['x', 'z'] as const).map((sumbu) =>
        URUTAN.map((k) => <mesh key={sumbu + k} geometry={GEO.bulat[sumbu][k]} material={mat[sumbu][k]} />),
      )}
      {TIANG_LALIN.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.rotY, 0]}>
          {/* Kepala lampu menghadap +z lokal (ke arus yang datang) */}
          <RoundedBox args={[0.42, 1.15, 0.32]} radius={0.08} smoothness={2} position={[0, 3.0, 0]} castShadow>
            <meshToonMaterial color="#2f3440" />
            <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
          </RoundedBox>

        </group>
      ))}
    </group>
  );
}
