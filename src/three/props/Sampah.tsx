import { useGame } from '../../game/store';

// Posisi sampah di lantai (di luar jalur perabot). Makin kotor → makin banyak yang terlihat.
const TITIK: { p: [number, number]; jenis: 'kertas' | 'botol' | 'cup' | 'baju' }[] = [
  { p: [0.2, 0.6], jenis: 'kertas' },
  { p: [-1.2, 1.1], jenis: 'cup' },
  { p: [1.6, -0.6], jenis: 'botol' },
  { p: [-0.6, -0.8], jenis: 'baju' },
  { p: [2.2, 1.2], jenis: 'kertas' },
  { p: [-1.9, 0.0], jenis: 'botol' },
  { p: [0.9, 1.6], jenis: 'cup' },
  { p: [-0.2, 2.1], jenis: 'kertas' },
];

/** Sampah kamar: muncul saat kebersihan turun (sinyal visual "ayo sapu!"). */
export function Sampah() {
  const kebersihan = useGame((s) => s.kebersihan);
  const bajuKotor = useGame((s) => s.bajuKotor);
  const n = kebersihan >= 80 ? 0 : Math.min(TITIK.length, Math.ceil((80 - kebersihan) / 10));
  return (
    <group>
      {TITIK.slice(0, n).map((t, i) => (
        <group key={i} position={[t.p[0], 0, t.p[1]]} rotation={[0, i * 1.7, 0]}>
          {t.jenis === 'kertas' && (
            <mesh position={[0, 0.07, 0]}>
              <icosahedronGeometry args={[0.08, 0]} />
              <meshToonMaterial color="#fffaf2" />
            </mesh>
          )}
          {t.jenis === 'botol' && (
            <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.24, 8]} />
              <meshStandardMaterial color="#8fd3ff" transparent opacity={0.7} roughness={0.3} />
            </mesh>
          )}
          {t.jenis === 'cup' && (
            <mesh position={[0, 0.06, 0]}>
              <cylinderGeometry args={[0.07, 0.055, 0.12, 10]} />
              <meshToonMaterial color="#ffb36b" />
            </mesh>
          )}
          {t.jenis === 'baju' && bajuKotor >= 2 && (
            <mesh position={[0, 0.02, 0]} scale={[1, 0.15, 0.7]}>
              <sphereGeometry args={[0.25, 10, 6]} />
              <meshToonMaterial color="#a0c4ff" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
