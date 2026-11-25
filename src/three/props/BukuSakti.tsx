// "Buku Sakti" catatan Ibu (prosedural). `bersinar` = denyut cahaya lembut (emissive + halo).
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Mesh, MeshToonMaterial } from 'three';
import { PALETTE, OUTLINE } from '../palette';

export function BukuSakti({ bersinar = false }: { bersinar?: boolean }) {
  const sampul = useRef<MeshToonMaterial>(null);
  const halo = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const k = bersinar ? 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 5) : 0;
    if (sampul.current) sampul.current.emissiveIntensity = k * 0.6;
    if (halo.current) {
      halo.current.visible = bersinar;
      halo.current.scale.setScalar(1 + k * 0.35);
    }
  });
  return (
    <group>
      <RoundedBox args={[0.3, 0.06, 0.38]} radius={0.02} smoothness={2} castShadow>
        <meshToonMaterial ref={sampul} color="#e98a6b" emissive="#ffd36b" emissiveIntensity={0} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Halaman krem & pita label */}
      <mesh position={[0.012, 0, 0]}>
        <boxGeometry args={[0.28, 0.045, 0.36]} />
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      <mesh position={[0, 0.032, 0.05]}>
        <boxGeometry args={[0.2, 0.005, 0.08]} />
        <meshBasicMaterial color={PALETTE.mentega} />
      </mesh>
      <mesh ref={halo} visible={false}>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshBasicMaterial color="#fff3b0" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}
