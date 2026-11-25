import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';

const LACI_Y = [0.3, 0.7, 1.1];

/** Lemari plastik susun 3 laci khas anak kos. */
export function Lemari({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.8, 1.3, 0.55]} radius={0.06} smoothness={3} position={[0, 0.65, 0]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.mint} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      {LACI_Y.map((y) => (
        <group key={y} position={[0, y, 0.28]}>
          <RoundedBox args={[0.7, 0.32, 0.03]} radius={0.012} smoothness={2}>
            <meshToonMaterial color={PALETTE.mintMuda} />
          </RoundedBox>
          <RoundedBox args={[0.22, 0.05, 0.04]} radius={0.015} smoothness={2} position={[0, 0.06, 0.02]}>
            <meshToonMaterial color={PALETTE.putih} />
          </RoundedBox>
        </group>
      ))}
      {/* Tumpukan baju terlipat di atas lemari */}
      <RoundedBox args={[0.5, 0.08, 0.35]} radius={0.03} smoothness={2} position={[0, 1.34, 0]} castShadow>
        <meshToonMaterial color={PALETTE.baju[1]} />
      </RoundedBox>
      <RoundedBox args={[0.46, 0.08, 0.32]} radius={0.03} smoothness={2} position={[0.02, 1.42, 0]} rotation={[0, 0.15, 0]} castShadow>
        <meshToonMaterial color={PALETTE.baju[0]} />
      </RoundedBox>
    </group>
  );
}
