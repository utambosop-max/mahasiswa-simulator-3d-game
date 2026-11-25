import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { KamarKos } from './world/KamarKos';
import { Dunia } from './world/Dunia';
import { Player } from './Player';
import { Lighting } from './Lighting';
import { Penanda } from './Penanda';
import { PemainLain } from './PemainLain';
import { Gitar } from './props/Gitar';
import { Sampah } from './props/Sampah';
import { Kucing } from './Kucing';
import { TargetOjol } from './TargetOjol';
import { Genangan, Hujan } from './Hujan';
import { Akuarium } from './props/Akuarium';
import { Pertamini } from './world/Pertamini';
import { PasarMalam } from './world/PasarMalam';
import { cuacaHari } from '../game/sim';
import { useGame } from '../game/store';
import { dprGrafik } from '../game/grafik';
import { KontrolKamera } from '../ui/KontrolKamera';
import { InteriorGedung } from './world/InteriorGedung';
import { Hantu, PacarDiKamar } from './props/KosExtra';
import { BANGUNAN } from '../game/duniaLayout';
import { rt60Sabine } from '../game/fisika';
import { aturGema } from '../audio/sfx';


/** Kanvas 3D utama (lihat skill cartoon-3d-stylizer & android-capacitor-builder §A5). */
export function GameCanvas() {
  const lokasi = useGame((s) => s.lokasi);
  const gedung = useGame((s) => s.gedung);
  const grafik = useGame((s) => s.grafik);
  const hujan = useGame((s) => cuacaHari(s.hari).id === 'hujan');
  // Resolusi gambar (device pixel ratio): mengikuti pilihan grafik, turun otomatis jika FPS anjlok
  const [turun, setTurun] = useState(false);

  // Hemat baterai: berhenti menggambar saat app di-background
  const [tersembunyi, setTersembunyi] = useState(document.visibilityState === 'hidden');
  useEffect(() => {
    const cek = () => setTersembunyi(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', cek);
    return () => document.removeEventListener('visibilitychange', cek);
  }, []);

  // Gema: hanya di dalam gedung, panjangnya dari ukuran gedung (rumus Sabine)
  useEffect(() => {
    const b = lokasi === 'gedung' ? BANGUNAN.find((x) => x.id === gedung) : undefined;
    if (!b) return aturGema(0);
    const rumah = b.jenis === 'rumah' || b.jenis === 'kos';
    aturGema(rt60Sabine(b.w, b.d, b.tinggi * 0.8, rumah ? 0.35 : 0.25));
  }, [lokasi, gedung]);

  const dprAkhir =turun ? 1 : dprGrafik(grafik, window.devicePixelRatio || 1);

  return (
    // z-0 = lapisan sendiri, agar label nama 3D (Html) tetap di bawah HUD & menu
    <div className="absolute inset-0 z-0">
      <KontrolKamera>
      <Canvas
        dpr={dprAkhir}
        shadows="percentage"
        frameloop={tersembunyi ? 'never' : 'always'}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [6, 7.5, 6], fov: 40, near: 0.1, far: 120 }}
      >
        {/*
          PerformanceMonitor mengukur FPS rata-rata. Jika terus rendah → resolusi diturunkan;
          jika naik-turun terus (flipflop) → menyerah: pindah ke mode Hemat (tanpa bayangan).
        */}
        <PerformanceMonitor
          flipflops={3}
          onIncline={() => setTurun(false)}
          onDecline={() => setTurun(true)}
          onFallback={() => {
            const st = useGame.getState();
            if (st.grafik !== 'hemat') {
              st.setGrafik('hemat');
              st.toast('🔋 HP terasa berat, grafik diturunkan ke mode Hemat. Bisa diubah di ⚙️.');
            }
          }}
        />
        <Lighting lokasi={lokasi} />
        {lokasi === 'kamar' ? <KamarKos /> : lokasi === 'gedung' ? <InteriorGedung /> : <Dunia />}
        <Penanda lokasi={lokasi} />
        <Player key={`${lokasi}-${gedung ?? ''}`} lokasi={lokasi} />
        <PemainLain key={`teman-${lokasi}-${gedung ?? ''}`} lokasi={lokasi} />
        {lokasi === 'gedung' ? null : lokasi === 'kamar' ? (
          <>
            <Gitar />
            <Sampah />
            <Akuarium />
            <Hantu />
            <PacarDiKamar />
          </>
        ) : (
          <>
            <Kucing />
            <Pertamini />
            <PasarMalam />
            <TargetOjol />
            {hujan && (
              <>
                <Hujan />
                <Genangan />
              </>
            )}
          </>
        )}
      </Canvas>
      </KontrolKamera>
    </div>
  );
}
