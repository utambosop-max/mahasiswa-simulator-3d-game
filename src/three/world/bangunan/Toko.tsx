import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../../lod/Outlines';
import type { Bangunan } from '../../../game/duniaLayout';
import { useGame } from '../../../game/store';
import { isMalam } from '../../../game/sim';
import { PALETTE, OUTLINE } from '../../palette';
import { AtapLimas, JendelaDeret, Kanopi, PapanNama } from './bagian';

const TINGGI_LANTAI = 3.6;

/**
 * Toko serbaguna (minimarket, klinik, warnet, fotokopi, laundry, perpustakaan).
 * Gaya diatur dari data: warna, aksen, papan, kanopi, jumlah lantai, atap limas.
 * Lokal: bagian depan menghadap +z.
 */
export function Toko({ b }: { b: Bangunan }) {
  const malam = useGame((s) => isMalam(s.fase));
  const lantai = b.lantai ?? 1;
  const tinggi = TINGGI_LANTAI * lantai;
  const zDepan = b.d / 2;
  const aksen = b.aksen ?? PALETTE.oranye;
  const lebarKaca = Math.min(b.w - 2.4, 6);

  return (
    <group>
      <RoundedBox args={[b.w, tinggi, b.d]} radius={0.12} smoothness={2} position={[0, tinggi / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={b.warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>

      {b.atapLimas ? (
        <AtapLimas w={b.w} d={b.d} tinggi={2.2} y={tinggi} warna={b.atap} />
      ) : (
        <RoundedBox args={[b.w + 0.3, 0.3, b.d + 0.3]} radius={0.08} smoothness={2} position={[0, tinggi + 0.15, 0]} castShadow>
          <meshToonMaterial color={b.atap} />
          <Outlines thickness={0.02} color={PALETTE.outline} />
        </RoundedBox>
      )}

      {/* Pita warna aksen di atas etalase */}
      <RoundedBox args={[b.w + 0.06, 0.55, 0.12]} radius={0.04} smoothness={2} position={[0, 3.0, zDepan + 0.02]}>
        <meshToonMaterial color={aksen} />
      </RoundedBox>

      {/* Etalase kaca + pintu kaca (menyala hangat saat malam) */}
      <RoundedBox args={[lebarKaca + 0.2, 2.3, 0.1]} radius={0.04} smoothness={2} position={[0, 1.3, zDepan + 0.02]}>
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0, 1.3, zDepan + 0.08]}>
        <planeGeometry args={[lebarKaca, 2.1]} />
        <meshBasicMaterial color={malam ? '#ffe3a0' : '#a9d8f5'} />
      </mesh>
      {[-lebarKaca / 6, lebarKaca / 6].map((x) => (
        <mesh key={x} position={[x, 1.3, zDepan + 0.09]}>
          <planeGeometry args={[0.06, 2.1]} />
          <meshBasicMaterial color={PALETTE.putih} />
        </mesh>
      ))}

      {/* Jendela lantai 2 */}
      {lantai === 2 &&
        <JendelaDeret daftar={[-b.w / 2 + 1.6, -1.8, 1.8, b.w / 2 - 1.6].map((x) => ({ posisi: [x, TINGGI_LANTAI + 1.8, zDepan + 0.02], w: 1.2, h: 1.1 }))} />}

      {b.kanopi && <Kanopi lebar={b.w} y={2.6} z={zDepan + 0.7} warnaA={aksen} warnaB={PALETTE.putih} />}

      {b.papan && (
        <PapanNama
          teks={b.papan}
          posisi={[0, lantai === 2 ? TINGGI_LANTAI + 0.2 : 3.0, zDepan + 0.16]}
          w={Math.min(b.w - 0.8, 6.5)}
          h={0.62}
          bg={aksen}
        />
      )}

      {/* Keset & pot tanaman di depan pintu */}
      <mesh position={[0, 0.015, zDepan + 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6, 0.6]} />
        <meshToonMaterial color={PALETTE.merahBata} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (lebarKaca / 2 + 0.6), 0, zDepan + 0.35]}>
          <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.22, 0.17, 0.44, 10]} />
            <meshToonMaterial color={PALETTE.merahBata} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <sphereGeometry args={[0.32, 10, 8]} />
            <meshToonMaterial color={PALETTE.daun[2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
