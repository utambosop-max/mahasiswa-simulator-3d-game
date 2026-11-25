// Set "jalan antarkota": bus diam di tengah, dunia yang bergulir (looping) — ruas aspal, marka,
// pohon & tiang lampu bergeser ke −x lalu dipindah lagi ke depan. Bukit jauh bergeser lebih pelan (paralaks).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';
import type { Group } from 'three';
import { PALETTE } from '../palette';
import { Bus } from '../props/Bus';

const PANJANG = 80; // panjang lingkaran gulir (m)
const LAJU = 13; // m/detik
const POHON = Array.from({ length: 16 }, (_, i) => [i * 5 + (i % 3), -6 - (i % 4) * 1.4, 1 + (i % 3) * 0.3] as const);
const LAMPU = Array.from({ length: 5 }, (_, i) => i * 16);
const MARKA = Array.from({ length: 20 }, (_, i) => i * 4);

/** Geser posisi x dalam lingkaran [-PANJANG/2, PANJANG/2). */
const gulir = (x0: number, d: number) => ((((x0 - d) % PANJANG) + PANJANG) % PANJANG) - PANJANG / 2;

export function SetJalan({ malam }: { malam: boolean }) {
  const pohon = useRef<Group>(null);
  const lampu = useRef<Group>(null);
  const marka = useRef<Group>(null);
  const bukit = useRef<Group>(null);
  const bus = useRef<Group>(null);
  const putar = useMemo(() => ({ current: LAJU / 0.45 }), []);
  const jarak = useRef(0);

  useFrame(({ clock }, dt) => {
    jarak.current += LAJU * Math.min(dt, 0.25);
    const d = jarak.current;
    const p = pohon.current;
    // Instance drei = Object3D anak dari grup Instances → posisinya bisa digeser langsung
    if (p) for (let i = 0; i < p.children.length; i++) p.children[i].position.x = gulir(POHON[i][0], d);
    const l = lampu.current;
    if (l) for (let i = 0; i < l.children.length; i++) l.children[i].position.x = gulir(LAMPU[i], d);
    const m = marka.current;
    if (m) for (let i = 0; i < m.children.length; i++) m.children[i].position.x = gulir(MARKA[i], d);
    if (bukit.current) bukit.current.position.x = -((d * 0.08) % 40);
    if (bus.current) bus.current.position.y = Math.abs(Math.sin(clock.getElapsedTime() * 6)) * 0.03;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 80]} />
        <meshToonMaterial color={PALETTE.rumput} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[200, 6]} />
        <meshToonMaterial color={PALETTE.aspal} />
      </mesh>
      <Instances limit={MARKA.length}>
        <boxGeometry args={[1.8, 0.02, 0.15]} />
        <meshBasicMaterial color={PALETTE.putih} />
        <group ref={marka}>
          {MARKA.map((x, i) => (
            <Instance key={i} position={[x, 0.02, 2.2]} />
          ))}
        </group>
      </Instances>
      {/* Pohon di sisi jauh */}
      <Instances limit={POHON.length}>
        <sphereGeometry args={[1.2, 10, 8]} />
        <meshToonMaterial color={PALETTE.daun[0]} />
        <group ref={pohon}>
          {POHON.map(([x, z, s], i) => (
            <Instance key={i} position={[x, 1.6 * s, z]} scale={s} />
          ))}
        </group>
      </Instances>
      {/* Tiang lampu di sisi dekat */}
      <Instances limit={LAMPU.length}>
        <cylinderGeometry args={[0.07, 0.07, 4, 6]} />
        <meshToonMaterial color="#9aa0aa" />
        <group ref={lampu}>
          {LAMPU.map((x, i) => (
            <Instance key={i} position={[x, 2, 4.2]} />
          ))}
        </group>
      </Instances>
      <group ref={bukit}>
        {[-40, -10, 20, 50, 80].map((x, i) => (
          <mesh key={i} position={[x, 0, -34]} scale={[14, 6 + (i % 2) * 3, 6]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshToonMaterial color={i % 2 ? '#9fc9b0' : '#b5d6c0'} />
          </mesh>
        ))}
      </group>
      {/* Bus melaju ke +x (menghadap +z lokal → diputar 90°) */}
      <group ref={bus}>
        <group rotation={[0, Math.PI / 2, 0]}>
          <Bus putar={putar} lampu={malam} />
        </group>
      </group>
    </group>
  );
}
