import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { PALETTE, OUTLINE } from '../palette';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import type { Level } from './Kasur';
import { PopUpgrade } from './PopUpgrade';

type Props = { level: Level; position: [number, number, number] };
type Vec3 = [number, number, number];

// Semua meja muat di kotak tabrakan 1.25 × 0.7 m (kursi boleh sedikit menonjol ke depan).

/** Laptop dipakai di semua level (hanya posisinya yang berbeda). */
function Laptop({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.46, 0.03, 0.32]} radius={0.01} smoothness={2} castShadow>
        <meshToonMaterial color={PALETTE.abu} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <group position={[0, 0.01, -0.15]} rotation={[-0.25, 0, 0]}>
        <RoundedBox args={[0.46, 0.3, 0.02]} radius={0.01} smoothness={2} position={[0, 0.15, 0]} castShadow>
          <meshToonMaterial color={PALETTE.abu} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <mesh position={[0, 0.15, 0.012]}>
          <planeGeometry args={[0.4, 0.24]} />
          <meshBasicMaterial color={PALETTE.layarLaptop} />
        </mesh>
      </group>
    </group>
  );
}

function KakiBulat({ tinggi, posisi }: { tinggi: number; posisi: [number, number][] }) {
  return (
    <>
      {posisi.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, tinggi / 2, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, tinggi, 8]} />
          <meshToonMaterial color={PALETTE.kayuGelap} />
        </mesh>
      ))}
    </>
  );
}

const KAKI: [number, number][] = [
  [-0.52, -0.25],
  [0.52, -0.25],
  [-0.52, 0.25],
  [0.52, 0.25],
];

/** Level 1: meja lipat pendek (lesehan) + laptop tua + bantal duduk. */
function MejaLipat() {
  return (
    <group>
      <RoundedBox args={[1.2, 0.06, 0.65]} radius={0.025} smoothness={2} position={[0, 0.36, 0]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.lantaiKayu} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <KakiBulat tinggi={0.34} posisi={KAKI} />
      <Laptop position={[0.05, 0.39, 0.02]} />
      <RoundedBox args={[0.22, 0.05, 0.3]} radius={0.01} smoothness={2} position={[-0.4, 0.415, 0.05]} rotation={[0, 0.2, 0]}>
        <meshToonMaterial color={PALETTE.merahBata} />
      </RoundedBox>
      <mesh position={[0.45, 0.45, 0.12]}>
        <cylinderGeometry args={[0.05, 0.045, 0.12, 10]} />
        <meshToonMaterial color={PALETTE.putih} />
      </mesh>
      <RoundedBox args={[0.5, 0.1, 0.5]} radius={0.045} smoothness={3} position={[0, 0.05, 0.62]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.oranye} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
    </group>
  );
}

/** Lampu belajar: menyala kuning saat malam. */
function LampuBelajar({ position }: { position: Vec3 }) {
  const malam = useGame((s) => isMalam(s.fase));
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.09, 0.1, 0.04, 12]} />
        <meshToonMaterial color={PALETTE.mint} />
      </mesh>
      <mesh position={[0.04, 0.2, 0]} rotation={[0, 0, -0.25]}>
        <cylinderGeometry args={[0.015, 0.015, 0.38, 6]} />
        <meshToonMaterial color={PALETTE.mint} />
      </mesh>
      <mesh position={[0.12, 0.38, 0.03]} rotation={[0.5, 0, -0.6]}>
        <coneGeometry args={[0.1, 0.14, 12, 1, true]} />
        <meshToonMaterial color={PALETTE.mint} side={2} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0.15, 0.34, 0.06]}>
        <sphereGeometry args={[0.04, 10, 8]} />
        <meshBasicMaterial color={malam ? '#fff1a8' : '#fffaf0'} />
      </mesh>
    </group>
  );
}

