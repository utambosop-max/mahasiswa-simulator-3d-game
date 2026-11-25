import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PERTAMINI } from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';

const BOTOL = [-0.3, -0.1, 0.1, 0.3];

/** Kios bensin eceran Pak Jo: rak kayu berisi botol bensin kuning + ban bekas + papan kecil. */
export function Pertamini() {
  return (
    <group position={[PERTAMINI.x, 0, PERTAMINI.z]}>
      {/* Rak */}
      <RoundedBox args={[1.0, 1.1, 0.45]} radius={0.04} position={[0, 0.55, 0]} castShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* 2 baris botol bensin (Instancing tidak perlu: hanya 8 botol kecil tanpa outline) */}
      {[0.75, 1.2].map((y) =>
        BOTOL.map((x) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.08]}>
            <cylinderGeometry args={[0.06, 0.06, 0.22, 8]} />
            <meshStandardMaterial color="#f2c14e" transparent opacity={0.85} roughness={0.3} />
          </mesh>
        )),
      )}
      {/* Atap seng kecil */}
      <mesh position={[0, 1.55, 0.05]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[1.3, 0.05, 0.8]} />
        <meshToonMaterial color="#9aa3ad" />
      </mesh>
      {/* Papan merah "BENSIN" (warna aksen) */}
      <mesh position={[0, 1.75, 0.3]}>
        <boxGeometry args={[0.8, 0.22, 0.04]} />
        <meshToonMaterial color="#e9605a" />
      </mesh>
      {/* Ban bekas bengkel */}
      <mesh position={[0.85, 0.3, 0.1]} rotation={[0, 0.4, 0]}>
        <torusGeometry args={[0.26, 0.09, 8, 16]} />
        <meshToonMaterial color="#3b3b40" />
      </mesh>
    </group>
  );
}
