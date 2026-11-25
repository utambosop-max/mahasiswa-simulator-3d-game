import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';

/** Rak kecil + rice cooker + dispenser galon (pojok "dapur" anak kos). */
export function PojokDapur({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rak kayu rendah */}
      <RoundedBox args={[0.5, 0.5, 0.9]} radius={0.04} smoothness={2} position={[0, 0.25, -0.45]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Rice cooker */}
      <group position={[0, 0.5, -0.62]}>
        <mesh position={[0, 0.11, 0]} castShadow>
          <cylinderGeometry args={[0.17, 0.16, 0.22, 16]} />
          <meshToonMaterial color={PALETTE.putih} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
        <mesh position={[0, 0.22, 0]} scale={[1, 0.45, 1]}>
          <sphereGeometry args={[0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color={PALETTE.selimut} />
        </mesh>
      </group>
      {/* Teko */}
      <mesh position={[0, 0.58, -0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.16, 12]} />
        <meshToonMaterial color={PALETTE.oranye} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>

      {/* Dispenser + galon */}
      <group position={[0, 0, 0.6]}>
        <RoundedBox args={[0.45, 0.8, 0.45]} radius={0.05} smoothness={2} position={[0, 0.4, 0]} castShadow receiveShadow>
          <meshToonMaterial color={PALETTE.putih} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <RoundedBox args={[0.08, 0.06, 0.06]} radius={0.02} smoothness={2} position={[0.25, 0.55, 0.06]}>
          <meshToonMaterial color={PALETTE.merahBata} />
        </RoundedBox>
        <RoundedBox args={[0.08, 0.06, 0.06]} radius={0.02} smoothness={2} position={[0.25, 0.55, -0.06]}>
          <meshToonMaterial color={PALETTE.kasur} />
        </RoundedBox>
        <mesh position={[0, 1.02, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.42, 16]} />
          <meshStandardMaterial color={PALETTE.airGalon} transparent opacity={0.75} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
