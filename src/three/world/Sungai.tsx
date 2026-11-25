// M13: Sungai (kali) di utara kota + jembatan di setiap jalan vertikal + jalan setapak tepi sungai + pemancing.
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { useTampilDekat } from './useTampilDekat';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import { Instance, Instances } from '@react-three/drei';
import { DUNIA, JALUR_SUNGAI, JEMBATAN_SETENGAH, PEMANCING, SUNGAI } from '../../game/duniaLayout';
import { PALETTE } from '../palette';
import { Chibi } from '../characters/Chibi';
import { GEO_KOTAK, GEO_KOTAK_BULAT } from './geoBersama';

const PANJANG = DUNIA.halfW * 2 + 60; // melewati batas peta agar ujung tidak terlihat
const diam = { current: false };
const KAWASAN_SUNGAI = { minX: -200, maxX: 200, minZ: SUNGAI.z - 6, maxZ: JALUR_SUNGAI.z + 2 };
/** Ruas tanggul [x awal, x akhir] di antara jembatan. */
const ruasTanggul: [number, number][] = (() => {
  const hasil: [number, number][] = [];
  let a = -PANJANG / 2;
  for (const jx of [...DUNIA.jalanV].sort((p, q) => p - q)) {
    hasil.push([a, jx - JEMBATAN_SETENGAH]);
    a = jx + JEMBATAN_SETENGAH;
  }
  hasil.push([a, PANJANG / 2]);
  return hasil;
})();

function Pemancing({ x, z, r, i }: { x: number; z: number; r: number; i: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, r, 0]}>
      <Chibi bergerak={diam} baju={i ? '#7cc6a4' : '#ffb36b'} rambut="#2a1d15" aksesoris={['topi']} tanpaBayangan />
      {/* Joran bambu menjulur ke sungai */}
      <mesh position={[0.25, 1.4, 1.3]} rotation={[1.0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 2.8, 6]} />
        <meshToonMaterial color="#c9a46b" />
      </mesh>
      {/* Ember ikan */}
      <mesh position={[-0.55, 0.18, 0.1]}>
        <cylinderGeometry args={[0.18, 0.15, 0.36, 10]} />
        <meshToonMaterial color="#5a8fe9" />
      </mesh>
    </group>
  );
}

export function Sungai() {
  const malam = useGame((s) => isMalam(s.fase));
  const ref = useRef<Group>(null);
  useTampilDekat(ref, KAWASAN_SUNGAI);
  const z0 = SUNGAI.z - SUNGAI.setengah;
  const z1 = SUNGAI.z + SUNGAI.setengah;
  // Tiang pagar jembatan (Instances)
  const tiang = useMemo(() => {
    const hasil: [number, number][] = [];
    for (const jx of DUNIA.jalanV)
      for (const s of [-1, 1]) for (let z = z0 - 0.4; z <= z1 + 0.41; z += 1.1) hasil.push([jx + s * (JEMBATAN_SETENGAH - 0.05), z]);
    return hasil;
  }, [z0, z1]);
  const riak = useMemo(
    () => Array.from({ length: 26 }, (_, i) => [-80 + i * 6.3 + ((i * 37) % 5), SUNGAI.z + (((i * 53) % 7) - 3) * 0.6, 0.6 + ((i * 13) % 5) * 0.25] as [number, number, number]),
    [],
  );

  return (
    <group ref={ref}>
      {/* Air */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, SUNGAI.z]}>
        <planeGeometry args={[PANJANG, SUNGAI.setengah * 2]} />
        {/* meshBasic: air tetap cerah (tidak ikut gelap toon), malam diredupkan lewat warna */}
        <meshBasicMaterial color={malam ? '#3f6f99' : '#8fd3ff'} />
      </mesh>
      {/* Riak air (garis putih pendek) */}
      <Instances limit={riak.length}>
        <planeGeometry args={[1, 0.08]} />
        <meshBasicMaterial color="#e8f6ff" transparent opacity={0.8} depthWrite={false} />
        {riak.map(([x, z, w], i) => (
          <Instance key={i} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[w, 1, 1]} />
        ))}
      </Instances>
      {/* Tanggul batu di kedua tepi */}
      {/* (dipotong di jembatan agar tidak menghalangi jalan) */}
      <Instances limit={16} receiveShadow>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color={PALETTE.abu} />
        {ruasTanggul.flatMap(([a, b]) =>
          [z0 - 0.3, z1 + 0.3].map((z) => <Instance key={`${a}${z}`} position={[(a + b) / 2, 0.12, z]} scale={[b - a, 0.24, 0.6]} />),
        )}
      </Instances>
      {/* Jalan setapak tepi sungai */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(JALUR_SUNGAI.x0 + JALUR_SUNGAI.x1) / 2, 0.004, JALUR_SUNGAI.z]} receiveShadow>
        <planeGeometry args={[JALUR_SUNGAI.x1 - JALUR_SUNGAI.x0, JALUR_SUNGAI.lebar]} />
        <meshToonMaterial color="#e3cfa9" />
      </mesh>

      {/* Jembatan: lantai beton di bawah aspal + balok samping + pagar */}
      {DUNIA.jalanV.map((jx) => (
        <group key={jx} position={[jx, 0, SUNGAI.z]}>
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[JEMBATAN_SETENGAH * 2, 0.1, SUNGAI.setengah * 2 + 1.2]} />
            <meshToonMaterial color="#d8cfc2" />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * (JEMBATAN_SETENGAH - 0.05), 0, 0]}>
              {/* Pegangan atas pagar */}
              <mesh position={[0, 0.95, 0]} scale={[0.14, 0.12, SUNGAI.setengah * 2 + 1.2]}>
                <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
                <meshToonMaterial color="#e9605a" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      <Instances limit={tiang.length}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color="#fffaf2" />
        {tiang.map(([x, z], i) => (
          <Instance key={i} position={[x, 0.5, z]} scale={[0.12, 0.9, 0.12]} />
        ))}
      </Instances>

      {PEMANCING.map(([x, z, r], i) => (
        <Pemancing key={i} x={x} z={z} r={r} i={i} />
      ))}
    </group>
  );
}
