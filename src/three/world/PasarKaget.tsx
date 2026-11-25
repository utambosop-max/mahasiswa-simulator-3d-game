// M13: Pasar kaget / area jajanan (selatan) + lapangan voli-bola kampung. Lapak digambar dengan Instances.
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useTampilDekat } from './useTampilDekat';
import { Instance, Instances } from '@react-three/drei';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import { LAPAK, LAPAK_UKURAN, LAPANGAN_KAMPUNG, PASAR_KAGET, lokalKeDunia, rotasiHadap } from '../../game/duniaLayout';
import { PALETTE } from '../palette';
import { GEO_ATAP, GEO_BOLA, GEO_KOTAK, GEO_KOTAK_BULAT, GEO_LANTAI, GEO_SILINDER } from './geoBersama';

/** Warna dagangan per jenis lapak: gorengan, buah, es, mainan. */
const DAGANGAN = [
  ['#e9b949', '#d9a046', '#f2d15c'],
  ['#e9605a', '#ffb36b', '#8fd18a'],
  ['#ff9ac1', '#8fd3ff', '#fffaf2'],
  ['#7fb3e0', '#bdb2ff', '#ffe08a'],
];
const TINGGI_MEJA = 0.9;
/** Kotak kawasan pasar + lapangan kampung (disembunyikan saat pemain jauh). */
const KAWASAN_PASAR = { minX: -56, maxX: 27, minZ: 44, maxZ: 60 };

