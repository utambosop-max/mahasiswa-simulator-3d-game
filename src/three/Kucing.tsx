import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from './lod/Outlines';
import type { Group, Mesh } from 'three';
import { KUCING } from '../game/duniaLayout';
import { PALETTE, OUTLINE } from './palette';

const ORANYE = '#f2a65a';
const ORANYE_TUA = '#d9853b';

/** Oyen, kucing oranye kos: rebahan, ekor bergoyang, napas pelan, telinga sesekali berkedut. */
export function Kucing() {
  const ekor = useRef<Group>(null);
  const badan = useRef<Mesh>(null);
  const kepala = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ekor.current) ekor.current.rotation.y = Math.sin(t * 2.2) * 0.5;
    if (badan.current) badan.current.scale.y = 0.75 + Math.sin(t * 1.6) * 0.02;
    if (kepala.current) kepala.current.rotation.z = Math.sin(t * 0.7) > 0.95 ? 0.15 : 0;
  });
  return (
    <group position={[KUCING.x, 0, KUCING.z]} rotation={[0, 0.6, 0]}>
      {/* Badan rebahan */}
      <mesh ref={badan} position={[0, 0.16, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.75, 1, 1]} castShadow>
        <capsuleGeometry args={[0.15, 0.3, 4, 8]} />
        <meshToonMaterial color={ORANYE} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Kepala */}
      <group ref={kepala} position={[0.32, 0.27, 0.02]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshToonMaterial color={ORANYE} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={`t${s}`} position={[0.02, 0.13, s * 0.08]} rotation={[s * 0.3, 0, 0]}>
            <coneGeometry args={[0.05, 0.1, 4]} />
            <meshToonMaterial color={ORANYE_TUA} />
          </mesh>
        ))}
        {/* Mata terpejam (garis) & hidung */}
        {[-1, 1].map((s) => (
          <mesh key={`m${s}`} position={[0.135, 0.02, s * 0.055]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.045, 0.01, 0.01]} />
            <meshBasicMaterial color="#3b2a20" />
          </mesh>
        ))}
        <mesh position={[0.148, -0.03, 0]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color="#ff9aa2" />
        </mesh>
      </group>
      {/* Ekor */}
      <group ref={ekor} position={[-0.3, 0.12, 0]}>
        <mesh position={[-0.15, 0.02, 0]} rotation={[0, 0, Math.PI / 2.3]}>
          <capsuleGeometry args={[0.035, 0.26, 4, 6]} />
          <meshToonMaterial color={ORANYE_TUA} />
        </mesh>
      </group>
      {/* Bantalan kardus tempat tidur Oyen */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.04, 0.6]} />
        <meshToonMaterial color="#c99a63" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <circleGeometry args={[0.55, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} depthWrite={false} />
      </mesh>
    </group>
  );
}
