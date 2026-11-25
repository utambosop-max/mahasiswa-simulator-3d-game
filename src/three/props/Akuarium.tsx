import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { AKUARIUM } from '../../game/kamarLayout';
import { PALETTE, OUTLINE } from '../palette';

/** Akuarium ikan cupang di atas meja kecil (muncul setelah dibeli). Ikan berenang bolak-balik. */
export function Akuarium() {
  const punya = useGame((s) => !!s.tas.akuarium);
  const ikan = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ikan.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.position.x = Math.sin(t * 0.8) * 0.15;
    g.position.y = 0.92 + Math.sin(t * 1.7) * 0.03;
    g.rotation.y = Math.cos(t * 0.8) > 0 ? 0 : Math.PI; // berbalik arah di ujung
  });
  if (!punya) return null;
  return (
    <group position={[AKUARIUM.x, 0, AKUARIUM.z]}>
      {/* Meja kecil */}
      <RoundedBox args={[0.6, 0.65, 0.4]} radius={0.04} position={[0, 0.325, 0]} castShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Kaca + air */}
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[0.52, 0.42, 0.32]} />
        <meshStandardMaterial color="#8fd3ff" transparent opacity={0.45} roughness={0.15} />
      </mesh>
      {/* Pasir & tanaman air */}
      <mesh position={[0, 0.69, 0]}>
        <boxGeometry args={[0.5, 0.04, 0.3]} />
        <meshToonMaterial color="#f2d9a6" />
      </mesh>
      <mesh position={[-0.16, 0.8, -0.05]}>
        <coneGeometry args={[0.04, 0.2, 5]} />
        <meshToonMaterial color="#6bb86e" />
      </mesh>
      {/* Ikan cupang merah */}
      <group ref={ikan} position={[0, 0.92, 0.02]}>
        <mesh scale={[1.6, 1, 0.6]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshToonMaterial color="#e23b3b" />
        </mesh>
        <mesh position={[-0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.04, 0.06, 4]} />
          <meshToonMaterial color="#ff6b6b" />
        </mesh>
      </group>
    </group>
  );
}
