// Tambahan kamar kos M11: pojok kamar mandi (sesuai tipe kos), dekor khas tiap kos,
// hantu Wisma Kenanga, dan pacar yang tinggal bareng.
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { PALETTE, OUTLINE } from '../palette';
import { useGame } from '../../game/store';
import { hantuMuncul, kosDari, wargaDari } from '../../game/m11';
import { KAMAR, POSISI, KLOSET } from '../../game/kamarLayout';
import { Chibi } from '../characters/Chibi';

/** Pojok kamar mandi: lantai keramik + kloset (jongkok/duduk) + ember atau shower. */
export function KamarMandi() {
  const toilet = useGame((s) => kosDari(s).toilet);
  const mewah = toilet === 'shower';
  return (
    <group>
      {/* Lantai keramik biru muda */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3.05, 0.006, 2.25]}>
        <planeGeometry args={[1.9, 1.5]} />
        <meshToonMaterial color={mewah ? '#e8f3fb' : '#cfe6f2'} />
      </mesh>
      {/* Sekat rendah (supaya tetap terlihat dari kamera) */}
      <RoundedBox args={[0.08, 0.9, 1.5]} radius={0.03} smoothness={2} position={[2.08, 0.45, 2.25]}>
        <meshToonMaterial color={mewah ? '#ffffff' : '#a9cdee'} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Kloset */}
      <group position={[KLOSET.x, 0, KLOSET.z]}>
        {toilet === 'jongkok' ? (
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.45, 0.08, 0.6]} />
            <meshToonMaterial color="#ffffff" />
            <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
          </mesh>
        ) : (
          <group rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[0.2, 0.16, 0.44, 14]} />
              <meshToonMaterial color="#ffffff" />
              <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
            </mesh>
            <RoundedBox args={[0.42, 0.4, 0.16]} radius={0.04} smoothness={2} position={[0, 0.55, -0.2]}>
              <meshToonMaterial color="#ffffff" />
              <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
            </RoundedBox>
          </group>
        )}
      </group>
      {/* Shower air panas (kos mewah) */}
      {mewah && (
        <group position={[POSISI.ember[0] + 0.1, 0, POSISI.ember[2] + 0.3]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.8, 6]} />
            <meshToonMaterial color="#9aa3ad" />
          </mesh>
          <mesh position={[0, 1.8, -0.12]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.06, 0.06, 12]} />
            <meshToonMaterial color="#9aa3ad" />
          </mesh>
          {/* Pemanas air kecil */}
          <RoundedBox args={[0.35, 0.45, 0.2]} radius={0.05} smoothness={2} position={[-0.45, 1.5, 0]}>
            <meshToonMaterial color="#ffffff" />
            <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
          </RoundedBox>
          <mesh position={[-0.45, 1.5, 0.11]}>
            <circleGeometry args={[0.04, 8]} />
            <meshBasicMaterial color="#e9605a" />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Dekor khas tiap kos: kos mewah (karpet, TV, lampu gantung), kos murah (bohlam polos), angker (sarang laba-laba & lilin), bebas (poster). */
export function DekorKos() {
  const id = useGame((s) => s.kos);
  const { halfW, halfD } = KAMAR;
  if (id === 'skyline' || id === 'griya') {
    return (
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0.01, 0.6]}>
          <circleGeometry args={[1.4, 24]} />
          <meshToonMaterial color={id === 'skyline' ? '#bdb2ff' : '#f6cfa0'} />
        </mesh>
        {/* TV dinding */}
        <group position={[-halfW + 0.06, 1.5, -0.9]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[1.2, 0.7, 0.05]} radius={0.02} smoothness={2}>
            <meshToonMaterial color="#2a1d15" />
          </RoundedBox>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.1, 0.6]} />
            <meshBasicMaterial color="#7fd8ff" />
          </mesh>
        </group>
        {/* Lampu gantung */}
        <mesh position={[0, 2.35, 0.3]}>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshBasicMaterial color="#ffe08a" />
        </mesh>
      </group>
    );
  }
  if (id === 'kenanga') {
    return (
      <group>
        {/* Sarang laba-laba di sudut dinding */}
        <mesh position={[-halfW + 0.25, 2.35, -halfD + 0.06]}>
          <circleGeometry args={[0.35, 8, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
        {/* Lilin di lantai */}
        <group position={[1.8, 0, 1.6]}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.24, 8]} />
            <meshToonMaterial color="#fffaf2" />
          </mesh>
          <mesh position={[0, 0.28, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color="#ffb36b" />
          </mesh>
        </group>
      </group>
    );
  }
  if (id === 'bebas') {
    return (
      <group>
        {[
          [-1.2, '#e9605a'],
          [2.3, '#7fb3e0'],
        ].map(([x, c]) => (
          <mesh key={String(x)} position={[Number(x), 1.75, -halfD + 0.04]}>
            <planeGeometry args={[0.6, 0.85]} />
            <meshBasicMaterial color={String(c)} />
          </mesh>
        ))}
      </group>
    );
  }
  if (id === 'hemat') {
    // Bohlam polos tanpa kap + noda di dinding
    return (
      <group>
        <mesh position={[0, 2.3, 0.3]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshBasicMaterial color="#ffe08a" />
        </mesh>
        <mesh position={[2.6, 1.2, -halfD + 0.04]}>
          <circleGeometry args={[0.25, 10]} />
          <meshBasicMaterial color="#c9b79a" transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }
  return null;
}

/** Hantu Wisma Kenanga: kain putih melayang di pojok kamar (sengaja melayang 👻), hanya malam & kadang-kadang. */
export function Hantu() {
  const muncul = useGame((s) => hantuMuncul(s));
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.position.y = 0.9 + Math.sin(t * 1.6) * 0.12;
    g.rotation.z = Math.sin(t * 0.9) * 0.08;
  });
  if (!muncul) return null;
  return (
    <group ref={ref} position={[2.1, 0.9, -1.2]}>
      <mesh>
        <sphereGeometry args={[0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={2} />
      </mesh>
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.31, 0.42, 0.55, 14, 1, true]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={2} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.12, 0.05, 0.33]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color="#2a1d15" />
        </mesh>
      ))}
    </group>
  );
}

/** Pacar NPC yang tinggal bareng: duduk santai di dekat kasur. */
export function PacarDiKamar() {
  const pacar = useGame((s) => (s.tinggalBareng && s.pacar?.jenis === 'npc' ? s.pacar.id : null));
  const diam = useRef({ current: false }).current;
  const w = pacar ? wargaDari(pacar) : null;
  if (!w) return null;
  return (
    <group position={[-1.6, 0, -0.6]} rotation={[0, 0.6, 0]}>
      <Chibi bergerak={diam} baju="#ff9aa2" gaya={w.gaya} />
    </group>
  );
}
