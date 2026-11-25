// Tab HP "Buku Sakti": daftar halaman (bab) cerita utama, progres tujuan, & celengan bantu warung Ibu.
// Versi minimal — nanti dirombak UI Programmer (16).
import { useGame, ambilSave } from '../../game/store';
import { BAB, CERITA, batalNabung, kirimNabung, progresTujuan, setorNabung } from '../../game/cerita';
import { formatRupiah } from '../../game/sim';
import { Kartu, Ket, Tombol } from '../kit';

const LABEL_STATUS = { aktif: '✍️ Sedang jalan', selesai: '✅ Selesai', rencanaB: '📝 Rencana B', lewat: '⏭️ Dilewati' } as const;

export function TabBukuSakti() {
  const s = useGame();
  const d = ambilSave(s);
  const c = d.cerita;
  const n = c.nabung;
  const ending = CERITA.ending.find((e) => e.id === c.ending);
  return (
    <div className="flex flex-col gap-2">
      <Ket>📒 Catatan tulisan tangan Ibu. Tiap halaman = satu tujuan kecil. Telat? Nggak apa-apa, ada Rencana B.</Ket>
      {n && (
        <Kartu judul="🐷 Celengan Bantu Warung Ibu" kanan={n.status === 'aktif' ? `s/d hari ${n.batas}` : n.status === 'terkirim' ? '✅ Terkirim' : 'Selesai'}>
          <div className="h-2.5 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full rounded-full bg-orange-400" style={{ width: `${Math.min(100, (n.terkumpul / n.target) * 100)}%` }} />
          </div>
          <Ket>
            {formatRupiah(n.terkumpul)} / {formatRupiah(n.target)} · sukarela, batal kapan saja tanpa hukuman
          </Ket>
          {n.status === 'aktif' && (
            <div className="flex flex-wrap gap-2">
              {n.terkumpul < n.target ? (
                <Tombol onTekan={() => s.fitur(setorNabung, 'koin')}>🐷 Sisihkan {formatRupiah(CERITA.nabung.setor)}</Tombol>
              ) : (
                <Tombol onTekan={() => s.fitur(kirimNabung, 'notif')}>📤 Kirim ke Ibu</Tombol>
              )}
              <Tombol varian="biasa" onTekan={() => s.fitur(batalNabung, 'pop')}>
                ↩️ Batal & ambil uangnya
              </Tombol>
            </div>
          )}
        </Kartu>
      )}
      {BAB.map((b, i) => {
        const p = c.bab[b.id];
        if (!p) {
          // Halaman yang belum terbuka: hanya tampilkan satu halaman "terkunci" berikutnya
          const sebelum = BAB[i - 1];
          return !sebelum || c.bab[sebelum.id] ? (
            <Kartu key={b.id} judul={`🔒 Halaman ${i + 1}`} kanan="Belum terbuka">
              <Ket>Halaman ini masih nempel. Jalani harimu dulu...</Ket>
            </Kartu>
          ) : null;
        }
        return (
          <Kartu key={b.id} judul={`${b.ikon} ${i === 0 ? 'Prolog' : `Bab ${b.urutan}`} · ${b.judul}`} kanan={LABEL_STATUS[p.s]}>
            <p className="text-sm font-bold text-teks italic">"{p.s === 'rencanaB' ? (b.rencanaB?.teks ?? b.halaman) : b.halaman}"</p>
            {p.s !== 'lewat' &&
              b.tujuan.map((t) => {
                const [x, target] = progresTujuan(d, b, t);
                return (
                  <div key={t.id} className="flex items-center gap-2 text-sm font-semibold">
                    <span>{x >= target ? '✅' : '⬜'}</span>
                    <span className="flex-1">{t.teks}</span>
                    <span className="text-mini font-extrabold text-teks-2 tabular-nums">
                      {x}/{target}
                    </span>
                  </div>
                );
              })}
            {p.s === 'aktif' && <Ket>⏳ Sisa {Math.max(0, p.mulai + b.batasHari - d.hari)} hari sebelum Rencana B</Ket>}
            {b.ending && ending && (
              <Ket>
                {ending.ikon} Ending: {ending.judul}
              </Ket>
            )}
          </Kartu>
        );
      })}
    </div>
  );
}
