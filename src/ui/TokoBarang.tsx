// Toko Serba Ada 24: barang (payung, vitamin, obat, kopi, akuarium, weker, makanan kucing),
// aksesoris (topi, kacamata, tas, bandana), dan cat dinding kamar.
import { useState } from 'react';
import { useGame } from '../game/store';
import { F2, formatRupiah } from '../game/sim';
import { BARANG, SEMUA_AKSESORIS, beliAksesoris, catDinding, cekBeliBarang } from '../game/fitur';
import { Chip, Ket, Panel, TabPil } from './kit';

type Tab = 'barang' | 'aksesoris' | 'cat';
const KARTU = 'flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2 text-left ring-1 ring-stone-900/5 active:scale-[0.98]';

export function TokoBarang() {
  const s = useGame();
  const [tab, setTab] = useState<Tab>('barang');
  if (!s.tokoBarang) return null;
  const tutup = () => s.setTokoBarang(false); // bunyi "pop" sudah dari Panel
  return (
    <Panel judul="🛍️ Toko Serba Ada 24" kanan={<Chip>💰 {formatRupiah(s.uang)}</Chip>} onTutup={tutup} lebar="lg">
      <div className="sticky top-0 z-10 -mx-1 bg-[#fffaf2] px-1 pb-2">
        <TabPil
          tab={[
            { id: 'barang', ikon: '🧺', nama: 'Barang' },
            { id: 'aksesoris', ikon: '😎', nama: 'Aksesoris' },
            { id: 'cat', ikon: '🎨', nama: 'Cat Kamar' },
          ]}
          aktif={tab}
          onPilih={setTab}
        />
      </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {tab === 'barang' &&
            BARANG.map((b) => {
              const cek = cekBeliBarang(s, b);
              const punya = s.tas[b.id] ?? 0;
              return (
                <button key={b.id} onPointerDown={() => s.beliBarangIni(b.id)} className={`${KARTU} ${cek.boleh ? 'bg-white shadow-sm' : 'bg-stone-200 opacity-70'}`}>
                  <span className="text-4xl">{b.ikon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold">{b.nama}</p>
                    <p className="text-mini font-bold opacity-75">{b.deskripsi}</p>
                    {punya > 0 && <p className="text-mini font-extrabold text-emerald-600">🎒 Punya: {b.permanen ? '✔' : punya}</p>}
                  </div>
                  <span className="font-black text-orange-600">{formatRupiah(b.harga)}</span>
                </button>
              );
            })}
          {tab === 'aksesoris' &&
            SEMUA_AKSESORIS.map((a) => {
              const punya = s.aksesoris.includes(a.id);
              const dipakai = s.pakai.includes(a.id);
              return (
                <button key={a.id} onPointerDown={() => s.fitur((d) => beliAksesoris(d, a.id), punya ? 'pop' : 'koin')} className={`${KARTU} bg-white shadow-sm`}>
                  <span className="text-4xl">{a.ikon}</span>
                  <div className="flex-1">
                    <p className="font-extrabold">{a.nama}</p>
                    <p className="text-mini font-bold opacity-75">{punya ? (dipakai ? '✅ Sedang dipakai — ketuk untuk lepas' : 'Ketuk untuk pakai') : 'Terlihat di karakter 3D (juga oleh teman online)'}</p>
                  </div>
                  <span className="font-black text-orange-600">{punya ? (dipakai ? 'Lepas' : 'Pakai') : formatRupiah(a.harga)}</span>
                </button>
              );
            })}
          {tab === 'cat' &&
            F2.catDinding.map((c) => (
              <button key={c.id} onPointerDown={() => s.fitur((d) => catDinding(d, c.id), 'upgrade')} className={`${KARTU} bg-white shadow-sm`}>
                <span className="h-12 w-12 shrink-0 rounded-xl" style={{ background: `linear-gradient(${c.warna} 60%, ${c.bawah} 60%)` }} />
                <div className="flex-1">
                  <p className="font-extrabold">{c.nama}</p>
                  <p className="text-mini font-bold opacity-75">{s.catDinding === c.id ? '✅ Warna kamar sekarang' : 'Dinding kamar langsung berubah'}</p>
                </div>
                <span className="font-black text-orange-600">{c.harga ? formatRupiah(c.harga) : 'Gratis'}</span>
              </button>
            ))}
        </div>
      <Ket className="mt-2 text-center">💇 Potong & cat rambut sekarang di Pangkas Rambut Bang Cukur.</Ket>
    </Panel>
  );
}
