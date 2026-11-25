import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import type { Bangunan } from '../../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../../palette';
import { AtapLimas, JendelaDeret, PapanNama, type DataJendela } from './bagian';

const TINGGI = 5;
const PILAR = [-5, -3, -1, 1, 3, 5];

/** Gedung kampus dengan pilar, menara jam, dan tangga. Lokal: depan menghadap +z. */
export function Kampus({ b }: { b: Bangunan }) {
  const zDepan = b.d / 2;
  return (
    <group>
      <RoundedBox args={[b.w, TINGGI, b.d]} radius={0.15} smoothness={2} position={[0, TINGGI / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[b.w + 0.4, 0.4, b.d + 0.4]} radius={0.1} smoothness={2} position={[0, TINGGI + 0.2, 0]} castShadow>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={0.02} color={PALETTE.outline} />
      </RoundedBox>

      {/* Menara jam */}
      <RoundedBox args={[4, 3, 4]} radius={0.12} smoothness={2} position={[0, TINGGI + 1.9, 0]} castShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.025} color={PALETTE.outline} />
      </RoundedBox>
      <AtapLimas w={4} d={4} tinggi={1.8} y={TINGGI + 3.4} warna={b.atap} />
      <mesh position={[0, TINGGI + 2.5, 2.02]}>
        <circleGeometry args={[0.65, 20]} />
        <meshBasicMaterial color={PALETTE.putih} />
      </mesh>
      <mesh position={[0, TINGGI + 2.7, 2.03]}>
        <planeGeometry args={[0.08, 0.45]} />
        <meshBasicMaterial color={PALETTE.outline} />
      </mesh>
      <mesh position={[0.15, TINGGI + 2.5, 2.03]}>
        <planeGeometry args={[0.32, 0.08]} />
        <meshBasicMaterial color={PALETTE.outline} />
      </mesh>
      <PapanNama teks="KAMPUS" posisi={[0, TINGGI + 1.35, 2.06]} w={3.2} h={0.7} bg="#7fb3e0" />

      {/* Jendela */}
      <JendelaDeret
        daftar={[
          ...[-8, -6.5, 6.5, 8].flatMap((x) => [1.5, 3.5].map((y): DataJendela => ({ posisi: [x, y, zDepan + 0.02], w: 1, h: 1 }))),
          ...[-4, -2, 2, 4].map((x): DataJendela => ({ posisi: [x, 3.5, zDepan + 0.02], w: 0.9, h: 0.9 })),
        ]}
      />

      {/* Pintu kaca ganda */}
      <RoundedBox args={[2.6, 2.9, 0.12]} radius={0.05} smoothness={2} position={[0, 1.45, zDepan + 0.04]}>
        <meshToonMaterial color={PALETTE.putih} />
      </RoundedBox>
      <mesh position={[0, 1.4, zDepan + 0.11]}>
        <planeGeometry args={[2.3, 2.7]} />
        <meshBasicMaterial color="#8cc4e8" />
      </mesh>

      {/* Teras berpilar */}
      <RoundedBox args={[12.4, 0.4, 2.1]} radius={0.08} smoothness={2} position={[0, 4.8, zDepan + 0.95]} castShadow>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={0.02} color={PALETTE.outline} />
      </RoundedBox>
      {PILAR.map((x) => (
        <mesh key={x} position={[x, 2.45, zDepan + 1.4]} castShadow>
          <cylinderGeometry args={[0.28, 0.32, 4.5, 12]} />
          <meshToonMaterial color={PALETTE.putih} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </mesh>
      ))}
      {/* Tangga */}
      {[0, 1].map((i) => (
        <RoundedBox
          key={i}
          args={[12.4 - i * 1.2, 0.18, 1.9 - i * 0.6]}
          radius={0.05}
          smoothness={2}
          position={[0, 0.09 + i * 0.18, zDepan + 0.95 - i * 0.3]}
          receiveShadow
        >
          <meshToonMaterial color={PALETTE.abu} />
        </RoundedBox>
      ))}
    </group>
  );
}
