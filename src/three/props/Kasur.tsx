import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';
import type { Level } from '../../game/sim';
import { PopUpgrade } from './PopUpgrade';

export type { Level };
type Props = { level: Level; position: [number, number, number] };

// Semua kasur muat di kotak tabrakan 1.4 × 2.0 m. Bantal di sisi -z (dekat dinding).

/** Level 1: kasur lipat tipis di lantai. */
function KasurLipat() {
  return (
    <group>
      <RoundedBox args={[1.3, 0.18, 1.9]} radius={0.07} smoothness={3} position={[0, 0.09, 0]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.kasur} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[0.85, 0.14, 0.42]} radius={0.06} smoothness={3} position={[0, 0.25, -0.65]} castShadow>
        <meshToonMaterial color={PALETTE.bantal} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[1.0, 0.09, 0.5]} radius={0.04} smoothness={3} position={[0, 0.22, 0.55]} castShadow>
        <meshToonMaterial color={PALETTE.selimut} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
    </group>
  );
}

/** Level 2: kasur busa tebal + seprai + guling + selimut terbentang. */
function KasurBusa() {
  return (
    <group>
      <RoundedBox args={[1.32, 0.32, 1.92]} radius={0.09} smoothness={3} position={[0, 0.16, 0]} castShadow receiveShadow>
        <meshToonMaterial color="#8fc0e6" />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      {/* Seprai motif garis */}
      <RoundedBox args={[1.28, 0.04, 1.88]} radius={0.02} smoothness={2} position={[0, 0.33, 0]} receiveShadow>
        <meshToonMaterial color="#d8efff" />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.16, 0.42]} radius={0.07} smoothness={3} position={[-0.12, 0.43, -0.66]} castShadow>
        <meshToonMaterial color={PALETTE.bantal} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Guling */}
      <mesh position={[0.48, 0.44, -0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
        <meshToonMaterial color="#ffd6a5" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <RoundedBox args={[1.26, 0.07, 0.95]} radius={0.03} smoothness={2} position={[0, 0.38, 0.45]} castShadow>
        <meshToonMaterial color={PALETTE.selimut} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
    </group>
  );
}

const KAKI_RANJANG: [number, number][] = [
  [-0.62, -0.92],
  [0.62, -0.92],
  [-0.62, 0.92],
  [0.62, 0.92],
];

/** Level 3: springbed dengan rangka kayu, sandaran kepala, 2 bantal & bed cover. */
function Springbed() {
  return (
    <group>
      {KAKI_RANJANG.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
          <cylinderGeometry args={[0.05, 0.04, 0.12, 8]} />
          <meshToonMaterial color={PALETTE.kayuGelap} />
        </mesh>
      ))}
      {/* Rangka (divan) */}
      <RoundedBox args={[1.4, 0.26, 2.0]} radius={0.06} smoothness={2} position={[0, 0.24, 0]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      {/* Sandaran kepala */}
      <RoundedBox args={[1.42, 0.95, 0.12]} radius={0.06} smoothness={3} position={[0, 0.6, -0.95]} castShadow>
        <meshToonMaterial color="#c48d55" />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </RoundedBox>
      {/* Kasur pegas tebal */}
      <RoundedBox args={[1.32, 0.3, 1.84]} radius={0.1} smoothness={3} position={[0, 0.52, 0.04]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {[-0.32, 0.32].map((x) => (
        <RoundedBox key={x} args={[0.56, 0.16, 0.36]} radius={0.07} smoothness={3} position={[x, 0.74, -0.6]} castShadow>
          <meshToonMaterial color={PALETTE.bantal} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
      ))}
      {/* Bed cover ungu lembut */}
      <RoundedBox args={[1.38, 0.1, 1.15]} radius={0.04} smoothness={2} position={[0, 0.7, 0.36]} castShadow>
        <meshToonMaterial color="#bdb2ff" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[1.38, 0.11, 0.18]} radius={0.04} smoothness={2} position={[0, 0.71, -0.17]}>
        <meshToonMaterial color={PALETTE.putih} />
      </RoundedBox>
    </group>
  );
}

export function Kasur({ level, position }: Props) {
  return (
    <PopUpgrade kunci={level} position={position}>
      {level === 1 && <KasurLipat />}
      {level === 2 && <KasurBusa />}
      {level === 3 && <Springbed />}
    </PopUpgrade>
  );
}
