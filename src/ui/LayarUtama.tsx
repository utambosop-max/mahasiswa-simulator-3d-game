import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGame, PEMAIN_BARU } from '../game/store';
import { namaHari, formatRupiah } from '../game/sim';
import { unlockAudio, sfxPop } from '../audio/sfx';
import { useOnline } from '../online/onlineStore';
import { LayarOnline } from './online/LayarOnline';
import { Maskot } from './Maskot';
import { Ket, Tombol } from './kit';

/**
 * Layar judul (landscape, 2 kolom agar muat di HP pendek): kiri = maskot & judul, kanan = tombol.
 * Kamar 3D tetap terlihat samar di belakang.
 */
export function LayarUtama() {
  const tampil = useGame((s) => s.layarUtama);
  const [yakinBaru, setYakinBaru] = useState(false);
  const layarOnline = useOnline((o) => o.layarOnline);

  useEffect(() => {
    if (!tampil || layarOnline || yakinBaru) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.defaultPrevented) return;
      if (e.target instanceof HTMLElement && e.target.closest('button')) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        unlockAudio();
        useGame.getState().mulaiMain(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tampil, layarOnline, yakinBaru]);

  if (!tampil) return null;
  if (layarOnline) return <LayarOnline />;
  const mulai = (baru: boolean) => {
    unlockAudio();
    useGame.getState().mulaiMain(baru);
  };

  return (
    <div className="layar-judul absolute inset-0 z-50 flex items-center justify-center gap-[4%] bg-gradient-to-br from-amber-50/90 via-orange-50/85 to-amber-100/90 text-teks">
      {/* Kiri: maskot Si Utan melambai + judul */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Maskot className="hidden h-[min(18vw,34dvh,12rem)] shrink-0 drop-shadow-[0_6px_0_rgba(180,83,9,0.18)] min-[640px]:block" />
        <div className="min-w-0">
          <h1 className="text-[clamp(1rem,min(4.8vw,7dvh),3rem)] leading-[1.05] font-black tracking-tight text-orange-600">
            Mahasiswa
            <br />
            Simulator 3D
          </h1>
          <p className="mt-2 text-mini font-extrabold text-stone-600">Kuliah, kerja sambilan, dan bertahan sampai tanggal tua!</p>
        </div>
      </div>

      {/* Kanan: tombol */}
      <div className="flex max-h-[94%] w-[min(50%,20rem)] shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-3xl bg-white/80 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur-sm">
        {!yakinBaru ? (
          <>
            <Tombol className="min-h-16 justify-center text-lg" onTekan={() => mulai(false)}>
              ▶ {PEMAIN_BARU ? 'Mulai Main' : 'Lanjutkan'}
            </Tombol>
            {!PEMAIN_BARU && <RingkasanSave />}
            <Tombol
              varian="gelap"
              className="justify-center"
              onTekan={() => {
                unlockAudio();
                sfxPop();
                useOnline.setState({ layarOnline: true, galat: null });
              }}
            >
              🌐 Main Bareng (Online)
            </Tombol>
            {!PEMAIN_BARU && (
              <Tombol varian="biasa" className="justify-center" onTekan={() => setYakinBaru(true)}>
                🆕 Main Baru
              </Tombol>
            )}
            <p className="hint-desktop text-center text-mini font-bold text-teks-2">Enter = mulai</p>
          </>
        ) : (
          <>
            <p className="text-center font-black text-rose-600">Mulai dari awal?</p>
            <Ket className="text-center">Progres lama akan hilang.</Ket>
            <div className="grid gap-2 min-[520px]:grid-cols-2">
              <Tombol varian="biasa" className="justify-center" onTekan={() => setYakinBaru(false)}>
                Batal
              </Tombol>
              <Tombol varian="bahaya" className="justify-center" onTekan={() => mulai(true)}>
                Ya, baru
              </Tombol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RingkasanSave() {
  const { hari, tanggal, bulan, uang, ipk } = useGame(useShallow(({ hari, tanggal, bulan, uang, ipk }) => ({ hari, tanggal, bulan, uang, ipk })));
  return (
    <Ket className="text-center">
      💾 {namaHari(hari)}, tgl {tanggal} · bln {bulan} · {formatRupiah(uang)} · IPK {ipk.toFixed(2)}
    </Ket>
  );
}
