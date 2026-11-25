// Pemasang animasi pembuka: kanvas 3D + overlay UI + audio. Muncul saat store.pembuka = true.
import { useCallback, useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { PembukaCanvas } from '../three/pembuka/PembukaCanvas';
import { resetJam } from '../three/pembuka/waktu';
import { hentikanAudioPembuka, mulaiAudioPembuka } from '../audio/pembuka';
import { PembukaOverlay } from './PembukaOverlay';

export function Pembuka() {
  const aktif = useGame((s) => s.pembuka);
  // Kanvas pembuka dilepas 1 tick SETELAH kanvas game dipasang lagi (2 commit terpisah),
  // agar React tidak memperingatkan "unmount root while rendering".
  const [tampil, setTampil] = useState(aktif);
  useEffect(() => {
    if (aktif) {
      setTampil(true);
      return;
    }
    const id = window.setTimeout(() => setTampil(false), 0);
    return () => window.clearTimeout(id);
  }, [aktif]);
  if (!aktif && !tampil) return null;
  return <Pemutar />;
}

function Pemutar() {
  useEffect(() => {
    resetJam();
    mulaiAudioPembuka();
    return () => hentikanAudioPembuka(); // berhenti rapi saat dilewati / selesai / unmount
  }, []);
  const selesai = useCallback(() => {
    hentikanAudioPembuka();
    useGame.getState().selesaiPembuka();
  }, []);
  return (
    <div className="absolute inset-0 z-[65] bg-black">
      <PembukaCanvas onSelesai={selesai} />
      <PembukaOverlay onLewati={selesai} />
    </div>
  );
}
