// Oyen versi pembuka: bisa berjalan (kaki melangkah) atau duduk tegak. Menghadap +z.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { PALETTE, OUTLINE } from '../palette';

const ORANYE = '#f2a65a';
const TUA = '#d9853b';
const KAKI: [number, number][] = [[-0.08, 0.14], [0.08, 0.14], [-0.08, -0.14], [0.08, -0.14]];

export function Oyen({ bergerak, duduk = false }: { bergerak: { current: boolean }; duduk?: boolean }) {
  const kaki = useRef<Group>(null);
  const ekor = useRef<Group>(null);
  const badan = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const g = kaki.current;
    if (g) for (let i = 0; i < g.children.length; i++) g.children[i].rotation.x = bergerak.current ? Math.sin(t * 14 + (i % 2 === 0 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * 0.6 : 0;
    if (ekor.current) ekor.current.rotation.z = Math.sin(t * 3) * 0.4;
    if (badan.current) badan.current.position.y = bergerak.current ? Math.abs(Math.sin(t * 14)) * 0.03 : 0;
  });
  return (
    <group ref={badan}>
      {duduk ? (
        <mesh position={[0, 0.2, -0.04]} rotation={[-0.3, 0, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.16, 4, 8]} />
          <meshToonMaterial color={ORANYE} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
      ) : (
        <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.12, 0.3, 4, 8]} />
          <meshToonMaterial color={ORANYE} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
      )}
      {!duduk && (
        <group ref={kaki}>
          {KAKI.map(([x, z], i) => (
            <group key={i} position={[x, 0.12, z]}>
              <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.035, 0.035, 0.12, 6]} />
                <meshToonMaterial color={TUA} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      <group position={[0, duduk ? 0.42 : 0.33, duduk ? 0.04 : 0.24]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshToonMaterial color={ORANYE} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.08, 0.13, 0]} rotation={[0, 0, -s * 0.3]}>
            <coneGeometry args={[0.05, 0.1, 4]} />
            <meshToonMaterial color={TUA} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`m${s}`} position={[s * 0.055, 0.02, 0.135]}>
            <sphereGeometry args={[0.022, 6, 6]} />
            <meshBasicMaterial color="#2a1d15" />
          </mesh>
        ))}
        <mesh position={[0, -0.03, 0.148]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color="#ff9aa2" />
        </mesh>
      </group>
      <group ref={ekor} position={[0, 0.18, duduk ? -0.15 : -0.22]}>
        <mesh position={[0, 0.12, -0.04]} rotation={[-0.4, 0, 0]}>
          <capsuleGeometry args={[0.03, 0.24, 4, 6]} />
          <meshToonMaterial color={TUA} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.25, 12]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}
