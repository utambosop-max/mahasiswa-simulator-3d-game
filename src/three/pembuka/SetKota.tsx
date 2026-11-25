// Set ringkas "Kampung Mahasiswa" (meniru dunia game, tidak mengimpor src/three/world agar aman saat dirombak):
// jalan + trotoar, halte, Warteg Barokah, Warkop Begadang, Kos Melati dengan gerbang, pohon & lampu jalan (Instances).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances, RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { PALETTE } from '../palette';
import { usePapan } from '../usePapan';
import { Bus } from '../props/Bus';
import { AngkotModel } from '../kendaraan/Model';
import { jam } from './waktu';
import { kurva, type Kendaraan } from './data';

const POHON = [-14, -6.2, -0.3, 5.8, 12.5, 16];
const LAMPU = [-12, -1.5, 6.2, 14];

function Gedung({ x, w, warna, atap, teks, aksen, tinggi = 3 }: { x: number; w: number; warna: string; atap: string; teks: string; aksen: string; tinggi?: number }) {
  const papan = usePapan(teks, aksen, '#ffffff', 512, 112);
  const d = 4.5;
  const z = -5.6 - d / 2;
  return (
    <group position={[x, 0, z]}>
      <RoundedBox args={[w, tinggi, d]} radius={0.12} smoothness={2} position={[0, tinggi / 2, 0]} castShadow receiveShadow>
        <meshToonMaterial color={warna} />
        <Outlines thickness={0.03} color={PALETTE.outline} />
      </RoundedBox>
      {/* Kanopi aksen */}
      <mesh position={[0, tinggi * 0.72, d / 2 + 0.5]} rotation={[0.3, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.08, 1.1]} />
        <meshToonMaterial color={aksen} />
      </mesh>
      <mesh position={[0, tinggi + 0.35, d / 2 - 0.2]}>
        <planeGeometry args={[Math.min(w * 0.85, 4), 0.62]} />
        <meshBasicMaterial map={papan} toneMapped={false} />
      </mesh>
      <mesh position={[0, tinggi + 0.25, -0.2]} castShadow>
        <boxGeometry args={[w + 0.2, 0.35, d + 0.2]} />
        <meshToonMaterial color={atap} />
      </mesh>
      {/* Pintu & etalase */}
      <mesh position={[-w * 0.2, 1, d / 2 + 0.03]}>
        <boxGeometry args={[1, 2, 0.05]} />
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </mesh>
      <mesh position={[w * 0.22, 1.2, d / 2 + 0.03]}>
        <boxGeometry args={[w * 0.35, 1, 0.05]} />
        <meshToonMaterial color="#bfe6ff" />
      </mesh>
    </group>
  );
}

function Halte() {
  const papan = usePapan('HALTE', '#7fb3e0', '#ffffff', 256, 96);
  return (
    <group position={[-9, 0, -4.8]}>
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} position={[x, 1.2, -0.4]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 2.4, 8]} />
          <meshToonMaterial color="#9aa0aa" />
        </mesh>
      ))}
      <RoundedBox args={[3.4, 0.14, 1.5]} radius={0.05} smoothness={2} position={[0, 2.45, -0.3]} castShadow>
        <meshToonMaterial color="#7fb3e0" />
        <Outlines thickness={0.02} color={PALETTE.outline} />
      </RoundedBox>
      <RoundedBox args={[2.4, 0.12, 0.45]} radius={0.04} smoothness={2} position={[0, 0.5, -0.6]}>
        <meshToonMaterial color={PALETTE.kayuGelap} />
      </RoundedBox>
      <mesh position={[0, 2.75, 0.3]}>
        <planeGeometry args={[1.2, 0.42]} />
        <meshBasicMaterial map={papan} toneMapped={false} />
      </mesh>
    </group>
  );
}

function KosMelati() {
  const papan = usePapan('KOS MELATI', '#ff9aa2', '#ffffff', 512, 112);
  return (
    <group>
      <Gedung x={11.5} w={5.4} warna={PALETTE.dindingKos} atap={PALETTE.merahBata} teks="KOS MELATI" aksen="#ff9aa2" tinggi={4.2} />
      {/* Pagar & gerbang */}
      {[8.4, 10.2].map((x) => (
        <mesh key={x} position={[x, 0.9, -5.2]} castShadow>
          <boxGeometry args={[0.25, 1.8, 0.25]} />
          <meshToonMaterial color="#e6d3b3" />
        </mesh>
      ))}
      <mesh position={[9.3, 2.0, -5.2]}>
        <planeGeometry args={[2.0, 0.42]} />
        <meshBasicMaterial map={papan} toneMapped={false} />
      </mesh>
      <mesh position={[9.95, 0.7, -5.0]} rotation={[0, -0.9, 0]}>
        <boxGeometry args={[1.5, 1.1, 0.06]} />
        <meshToonMaterial color="#7cc6a4" />
      </mesh>
    </group>
  );
}

