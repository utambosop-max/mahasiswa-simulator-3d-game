import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import type { Bangunan } from '../../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../../palette';
import { Kanopi, PapanNama } from './bagian';

const TINGGI = 3.2;
const LAUK = ['#e98a6b', '#ffe08a', '#7cc6a4', '#c48d55', '#ff9aa2', '#ffb36b'];

/** Warteg: etalase kaca berisi lauk warna-warni + kanopi hijau. Lokal: depan menghadap +z. */
export function Warteg({ b }: { b: Bangunan }) {
  const zDepan = b.d / 2;
  return (
    <group>
      <RoundedBox args={[b.w, TINGGI, b.d]} radius={0.12} smoothness={2} position={[0, TINGGI / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[b.w + 0.3, 0.25, b.d + 0.3]} radius={0.08} smoothness={2} position={[0, TINGGI + 0.12, 0]} castShadow>
        <meshToonMaterial color={b.atap} />
        <Outlines thickness={0.02} color={PALETTE.outline} />
      </RoundedBox>

      {/* Bagian dalam yang terbuka (gelap) */}
      <mesh position={[0, 1.45, zDepan + 0.01]}>
        <planeGeometry args={[6.2, 2.3]} />
        <meshToonMaterial color="#7a5a42" />
      </mesh>

      {/* Etalase */}
      <RoundedBox args={[4.4, 0.95, 0.8]} radius={0.05} smoothness={2} position={[0, 0.48, zDepan + 0.42]} castShadow>
        <meshToonMaterial color={PALETTE.wartegBiru} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {LAUK.map((warna, i) => (
        <group key={i} position={[-1.75 + i * 0.7, 1.05, zDepan + 0.42]}>
          <mesh>
            <cylinderGeometry args={[0.26, 0.2, 0.14, 12]} />
            <meshToonMaterial color={PALETTE.putih} />
          </mesh>
          <mesh position={[0, 0.07, 0]} scale={[1, 0.4, 1]}>
            <sphereGeometry args={[0.22, 12, 8]} />
            <meshToonMaterial color={warna} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.25, zDepan + 0.42]}>
        <boxGeometry args={[4.3, 0.55, 0.74]} />
        <meshStandardMaterial color="#e8f6ff" transparent opacity={0.3} roughness={0.2} />
      </mesh>

      {/* Termos teh di ujung etalase */}
      <mesh position={[1.95, 1.27, zDepan + 0.42]}>
        <cylinderGeometry args={[0.14, 0.14, 0.5, 12]} />
        <meshToonMaterial color={PALETTE.merahBata} />
      </mesh>

      {/* Bangku panjang di kiri-kanan */}
      {[-3.1, 3.1].map((x) => (
        <RoundedBox key={x} args={[1.4, 0.42, 0.5]} radius={0.05} smoothness={2} position={[x, 0.21, zDepan + 0.45]} castShadow>
          <meshToonMaterial color={PALETTE.kayuGelap} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
      ))}

      <Kanopi lebar={b.w} y={2.85} z={zDepan + 0.7} warnaA={PALETTE.wartegHijau} warnaB={PALETTE.putih} />
      <PapanNama teks="WARTEG BAROKAH" posisi={[0, TINGGI + 0.85, zDepan - 0.3]} w={5.2} h={1.0} bg="#7cc6a4" />
    </group>
  );
}
