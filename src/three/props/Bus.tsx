// Bus antarkota pastel (prosedural, menghadap +z). Dipakai animasi pembuka.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances, RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { PALETTE, OUTLINE } from '../palette';
import { usePapan } from '../usePapan';

const BADAN = '#a8e6cf';
const LIS = '#ffb36b';
const PANJANG = 8;
const RODA_Z = [-2.6, 2.6];
// Tiang jendela di kedua sisi (instanced)
const TIANG: [number, number][] = [];
for (const s of [-1, 1]) for (let i = 0; i < 7; i++) TIANG.push([s * 1.19, -3.3 + i * 1.1]);

type Props = {
  /** Kecepatan putar roda (rad/detik), diisi pengendali */
  putar?: { current: number };
  /** Lampu depan menyala (malam) */
  lampu?: boolean;
};

export function Bus({ putar, lampu = false }: Props) {
  const roda = useRef<Group>(null);
  const papan = usePapan('KOTA KAMPUS', '#ffe08a', '#6b4430', 512, 96);
  useFrame((_, dt) => {
    const g = roda.current;
    if (!g || !putar) return;
    for (let i = 0; i < g.children.length; i++) g.children[i].rotation.x += putar.current * Math.min(dt, 0.1);
  });
  return (
    <group>
      {/* Badan bawah + lis oranye */}
      <RoundedBox args={[2.4, 1.35, PANJANG]} radius={0.2} smoothness={2} position={[0, 0.98, 0]} castShadow>
        <meshToonMaterial color={BADAN} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[2.44, 0.18, PANJANG - 0.3]} />
        <meshToonMaterial color={LIS} />
      </mesh>
      {/* Atap */}
      <RoundedBox args={[2.4, 0.5, PANJANG]} radius={0.2} smoothness={2} position={[0, 2.85, 0]} castShadow>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      {/* Kaca jendela tembus pandang (kepala penumpang terlihat) */}
      <mesh position={[0, 2.12, 0]}>
        <boxGeometry args={[2.34, 1.0, PANJANG - 0.2]} />
        <meshStandardMaterial color="#bfe6ff" transparent opacity={0.35} roughness={0.2} depthWrite={false} />
      </mesh>
      <Instances limit={TIANG.length}>
        <boxGeometry args={[0.06, 1.0, 0.14]} />
        <meshToonMaterial color={BADAN} />
        {TIANG.map(([x, z], i) => (
          <Instance key={i} position={[x, 2.12, z]} />
        ))}
      </Instances>
      {/* Pintu di sisi kiri (+x lokal) */}
      <mesh position={[1.215, 1.4, 2.7]}>
        <boxGeometry args={[0.03, 2.1, 0.9]} />
        <meshToonMaterial color="#7fb3e0" />
      </mesh>
      {/* Kursi (sandaran) */}
      {[-2.2, -0.6, 1].map((z) => (
        <mesh key={z} position={[0, 1.85, z]}>
          <boxGeometry args={[2.1, 0.6, 0.15]} />
          <meshToonMaterial color="#e98a6b" />
        </mesh>
      ))}
      {/* Papan tujuan & lampu depan */}
      <mesh position={[0, 2.85, PANJANG / 2 + 0.01]}>
        <planeGeometry args={[1.6, 0.3]} />
        <meshBasicMaterial map={papan} toneMapped={false} />
      </mesh>
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.75, PANJANG / 2 + 0.02]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          <meshBasicMaterial color={lampu ? '#fff3b0' : '#f4f4f4'} />
        </mesh>
      ))}
      {/* Roda */}
      <group ref={roda}>
        {RODA_Z.flatMap((z) =>
          [-1.12, 1.12].map((x) => (
            <mesh key={`${x}${z}`} position={[x, 0.45, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.45, 0.45, 0.32, 12]} />
              <meshToonMaterial color="#3a3a3a" />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}
