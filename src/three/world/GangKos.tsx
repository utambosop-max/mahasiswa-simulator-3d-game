// M13: Gang kos-kosan di barat — paving gang, deretan kos petak (Instances), gapura, menara air,
// dan detail "cerita anak kos": sandal di depan pintu, kardus mi instan, papan "Bayar Tgl 5", kucing tidur di atap.
import { useMemo, useRef } from 'react';
import { Instance, Instances, RoundedBox } from '@react-three/drei';
import { Outlines } from '../lod/Outlines';
import type { Group } from 'three';
import { useGame } from '../../game/store';
import { isMalam } from '../../game/sim';
import { boxAt } from '../../game/collision';
import { GANG, GAPURA, GAPURA_TIANG, KARDUS, KOS_PETAK, KUCING_ATAP, MENARA_AIR, PAPAN_KOS, SANDAL, lokalKeDunia, rotasiHadap } from '../../game/duniaLayout';
import { PALETTE, OUTLINE } from '../palette';
import { useTembusPandang } from '../useTembusPandang';
import { usePapan } from '../usePapan';
import { GEO_ATAP, GEO_BIDANG, GEO_KOTAK, GEO_KOTAK_BULAT } from './geoBersama';
import { KucingModel } from './Satwa';
import { useTampilDekat } from './useTampilDekat';

const TINGGI = 3;
/** Kotak kawasan gang (untuk disembunyikan saat pemain jauh). */
const KAWASAN_GANG = { minX: -84, maxX: -59, minZ: -46, maxZ: 62 };
const ATAP = 1.4;
type V3 = [number, number, number];

/** Data instance kos petak (dihitung sekali). */
function useDataPetak() {
  return useMemo(() => {
    return KOS_PETAK.map((p) => {
      const rot = rotasiHadap(p.hadap);
      const lw = p.hadap === '+x' || p.hadap === '-x' ? p.d : p.w; // lebar muka
      const ld = p.hadap === '+x' || p.hadap === '-x' ? p.w : p.d; // kedalaman
      const titik = (lx: number, y: number, lz: number): V3 => {
        const [x, z] = lokalKeDunia(p.x, p.z, rot, lx, lz);
        return [x, y, z];
      };
      return { p, rot, lw, ld, titik };
    });
  }, []);
}

