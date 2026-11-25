import { getar } from '../game/getar';
// Mini-game KERJA BARENG (online): pelanggan sama untuk kedua pemain, bahan dibagi dua.
// Kamu hanya bisa mengambil bahan yang berwarna bajumu — sisanya dipegang temanmu. Harus kompak!
import { useEffect, useMemo, useRef } from 'react';
import { useGame, ambilSave } from '../game/store';
import { KERJA, formatRupiah, hitungGaji, pesananKerja, ringkasEfek, type TempatKerja } from '../game/sim';
import { useOnline, namaPemain } from '../online/onlineStore';
import { kirim } from '../online/net';
import { sfxPop } from '../audio/sfx';

const WAJAH_MOOD = ['😠', '😐', '😊'] as const;

export function KerjaBareng({ tempat }: { tempat: TempatKerja }) {
  const k = useOnline((s) => s.kerjaBareng);
  const hasil = useOnline((s) => s.kerjaHasil);
  const saya = useOnline((s) => s.saya);
  const pemain = useOnline((s) => s.pemain);
  const kj = KERJA[tempat];
  const menuList = useMemo(() => pesananKerja(tempat), [tempat]);
  const bar = useRef<HTMLDivElement>(null);
  const wajah = useRef<HTMLSpanElement>(null);

  const warnaDari = (id: string) => pemain.find((p) => p.id === id)?.warna ?? '#ccc';
  const pemegang = (i: number) => (k ? k.anggota[i % k.anggota.length] : '');
  const teman = k?.anggota.find((a) => a !== saya) ?? '';

  const tap = (bahan: string, i: number) => {
    if (!k || pemegang(i) !== saya) {
      sfxPop();
      return;
    }
    getar(8);
    kirim({ t: 'kerjaTap', bahan });
  };

  const ambilGaji = () => {
    const h = hasil;
    useOnline.setState({ kerjaBareng: null, kerjaHasil: null });
    useGame.getState().akhiriKerja(h && h.benar + h.gagal > 0 ? { benar: h.benar, gagal: h.gagal, tips: h.tips } : null);
  };

  // Batang kesabaran dihitung mundur dari waktu pesan server terakhir diterima (tanpa re-render)
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const s = useOnline.getState();
      const kk = s.kerjaBareng;
      if (kk?.pelanggan && !kk.reaksi && bar.current) {
        const sisa = Math.max(0, kk.sisaMs - (performance.now() - s.kerjaDiterima));
        const f = sisa / (kk.pelanggan.sabar * 1000);
        bar.current.style.width = `${f * 100}%`;
        bar.current.style.backgroundColor = f > 0.6 ? '#4fb35a' : f > 0.3 ? '#f2b33d' : '#e9605a';
        if (wajah.current) wajah.current.textContent = WAJAH_MOOD[f > 0.6 ? 2 : f > 0.3 ? 1 : 0];
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);

  // Keyboard PC: 1–6 bahan, Enter ambil gaji
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= kj.bahan.length) tap(kj.bahan[n - 1].id, n - 1);
      else if ((e.code === 'Enter' || e.code === 'Space') && useOnline.getState().kerjaHasil) {
        e.preventDefault();
        ambilGaji();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (hasil) return <RekapBareng tempat={tempat} hasil={hasil} teman={teman} onAmbil={ambilGaji} />;
  if (!k) return null;

  const p = k.pelanggan;
  const menu = p ? menuList.find((m) => m.id === p.menuId) : undefined;
  const bahanById = new Map(kj.bahan.map((b, i) => [b.id, { ...b, i }]));

  return (
    <div className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-amber-950/55">
      <div className="flex h-[92%] w-[94%] flex-col gap-2 overflow-y-auto rounded-3xl bg-amber-50 p-3 text-amber-900 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-extrabold">
            {kj.ikon} {kj.nama} · 👥 bareng {namaPemain(teman)}
          </div>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <span className="rounded-xl bg-white px-3 py-1">
              👥 {Math.min(k.idx + 1, k.total)}/{k.total}
            </span>
            <span className="rounded-xl bg-white px-3 py-1">✅ {k.benar}</span>
            <span className="rounded-xl bg-white px-3 py-1">❌ {k.gagal}</span>
          </div>
          <button
            onPointerDown={() => kirim({ t: 'kerjaBerhenti' })}
            className="min-h-14 rounded-2xl bg-stone-400 px-4 font-extrabold text-white shadow-sm active:scale-[0.98]"
          >
            Berhenti
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center gap-6 rounded-2xl bg-gradient-to-b from-sky-100 to-amber-100 px-4">
          {p && menu ? (
            <>
              <div className="flex w-36 flex-col items-center gap-2">
                <div key={p.no} className="anim-datang relative">
                  <span className="text-7xl leading-none">{p.wajah}</span>
                  <span ref={wajah} className="absolute -right-3 -bottom-1 text-3xl">
                    {k.reaksi ? (k.reaksi.senang ? '😋' : '😤') : '😊'}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-stone-300">
                  <div ref={bar} className="h-full w-full rounded-full bg-[#4fb35a]" />
                </div>
                <span className="text-[11px] font-bold opacity-70">Kesabaran</span>
              </div>
              <div className="rounded-3xl bg-white px-4 py-3 shadow-sm">
                <div className="text-xs font-bold opacity-60">Pesan, ya:</div>
                <div className="flex items-center gap-2 text-xl font-extrabold">
                  <span className="text-3xl">{menu.ikon}</span> {menu.nama}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {menu.resep.map((id) => {
                    const b = bahanById.get(id);
                    const ok = p.terisi.includes(id);
                    const milik = b ? pemegang(b.i) : '';
                    return (
                      <span
                        key={id}
                        className={`flex items-center gap-1 rounded-xl border-b-4 px-2 py-1 text-sm font-extrabold ${ok ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-100'}`}
                        style={{ borderColor: warnaDari(milik) }}
                      >
                        <span className="text-xl">{b?.ikon}</span>
                        {ok ? '✔' : milik === saya ? `${b?.nama} (kamu)` : `${b?.nama} (${namaPemain(milik)})`}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="grid h-32 w-32 place-items-center rounded-full border-8 border-white bg-stone-100 shadow-inner">
                <div className="flex flex-wrap items-center justify-center gap-1 p-2">
                  {p.terisi.length === 0 ? (
                    <span className="text-xs font-bold opacity-40">kosong</span>
                  ) : (
                    p.terisi.map((id) => (
                      <span key={id} className="anim-datang text-3xl">
                        {bahanById.get(id)?.ikon}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-lg font-extrabold opacity-60">{k.selesai ? 'Shift selesai!' : 'Bersiap... pelanggan segera datang!'}</span>
          )}
          {k.reaksi && (
            <div
              className={`anim-datang absolute top-3 left-1/2 -translate-x-1/2 rounded-2xl px-4 py-1 text-lg font-extrabold text-white ${
                k.reaksi.senang ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            >
              {k.reaksi.teks}
            </div>
          )}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {kj.bahan.map((b, i) => {
            const milik = pemegang(i);
            const punyaku = milik === saya;
            const sudah = !!p?.terisi.includes(b.id);
            const salah = k.salah?.bahan === b.id;
            return (
              <button
                key={b.id}
                onPointerDown={() => tap(b.id, i)}
                className={`relative flex h-20 touch-none flex-col items-center justify-center rounded-2xl border-4 transition-transform active:scale-[0.98] ${
                  sudah ? 'bg-emerald-200' : punyaku ? 'bg-white shadow-sm' : 'bg-stone-200 opacity-60'
                } ${salah ? 'animate-goyang bg-rose-200' : ''}`}
                style={{ borderColor: warnaDari(milik) }}
                aria-label={b.nama}
              >
                <span className="text-4xl leading-none">{b.ikon}</span>
                <span className="mt-1 text-[11px] leading-none font-extrabold">{punyaku ? b.nama : `🔒 ${namaPemain(milik)}`}</span>
                <span className="hint-desktop absolute top-1 left-2 text-[10px] font-bold opacity-40">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RekapBareng({
  tempat,
  hasil,
  teman,
  onAmbil,
}: {
  tempat: TempatKerja;
  hasil: { benar: number; gagal: number; tips: number };
  teman: string;
  onAmbil: () => void;
}) {
  const kj = KERJA[tempat];
  const r = hitungGaji(ambilSave(useGame.getState()), tempat, hasil);
  const kosong = hasil.benar + hasil.gagal === 0;
  return (
    <div className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-amber-950/55">
      <div className="flex max-h-[94%] max-w-[94%] flex-col items-center gap-3 overflow-y-auto rounded-3xl bg-amber-50 p-5 text-center text-amber-900 shadow-sm">
        <h2 className="text-2xl font-extrabold">📋 Rekap Kerja Bareng{teman ? ` ${namaPemain(teman)}` : ''}</h2>
        {kosong ? (
          <p className="font-bold">Belum melayani siapa pun. Tidak ada gaji, waktu & energi juga tidak terpakai.</p>
        ) : (
          <>
            <p className="font-bold">
              {kj.bos}: "{hasil.gagal === 0 ? 'Kalian kompak banget! 🌟' : 'Makasih ya, kalian berdua!'}"
            </p>
            <div className="grid min-w-80 grid-cols-2 gap-x-6 gap-y-1 rounded-2xl bg-white px-5 py-3 text-left font-bold">
              <span>✅ Pesanan benar</span>
              <span className="text-right">{hasil.benar}</span>
              <span>❌ Pelanggan kecewa</span>
              <span className="text-right">{hasil.gagal}</span>
              <span>💼 Gaji dasar{r.lemas ? ' (lemas ½)' : ''}</span>
              <span className="text-right">{formatRupiah(r.dasar)}</span>
              <span>🍽️ Bonus pesanan</span>
              <span className="text-right">{formatRupiah(r.bonus)}</span>
              <span>🪙 Tip</span>
              <span className="text-right">{formatRupiah(r.tips)}</span>
              <span className="border-t-2 border-amber-200 pt-1 font-extrabold">💰 Gajimu</span>
              <span className="border-t-2 border-amber-200 pt-1 text-right font-extrabold text-orange-600">{formatRupiah(r.total)}</span>
            </div>
            <p className="text-sm font-semibold opacity-80">{ringkasEfek({ energi: r.efek.energi, stres: r.efek.stres })} · 1 fase waktu</p>
          </>
        )}
        <button
          onPointerDown={onAmbil}
          className="min-h-16 rounded-2xl bg-orange-400 px-8 text-xl font-extrabold text-white shadow-sm active:scale-[0.98]"
        >
          {kosong ? '🚪 Pulang' : '💰 Ambil Gaji'}
        </button>
      </div>
    </div>
  );
}
