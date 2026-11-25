import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import type { Bangunan } from '../../../game/duniaLayout';
import { useGame } from '../../../game/store';
import { isMalam } from '../../../game/sim';
import { PALETTE, OUTLINE } from '../../palette';
import { Kanopi, PapanNama } from './bagian';

const TINGGI = 2.8;
const SACHET = ['#e98a6b', '#ffe08a', '#6b4430', '#7fb3e0', '#ff9aa2'];

/** Warkop kayu: meja bar, toples, rentengan sachet kopi, lampu bohlam. Lokal: depan menghadap +z. */
export function Warkop({ b }: { b: Bangunan }) {
  const malam = useGame((s) => isMalam(s.fase));
  const zDepan = b.d / 2;
  return (
    <group>
      <RoundedBox args={[b.w, TINGGI, b.d]} radius={0.1} smoothness={2} position={[0, TINGGI / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>
      {/* Atap seng miring */}
      <RoundedBox
        args={[b.w + 0.6, 0.15, b.d + 1.0]}
        radius={0.05}
        smoothness={2}
        position={[0, TINGGI + 0.25, 0.2]}
        rotation={[0.12, 0, 0]}
        castShadow
      >
        <meshToonMaterial color={b.atap} />
        <Outlines thickness={0.02} color={PALETTE.outline} />
      </RoundedBox>

      <mesh position={[0, 1.4, zDepan + 0.01]}>
        <planeGeometry args={[5.4, 2.0]} />
        <meshToonMaterial color="#5a4030" />
      </mesh>

      {/* Meja bar + toples */}
      <RoundedBox args={[5.2, 1.05, 0.7]} radius={0.05} smoothness={2} position={[0, 0.53, zDepan + 0.36]} castShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {[-1.8, -1.2, -0.6].map((x, i) => (
        <group key={x} position={[x, 1.25, zDepan + 0.36]}>
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.36, 12]} />
            <meshStandardMaterial color="#e8f6ff" transparent opacity={0.45} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.2, 10]} />
            <meshToonMaterial color={[PALETTE.mentega, PALETTE.oranye, PALETTE.merahBata][i]} />
          </mesh>
        </group>
      ))}
      {/* Gelas kopi */}
      {[0.9, 1.5].map((x) => (
        <mesh key={x} position={[x, 1.13, zDepan + 0.4]}>
          <cylinderGeometry args={[0.08, 0.07, 0.16, 10]} />
          <meshToonMaterial color={PALETTE.putih} />
        </mesh>
      ))}

      {/* Rentengan sachet kopi */}
      {Array.from({ length: 12 }, (_, i) => (
        <RoundedBox
          key={i}
          args={[0.22, 0.32, 0.03]}
          radius={0.01}
          smoothness={1}
          position={[-2.6 + i * 0.47, 2.3 - (i % 2) * 0.08, zDepan + 0.06]}
        >
          <meshToonMaterial color={SACHET[i % SACHET.length]} />
        </RoundedBox>
      ))}

      {/* Bohlam: menyala saat malam */}
      <mesh position={[0, 2.55, zDepan + 0.7]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshBasicMaterial color={malam ? '#ffe08a' : '#fff6e5'} />
      </mesh>

      <Kanopi lebar={b.w} y={2.55} z={zDepan + 0.75} warnaA={PALETTE.oranye} warnaB={PALETTE.putih} />
      <PapanNama teks="WARKOP BEGADANG" posisi={[0, TINGGI + 0.9, zDepan - 0.2]} w={4.6} h={0.9} bg="#6b4430" />
    </group>
  );
}
