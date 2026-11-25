import { useGame, ambilSave } from '../game/store';
import { NAMA_TEMPAT, cekBeli, daftarMenu, formatRupiah, hargaMenu, isTanggalTua, ringkasEfek } from '../game/sim';
import { Chip, Panel, gabung } from './kit';

/** Panel pilih makanan/minuman (warteg, warkop, toko, gerobak, pasar, cilok, kafe). */
export function MenuMakan() {
  const s = useGame();
  const tempat = s.menuMakan;
  if (!tempat) return null;
  const save = ambilSave(s);
  const naik = tempat === 'warteg' && isTanggalTua(s.tanggal);

  return (
    <Panel
      judul={NAMA_TEMPAT[tempat]}
      sub={naik ? '😱 Tanggal tua: harga naik Rp2.000!' : 'Ketuk menu untuk membeli'}
      kanan={<Chip>💰 {formatRupiah(s.uang)}</Chip>}
      onTutup={() => s.setMenuMakan(null)}
      lebar="md"
    >
      <div className="grid grid-cols-2 gap-2">
        {daftarMenu(tempat).map((m) => {
          const cek = cekBeli(save, tempat, m);
          return (
            <button
              key={m.id}
              onPointerDown={() => s.beli(tempat, m.id)}
              className={gabung(
                'flex min-h-16 items-center gap-3 rounded-2xl p-2 text-left ring-1 ring-stone-900/5 active:scale-[0.98]',
                cek.boleh ? 'bg-white' : 'bg-stone-100 opacity-60',
              )}
            >
              <span className="text-3xl">{m.ikon}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm leading-tight font-extrabold">{m.nama}</span>
                <span className="text-mini font-semibold text-teks-2">{ringkasEfek(m.efek)}</span>
              </span>
              <span className="shrink-0 text-sm font-black text-orange-600 tabular-nums">{formatRupiah(hargaMenu(save, tempat, m))}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
