import { useMemo } from 'react';
import { Instances, Instance, RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';
import { KAMAR, POSISI } from '../../game/kamarLayout';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import type { Level } from './Kasur';
import { PopUpgrade } from './PopUpgrade';

const ZB = -KAMAR.halfD + 0.03; // permukaan dinding belakang
const XK = -KAMAR.halfW + 0.03; // permukaan dinding kiri

/** Poster gunung & matahari di dinding belakang (dari bentuk dasar, tanpa gambar). */
function Poster() {
  return (
    <group position={[2.15, 1.75, ZB]}>
      <RoundedBox args={[0.6, 0.8, 0.02]} radius={0.01} smoothness={2}>
        <meshToonMaterial color="#bdb2ff" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0.12, 0.18, 0.012]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color={PALETTE.mentega} />
      </mesh>
      <mesh position={[-0.08, -0.12, 0.013]}>
        <circleGeometry args={[0.24, 3]} />
        <meshBasicMaterial color={PALETTE.wartegHijau} />
      </mesh>
      <mesh position={[0.15, -0.16, 0.014]}>
        <circleGeometry args={[0.17, 3]} />
        <meshBasicMaterial color="#5fa98a" />
      </mesh>
    </group>
  );
}

const WARNA_BUKU = ['#e98a6b', '#7fb3e0', '#ffe08a', '#a8e6cf', '#bdb2ff', '#ff9aa2'];

/** Rak buku melayang di dinding kiri, di atas kasur. */
function RakBuku() {
  return (
    <group position={[XK + 0.14, 1.45, POSISI.kasur[2]]}>
      <RoundedBox args={[0.26, 0.05, 1.05]} radius={0.015} smoothness={2} castShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {WARNA_BUKU.map((c, i) => (
        <RoundedBox
          key={c}
          args={[0.18, 0.24 + (i % 3) * 0.04, 0.07]}
          radius={0.01}
          smoothness={2}
          position={[0, 0.15 + (i % 3) * 0.02, -0.4 + i * 0.1]}
          rotation={[i === 5 ? 0.35 : 0, 0, 0]}
        >
          <meshToonMaterial color={c} />
        </RoundedBox>
      ))}
    </group>
  );
}

/** Pot tanaman monstera sederhana. */
function Tanaman() {
  return (
    <group position={POSISI.tanaman}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 12]} />
        <meshToonMaterial color={PALETTE.merahBata} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, 0.62 + (i % 2) * 0.12, Math.sin(a) * 0.14]} scale={[1, 0.55, 1]} castShadow>
            <sphereGeometry args={[0.2, 10, 8]} />
            <meshToonMaterial color={PALETTE.daun[i % 3]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Karpet bulat di tengah kamar. */
function Karpet() {
  return (
    <group position={[0.4, 0.012, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <circleGeometry args={[1.15, 28]} />
        <meshToonMaterial color="#ffd6a5" />
      </mesh>
      <mesh position={[0, 0, 0.002]} receiveShadow>
        <ringGeometry args={[0.7, 0.85, 28]} />
        <meshToonMaterial color="#ff9aa2" />
      </mesh>
    </group>
  );
}

const JUMLAH_BOHLAM = 14;
const WARNA_BOHLAM = ['#ffe08a', '#ff9aa2', '#a0c4ff', '#caffbf'];

/** Lampu tumblr: untaian bohlam kecil melengkung di dinding belakang (satu draw call lewat Instances). */
function LampuTumblr() {
  const malam = useGame((s) => isMalam(s.fase));
  const titik = useMemo(
    () =>
      Array.from({ length: JUMLAH_BOHLAM }, (_, i) => {
        const t = i / (JUMLAH_BOHLAM - 1);
        const x = -3.6 + t * 7.2;
        // Dua lengkungan (catenary sederhana): turun di tengah tiap separuh
        const lengkung = Math.sin(t * Math.PI * 2) ** 2 * 0.18;
        return { x, y: 2.42 - lengkung, warna: WARNA_BOHLAM[i % WARNA_BOHLAM.length] };
      }),
    [],
  );
  return (
    <Instances limit={JUMLAH_BOHLAM} position={[0, 0, ZB + 0.05]}>
      <sphereGeometry args={[0.045, 8, 6]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={malam ? 1 : 0.75} />
      {titik.map((b, i) => (
        <Instance key={i} position={[b.x, b.y, 0]} color={b.warna} />
      ))}
    </Instances>
  );
}

/** Dekorasi kamar: Lv1 polos, Lv2 poster + rak buku, Lv3 + tanaman + karpet + lampu tumblr. */
export function Dekorasi({ level }: { level: Level }) {
  // PopUpgrade selalu dipasang (walau Lv1 kosong) agar perubahan 1 → 2 tetap beranimasi "pop"
  return (
    <PopUpgrade kunci={level}>
      {level >= 2 && (
        <>
          <Poster />
          <RakBuku />
        </>
      )}
      {level === 3 && (
        <>
          <Tanaman />
          <Karpet />
          <LampuTumblr />
        </>
      )}
    </PopUpgrade>
  );
}
