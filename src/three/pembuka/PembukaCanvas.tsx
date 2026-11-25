// Kanvas 3D animasi pembuka. Menggantikan GameCanvas selama pembuka diputar (hanya 1 kanvas aktif = ringan).
// Hanya set lokasi shot aktif yang dipasang; 1 lampu berbayangan; dpr mengikuti pilihan grafik.
import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import type { DirectionalLight, HemisphereLight } from 'three';
import { useGame } from '../../game/store';
import { dprGrafik } from '../../game/grafik';
import { PALETTE } from '../palette';
import { Kardus } from '../props/Kardus';
import { Aktor } from './Aktor';
import { Sutradara } from './Sutradara';
import { SetKampung } from './SetKampung';
import { SetJalan } from './SetJalan';
import { SetKota } from './SetKota';
import { SetKamar } from './SetKamar';
import { PENAMPILAN, SHOT, type Penampilan } from './data';
import { usePembuka } from './waktu';

function Adegan({ onSelesai }: { onSelesai: () => void }) {
  const shot = usePembuka((s) => s.shot);
  // Dibaca sekali (bukan langganan): root 3D tidak ikut re-render saat store berubah di akhir pembuka
  const [{ profil, pakai }] = useState(() => useGame.getState());
  const matahari = useRef<DirectionalLight>(null);
  const langit = useRef<HemisphereLight>(null);
  const s = SHOT[shot];
  const efek = s.efek ?? [];
  // Penampilan pemain = karakter buatan pemain (+ tas punggung selama perjalanan)
  const rupaPemain: Penampilan = {
    nama: profil?.nama ?? 'Kamu',
    warnaNama: PENAMPILAN.pemain.warnaNama,
    kulit: PALETTE.kulit[profil?.kulit ?? 0] ?? PALETTE.kulit[0],
    rambut: profil?.rambut,
    baju: profil?.baju,
    gaya: profil?.gaya,
    aksesoris: s.lokasi === 'kamar' ? pakai : [...pakai, 'tasPunggung'],
  };
  return (
    <>
      <Sutradara matahari={matahari} langit={langit} onSelesai={onSelesai} />
      <hemisphereLight ref={langit} args={['#fff6e5', '#a6d785', 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        ref={matahari}
        position={[8, 14, 8]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-far={50}
      />
      {s.lokasi === 'kampung' && <SetKampung asap={efek.includes('asap')} />}
      {s.lokasi === 'jalan' && <SetJalan malam={efek.includes('lampuBus')} />}
      {s.lokasi === 'kota' && <SetKota key={s.id} kendaraan={s.kendaraan} durasi={s.durasi} />}
      {s.lokasi === 'kamar' && <SetKamar kalender={efek.includes('kalender')} durasi={s.durasi} />}
      {s.tokoh.map((a) => (
        <Aktor
          key={`${s.lokasi}-${a.id}`}
          aksi={a}
          durasi={s.durasi}
          rupa={a.id === 'pemain' ? rupaPemain : PENAMPILAN[a.id]}
          bukuBersinar={efek.includes('bukuBersinar')}
        />
      ))}
      {s.props?.map((p, i) => (
        <group key={`${s.id}-p${i}`} position={p.pos}>
          {p.id === 'kardus' && <Kardus />}
        </group>
      ))}
    </>
  );
}

export function PembukaCanvas({ onSelesai }: { onSelesai: () => void }) {
  const grafik = useGame((s) => s.grafik);
  const [turun, setTurun] = useState(false);
  const dpr = turun ? 1 : dprGrafik(grafik, window.devicePixelRatio || 1);
  return (
    <Canvas
      dpr={dpr}
      shadows={grafik === 'hemat' ? false : 'percentage'}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [5, 5, 12], fov: 40, near: 0.1, far: 150 }}
    >
      <PerformanceMonitor onDecline={() => setTurun(true)} onIncline={() => setTurun(false)} />
      <Adegan onSelesai={onSelesai} />
    </Canvas>
  );
}
