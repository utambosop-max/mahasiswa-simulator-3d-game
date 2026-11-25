import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import type { Bangunan } from '../../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../../palette';
import { AtapLimas, JendelaDeret, PapanNama, Pintu, type DataJendela } from './bagian';

const TINGGI = 5;
const KOLOM = [-3.2, -1.6, 1.6, 3.2];

/** Kos 2 lantai. Lokal: bagian depan menghadap +z. */
export function Kos({ b }: { b: Bangunan }) {
  const zDepan = b.d / 2;
  return (
    <group>
      <RoundedBox args={[b.w, TINGGI, b.d]} radius={0.12} smoothness={2} position={[0, TINGGI / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>
      {/* Lis pembatas lantai */}
      <RoundedBox args={[b.w + 0.12, 0.2, b.d + 0.12]} radius={0.05} smoothness={2} position={[0, 2.55, 0]}>
        <meshToonMaterial color={PALETTE.dindingBawah} />
      </RoundedBox>
      <AtapLimas w={b.w} d={b.d} tinggi={2} y={TINGGI} warna={b.atap} />

      {/* Jendela lantai 1 & 2 */}
      <JendelaDeret
        daftar={[
          ...KOLOM.map((x): DataJendela => ({ posisi: [x, 1.45, zDepan + 0.02], w: 0.9, h: 0.9 })),
          ...[...KOLOM, 0].map((x): DataJendela => ({ posisi: [x, 3.7, zDepan + 0.02], w: 0.9, h: 0.9 })),
        ]}
      />

      <Pintu posisi={[0, 0, zDepan + 0.05]} w={1.3} h={2.15} />
      {/* Undakan */}
      <RoundedBox args={[2.2, 0.16, 0.6]} radius={0.04} smoothness={2} position={[0, 0.08, zDepan + 0.3]} receiveShadow>
        <meshToonMaterial color={PALETTE.abu} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <PapanNama teks="KOS MELATI" posisi={[0, 2.95, zDepan + 0.1]} w={2.6} h={0.55} bg="#e98a6b" />

      {/* Jemuran di samping */}
      <group position={[b.w / 2 - 0.6, 0, zDepan + 0.35]}>
        {[-0.6, 0.6].map((x) => (
          <mesh key={x} position={[x, 0.75, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.5, 6]} />
            <meshToonMaterial color={PALETTE.abu} />
          </mesh>
        ))}
        {[
          [-0.35, PALETTE.baju[0]],
          [0.05, PALETTE.baju[2]],
          [0.4, PALETTE.baju[3]],
        ].map(([x, warna]) => (
          <RoundedBox key={String(x)} args={[0.32, 0.42, 0.04]} radius={0.02} smoothness={2} position={[Number(x), 1.25, 0]}>
            <meshToonMaterial color={String(warna)} />
          </RoundedBox>
        ))}
      </group>
    </group>
  );
}
