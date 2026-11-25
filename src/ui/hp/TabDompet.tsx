// Tab HP: dompet & tabungan (celengan digital), tas (barang).
import { useGame } from '../../game/store';
import { FITUR, formatRupiah, pengaliJurusan } from '../../game/sim';
import { BARANG, SEMUA_AKSESORIS, pakaiAksesoris } from '../../game/fitur';

const TOMBOL = 'min-h-14 rounded-2xl px-4 font-extrabold text-white active:scale-[0.98] touch-none';

export function TabDompet() {
  const s = useGame();
  const bunga = FITUR.tabungan.bungaPerBulan * pengaliJurusan(s, 'bungaTabungan') * 100;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 font-extrabold">
          👛 Uang di dompet<div className="text-2xl text-orange-600">{formatRupiah(s.uang)}</div>
        </div>
        <div className="rounded-2xl bg-pink-50 p-4 font-extrabold">
          🐷 Tabungan (bunga {bunga.toFixed(0)}%/bulan)<div className="text-2xl text-pink-600">{formatRupiah(s.tabungan)}</div>
        </div>
      </div>
      <p className="text-sm font-bold opacity-75">💡 Uang tabungan tidak bisa dipakai jajan, aman dari godaan tanggal tua. Bunga masuk tiap tanggal 1.</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold">Setor:</span>
        {FITUR.tabungan.setor.map((n) => (
          <button key={n} className={`${TOMBOL} bg-pink-400 shadow-sm`} onPointerDown={() => s.tabung(n, true)}>
            {formatRupiah(n)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-extrabold">Tarik:</span>
        {FITUR.tabungan.setor.map((n) => (
          <button key={n} className={`${TOMBOL} bg-sky-500 shadow-sm`} onPointerDown={() => s.tabung(n, false)}>
            {formatRupiah(n)}
          </button>
        ))}
        <button className={`${TOMBOL} bg-stone-500 shadow-sm`} onPointerDown={() => s.tabung(s.tabungan, false)}>
          Semua
        </button>
      </div>
    </div>
  );
}

export function TabTas() {
  const s = useGame();
  const punya = BARANG.filter((b) => (s.tas[b.id] ?? 0) > 0);
  return (
    <div className="flex flex-col gap-2">
      {s.aksesoris.length > 0 && (
        <div className="rounded-2xl bg-white px-4 py-2">
          <p className="mb-1 font-extrabold">😎 Aksesoris (ketuk untuk pakai / lepas)</p>
          <div className="flex flex-wrap gap-2">
            {SEMUA_AKSESORIS
              .filter((a) => s.aksesoris.includes(a.id))
              .map((a) => (
                <button
                  key={a.id}
                  onPointerDown={() => s.fitur((d) => pakaiAksesoris(d, a.id))}
                  className={`min-h-14 rounded-xl border-4 px-3 font-extrabold ${s.pakai.includes(a.id) ? 'border-orange-400 bg-orange-50' : 'border-white bg-amber-50'}`}
                >
                  {a.ikon} {a.nama} {s.pakai.includes(a.id) ? '✅' : ''}
                </button>
              ))}
          </div>
        </div>
      )}
      {punya.length === 0 && <p className="font-bold">🎒 Tas masih kosong. Beli barang di 🏪 Toko Serba Ada 24 (tombol 🛍️).</p>}
      {punya.map((b) => (
        <div key={b.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2">
          <span className="text-4xl">{b.ikon}</span>
          <div className="flex-1">
            <p className="font-extrabold">
              {b.nama} {!b.permanen && <span className="text-sm opacity-70">× {s.tas[b.id]}</span>}
            </p>
            <p className="text-mini font-bold opacity-75">{b.deskripsi}</p>
          </div>
          {b.permanen ? (
            <span className="text-sm font-extrabold text-emerald-600">✔ Selalu dibawa</span>
          ) : (
            <button className={`${TOMBOL} bg-aksen text-teks! shadow-tombol`} onPointerDown={() => s.pakaiBarangIni(b.id)}>
              Pakai
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
