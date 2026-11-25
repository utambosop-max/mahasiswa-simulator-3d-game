import { useEffect, useRef } from 'react';
import { GameCanvas } from './three/GameCanvas';
import { HUD } from './ui/HUD';
import { Joystick } from './ui/Joystick';
import { ActionButtons } from './ui/ActionButtons';
import { NotifHP } from './ui/hp/NotifHP';
import { TransisiOverlay } from './ui/TransisiOverlay';
import { KonfirmasiKeluar } from './ui/KonfirmasiKeluar';
import { langkahKembali, pasangTombolKembali } from './ui/tombolKembaliAndroid';
import { bacaKurangiAnimasi, terapkanKurangiAnimasi } from './ui/kurangiAnimasi';
import { MenuMakan } from './ui/MenuMakan';
import { MenuUpgrade } from './ui/MenuUpgrade';
import { DialogEvent } from './ui/DialogEvent';
import { LayarUtama } from './ui/LayarUtama';
import { Konfeti } from './ui/Konfeti';
import { KerjaSambilan } from './minigames/KerjaSambilan';
import { Minimap } from './ui/peta/Minimap';
import { PetaBesar } from './ui/peta/PetaBesar';
import { RotateHint } from './ui/RotateHint';
import { attachKeyboard } from './game/input';
import { simpanSekarang, useGame } from './game/store';
import { unlockAudio } from './audio/sfx';
import { PanelOnline } from './ui/online/PanelOnline';
import { MenuChat } from './ui/online/MenuChat';
import './online/klien'; // pasang penangan pesan server (mode online)
import { mulaiAmbience } from './audio/ambience';
import { OjolHUD } from './ui/OjolHUD';
import { TokoBarang } from './ui/TokoBarang';
import { HPMenu } from './ui/hp/HPMenu';
import { DialogRapor } from './ui/DialogRapor';
import { BuatKarakter } from './ui/BuatKarakter';
import { Pembuka } from './ui/Pembuka';
import { BarisAlat, KeluarModeFoto, Kilat } from './ui/BarisAlat';
import { TombolNyangkut } from './ui/TombolNyangkut';
import { Bengkel } from './ui/Bengkel';
import { PanelTempat } from './ui/PanelTempat';
import { MiniFisika } from './minigames/MiniFisika';
import { KuisUjian } from './ui/KuisUjian';
import { DialogWisuda } from './ui/DialogWisuda';
import { bacaTeksBesar, setTinggiLayar, terapkanTeksBesar } from './game/pengaturan';
import { mulaiJam } from './game/jam';
import { OverlaySibuk } from './ui/OverlaySibuk';

// Terapkan pilihan "teks besar" sejak awal
terapkanTeksBesar(bacaTeksBesar());
terapkanKurangiAnimasi(bacaKurangiAnimasi());

export default function App() {
  const modeFoto = useGame((s) => s.modeFoto);
  // Saat animasi pembuka diputar, kanvas game dilepas (hanya 1 kanvas 3D aktif = hemat GPU)
  const pembuka = useGame((s) => s.pembuka);
  // Skala UI mengikuti tinggi kotak game (UI tidak jadi mini di monitor besar)
  const kotak = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = kotak.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTinggiLayar(el.clientHeight));
    ro.observe(el);
    setTinggiLayar(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  // Dengarkan WASD / panah untuk tes di PC
  useEffect(() => attachKeyboard(), []);
  // Jam real-time mode offline (1 detik = 1 menit game)
  useEffect(() => mulaiJam(), []);
  // Tombol Kembali fisik Android (hanya di APK; di web tidak dipasang)
  useEffect(() => pasangTombolKembali(), []);
  // Tes otomatis di browser bisa memicu langkah 'Kembali' lewat window.__kembali (mode dev saja)
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __kembali: () => void }).__kembali = langkahKembali;
  }, []);

  // Audio baru boleh bunyi setelah interaksi pertama (aturan browser & Android WebView)
  useEffect(() => {
    const buka = () => {
      unlockAudio();
      mulaiAmbience(); // suara suasana (burung, jangkrik, hujan)
    };
    window.addEventListener('pointerdown', buka, { once: true });
    window.addEventListener('keydown', buka, { once: true });
    return () => {
      window.removeEventListener('pointerdown', buka);
      window.removeEventListener('keydown', buka);
    };
  }, []);

  // Simpan saat app di-minimize / tab ditutup (penting di Android)
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') simpanSekarang();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', simpanSekarang);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', simpanSekarang);
    };
  }, []);

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-neutral-800">
      {/* Kotak 16:9 terbesar yang muat di layar: lebar = min(100vw, 16/9 × tinggi layar) */}
      <div ref={kotak} className="kotak-game relative aspect-video w-[min(100vw,177.78dvh)] overflow-hidden bg-amber-50">
        {!pembuka && <GameCanvas />}
        {/* Mode foto: sembunyikan HUD & tombol, dunia 3D bersih untuk tangkapan layar */}
        {!modeFoto && (
          <>
            <HUD />
            <Minimap />
            <NotifHP />
          </>
        )}
        <Joystick />
        {!modeFoto && (
          <>
            <ActionButtons />
            <BarisAlat />
          </>
        )}
        <KeluarModeFoto />
        <TombolNyangkut />
        <Kilat />
        <MenuMakan />
        <MenuUpgrade />
        <KerjaSambilan />
        <PetaBesar />
        <OjolHUD />
        <OverlaySibuk />
        <PanelOnline />
        <MenuChat />
        <TokoBarang />
        <HPMenu />
        <Bengkel />
        <PanelTempat />
        <MiniFisika />
        <DialogRapor />
        <KuisUjian />
        <DialogWisuda />
        <DialogEvent />
        <TransisiOverlay />
        <Konfeti />
        <KonfirmasiKeluar />
        <LayarUtama />
        <BuatKarakter />
        <Pembuka />
      </div>
      <RotateHint />
    </div>
  );
}
