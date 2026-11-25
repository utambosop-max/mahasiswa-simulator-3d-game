// Fasilitas di dunia luar: halte angkot, gerobak nasi goreng, lapangan futsal.
import { useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { boxAt } from '../../game/collision';
import { useTembusPandang } from '../useTembusPandang';
import { isMalam } from '../../game/sim';
import { GEROBAK, HALTE, LAPANGAN, rotasiHadap, type Halte } from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';
import { PapanNama } from './bangunan/bagian';

function HalteAngkot({ h }: { h: Halte }) {
  const ref = useRef<Group>(null);
  const kotak = useMemo(() => boxAt(h.x, h.z, 3.8, 1.6), [h]);
  useTembusPandang(ref, kotak, 3.2);
  return (
    <group ref={ref} position={[h.x, 0, h.z]} rotation={[0, rotasiHadap(h.hadap), 0]}>
      {/* Atap */}
      <RoundedBox args={[3.6, 0.15, 1.8]} radius={0.05} smoothness={2} position={[0, 2.5, 0]} castShadow>
        <meshToonMaterial color={PALETTE.wartegHijau} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Dinding belakang */}
      <RoundedBox args={[3.4, 1.9, 0.1]} radius={0.04} smoothness={2} position={[0, 1.4, -0.45]}>
        <meshStandardMaterial color="#e8f6ff" transparent opacity={0.55} roughness={0.3} />
      </RoundedBox>
      {[-1.65, 1.65].map((x) => (
        <mesh key={x} position={[x, 1.25, -0.45]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.5, 8]} />
          <meshToonMaterial color="#5f6672" />
        </mesh>
      ))}
      {/* Bangku */}
      <RoundedBox args={[2.6, 0.1, 0.45]} radius={0.03} smoothness={2} position={[0, 0.5, -0.2]} castShadow>
        <meshToonMaterial color={PALETTE.kayuGelap} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      <PapanNama teks="🚐 HALTE ANGKOT" posisi={[0, 2.85, 0.6]} w={2.4} h={0.45} bg="#4fb35a" />
    </group>
  );
}

function GerobakNasgor() {
  const malam = useGame((s) => isMalam(s.fase));
  const ref = useRef<Group>(null);
  const kotak = useMemo(() => boxAt(GEROBAK.x, GEROBAK.z, 2.4, 1.3), []);
  useTembusPandang(ref, kotak, 2.8);
  return (
    <group ref={ref} position={[GEROBAK.x, 0, GEROBAK.z]} rotation={[0, rotasiHadap(GEROBAK.hadap), 0]}>
      {/* Badan gerobak */}
      <RoundedBox args={[2.0, 0.9, 1.0]} radius={0.06} smoothness={2} position={[0, 0.85, 0]} castShadow>
        <meshToonMaterial color="#ffe08a" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {/* Etalase kaca */}
      <mesh position={[-0.35, 1.6, 0]}>
        <boxGeometry args={[1.1, 0.6, 0.85]} />
        <meshStandardMaterial color="#e8f6ff" transparent opacity={0.4} roughness={0.2} />
      </mesh>
      {/* Wajan di atas kompor */}
      <mesh position={[0.6, 1.4, 0]}>
        <cylinderGeometry args={[0.32, 0.18, 0.14, 14]} />
        <meshToonMaterial color="#3a3a3a" />
      </mesh>
      {/* Tiang & atap kain */}
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} position={[x, 1.75, -0.4]}>
          <cylinderGeometry args={[0.04, 0.04, 1.8, 6]} />
          <meshToonMaterial color={PALETTE.kayuGelap} />
        </mesh>
      ))}
      <RoundedBox args={[2.3, 0.08, 1.3]} radius={0.03} smoothness={2} position={[0, 2.65, 0]} castShadow>
        <meshToonMaterial color={PALETTE.merahBata} />
      </RoundedBox>
      {/* Roda */}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.3, 0.52]}>
          <cylinderGeometry args={[0.3, 0.3, 0.08, 14]} />
          <meshToonMaterial color="#5f6672" />
        </mesh>
      ))}
      {/* Lampu petromaks (menyala malam) */}
      <mesh position={[0, 2.35, 0.3]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshBasicMaterial color={malam ? '#fff1a8' : '#fffaf0'} />
      </mesh>
      <PapanNama teks="NASI GORENG" posisi={[0, 0.9, 0.52]} w={1.7} h={0.42} bg="#e9605a" />
      {/* Kursi plastik pembeli */}
      <RoundedBox args={[0.45, 0.45, 0.45]} radius={0.08} smoothness={2} position={[1.5, 0.23, 0.8]}>
        <meshToonMaterial color="#5a8fe9" />
      </RoundedBox>
    </group>
  );
}

function LapanganFutsal() {
  const { x, z, w, d } = LAPANGAN;
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshToonMaterial color="#6fc06a" />
      </mesh>
      {/* Garis lapangan */}
      {[
        [0, 0, 0.12, d - 1],
        [0, -(d / 2 - 0.5), w - 1, 0.12],
        [0, d / 2 - 0.5, w - 1, 0.12],
        [-(w / 2 - 0.5), 0, 0.12, d - 1],
        [w / 2 - 0.5, 0, 0.12, d - 1],
      ].map(([gx, gz, gw, gd], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[gx, 0.03, gz]}>
          <planeGeometry args={[gw, gd]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.6, 1.75, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Gawang */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2 - 0.5), 0, 0]}>
          {[-1.5, 1.5].map((gz) => (
            <mesh key={gz} position={[0, 0.9, gz]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 1.8, 8]} />
              <meshToonMaterial color={PALETTE.putih} />
              <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
            </mesh>
          ))}
          <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 3.1, 8]} />
            <meshToonMaterial color={PALETTE.putih} />
          </mesh>
        </group>
      ))}
      {/* Bola */}
      <mesh position={[2, 0.22, 1]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshToonMaterial color={PALETTE.putih} />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
    </group>
  );
}

export function Fasilitas() {
  return (
    <group>
      {HALTE.map((h) => (
        <HalteAngkot key={h.id} h={h} />
      ))}
      <GerobakNasgor />
      <LapanganFutsal />
    </group>
  );
}
