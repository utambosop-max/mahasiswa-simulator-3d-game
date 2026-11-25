import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';

/** Ember + gayung (wajib ada di kos-kosan). */
export function Ember({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.175, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.2, 0.35, 16]} />
        <meshToonMaterial color={PALETTE.merahBata} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Air */}
      <mesh position={[0, 0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.23, 16]} />
        <meshBasicMaterial color={PALETTE.airGalon} />
      </mesh>
      {/* Gayung mengapung */}
      <group position={[0.06, 0.36, 0.04]} rotation={[0, 0.6, 0]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.08, 0.08, 12]} />
          <meshToonMaterial color={PALETTE.mentega} />
        </mesh>
        <RoundedBox args={[0.3, 0.04, 0.05]} radius={0.015} smoothness={2} position={[0.22, 0.02, 0]}>
          <meshToonMaterial color={PALETTE.mentega} />
        </RoundedBox>
      </group>
    </group>
  );
}
