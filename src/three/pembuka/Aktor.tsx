// Satu tokoh di animasi pembuka: posisi, arah hadap, jalan, lambai & gestur dihitung dari data shot.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Chibi } from '../characters/Chibi';
import { MotorModel } from '../kendaraan/Model';
import { Kardus } from '../props/Kardus';
import { Rantang } from '../props/Rantang';
import { BukuSakti } from '../props/BukuSakti';
import { Oyen } from './Oyen';
import { jam } from './waktu';
import type { AksiTokoh, Bawaan, Penampilan } from './data';

const RAD = Math.PI / 180;

/** Kurva lonceng 0→1→0 di dalam jendela [a, b] (0 di luar jendela). */
function lonceng(f: number, w: [number, number] | undefined): number {
  if (!w) return 0;
  const u = (f - w[0]) / (w[1] - w[0]);
  return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
}
const dalam = (f: number, w: [number, number] | undefined) => !!w && f >= w[0] && f <= w[1];

function Bawa({ jenis, bersinar }: { jenis: Bawaan; bersinar: boolean }) {
  if (jenis === 'kardus') return <Kardus skala={0.8} />;
  if (jenis === 'rantang') return <group position={[0, -0.15, 0]}><Rantang /></group>;
  if (jenis === 'buku') return <group rotation={[-1.1, 0, 0]}><BukuSakti bersinar={bersinar} /></group>;
  if (jenis === 'hp')
    return (
      <mesh rotation={[-0.9, 0, 0]} position={[0, 0.1, 0]}>
        <boxGeometry args={[0.14, 0.02, 0.26]} />
        <meshBasicMaterial color="#3b4673" />
      </mesh>
    );
  if (jenis === 'gelas')
    return (
      <mesh position={[0.18, 0.05, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.13, 10]} />
        <meshToonMaterial color="#fffaf2" />
      </mesh>
    );
  return (
    <mesh position={[0.2, 0.05, 0]}>
      <torusGeometry args={[0.05, 0.012, 5, 10]} />
      <meshBasicMaterial color="#f2d15c" />
    </mesh>
  );
}

type Props = { aksi: AksiTokoh; durasi: number; rupa: Penampilan; bukuBersinar?: boolean };

export function Aktor({ aksi, durasi, rupa, bukuBersinar = false }: Props) {
  const akar = useRef<Group>(null);
  const badan = useRef<Group>(null);
  const bawaRef = useRef<Group>(null);
  const bergerak = useMemo(() => ({ current: false }), []);
  const lambai = useMemo(() => ({ current: false }), []);
  // Data terbaru disimpan di ref agar useFrame tidak perlu didaftarkan ulang
  const d = useRef(aksi);
  d.current = aksi;
  const dur = useRef(durasi);
  dur.current = durasi;

  useFrame(() => {
    const a = d.current;
    const g = akar.current;
    const b = badan.current;
    if (!g || !b) return;
    const f = Math.min(1, jam.lokal / dur.current);
    // Posisi: lerp dari → ke selama jendela jalan
    let x = a.dari[0];
    let z = a.dari[1];
    let jalan = false;
    if (a.ke) {
      const w = a.jalan ?? [0, 1];
      const u = Math.min(1, Math.max(0, (f - w[0]) / (w[1] - w[0])));
      x += (a.ke[0] - a.dari[0]) * u;
      z += (a.ke[1] - a.dari[1]) * u;
      jalan = f > w[0] && f < w[1];
    }
    // Arah hadap: saat jalan = arah gerak; diam = nilai data. Diputar halus lewat sudut terpendek.
    const tujuan = jalan && a.ke ? Math.atan2(a.ke[0] - a.dari[0], a.ke[1] - a.dari[1]) : a.hadap * RAD;
    const selisih = Math.atan2(Math.sin(tujuan - g.rotation.y), Math.cos(tujuan - g.rotation.y));
    g.rotation.y = jam.lokal < 0.05 ? tujuan : g.rotation.y + selisih * 0.15;
    g.position.set(x, a.y ?? 0, z);
    g.visible = a.muncul === undefined || f >= a.muncul;
    bergerak.current = jalan;
    lambai.current = dalam(f, a.lambai);

    // Gestur badan (prosedural, tanpa klip)
    const t = jam.t;
    const k = a.gesturWaktu ? lonceng(f, a.gesturWaktu) : 1;
    b.rotation.set(0, 0, 0);
    b.position.set(0, 0, 0);
    b.scale.set(1, 1, 1);
    const gs = a.gestur;
    if (gs === 'ikat') {
      b.rotation.x = 0.35;
      b.position.y = -0.12 + Math.sin(t * 9) * 0.035;
    } else if (gs === 'serah') b.rotation.x = 0.2 * k;
    else if (gs === 'ambles') {
      b.scale.set(1 + 0.1 * k, 1 - 0.2 * k, 1 + 0.1 * k);
    } else if (gs === 'tidur') {
      b.rotation.z = 0.32;
      b.position.y = Math.sin(t * 7) * 0.015; // bus bergoyang
    } else if (gs === 'lihatHP') b.rotation.x = 0.12;
    const bw = bawaRef.current;
    if (bw) {
      // Barang di depan dada; "serah" mendorong maju, "angkat" menaikkan
      bw.position.set(0, 0.58 + (gs === 'angkat' ? 0.4 * k : 0), 0.33 + (gs === 'serah' ? 0.2 * k : 0));
    }
  });

  const pemain = aksi.id === 'pemain';
  return (
    <group ref={akar}>
      <group ref={badan}>
        {aksi.id === 'oyen' ? (
          <Oyen bergerak={bergerak} duduk={aksi.gestur === 'duduk'} />
        ) : (
          <group position={[0, aksi.naik === 'motor' ? 0.32 : 0, 0]}>
            <Chibi
              kulit={rupa.kulit}
              baju={rupa.baju}
              rambut={rupa.rambut}
              celana={rupa.celana}
              gaya={rupa.gaya}
              aksesoris={rupa.aksesoris}
              bergerak={bergerak}
              lambai={lambai}
              // Pembuka = sinematik (bisa close-up dari jauh): tokoh selalu detail penuh
              lod={0}
              tanpaBayangan={aksi.naik === 'motor' || pemain && aksi.gestur === 'tidur'}
            />
          </group>
        )}
        {aksi.bawa && (
          <group ref={bawaRef}>
            <Bawa jenis={aksi.bawa} bersinar={bukuBersinar} />
          </group>
        )}
      </group>
      {aksi.naik === 'motor' && (
        <group position={[0, 0, 0.1]}>
          <MotorModel warna="#7fb3e0" />
        </group>
      )}
    </group>
  );
}
