// M13: Sawah, kebun sayur, kebun pisang, saung bambu, orang-orangan sawah & bangau (kawasan timur/selatan).
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useTampilDekat } from './useTampilDekat';
import { Instance, Instances } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import { BEDENGAN, PETAK_SAWAH, POHON_PISANG, SAUNG } from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';
import { GEO_ATAP, GEO_BOLA, GEO_DAUN, GEO_KERUCUT, GEO_KOTAK, GEO_KOTAK_BULAT, GEO_LANTAI, GEO_SILINDER } from './geoBersama';

/** Generator acak tetap kecil (hasil sama tiap dimuat). */
function acak(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Saung({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * 1.2, 0, sz * 1.2]} scale={[0.14, 2.3, 0.14]} castShadow>
          <primitive object={GEO_SILINDER} attach="geometry" />
          <meshToonMaterial color="#c9a46b" />
        </mesh>
      ))}
      {/* Balai-balai bambu */}
      <mesh position={[0, 0.55, 0]} scale={[2.6, 0.14, 2.6]} castShadow receiveShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color="#e3c28a" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Atap ijuk */}
      <mesh position={[0, 2.25, 0]} scale={[3.4, 1.3, 3.4]} castShadow>
        <primitive object={GEO_ATAP} attach="geometry" />
        <meshToonMaterial color="#8a5a35" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      {/* Caping & kendi di balai-balai */}
      <mesh position={[0.5, 0.66, 0.3]} scale={[0.35, 0.15, 0.35]}>
        <primitive object={GEO_KERUCUT} attach="geometry" />
        <meshToonMaterial color="#e9c46a" />
      </mesh>
      <mesh position={[-0.6, 0.78, -0.2]} scale={0.16}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#c46a3a" />
      </mesh>
    </group>
  );
}

function OrangOrangan({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh scale={[0.07, 1.9, 0.07]}>
        <primitive object={GEO_SILINDER} attach="geometry" />
        <meshToonMaterial color="#a86b3c" />
      </mesh>
      <mesh position={[0, 1.35, 0]} scale={[1.4, 0.06, 0.06]}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color="#a86b3c" />
      </mesh>
      <mesh position={[0, 1.2, 0]} scale={[0.6, 0.6, 0.3]}>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color="#e9605a" />
      </mesh>
      <mesh position={[0, 1.75, 0]} scale={0.22}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#fff1c4" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, 1.92, 0]} scale={[0.42, 0.2, 0.42]}>
        <primitive object={GEO_KERUCUT} attach="geometry" />
        <meshToonMaterial color="#e9c46a" />
      </mesh>
    </group>
  );
}

/** Kotak kawasan sawah & kebun (timur + tenggara). */
const KAWASAN_SAWAH = { minX: 60, maxX: 84, minZ: -45, maxZ: 58 };

