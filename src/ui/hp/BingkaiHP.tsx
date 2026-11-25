// Bingkai HP: latar redup + casing cokelat tua + layar krem + status bar + garis "home".
// Ukuran seperti HP yang dipegang (rombak-ui §2.6): lebar min(94%, 60rem), tinggi min(92%, 30rem) → dunia 3D tetap terlihat.
// Ketuk di luar casing = tutup. Esc ditangani pemakai (HPMenu) karena perlu "kembali satu tingkat".
import type { ReactNode } from 'react';
import { sfxPop } from '../../audio/sfx';
import { StatusBarHP } from './StatusBarHP';

type Props = {
  onTutup: () => void;
  /** Ketuk garis home (bawah) → kembali ke layar utama */
  onBeranda?: () => void;
  children: ReactNode;
};

export function BingkaiHP({ onTutup, onBeranda, children }: Props) {
  return (
    <div
      className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-redup"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          sfxPop();
          onTutup();
        }
      }}
    >
      <div
        role="dialog"
        aria-label="HP"
        className="anim-hp-masuk relative flex h-[min(92%,30rem)] w-[min(94%,60rem)] min-w-0 rounded-casing bg-hp-casing p-1.5 pl-3 shadow-hp"
      >
        {/* Kamera depan (hiasan) di sisi kiri casing */}
        <span className="absolute top-1/2 left-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-white/25" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-layar bg-hp-krem bg-gradient-to-br from-hp-krem to-[#fde8c8] text-teks">
          <StatusBarHP />
          <div className="@container relative flex min-h-0 flex-1 flex-col">{children}</div>
          {/* Garis home = tombol Beranda (hiasan; navigasi utama tetap ‹ dan ✕ 56 px) */}
          <button
            aria-label="Beranda"
            onPointerDown={() => {
              if (!onBeranda) return;
              sfxPop();
              onBeranda();
            }}
            className="grid h-5 shrink-0 place-items-center"
          >
            <span className="h-1.5 w-28 rounded-full bg-hp-casing/35" />
          </button>
        </div>
      </div>
    </div>
  );
}
