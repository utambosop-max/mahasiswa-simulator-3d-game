import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import type { Bangunan } from '../../../game/duniaLayout';
import { PALETTE } from '../../palette';
import { AtapLimas, JendelaBangunan, Pintu } from './bagian';

const TINGGI = 2.8;

/** Rumah warga sederhana. Lokal: depan menghadap +z. */
export function Rumah({ b }: { b: Bangunan }) {
  const zDepan = b.d / 2;
  return (
    <group>
      <RoundedBox args={[b.w, TINGGI, b.d]} radius={0.12} smoothness={2} position={[0, TINGGI / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>
      <AtapLimas w={b.w} d={b.d} tinggi={1.6} y={TINGGI} warna={b.atap} />
      <Pintu posisi={[-0.9, 0, zDepan + 0.05]} w={1} h={1.9} />
      <JendelaBangunan posisi={[1.3, 1.5, zDepan + 0.02]} w={1.1} h={0.8} />
    </group>
  );
}
