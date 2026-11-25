// Kit UI bersama — tema "HP mahasiswa" (docs/GDD/rombak-ui.md §2). Dipakai semua panel/menu/aplikasi HP.
// Aturan gaya (skill game-ux-accessibility):
//  • Warna dari design token di index.css (bg-hp-layar, text-teks, bg-aksen, ...), bukan warna Tailwind acak.
//  • SATU warna aksen (oranye pastel + teks cokelat tua, kontras ± 6.7:1) hanya untuk aksi utama; lainnya netral.
//  • Tutup selalu ✕ di kanan atas, Kembali ‹ di kiri atas. SEMUA target sentuh ≥ 56 px (h-14 / min-h-14).
//  • Ukuran teks memakai rem (token text-mini/ket/isi/judul) → ikut skala layar & "Teks besar".
//  • Tombol nonaktif tetap bisa ditekan untuk memberi alasan.
import { useEffect, type ReactNode } from 'react';
import { sfxPop } from '../audio/sfx';

const gabung = (...k: (string | false | null | undefined)[]) => k.filter(Boolean).join(' ');

// ===== Panel modal =====
type PanelProps = {
  judul: ReactNode;
  /** Teks kecil di bawah judul (keterangan / rumus) */
  sub?: ReactNode;
  /** Isi kanan header (mis. saldo uang) */
  kanan?: ReactNode;
  onTutup?: () => void;
  /** sm ≈ 26rem · md ≈ 40rem · lg ≈ 54rem · penuh = 96% */
  lebar?: 'sm' | 'md' | 'lg' | 'penuh';
  /** Tinggi tetap 92% (untuk panel bertab) */
  tinggiPenuh?: boolean;
  children: ReactNode;
  /** Area bawah tetap (tidak ikut gulir), mis. tombol konfirmasi */
  bawah?: ReactNode;
  /** Kelas tambahan untuk area isi */
  isiClass?: string;
  /** Ketuk di luar panel = tutup (matikan untuk mini-game agar tidak tertutup tak sengaja) */
  tutupLuar?: boolean;
  /** Tombol tambahan di header sebelum ✕ (mis. "Lewati") */
  aksiHeader?: ReactNode;
};

const LEBAR = { sm: 'w-[min(94%,26rem)]', md: 'w-[min(94%,40rem)]', lg: 'w-[min(95%,54rem)]', penuh: 'w-[96%]' };

/** Panel modal standar (panel tempat, toko, mini-game): latar redup, kartu krem, header (judul + kanan + ✕). Esc = tutup. */
export function Panel({ judul, sub, kanan, onTutup, lebar = 'md', tinggiPenuh, children, bawah, isiClass, tutupLuar = true, aksiHeader }: PanelProps) {
  useEffect(() => {
    if (!onTutup) return;
    const k = (e: KeyboardEvent) => e.code === 'Escape' && onTutup();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onTutup]);
  return (
    <div
      className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-redup"
      onPointerDown={(e) => {
        if (onTutup && tutupLuar && e.target === e.currentTarget) {
          sfxPop();
          onTutup();
        }
      }}
    >
      <div
        className={gabung(
          LEBAR[lebar],
          tinggiPenuh ? 'h-[92%]' : 'max-h-[92%]',
          'anim-panel flex min-w-0 flex-col overflow-hidden rounded-layar bg-hp-layar text-teks shadow-hp ring-1 ring-hp-casing/10',
        )}
      >
        <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-1.5">
          <div className="min-w-0 flex-1 pl-1">
            <h2 className="truncate text-judul font-black">{judul}</h2>
            {sub && <p className="truncate text-mini font-semibold text-teks-2">{sub}</p>}
          </div>
          {kanan}
          {aksiHeader}
          {onTutup && <TombolTutup onTekan={onTutup} />}
        </div>
        <div className={gabung('min-h-0 flex-1 overflow-y-auto px-3 pb-3', isiClass)}>{children}</div>
        {bawah && <div className="shrink-0 border-t border-hp-casing/10 px-3 py-2.5">{bawah}</div>}
      </div>
    </div>
  );
}

/** Tombol ✕ (56 px) — selalu di kanan atas (jempol kanan) */
export function TombolTutup({ onTekan, label = 'Tutup' }: { onTekan: () => void; label?: string }) {
  return (
    <button
      aria-label={label}
      onPointerDown={() => {
        sfxPop();
        onTekan();
      }}
      className="grid h-14 w-14 shrink-0 place-items-center rounded-tombol bg-netral text-xl font-black text-teks active:translate-y-0.5 active:scale-95"
    >
      ✕
    </button>
  );
}

/** Tombol ‹ Kembali (56 px) — selalu di kiri atas (jempol kiri) */
export function TombolKembali({ onTekan, label = 'Kembali' }: { onTekan: () => void; label?: string }) {
  return (
    <button
      aria-label={label}
      onPointerDown={() => {
        sfxPop();
        onTekan();
      }}
      className="grid h-14 w-14 shrink-0 place-items-center rounded-tombol bg-white/70 text-3xl leading-none font-black text-teks ring-1 ring-hp-casing/10 active:translate-y-0.5 active:scale-95"
    >
      ‹
    </button>
  );
}