export function SawahKebun() {
  const ref = useRef<Group>(null);
  useTampilDekat(ref, KAWASAN_SAWAH);
  const data = useMemo(() => {
    const r = acak(31337);
    // Rumpun padi berbaris rapi di tiap petak
    const padi: [number, number, number][] = [];
    for (const p of PETAK_SAWAH)
      for (let x = p.minX + 0.45; x < p.maxX - 0.2; x += 0.8) for (let z = p.minZ + 0.45; z < p.maxZ - 0.2; z += 0.9) padi.push([x, z, 0.8 + r() * 0.4]);
    // Tanaman sayur di atas bedengan (warna bergantian: kol, cabai, terong)
    const sayur: [number, number, string][] = [];
    const WARNA = ['#8fd18a', '#e9605a', '#9b7fd1', '#6bb86e'];
    BEDENGAN.forEach((b, j) => {
      for (let x = b.minX + 0.5; x < b.maxX - 0.3; x += 0.9) sayur.push([x, (b.minZ + b.maxZ) / 2, WARNA[j % WARNA.length]]);
    });
    // Bangau putih berdiri di petak sawah
    const bangau = PETAK_SAWAH.filter((_, i) => i % 2 === 0).map((p, i): [number, number, number] => [p.minX + 1.4 + (i % 2) * 1.5, p.minZ + 2 + i * 0.7, i * 1.3]);
    const orang = [PETAK_SAWAH[1], PETAK_SAWAH[8]].filter(Boolean).map((p): [number, number] => [(p.minX + p.maxX) / 2, (p.minZ + p.maxZ) / 2]);
    return { padi, sayur, bangau, orang };
  }, []);

  return (
    <group ref={ref}>
      {/* Air sawah (hijau keruh) — tiap petak 1 instance */}
      <Instances limit={PETAK_SAWAH.length} receiveShadow>
        <primitive object={GEO_LANTAI} attach="geometry" />
        <meshToonMaterial color="#b9d98d" />
        {PETAK_SAWAH.map((p, i) => (
          <Instance key={i} position={[(p.minX + p.maxX) / 2, 0.01, (p.minZ + p.maxZ) / 2]} scale={[p.maxX - p.minX, 1, p.maxZ - p.minZ]} />
        ))}
      </Instances>
      {/* Rumpun padi (tanpa bayangan: banyak & kecil) */}
      <Instances limit={data.padi.length}>
        <primitive object={GEO_KERUCUT} attach="geometry" />
        <meshToonMaterial color="#7cc67a" />
        {data.padi.map(([x, z, s], i) => (
          <Instance key={i} position={[x, 0, z]} scale={[0.16, 0.55 * s, 0.16]} />
        ))}
      </Instances>
      {/* Bedengan tanah */}
      <Instances limit={BEDENGAN.length} receiveShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color="#b98a5e" />
        {BEDENGAN.map((b, i) => (
          <Instance key={i} position={[(b.minX + b.maxX) / 2, 0.1, (b.minZ + b.maxZ) / 2]} scale={[b.maxX - b.minX, 0.25, b.maxZ - b.minZ]} />
        ))}
      </Instances>
      <Instances limit={data.sayur.length}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial />
        {data.sayur.map(([x, z, w], i) => (
          <Instance key={i} position={[x, 0.36, z]} scale={[0.28, 0.22, 0.28]} color={w} />
        ))}
      </Instances>
      {/* Daun bawah sayur (hijau) agar cabai/terong tetap terbaca sebagai tanaman */}
      <Instances limit={data.sayur.length}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#6bb86e" />
        {data.sayur.map(([x, z], i) => (
          <Instance key={i} position={[x + 0.12, 0.28, z - 0.08]} scale={[0.22, 0.14, 0.22]} />
        ))}
      </Instances>

      {/* Pohon pisang: batang + 5 daun lebar melengkung */}
      <Instances limit={POHON_PISANG.length} castShadow>
        <primitive object={GEO_SILINDER} attach="geometry" />
        <meshToonMaterial color="#9fc46a" />
        {POHON_PISANG.map(([x, z, s], i) => (
          <Instance key={i} position={[x, 0, z]} scale={[0.32 * s, 2.2 * s, 0.32 * s]} />
        ))}
      </Instances>
      <Instances limit={POHON_PISANG.length * 5}>
        <primitive object={GEO_DAUN} attach="geometry" />
        <meshToonMaterial color="#7cc67a" />
        {POHON_PISANG.flatMap(([x, z, s], i) =>
          [0, 1, 2, 3, 4].map((k) => (
            <Instance key={`${i}-${k}`} position={[x, 2.15 * s, z]} rotation={[-0.35 - (k % 2) * 0.25, (k / 5) * Math.PI * 2 + i, 0, 'YXZ']} scale={[2.0 * s, 1, 1.7 * s]} />
          )),
        )}
      </Instances>

      {/* Bangau: badan, leher, kaki */}
      <Instances limit={data.bangau.length}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#fffaf2" />
        {data.bangau.map(([x, z, r], i) => (
          <Instance key={i} position={[x, 0.75, z]} rotation={[0, r, 0]} scale={[0.2, 0.18, 0.34]} />
        ))}
      </Instances>
      <Instances limit={data.bangau.length * 2}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#fffaf2" />
        {data.bangau.flatMap(([x, z, r], i) => [
          <Instance key={`l${i}`} position={[x + Math.sin(r) * 0.22, 1.05, z + Math.cos(r) * 0.22]} scale={[0.05, 0.22, 0.05]} />,
          <Instance key={`k${i}`} position={[x + Math.sin(r) * 0.27, 1.3, z + Math.cos(r) * 0.27]} scale={0.08} />,
        ])}
      </Instances>
      <Instances limit={data.bangau.length * 2}>
        <primitive object={GEO_SILINDER} attach="geometry" />
        <meshToonMaterial color="#ffb36b" />
        {data.bangau.flatMap(([x, z], i) =>
          [-0.06, 0.06].map((o) => <Instance key={`${i}${o}`} position={[x + o, 0, z]} scale={[0.025, 0.62, 0.025]} />),
        )}
      </Instances>

      {SAUNG.map(([x, z]) => (
        <Saung key={`${x}${z}`} x={x} z={z} />
      ))}
      {data.orang.map(([x, z]) => (
        <OrangOrangan key={`${x}${z}`} x={x} z={z} />
      ))}
    </group>
  );
}