/** Bus/angkot yang bergerak sesuai data shot (kurva percepatan/perlambatan). */
function Mobil({ k, durasi }: { k: Kendaraan; durasi: number }) {
  const g = useRef<Group>(null);
  const putar = useMemo(() => ({ current: 0 }), []);
  useFrame(() => {
    if (!g.current) return;
    const f = jam.lokal / durasi;
    const u = (f - k.waktu[0]) / (k.waktu[1] - k.waktu[0]);
    const e = kurva(k.kurva, u);
    g.current.position.set(k.dari[0] + (k.ke[0] - k.dari[0]) * e, 0, k.dari[1] + (k.ke[1] - k.dari[1]) * e);
    putar.current = u > 0 && u < 1 ? 20 * (1 - e) + 2 : 0;
  });
  return (
    <group ref={g} rotation={[0, (k.hadap * Math.PI) / 180, 0]}>
      {k.id === 'bus' ? <Bus putar={putar} /> : <AngkotModel warna="#7cc6a4" malam={false} />}
    </group>
  );
}

export function SetKota({ kendaraan, durasi }: { kendaraan?: Kendaraan[]; durasi: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <meshToonMaterial color={PALETTE.rumput} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[120, 6]} />
        <meshToonMaterial color={PALETTE.aspal} />
      </mesh>
      {[-4.3, 3.8].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, z]} receiveShadow>
          <planeGeometry args={[120, z < 0 ? 2.6 : 1.6]} />
          <meshToonMaterial color={PALETTE.trotoar} />
        </mesh>
      ))}
      <Instances limit={30}>
        <boxGeometry args={[1.6, 0.02, 0.15]} />
        <meshBasicMaterial color={PALETTE.putih} />
        {Array.from({ length: 30 }, (_, i) => (
          <Instance key={i} position={[-45 + i * 3.2, 0.02, 0]} />
        ))}
      </Instances>
      <Halte />
      <Gedung x={-3.2} w={5} warna="#e9f6ef" atap={PALETTE.wartegHijau} teks="WARTEG BAROKAH" aksen={PALETTE.wartegHijau} />
      <Gedung x={2.6} w={4.4} warna="#f3e1cf" atap={PALETTE.kopi} teks="WARKOP BEGADANG" aksen={PALETTE.kopi} />
      <KosMelati />
      {/* Rumah warga filler di sisi seberang */}
      {[-12, -3, 6, 14].map((x, i) => (
        <group key={x} position={[x, 0, 9]}>
          <RoundedBox args={[4.5, 2.6, 4]} radius={0.12} smoothness={2} position={[0, 1.3, 0]} castShadow>
            <meshToonMaterial color={i % 2 ? '#fde8c8' : '#e9f0fb'} />
          </RoundedBox>
          <group position={[0, 3.2, 0]} scale={[3.6, 1, 3.2]}>
            <mesh rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[1, 1.4, 4]} />
              <meshToonMaterial color={i % 2 ? PALETTE.merahBata : PALETTE.wartegBiru} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Pohon & lampu jalan (instanced) */}
      <Instances limit={POHON.length}>
        <cylinderGeometry args={[0.15, 0.2, 1.6, 8]} />
        <meshToonMaterial color={PALETTE.batang} />
        {POHON.map((x, i) => (
          <Instance key={i} position={[x, 0.8, -4.9]} />
        ))}
      </Instances>
      <Instances limit={POHON.length}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial color={PALETTE.daun[2]} />
        {POHON.map((x, i) => (
          <Instance key={i} position={[x, 2.2, -4.9]} scale={0.95} />
        ))}
      </Instances>
      <Instances limit={LAMPU.length}>
        <cylinderGeometry args={[0.06, 0.06, 3.6, 6]} />
        <meshToonMaterial color="#9aa0aa" />
        {LAMPU.map((x, i) => (
          <Instance key={i} position={[x, 1.8, 3.4]} />
        ))}
      </Instances>
      {kendaraan?.map((k) => <Mobil key={k.id} k={k} durasi={durasi} />)}
    </group>
  );
}
