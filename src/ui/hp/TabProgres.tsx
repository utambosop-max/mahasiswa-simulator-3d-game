// Tab HP: misi harian & pencapaian.
import { useGame } from '../../game/store';
import { FITUR, formatRupiah, ringkasEfek } from '../../game/sim';
import { PENCAPAIAN, cariMisi, nilaiPencapaian, progresMisi, siapkanMisi } from '../../game/fitur';

export function TabMisi() {
  const s = useGame();
  const d = siapkanMisi(s); // hari baru yang belum diproses tetap menampilkan misi hari ini
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold opacity-75">
        {s.hari === 1 ? '🐣 Misi pertama (tutorial)' : '📋 Misi berganti setiap hari'} · selesaikan semua = bonus {formatRupiah(FITUR.misiBonusLengkap)}
      </p>
      {d.misi.daftar.map((it) => {
        const m = cariMisi(it.id);
        if (!m) return null;
        const prog = it.klaim ? m.target : progresMisi(d, m);
        return (
          <div key={it.id} className={`flex items-center gap-3 rounded-2xl border-4 px-4 py-3 ${it.klaim ? 'border-emerald-300 bg-emerald-50' : 'border-white bg-white'}`}>
            <span className="text-3xl">{it.klaim ? '✅' : '⬜'}</span>
            <div className="flex-1">
              <p className="font-extrabold">{m.teks}</p>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-amber-100">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(prog / m.target) * 100}%` }} />
              </div>
            </div>
            <div className="text-right text-sm font-extrabold">
              {prog}/{m.target}
              <div className="text-mini opacity-70">🎁 {ringkasEfek(m.hadiah)}</div>
            </div>
          </div>
        );
      })}
      {d.misi.bonus && <p className="text-center font-extrabold text-emerald-600">🌟 Semua misi hari ini beres! Bonus sudah diterima.</p>}
    </div>
  );
}

export function TabPencapaian() {
  const s = useGame();
  const dapat = s.pencapaian.length;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-extrabold">
        🏆 {dapat}/{PENCAPAIAN.length} pencapaian terbuka
      </p>
      <div className="grid grid-cols-2 gap-2">
        {PENCAPAIAN.map((p) => {
          const ok = s.pencapaian.includes(p.id);
          const nilai = nilaiPencapaian(s, p);
          const persen = Math.min(100, (nilai / p.min) * 100);
          return (
            <div key={p.id} className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${ok ? 'bg-amber-200' : 'bg-white opacity-75'}`}>
              <span className={`text-3xl ${ok ? '' : 'grayscale'}`}>{ok ? p.ikon : '🔒'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{p.nama}</p>
                <p className="text-mini font-bold opacity-75">{p.deskripsi}</p>
                {!ok && (
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-amber-100">
                    <div className="h-full bg-orange-400" style={{ width: `${persen}%` }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