/** Level 2: meja kayu tinggi + laci + lampu belajar + kursi kayu. */
function MejaKayu() {
  return (
    <group>
      <RoundedBox args={[1.2, 0.07, 0.62]} radius={0.025} smoothness={2} position={[0, 0.74, 0]} castShadow receiveShadow>
        <meshToonMaterial color={PALETTE.lantaiKayu} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <KakiBulat tinggi={0.71} posisi={KAKI} />
      {/* Laci */}
      <RoundedBox args={[0.42, 0.24, 0.55]} radius={0.02} smoothness={2} position={[0.36, 0.58, 0]} castShadow>
        <meshToonMaterial color="#c48d55" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[0.14, 0.04, 0.03]} radius={0.01} smoothness={2} position={[0.36, 0.6, 0.29]}>
        <meshToonMaterial color={PALETTE.mentega} />
      </RoundedBox>
      <Laptop position={[0.05, 0.79, 0.02]} />
      <LampuBelajar position={[-0.45, 0.775, -0.12]} />
      {/* Tumpukan buku */}
      {['#7fb3e0', PALETTE.merahBata, '#caffbf'].map((c, i) => (
        <RoundedBox key={c} args={[0.2, 0.05, 0.27]} radius={0.01} smoothness={2} position={[0.45, 0.8 + i * 0.05, 0.12]} rotation={[0, i * 0.15, 0]}>
          <meshToonMaterial color={c} />
        </RoundedBox>
      ))}
      {/* Kursi kayu */}
      <group position={[0, 0, 0.46]}>
        <RoundedBox args={[0.44, 0.06, 0.42]} radius={0.02} smoothness={2} position={[0, 0.45, 0]} castShadow>
          <meshToonMaterial color={PALETTE.kayuGelap} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <RoundedBox args={[0.44, 0.36, 0.05]} radius={0.02} smoothness={2} position={[0, 0.68, 0.2]} castShadow>
          <meshToonMaterial color={PALETTE.kayuGelap} />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <KakiBulat
          tinggi={0.43}
          posisi={[
            [-0.18, -0.17],
            [0.18, -0.17],
            [-0.18, 0.17],
            [0.18, 0.17],
          ]}
        />
      </group>
    </group>
  );
}

/** Level 3: meja gaming hitam + monitor + keyboard RGB + strip LED + kursi gaming. */
function MejaGaming() {
  const malam = useGame((s) => isMalam(s.fase));
  return (
    <group>
      <RoundedBox args={[1.25, 0.07, 0.64]} radius={0.025} smoothness={2} position={[0, 0.74, 0]} castShadow receiveShadow>
        <meshToonMaterial color="#4a4458" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {[-0.56, 0.56].map((x) => (
        <RoundedBox key={x} args={[0.07, 0.71, 0.5]} radius={0.02} smoothness={2} position={[x, 0.355, 0]} castShadow>
          <meshToonMaterial color="#3a3546" />
        </RoundedBox>
      ))}
      {/* Strip LED di tepi depan meja (lebih terang saat malam) */}
      <mesh position={[0, 0.705, 0.32]}>
        <boxGeometry args={[1.18, 0.025, 0.02]} />
        <meshBasicMaterial color={malam ? '#d59cff' : '#b98ee0'} />
      </mesh>
      {/* Monitor */}
      <mesh position={[0, 0.84, -0.17]}>
        <cylinderGeometry args={[0.025, 0.025, 0.18, 8]} />
        <meshToonMaterial color="#3a3546" />
      </mesh>
      <RoundedBox args={[0.8, 0.44, 0.04]} radius={0.02} smoothness={2} position={[0, 1.13, -0.18]} castShadow>
        <meshToonMaterial color="#2f2b3a" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <mesh position={[0, 1.13, -0.157]}>
        <planeGeometry args={[0.72, 0.37]} />
        <meshBasicMaterial color="#7fe0ff" />
      </mesh>
      {/* Keyboard RGB + mouse */}
      <RoundedBox args={[0.5, 0.03, 0.16]} radius={0.01} smoothness={2} position={[-0.05, 0.79, 0.1]}>
        <meshBasicMaterial color="#ff9bd2" />
      </RoundedBox>
      <RoundedBox args={[0.07, 0.03, 0.1]} radius={0.015} smoothness={2} position={[0.33, 0.79, 0.1]}>
        <meshBasicMaterial color="#9bffd8" />
      </RoundedBox>
      {/* Laptop di samping (untuk nugas) */}
      <Laptop position={[-0.42, 0.79, 0.0]} />
      {/* Kursi gaming oranye */}
      <group position={[0, 0, 0.5]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.05, 12]} />
          <meshToonMaterial color="#3a3546" />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.38, 8]} />
          <meshToonMaterial color="#3a3546" />
        </mesh>
        <RoundedBox args={[0.5, 0.1, 0.46]} radius={0.04} smoothness={2} position={[0, 0.47, 0]} castShadow>
          <meshToonMaterial color="#ff8a5b" />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <RoundedBox args={[0.5, 0.78, 0.1]} radius={0.05} smoothness={2} position={[0, 0.92, 0.22]} rotation={[0.12, 0, 0]} castShadow>
          <meshToonMaterial color="#ff8a5b" />
          <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
        </RoundedBox>
        <RoundedBox args={[0.22, 0.6, 0.11]} radius={0.04} smoothness={2} position={[0, 0.9, 0.225]} rotation={[0.12, 0, 0]}>
          <meshToonMaterial color="#3a3546" />
        </RoundedBox>
      </group>
    </group>
  );
}

export function MejaBelajar({ level, position }: Props) {
  return (
    <PopUpgrade kunci={level} position={position}>
      {level === 1 && <MejaLipat />}
      {level === 2 && <MejaKayu />}
      {level === 3 && <MejaGaming />}
    </PopUpgrade>
  );
}
