import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { F2, hariMinggu, isMalam } from '../../game/sim';
import { LAPANGAN } from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';

const TENDA = [
  { x: -6, warna: '#e9605a' },
  { x: -2, warna: '#7fb3e0' },
  { x: 2, warna: '#f2d15c' },
];
const WARNA_LAMPU = ['#ffd877', '#ff9aa2', '#a8e6cf', '#bfe6ff'];

/** Pasar malam di lapangan futsal: hanya Sabtu malam. Tenda jajanan, lampu warna-warni, komidi putar. */
export function PasarMalam() {
  const buka = useGame((s) => hariMinggu(s.hari) === F2.pasarMalam.hari && isMalam(s.fase));
  const roda = useRef<Group>(null);
  useFrame((_, dt) => {
    if (roda.current) roda.current.rotation.z += dt * 0.4;
  });
  // Untaian lampu: 1 Instances = 1 draw call
  const lampu = useMemo(() => Array.from({ length: 28 }, (_, i) => ({ x: -9 + i * 0.65, y: 3.1 + Math.sin(i * 0.9) * 0.25, w: WARNA_LAMPU[i % 4] })), []);
  if (!buka) return null;
  return (
    <group position={[LAPANGAN.x, 0, LAPANGAN.z]}>
      {TENDA.map((t) => (
        <group key={t.x} position={[t.x, 0, -3]}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2.6, 1, 1.4]} />
            <meshToonMaterial color={PALETTE.putih} />
            <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
          </mesh>
          <mesh position={[0, 2.0, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[1.9, 1.1, 4]} />
            <meshToonMaterial color={t.warna} />
          </mesh>
          {[-1.2, 1.2].map((x) => (
            <mesh key={x} position={[x, 0.9, 0.6]}>
              <cylinderGeometry args={[0.05, 0.05, 1.8, 6]} />
              <meshToonMaterial color={PALETTE.kayuGelap} />
            </mesh>
          ))}
        </group>
      ))}
      <Instances limit={lampu.length}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshBasicMaterial />
        {lampu.map((l, i) => (
          <Instance key={i} position={[l.x, l.y, -2.2]} color={l.w} />
        ))}
      </Instances>
      {/* Komidi putar (roda) */}
      <group position={[6.5, 3.4, -3.5]}>
        <group ref={roda}>
          <mesh>
            <torusGeometry args={[2.4, 0.08, 6, 24]} />
            <meshToonMaterial color="#e98fb0" />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
              <mesh>
                <boxGeometry args={[4.8, 0.06, 0.06]} />
                <meshToonMaterial color="#fffaf2" />
              </mesh>
              <mesh position={[2.4, 0, 0]}>
                <boxGeometry args={[0.45, 0.4, 0.4]} />
                <meshToonMaterial color={WARNA_LAMPU[i % 4]} />
              </mesh>
            </group>
          ))}
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1, -1.7, 0]} rotation={[0, 0, s * 0.35]}>
            <cylinderGeometry args={[0.08, 0.1, 3.6, 6]} />
            <meshToonMaterial color="#9aa3ad" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
