import { Outlines } from '../lod/Outlines';
import { POSISI } from '../../game/kamarLayout';
import { PALETTE, OUTLINE } from '../palette';

/** Gitar akustik bersandar di dinding kanan (badan = 2 bola pipih, leher = kotak). */
export function Gitar() {
  const [x, , z] = POSISI.gitar;
  return (
    // Menghadap ke dalam kamar (+x), bagian atas miring bersandar ke dinding kiri (−x)
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2, 0.22]}>
      <mesh position={[0, 0.28, 0]} scale={[1, 1, 0.38]} castShadow>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshToonMaterial color="#d98e4a" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, 0.58, 0]} scale={[1, 1, 0.38]} castShadow>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshToonMaterial color="#d98e4a" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Lubang suara */}
      <mesh position={[0, 0.42, 0.095]}>
        <circleGeometry args={[0.07, 16]} />
        <meshBasicMaterial color="#3b2a20" />
      </mesh>
      {/* Leher + kepala */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.07, 0.62, 0.05]} />
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </mesh>
      <mesh position={[0, 1.36, 0]}>
        <boxGeometry args={[0.11, 0.14, 0.05]} />
        <meshToonMaterial color="#5a3a24" />
      </mesh>
    </group>
  );
}
