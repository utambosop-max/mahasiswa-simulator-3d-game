// Satu sel ikon aplikasi di layar utama HP (4.75 × 5rem, seluruh sel bisa disentuh).
// Badge memakai angka / teks "Baru" (bukan warna saja); terkunci = abu + 🔒, tetap bisa disentuh untuk melihat alasan.
import { sfxPop } from '../../audio/sfx';
import { getar } from '../../game/getar';
import type { AppDef } from './daftarApp';

type Props = {
  app: AppDef;
  /** Angka badge (0 = tidak ada) */
  badge?: number;
  /** Label "Baru" (fitur/halaman baru) */
  baru?: boolean;
  terkunci?: boolean;
  onBuka: () => void;
};

export function IkonApp({ app, badge = 0, baru, terkunci, onBuka }: Props) {
  return (
    <button
      aria-label={`${app.nama}${badge > 0 ? `, ${badge} baru` : baru ? ', baru' : ''}${terkunci ? ', terkunci' : ''}`}
      onClick={() => {
        sfxPop();
        getar(10);
        onBuka();
      }}
      className="flex min-h-20 w-[5.5rem] shrink-0 flex-col items-center justify-start gap-1 rounded-tombol pt-1 active:scale-95"
    >
      <span
        className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-ikon text-[1.75rem] leading-none shadow-ikon ring-1 ring-hp-casing/10 ${terkunci ? 'grayscale' : ''}`}
        style={{ backgroundColor: terkunci ? '#e7e0d8' : app.warna }}
      >
        {app.ikon}
        {terkunci && <span className="absolute -right-1 -bottom-1 text-base">🔒</span>}
        {badge > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-[#c2381f] px-1 text-mini font-black text-white ring-2 ring-hp-krem">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : (
          baru && (
            <span className="absolute -top-1.5 -right-3 rounded-full bg-[#c2381f] px-1.5 text-mini leading-5 font-black text-white ring-2 ring-hp-krem">Baru</span>
          )
        )}
      </span>
      <span className="w-full wrap-anywhere text-center text-mini leading-tight font-extrabold text-teks">{app.nama}</span>
    </button>
  );
}