function PapanKos({ teks, bg, posisi, rot }: { teks: string; bg: string; posisi: V3; rot: number }) {
  const tex = usePapan(teks, bg);
  return (
    <mesh position={posisi} rotation={[0, rot, 0]} scale={[2.0, 0.5, 1]}>
      <primitive object={GEO_BIDANG} attach="geometry" />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Gapura({ x, z, teks }: { x: number; z: number; teks: string }) {
  const tex = usePapan(teks, '#e94b4b');
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * GAPURA_TIANG, 0, 0]}>
          {/* Tiang belang merah-putih khas gapura 17-an */}
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[0, 0.45 + k * 0.85, 0]} castShadow>
              <boxGeometry args={[0.42, 0.85, 0.42]} />
              <meshToonMaterial color={k % 2 === 0 ? '#e94b4b' : '#fffaf2'} />
            </mesh>
          ))}
          <mesh position={[0, 3.55, 0]}>
            <sphereGeometry args={[0.26, 10, 8]} />
            <meshToonMaterial color={PALETTE.mentega} />
          </mesh>
        </group>
      ))}
      <RoundedBox args={[GAPURA_TIANG * 2 + 0.7, 0.6, 0.3]} radius={0.06} smoothness={2} position={[0, 3.1, 0]} castShadow>
        <meshToonMaterial color="#fffaf2" />
        <Outlines thickness={OUTLINE.tipis} color={PALETTE.outline} />
      </RoundedBox>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 3.1, s * 0.16]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[GAPURA_TIANG * 2 + 0.3, 0.48]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function MenaraAir() {
  const ref = useRef<Group>(null);
  const kotak = useMemo(() => boxAt(MENARA_AIR.x, MENARA_AIR.z, 3, 3), []);
  useTembusPandang(ref, kotak, MENARA_AIR.tinggi);
  const kaki = 6.2;
  return (
    <group ref={ref} position={[MENARA_AIR.x, 0, MENARA_AIR.z]}>
      {[
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * 0.95, kaki / 2, sz * 0.95]} castShadow>
          <cylinderGeometry args={[0.09, 0.12, kaki, 8]} />
          <meshToonMaterial color="#9aa3ad" />
        </mesh>
      ))}
      {/* Palang silang */}
      {[2.2, 4.4].map((y) => (
        <group key={y}>
          {[0, Math.PI / 2].map((r) => (
            <mesh key={r} position={[0, y, 0]} rotation={[0, r, 0]}>
              <boxGeometry args={[2.0, 0.08, 0.08]} />
              <meshToonMaterial color="#9aa3ad" />
            </mesh>
          ))}
        </group>
      ))}
      {/* Tandon air biru */}
      <mesh position={[0, kaki + 1.1, 0]} castShadow>
        <cylinderGeometry args={[1.35, 1.35, 2.2, 16]} />
        <meshToonMaterial color="#7fb3e0" />
        <Outlines thickness={OUTLINE.tebal} color={PALETTE.outline} />
      </mesh>
      <mesh position={[0, kaki + 2.2 + 0.3, 0]}>
        <coneGeometry args={[1.45, 0.6, 16]} />
        <meshToonMaterial color="#5a8fe9" />
      </mesh>
      {/* Lingkar putih bertulisan (pita) */}
      <mesh position={[0, kaki + 1.1, 0]}>
        <cylinderGeometry args={[1.37, 1.37, 0.35, 16]} />
        <meshToonMaterial color="#fffaf2" />
      </mesh>
      {/* Tangga */}
      <mesh position={[1.08, kaki / 2 + 0.5, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.06, kaki + 1, 0.5]} />
        <meshToonMaterial color="#5f6672" />
      </mesh>
    </group>
  );
}