export function PasarKaget() {
  const malam = useGame((s) => isMalam(s.fase));
  const { w, d } = LAPAK_UKURAN;
  const ref = useRef<Group>(null);
  useTampilDekat(ref, KAWASAN_PASAR);
  const data = useMemo(() => {
    const tiang: [number, number][] = [];
    const barang: [number, number, number, string][] = [];
    LAPAK.forEach((l, i) => {
      const rot = rotasiHadap(l.hadap);
      for (const [lx, lz] of [
        [-w / 2 + 0.1, d / 2 - 0.1],
        [w / 2 - 0.1, d / 2 - 0.1],
        [-w / 2 + 0.1, -d / 2 + 0.1],
        [w / 2 - 0.1, -d / 2 + 0.1],
      ])
        tiang.push(lokalKeDunia(l.x, l.z, rot, lx, lz));
      for (let k = 0; k < 5; k++) {
        const [bx, bz] = lokalKeDunia(l.x, l.z, rot, -1.1 + k * 0.55, 0.55);
        barang.push([bx, TINGGI_MEJA + 0.12, bz, DAGANGAN[l.jenis][(k + i) % 3]]);
      }
    });
    // Untaian lampu warna-warni di atas lorong (zig-zag dua sisi)
    const bohlam: [number, number, number, string][] = [];
    const WARNA = ['#ffd877', '#ff9aa2', '#a8e6cf', '#bfe6ff'];
    for (const s of [-1, 1])
      for (let x = PASAR_KAGET.x0 + 0.3; x <= PASAR_KAGET.x1 - 0.5; x += 0.7) {
        const k = Math.round(x * 10);
        bohlam.push([s * x, 2.55 + Math.sin(x * 0.9) * 0.15, PASAR_KAGET.z + Math.sin(x * 0.45) * 1.2, WARNA[k % 4]]);
      }
    return { tiang, barang, bohlam };
  }, [w, d]);

  const L = LAPANGAN_KAMPUNG;
  return (
    <group ref={ref}>
      {/* Lorong pasar (tanah padat) */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[(s * (PASAR_KAGET.x0 + PASAR_KAGET.x1)) / 2, 0.004, PASAR_KAGET.z]} receiveShadow>
          <planeGeometry args={[PASAR_KAGET.x1 - PASAR_KAGET.x0 + 1.5, PASAR_KAGET.lorong + 4.4]} />
          <meshToonMaterial color="#ead7b4" />
        </mesh>
      ))}
      {/* Meja lapak */}
      <Instances limit={LAPAK.length} castShadow receiveShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial color={PALETTE.putih} />
        {LAPAK.map((l, i) => (
          <Instance key={i} position={[l.x, TINGGI_MEJA / 2, l.z]} rotation={[0, rotasiHadap(l.hadap), 0]} scale={[w - 0.3, TINGGI_MEJA, d - 0.6]} />
        ))}
      </Instances>
      {/* Kain depan meja berwarna sesuai atap */}
      <Instances limit={LAPAK.length}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial />
        {LAPAK.map((l, i) => {
          const rot = rotasiHadap(l.hadap);
          const [x, z] = lokalKeDunia(l.x, l.z, rot, 0, d / 2 - 0.29);
          return <Instance key={i} position={[x, 0.45, z]} rotation={[0, rot, 0]} scale={[w - 0.25, 0.5, 0.04]} color={l.atap} />;
        })}
      </Instances>
      {/* Atap terpal */}
      <Instances limit={LAPAK.length} castShadow>
        <primitive object={GEO_ATAP} attach="geometry" />
        <meshToonMaterial />
        {LAPAK.map((l, i) => (
          <Instance key={i} position={[l.x, 2.15, l.z]} rotation={[0, rotasiHadap(l.hadap), 0]} scale={[w + 0.3, 0.75, d + 0.3]} color={l.atap} />
        ))}
      </Instances>
      <Instances limit={data.tiang.length}>
        <primitive object={GEO_SILINDER} attach="geometry" />
        <meshToonMaterial color={PALETTE.kayuGelap} />
        {data.tiang.map(([x, z], i) => (
          <Instance key={i} position={[x, 0, z]} scale={[0.07, 2.2, 0.07]} />
        ))}
      </Instances>
      {/* Dagangan di atas meja */}
      <Instances limit={data.barang.length}>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial />
        {data.barang.map(([x, y, z, c], i) => (
          <Instance key={i} position={[x, y, z]} scale={[0.2, 0.13, 0.2]} color={c} />
        ))}
      </Instances>
      {/* Bohlam hias (menyala malam) */}
      <Instances limit={data.bohlam.length}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial toneMapped={false} />
        {data.bohlam.map(([x, y, z, c], i) => (
          <Instance key={i} position={[x, y, z]} color={malam ? c : '#fffaf2'} />
        ))}
      </Instances>
      {malam && (
        <Instances limit={LAPAK.length}>
          <circleGeometry args={[1.5, 16]} />
          <meshBasicMaterial color="#ffe08a" transparent opacity={0.18} depthWrite={false} />
          {LAPAK.filter((_, i) => i % 2 === 0).map((l, i) => (
            <Instance key={i} position={[l.x, 0.02, PASAR_KAGET.z]} rotation={[-Math.PI / 2, 0, 0]} />
          ))}
        </Instances>
      )}

      {/* ===== Lapangan kampung (tanah) ===== */}
      <mesh position={[L.x, 0.006, L.z]} scale={[L.w, 1, L.d]} receiveShadow>
        <primitive object={GEO_LANTAI} attach="geometry" />
        <meshToonMaterial color="#dcb98a" />
      </mesh>
      <mesh position={[L.x, 0.009, L.z]} scale={[0.12, 1, L.d - 1]}>
        <primitive object={GEO_LANTAI} attach="geometry" />
        <meshBasicMaterial color="#fffaf2" />
      </mesh>
      {/* Gawang bambu */}
      {[-1, 1].map((s) => (
        <group key={s} position={[L.x + s * (L.w / 2 - 0.4), 0, L.z]}>
          {[-1.4, 1.4].map((gz) => (
            <mesh key={gz} position={[0, 0, gz]} scale={[0.1, 1.7, 0.1]} castShadow>
              <primitive object={GEO_SILINDER} attach="geometry" />
              <meshToonMaterial color="#c9a46b" />
            </mesh>
          ))}
          <mesh position={[0, 1.7, 0]} scale={[0.1, 0.1, 2.9]}>
            <primitive object={GEO_KOTAK} attach="geometry" />
            <meshToonMaterial color="#c9a46b" />
          </mesh>
        </group>
      ))}
      {/* Bola plastik */}
      <mesh position={[L.x + 2.5, 0.18, L.z + 1.5]} scale={0.18} castShadow>
        <primitive object={GEO_BOLA} attach="geometry" />
        <meshToonMaterial color="#ffb36b" />
      </mesh>
    </group>
  );
}
