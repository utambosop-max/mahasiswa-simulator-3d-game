// M12: gerobak cilok Mang Ujang yang keliling di trotoar jalan utama.
// Posisi dihitung di game/cilok.ts; komponen ini hanya menggambar & membunyikan lonceng "teng-teng".
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { CILOK, langkahCilok } from '../../game/cilok';
import { playerPos } from '../../game/playerPos';
import { useGame } from '../../game/store';
import { sfxTengTeng } from '../../audio/sfx';
import { Chibi } from '../characters/Chibi';
import { usePapan } from '../usePapan';
import { PALETTE, OUTLINE } from '../palette';

const DENGAR = 25; // lonceng terdengar sampai 25 m

export function GerobakCilok() {
  const grup = useRef<Group>(null);
  const jalan = useRef({ current: false }).current;
  const papan = usePapan('CILOK', '#e9605a');

  useFrame(() => {
    if (useGame.getState().transisi) return;
    // Posisi dari jam dunia nyata → sama di semua HP pemain online
    if (langkahCilok() && Math.hypot(playerPos.x - CILOK.x, playerPos.z - CILOK.z) < DENGAR) sfxTengTeng();
    jalan.current = !CILOK.mangkal;
    const g = grup.current;
    if (g) {
      g.position.set(CILOK.x, 0, CILOK.z);
      g.rotation.y = CILOK.rotY;
    }
  });

  return (
    <group ref={grup} position={[CILOK.x, 0, CILOK.z]}>
      {/* Badan gerobak (memanjang di sumbu z lokal = arah jalan) */}
      <RoundedBox args={[0.7, 0.55, 1.2]} radius={0.08} smoothness={2} position={[0, 0.75, 0.15]} castShadow>
        <meshToonMaterial color="#ffd6a5" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Kotak kaca + panci kukusan cilok */}
      <mesh position={[0, 1.22, 0.35]}>
        <boxGeometry args={[0.6, 0.38, 0.6]} />
        <meshStandardMaterial color="#dff1ff" transparent opacity={0.45} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.15, -0.2]}>
        <cylinderGeometry args={[0.2, 0.2, 0.25, 12]} />
        <meshToonMaterial color="#9aa3ad" />
      </mesh>
      {/* Roda */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.38, 0.28, 0.45]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.08, 14]} />
          <meshToonMaterial color="#3b2a20" />
        </mesh>
      ))}
      {/* Tiang + papan "CILOK" */}
      <mesh position={[0.3, 1.6, 0.6]}>
        <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
        <meshToonMaterial color="#8a5a35" />
      </mesh>
      <mesh position={[0.3, 2.05, 0.6]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 0.22]} />
        <meshBasicMaterial map={papan} side={2} />
      </mesh>
      {/* Mang Ujang mendorong dari belakang */}
      <group position={[0, 0, -0.85]}>
        <Chibi bergerak={jalan} baju="#e9605a" rambut="#2a1d15" aksesoris={['topi']} />
      </group>
    </group>
  );
}
