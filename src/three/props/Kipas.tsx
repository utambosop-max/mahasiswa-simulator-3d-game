import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { PALETTE, OUTLINE } from '../palette';
import { POSISI } from '../../game/kamarLayout';
import type { Level } from './Kasur';
import { PopUpgrade } from './PopUpgrade';

/** Level 1: kipas anyaman bambu bersandar di dinding. */
function KipasTangan() {
  return (
    <group rotation={[-0.35, 0.3, 0]} position={[0, 0, 0.12]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.4, 6]} />
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </mesh>
      <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 14]} />
        <meshToonMaterial color="#e8c98a" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
    </group>
  );
}

/** Level 2: kipas berdiri dengan baling-baling berputar. */
function KipasBerdiri() {
  const baling = useRef<Group>(null);
  useFrame((_, dt) => {
    if (baling.current) baling.current.rotation.z += dt * 14;
  });
  return (
    <group rotation={[0, 0.6, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.06, 14]} />
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.0, 8]} />
        <meshToonMaterial color={PALETTE.abu} />
      </mesh>
      <group position={[0, 1.12, 0]}>
        <mesh position={[0, 0, -0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.09, 0.14, 12]} />
          <meshToonMaterial color={PALETTE.putih} />
        </mesh>
        {/* Rumah kipas (jaring) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.27, 0.018, 6, 24]} />
          <meshToonMaterial color={PALETTE.mint} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
        <group ref={baling} position={[0, 0, 0.01]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 3]} position={[0, 0, 0]}>
              <boxGeometry args={[0.09, 0.44, 0.01]} />
              <meshToonMaterial color={PALETTE.mintMuda} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 0, 0.03]}>
          <sphereGeometry args={[0.04, 10, 8]} />
          <meshToonMaterial color={PALETTE.mint} />
        </mesh>
      </group>
    </group>
  );
}

/** Level 3: AC dinding dengan sirip yang bergoyang pelan + lampu indikator. */
function ACDinding() {
  const sirip = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sirip.current) sirip.current.rotation.x = 0.35 + Math.sin(clock.getElapsedTime() * 1.2) * 0.2;
  });
  return (
    <group>
      <RoundedBox args={[1.0, 0.32, 0.22]} radius={0.06} smoothness={3} castShadow>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <group ref={sirip} position={[0, -0.13, 0.11]}>
        <RoundedBox args={[0.86, 0.02, 0.08]} radius={0.008} smoothness={2} position={[0, 0, 0.03]}>
          <meshToonMaterial color={PALETTE.abu} />
        </RoundedBox>
      </group>
      <mesh position={[0.4, 0.06, 0.112]}>
        <circleGeometry args={[0.018, 10]} />
        <meshBasicMaterial color="#5fe08a" />
      </mesh>
      <mesh position={[-0.3, 0.06, 0.112]}>
        <planeGeometry args={[0.2, 0.03]} />
        <meshBasicMaterial color={PALETTE.wartegBiru} />
      </mesh>
    </group>
  );
}

/** Kipas/AC: posisinya berbeda per level (AC menempel di dinding atas kasur). */
export function Kipas({ level }: { level: Level }) {
  return (
    <PopUpgrade kunci={level} position={level === 3 ? POSISI.ac : POSISI.kipas}>
      {level === 1 && <KipasTangan />}
      {level === 2 && <KipasBerdiri />}
      {level === 3 && <ACDinding />}
    </PopUpgrade>
  );
}