// ===== Tombol =====
export type Varian = 'utama' | 'biasa' | 'bahaya' | 'gelap';
const VARIAN: Record<Varian, string> = {
  // Tombol utama "jelly": tepi bawah oranye tua → saat ditekan turun 2 px
  utama: 'bg-aksen text-teks shadow-tombol active:translate-y-0.5 active:shadow-none',
  biasa: 'bg-netral text-teks active:scale-[0.98]',
  bahaya: 'bg-bahaya text-bahaya-teks active:scale-[0.98]',
  gelap: 'bg-hp-casing text-white active:scale-[0.98]',
};

type TombolProps = {
  onTekan: () => void;
  children: ReactNode;
  varian?: Varian;
  /** Tampil pudar tapi TETAP bisa ditekan (agar store bisa menjelaskan alasannya) */
  mati?: boolean;
  /** Benar-benar tidak bisa ditekan */
  nonaktif?: boolean;
  className?: string;
  label?: string;
};

/** Tombol standar ≥ 56 px. `kanan` di children bisa memakai <span className="ml-auto"> untuk harga. */
export function Tombol({ onTekan, children, varian = 'utama', mati, nonaktif, className, label }: TombolProps) {
  return (
    <button
      aria-label={label}
      aria-disabled={mati || undefined}
      disabled={nonaktif}
      onClick={onTekan}
      className={gabung(
        'flex min-h-14 items-center gap-2 rounded-tombol px-4 text-left text-isi font-extrabold transition-transform disabled:opacity-40',
        mati ? 'bg-netral/60 text-teks-2' : VARIAN[varian],
        className,
      )}
    >
      {children}
    </button>
  );
}

// ===== Kartu & teks =====
export function Kartu({ judul, kanan, children, className }: { judul?: ReactNode; kanan?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={gabung('flex flex-col gap-2 rounded-kartu bg-kartu p-3 shadow-tipis ring-1 ring-hp-casing/5', className)}>
      {(judul || kanan) && (
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-isi font-black">{judul}</p>
          {kanan && <span className="shrink-0 text-mini font-extrabold text-teks-2">{kanan}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Keterangan (warna --teks-2, kontras ≥ 4.5:1) */
export const Ket = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={gabung('text-ket leading-snug font-semibold text-teks-2', className)}>{children}</p>
);

/** Label kecil (badge): saldo, status */
export const Chip = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={gabung('shrink-0 rounded-tombol bg-kartu px-3 py-1.5 text-isi font-extrabold tabular-nums ring-1 ring-hp-casing/10', className)}>{children}</span>
);

/** Baris pengaturan on/off: ikon + label + keterangan + saklar (posisi bulatan + teks Nyala/Mati) */
export function Saklar({ ikon, label, ket, nyala, onUbah }: { ikon: string; label: string; ket?: string; nyala: boolean; onUbah: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={nyala}
      onClick={onUbah}
      className="flex min-h-14 w-full items-center gap-3 rounded-tombol bg-kartu px-3 text-left ring-1 ring-hp-casing/10 active:scale-[0.99]"
    >
      <span className="text-xl">{ikon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-isi font-extrabold">{label}</span>
        {ket && <span className="block truncate text-mini font-semibold text-teks-2">{ket}</span>}
      </span>
      <span className={gabung('relative h-8 w-14 shrink-0 rounded-full transition-colors', nyala ? 'bg-aksen' : 'bg-netral ring-1 ring-hp-casing/15')}>
        <span className={gabung('absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all', nyala ? 'left-7' : 'left-1')} />
      </span>
      <span className="w-12 text-right text-mini font-extrabold text-teks-2">{nyala ? 'Nyala' : 'Mati'}</span>
    </button>
  );
}

/** Pilihan beberapa opsi (segmented), mis. grafik Hemat/Bagus/Ultra — tiap segmen 56 px */
export function Pilihan<T extends string>({ opsi, nilai, onPilih }: { opsi: { id: T; label: string }[]; nilai: T; onPilih: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-tombol bg-netral p-1">
      {opsi.map((o) => (
        <button
          key={o.id}
          aria-pressed={nilai === o.id}
          onClick={() => onPilih(o.id)}
          className={gabung('min-h-14 flex-1 rounded-xl px-2 text-isi font-extrabold', nilai === o.id ? 'bg-kartu text-teks shadow-tipis' : 'text-teks-2')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tab horizontal (pil 56 px) — untuk sub-menu di dalam aplikasi/panel. Titik merah + aria "baru". */
export function TabPil<T extends string>({ tab, aktif, onPilih }: { tab: { id: T; ikon: string; nama: string; titik?: boolean }[]; aktif: T; onPilih: (v: T) => void }) {
  return (
    <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-1">
      {tab.map((t) => (
        <button
          key={t.id}
          aria-pressed={aktif === t.id}
          onClick={() => {
            sfxPop();
            onPilih(t.id);
          }}
          className={gabung(
            'relative flex min-h-14 shrink-0 items-center gap-1.5 rounded-full px-4 text-isi font-extrabold',
            aktif === t.id ? 'bg-hp-casing text-white' : 'bg-netral text-teks',
          )}
        >
          <span>{t.ikon}</span>
          {t.nama}
          {t.titik && <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-[#d6452b] ring-2 ring-white" aria-label="baru" />}
        </button>
      ))}
    </div>
  );
}

export { gabung };