/** Kawasan gang kos-kosan. */
export function GangKos() {
  const malam = useGame((s) => isMalam(s.fase));
  const data = useDataPetak();
  const panjang = GANG.z1 - GANG.z0;
  const ref = useRef<Group>(null);
  useTampilDekat(ref, KAWASAN_GANG);

  return (
    <group ref={ref}>
      {/* Paving gang (sedikit di bawah aspal agar jalan raya tetap di atas) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[GANG.x, 0.004, (GANG.z0 + GANG.z1) / 2]} receiveShadow>
        <planeGeometry args={[GANG.lebar, panjang]} />
        <meshToonMaterial color="#e3cfa9" />
      </mesh>
      {/* Garis tepi paving (lis batu) */}
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[GANG.x + s * (GANG.lebar / 2 + 0.1), 0.0045, (GANG.z0 + GANG.z1) / 2]}>
          <planeGeometry args={[0.2, panjang]} />
          <meshToonMaterial color="#c9b48d" />
        </mesh>
      ))}

      {/* Badan kos petak */}
      <Instances limit={data.length} castShadow receiveShadow>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial />
        {data.map(({ p, rot, lw, ld }, i) => (
          <Instance key={i} position={[p.x, TINGGI / 2, p.z]} rotation={[0, rot, 0]} scale={[lw, TINGGI, ld]} color={p.warna} />
        ))}
      </Instances>
      {/* Atap limas */}
      <Instances limit={data.length} castShadow>
        <primitive object={GEO_ATAP} attach="geometry" />
        <meshToonMaterial />
        {data.map(({ p, rot, lw, ld }, i) => (
          <Instance key={i} position={[p.x, TINGGI, p.z]} rotation={[0, rot, 0]} scale={[lw, ATAP, ld]} color={p.atap} />
        ))}
      </Instances>
      {/* Pintu kayu */}
      <Instances limit={data.length}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color={PALETTE.kayuGelap} />
        {data.map(({ rot, ld, titik }, i) => (
          <Instance key={i} position={titik(-1.0, 0.95, ld / 2 + 0.03)} rotation={[0, rot, 0]} scale={[0.9, 1.9, 0.08]} />
        ))}
      </Instances>
      {/* Jendela: menyala kuning saat malam (meshBasic = "menyala" tanpa lampu sungguhan) */}
      <Instances limit={data.length}>
        <primitive object={GEO_BIDANG} attach="geometry" />
        <meshBasicMaterial color={malam ? '#ffd877' : '#bfe6ff'} toneMapped={false} />
        {data.map(({ rot, ld, titik }, i) => (
          <Instance key={i} position={titik(1.1, 1.65, ld / 2 + 0.07)} rotation={[0, rot, 0]} scale={[1.1, 0.8, 1]} />
        ))}
      </Instances>
      {/* Kusen jendela */}
      <Instances limit={data.length}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color="#fffaf2" />
        {data.map(({ rot, ld, titik }, i) => (
          <Instance key={i} position={titik(1.1, 1.65, ld / 2 + 0.035)} rotation={[0, rot, 0]} scale={[1.3, 1.0, 0.05]} />
        ))}
      </Instances>

      {/* Sandal di depan pintu (sepasang = 2 instance) */}
      <Instances limit={SANDAL.length * 2}>
        <primitive object={GEO_KOTAK_BULAT} attach="geometry" />
        <meshToonMaterial />
        {SANDAL.flatMap(([x, z, r], i) =>
          [-0.09, 0.09].map((o) => {
            const [sx, sz] = lokalKeDunia(x, z, r, o, 0);
            return <Instance key={`${i}${o}`} position={[sx, 0.03, sz]} rotation={[0, r + o, 0]} scale={[0.13, 0.05, 0.3]} color={['#3d7fd1', '#e9605a', '#4f9a45', '#3b2a20'][i % 4]} />;
          }),
        )}
      </Instances>
      {/* Kardus mi instan bertumpuk */}
      <Instances limit={KARDUS.length * 2}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color="#d8b07a" />
        {KARDUS.flatMap(([x, z, r], i) => [
          <Instance key={`a${i}`} position={[x, 0.18, z]} rotation={[0, r, 0]} scale={[0.5, 0.36, 0.38]} />,
          <Instance key={`b${i}`} position={[x, 0.5, z]} rotation={[0, r + 0.4, 0]} scale={[0.42, 0.28, 0.32]} />,
        ])}
      </Instances>
      {/* Pita merah di kardus (biar terbaca "kardus mi") */}
      <Instances limit={KARDUS.length}>
        <primitive object={GEO_KOTAK} attach="geometry" />
        <meshToonMaterial color="#e9605a" />
        {KARDUS.map(([x, z, r], i) => (
          <Instance key={i} position={[x, 0.2, z]} rotation={[0, r, 0]} scale={[0.52, 0.1, 0.4]} />
        ))}
      </Instances>

      {/* Papan kecil di dinding kos */}
      {PAPAN_KOS.map((k) => {
        const d = data[k.petak];
        if (!d) return null;
        return <PapanKos key={k.petak} teks={k.teks} bg={k.bg} posisi={d.titik(0.2, 2.5, d.ld / 2 + 0.08)} rot={d.rot} />;
      })}

      {/* Kejutan kecil: kucing tidur di lereng atap */}
      {KUCING_ATAP.map((idx) => {
        const d = data[idx];
        if (!d) return null;
        const t = 0.45;
        const lz = t * 0.55 * d.ld;
        const lereng = Math.atan2(ATAP, 0.55 * d.ld);
        return (
          <group key={idx} position={d.titik(0.5, TINGGI + ATAP * (1 - t) + 0.02, lz)} rotation={[0, d.rot, 0]}>
            <group rotation={[lereng, 0, 0]}>
              <KucingModel warna={idx % 2 ? '#ffb36b' : '#5f6672'} tidur />
            </group>
          </group>
        );
      })}

      {GAPURA.map((g) => (
        <Gapura key={g.z} x={g.x} z={g.z} teks={g.teks} />
      ))}
      <MenaraAir />
    </group>
  );
}
