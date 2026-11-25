import { getar } from '../game/getar';
// Mini-game kerja sambilan: meracik pesanan pelanggan di warteg / warkop.
// Cara main: ketuk bahan sesuai resep sebelum kesabaran pelanggan habis.
// Bahan salah = kesabaran berkurang. Cepat selesai = tip lebih besar.
import { useEffect, useMemo, useReducer, useRef, type RefObject } from 'react';
import { useGame, ambilSave } from '../game/store';
import {
  KERJA,
  WAJAH_PELANGGAN,
  formatRupiah,
  hitungGaji,
  pesananKerja,
  ringkasEfek,
  type MenuItem,
  type TempatKerja,
} from '../game/sim';
import { sfxBahan, sfxKecewa, sfxKoin, sfxPelanggan, sfxPop, sfxSalah } from '../audio/sfx';
import { BAL } from '../game/sim';
import { useOnline, namaPemain } from '../online/onlineStore';
import { kirim } from '../online/net';
import { KerjaBareng } from './KerjaBareng';

type Tahap = 'intro' | 'main' | 'rekap';
type Pelanggan = { no: number; wajah: string; menu: MenuItem; sabar: number };

/** Semua keadaan mini-game disimpan di satu objek mutable (dibaca tiap frame tanpa re-render). */
type Keadaan = {
  tahap: Tahap;
  idx: number; // jumlah pelanggan yang sudah selesai dilayani/pergi
  pel: Pelanggan | null;
  terisi: string[];
  sisa: number; // detik kesabaran tersisa
  mood: 0 | 1 | 2; // 0 kesal, 1 biasa, 2 senang
  reaksi: { teks: string; senang: boolean } | null;
  goyang: string | null; // bahan yang barusan salah (animasi goyang)
  benar: number;
  gagal: number;
  tips: number;
  menuTerakhir: string;
};

const JEDA_REAKSI = 900; // ms jeda antar pelanggan
const WAJAH_MOOD = ['😠', '😐', '😊'] as const;
const acak = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function KerjaSambilan() {
  const tempat = useGame((s) => s.kerja);
  const bareng = useOnline((s) => s.kerjaBareng !== null || s.kerjaHasil !== null);
  if (!tempat) return null;
  if (bareng) return <KerjaBareng tempat={tempat} />;
  return <Sesi tempat={tempat} />;
}

/** (Online) Ajak teman yang juga membuka layar kerja di tempat yang sama. */
function LobiBareng({ tempat }: { tempat: TempatKerja }) {
  const online = useGame((s) => s.online);
  const lobi = useOnline((s) => s.kerjaLobi);
  const saya = useOnline((s) => s.saya);
  useEffect(() => {
    if (!online) return;
    kirim({ t: 'kerjaLobi', tempat });
    return () => kirim({ t: 'kerjaLobi', tempat: null });
  }, [online, tempat]);
  if (!online) return null;
  const teman = lobi?.tempat === tempat ? lobi.ids.filter((id) => id !== saya) : [];
  return (
    <div className="rounded-2xl bg-sky-100 px-4 py-2 text-sm font-bold">
      {teman.length === 0 ? (
        <span>👥 Ajak teman ke sini untuk <b>kerja bareng</b> (pelanggan +{BAL.online.kerjaBareng.tambahPelanggan}, bahan dibagi dua)!</span>
      ) : (
        <button
          onPointerDown={() => {
            sfxPop();
            kirim({ t: 'kerjaMulai', tempat });
          }}
          className="min-h-14 rounded-2xl bg-sky-500 px-6 text-lg font-extrabold text-white shadow-sm active:scale-[0.98]"
        >
          👥 Kerja bareng {teman.map(namaPemain).join(', ')}!
        </button>
      )}
    </div>
  );
}

function Sesi({ tempat }: { tempat: TempatKerja }) {
  const k = KERJA[tempat];
  const daftarPesanan = useMemo(() => pesananKerja(tempat), [tempat]);
  const bahanById = useMemo(() => new Map(k.bahan.map((b) => [b.id, b])), [k]);
  const akhiriKerja = useGame((s) => s.akhiriKerja);
  const [, paksa] = useReducer((n: number) => n + 1, 0);
  const bar = useRef<HTMLDivElement>(null);
  const timer = useRef<number[]>([]);
  const g = useRef<Keadaan>({
    tahap: 'intro',
    idx: 0,
    pel: null,
    terisi: [],
    sisa: 0,
    mood: 2,
    reaksi: null,
    goyang: null,
    benar: 0,
    gagal: 0,
    tips: 0,
    menuTerakhir: '',
  }).current;

  const tunda = (fn: () => void, ms: number) => {
    timer.current.push(window.setTimeout(fn, ms));
  };

  // ===== Alur permainan =====
  const datang = () => {
    if (g.tahap !== 'main') return;
    if (g.idx >= k.jumlahPelanggan) {
      g.tahap = 'rekap';
      g.pel = null;
      paksa();
      return;
    }
    // Hindari pesanan yang sama dua kali berturut-turut
    let menu = acak(daftarPesanan);
    if (menu.id === g.menuTerakhir && daftarPesanan.length > 1) {
      menu = daftarPesanan[(daftarPesanan.indexOf(menu) + 1) % daftarPesanan.length];
    }
    g.menuTerakhir = menu.id;
    // Makin lama shift, pelanggan makin tidak sabar (tantangan naik pelan-pelan)
    const sabar = Math.max(k.kesabaranMin, k.kesabaranAwal - g.idx * k.kesabaranTurun);
    g.pel = { no: g.idx + 1, wajah: acak(WAJAH_PELANGGAN), menu, sabar };
    g.sisa = sabar;
    g.terisi = [];
    g.mood = 2;
    g.reaksi = null;
    sfxPelanggan();
    paksa();
  };

  const lanjut = (teks: string, senang: boolean) => {
    g.reaksi = { teks, senang };
    g.idx++;
    paksa();
    tunda(datang, JEDA_REAKSI);
  };

  const mulai = () => {
    if (g.tahap !== 'intro') return;
    sfxPop();
    g.tahap = 'main';
    datang();
  };

  const berhenti = () => {
    timer.current.forEach(clearTimeout);
    timer.current = [];
    g.tahap = 'rekap';
    g.pel = null;
    g.reaksi = null;
    sfxPop();
    paksa();
  };

  const tapBahan = (id: string) => {
    const p = g.pel;
    if (g.tahap !== 'main' || !p || g.reaksi) return;
    getar(8);
    const resep = p.menu.resep;
    if (g.terisi.includes(id)) {
      sfxPop(); // sudah ditaruh, tidak apa-apa
      return;
    }
    if (resep.includes(id)) {
      g.terisi = [...g.terisi, id];
      sfxBahan(g.terisi.length - 1);
      if (g.terisi.length === resep.length) {
        // Pesanan lengkap! Tip sebanding sisa kesabaran (dibulatkan ke Rp100)
        const tip = Math.round((k.tipMaks * (g.sisa / p.sabar)) / 100) * 100;
        g.benar++;
        g.tips += tip;
        sfxKoin();
        lanjut(`😋 Mantap! +${formatRupiah(k.bayarPerPesanan + tip)}`, true);
      } else paksa();
      return;
    }
    // Bahan salah → pelanggan makin tidak sabar
    g.sisa = Math.max(0.01, g.sisa - k.penaltiSalah);
    g.goyang = id;
    sfxSalah();
    paksa();
    tunda(() => {
      g.goyang = null;
      paksa();
    }, 350);
  };

  const ambilGaji = () => {
    const kosong = g.benar + g.gagal === 0;
    akhiriKerja(kosong ? null : { benar: g.benar, gagal: g.gagal, tips: g.tips });
  };

  // ===== Loop waktu: kesabaran pelanggan berkurang =====
  useEffect(() => {
    let id = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const p = g.pel;
      if (g.tahap === 'main' && p && !g.reaksi) {
        g.sisa -= dt;
        const f = Math.max(0, g.sisa / p.sabar);
        // Ubah gaya batang langsung lewat DOM (tanpa re-render React tiap frame)
        if (bar.current) {
          bar.current.style.width = `${f * 100}%`;
          bar.current.style.backgroundColor = f > 0.6 ? '#4fb35a' : f > 0.3 ? '#f2b33d' : '#e9605a';
        }
        const mood = f > 0.6 ? 2 : f > 0.3 ? 1 : 0;
        if (mood !== g.mood) {
          g.mood = mood;
          paksa();
        }
        if (g.sisa <= 0) {
          g.gagal++;
          sfxKecewa();
          lanjut('😤 Kelamaan! Pelanggan pergi...', false);
        }
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    const semuaTimer = timer.current;
    return () => {
      cancelAnimationFrame(id);
      semuaTimer.forEach(clearTimeout);
    };
  }, []);

  // ===== Keyboard PC: 1–6 = bahan, Enter = mulai/ambil gaji, Esc = batal =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const n = Number(e.key);
      if (g.tahap === 'main' && n >= 1 && n <= k.bahan.length) tapBahan(k.bahan[n - 1].id);
      else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        if (g.tahap === 'intro') mulai();
        else if (g.tahap === 'rekap') ambilGaji();
      } else if (e.code === 'Escape' && g.tahap === 'intro') akhiriKerja(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-amber-950/55">
      <div className="flex h-[92%] w-[94%] flex-col gap-2 overflow-y-auto rounded-3xl bg-amber-50 p-3 text-amber-900 shadow-sm">
        {g.tahap === 'intro' && <Intro tempat={tempat} onMulai={mulai} onBatal={() => akhiriKerja(null)} />}
        {g.tahap === 'main' && (
          <>
            <Header tempat={tempat} keadaan={g} onBerhenti={berhenti} />
            <Konter keadaan={g} bahanById={bahanById} bar={bar} />
            <div className="grid grid-cols-6 gap-2">
              {k.bahan.map((b, i) => {
                const sudah = g.terisi.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onPointerDown={() => tapBahan(b.id)}
                    className={`relative flex h-20 touch-none flex-col items-center justify-center rounded-2xl transition-transform active:scale-[0.98] ${
                      sudah ? 'bg-emerald-200 shadow-sm' : 'bg-white shadow-sm'
                    } ${g.goyang === b.id ? 'animate-goyang bg-rose-200' : ''}`}
                    aria-label={b.nama}
                  >
                    <span className="text-4xl leading-none">{b.ikon}</span>
                    <span className="mt-1 text-[11px] font-extrabold leading-none">{b.nama}</span>
                    <span className="hint-desktop absolute top-1 left-2 text-[10px] font-bold opacity-40">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {g.tahap === 'rekap' && <Rekap tempat={tempat} keadaan={g} onAmbil={ambilGaji} />}
      </div>
    </div>
  );
}

function Intro({ tempat, onMulai, onBatal }: { tempat: TempatKerja; onMulai: () => void; onBatal: () => void }) {
  const k = KERJA[tempat];
  const efek = hitungGaji(ambilSave(useGame.getState()), tempat, { benar: 0, gagal: 0, tips: 0 }).efek;
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <div className="text-6xl">{k.ikon}</div>
      <h2 className="text-2xl font-extrabold">Kerja Sambilan di {k.nama}</h2>
      <p className="max-w-xl rounded-2xl bg-white px-4 py-2 font-bold">
        <b>{k.bos}:</b> "{k.sapaan}"
      </p>
      <ul className="max-w-xl text-left text-sm font-semibold leading-relaxed">
        <li>👆 Ketuk bahan sesuai pesanan pelanggan (urutan bebas).</li>
        <li>⏳ Pelanggan yang menunggu terlalu lama akan pergi. Bahan salah = mereka makin tidak sabar.</li>
        <li>
          💰 Gaji {formatRupiah(k.gajiDasar)} + {formatRupiah(k.bayarPerPesanan)} per pesanan + tip kalau cepat ({k.jumlahPelanggan}{' '}
          pelanggan).
        </li>
        <li>
          🕐 Memakai 1 fase waktu · ⚡ {efek.energi} · 😵 +{efek.stres} (lebih ringan kalau tanpa kesalahan)
        </li>
      </ul>
      <LobiBareng tempat={tempat} />
      <div className="flex gap-3">
        <button
          onPointerDown={onBatal}
          className="min-h-14 rounded-2xl bg-stone-400 px-6 text-lg font-extrabold text-white shadow-sm active:scale-[0.98]"
        >
          Nggak jadi
        </button>
        <button
          onPointerDown={onMulai}
          className="min-h-16 rounded-2xl bg-orange-400 px-8 text-xl font-extrabold text-white shadow-sm active:scale-[0.98]"
        >
          💼 Mulai Kerja!
        </button>
      </div>
    </div>
  );
}

function Header({ tempat, keadaan: g, onBerhenti }: { tempat: TempatKerja; keadaan: Keadaan; onBerhenti: () => void }) {
  const k = KERJA[tempat];
  const bonus = g.benar * k.bayarPerPesanan + g.tips;
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="text-lg font-extrabold">
        {k.ikon} {k.nama}
      </div>
      <div className="flex items-center gap-2 text-sm font-extrabold">
        <span className="rounded-xl bg-white px-3 py-1">
          👥 {Math.min(g.idx + 1, k.jumlahPelanggan)}/{k.jumlahPelanggan}
        </span>
        <span className="rounded-xl bg-white px-3 py-1">✅ {g.benar}</span>
        <span className="rounded-xl bg-white px-3 py-1">❌ {g.gagal}</span>
        <span className="rounded-xl bg-white px-3 py-1 text-orange-600">💰 +{formatRupiah(bonus)}</span>
      </div>
      <button
        onPointerDown={onBerhenti}
        className="min-h-14 rounded-2xl bg-stone-400 px-4 font-extrabold text-white shadow-sm active:scale-[0.98]"
      >
        Berhenti
      </button>
    </div>
  );
}

type KonterProps = {
  keadaan: Keadaan;
  bahanById: Map<string, { id: string; nama: string; ikon: string }>;
  bar: RefObject<HTMLDivElement | null>;
};

/** Area konter: pelanggan + gelembung pesanan + piring/gelas yang sedang diracik. */
function Konter({ keadaan: g, bahanById, bar }: KonterProps) {
  const p = g.pel;
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center gap-6 rounded-2xl bg-gradient-to-b from-sky-100 to-amber-100 px-4">
      {p ? (
        <>
          {/* Pelanggan */}
          <div className="flex w-36 flex-col items-center gap-2">
            <div key={p.no} className="relative anim-datang">
              <span className="text-7xl leading-none">{p.wajah}</span>
              <span className="absolute -right-3 -bottom-1 text-3xl">{g.reaksi ? (g.reaksi.senang ? '😋' : '😤') : WAJAH_MOOD[g.mood]}</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-stone-300">
              <div ref={bar} className="h-full w-full rounded-full bg-[#4fb35a]" />
            </div>
            <span className="text-[11px] font-bold opacity-70">Kesabaran</span>
          </div>

          {/* Gelembung pesanan */}
          <div className="relative rounded-3xl bg-white px-4 py-3 shadow-sm">
            <span className="absolute top-1/2 -left-3 h-5 w-5 -translate-y-1/2 rotate-45 border-b-4 border-l-4 border-white bg-white" />
            <div className="text-xs font-bold opacity-60">Pesan, ya:</div>
            <div className="flex items-center gap-2 text-xl font-extrabold">
              <span className="text-3xl">{p.menu.ikon}</span> {p.menu.nama}
            </div>
            <div className="mt-2 flex gap-2">
              {p.menu.resep.map((id) => {
                const b = bahanById.get(id);
                const ok = g.terisi.includes(id);
                return (
                  <span
                    key={id}
                    className={`flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-extrabold ${
                      ok ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-100'
                    }`}
                  >
                    <span className="text-xl">{b?.ikon}</span>
                    {ok ? '✔' : b?.nama}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Piring / gelas yang sedang diracik */}
          <div className="grid h-32 w-32 place-items-center rounded-full border-8 border-white bg-stone-100 shadow-inner">
            <div className="flex flex-wrap items-center justify-center gap-1 p-2">
              {g.terisi.length === 0 ? (
                <span className="text-xs font-bold opacity-40">kosong</span>
              ) : (
                g.terisi.map((id) => (
                  <span key={id} className="anim-datang text-3xl">
                    {bahanById.get(id)?.ikon}
                  </span>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <span className="text-lg font-extrabold opacity-60">Menunggu pelanggan...</span>
      )}

      {g.reaksi && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 anim-datang rounded-2xl px-4 py-1 text-lg font-extrabold text-white ${
            g.reaksi.senang ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        >
          {g.reaksi.teks}
        </div>
      )}
    </div>
  );
}

function Rekap({ tempat, keadaan: g, onAmbil }: { tempat: TempatKerja; keadaan: Keadaan; onAmbil: () => void }) {
  const k = KERJA[tempat];
  const r = hitungGaji(ambilSave(useGame.getState()), tempat, g);
  const kosong = g.benar + g.gagal === 0;
  const pujian =
    g.gagal === 0 && g.benar > 0 ? `${k.bos}: "Wah, sempurna! Besok datang lagi ya!" 🌟` : g.benar >= g.gagal ? `${k.bos}: "Lumayan, makasih ya!"` : `${k.bos}: "Nggak apa-apa, namanya juga belajar..."`;
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-2xl font-extrabold">📋 Rekap Shift</h2>
      {kosong ? (
        <p className="font-bold">Belum melayani siapa pun. Tidak ada gaji, tapi waktu & energi juga tidak terpakai.</p>
      ) : (
        <>
          <p className="font-bold">{pujian}</p>
          <div className="grid min-w-80 grid-cols-2 gap-x-6 gap-y-1 rounded-2xl bg-white px-5 py-3 text-left font-bold">
            <span>✅ Pesanan benar</span>
            <span className="text-right">{g.benar}</span>
            <span>❌ Pelanggan kecewa</span>
            <span className="text-right">{g.gagal}</span>
            <span>💼 Gaji dasar{r.lemas ? ' (lemas ½)' : ''}</span>
            <span className="text-right">{formatRupiah(r.dasar)}</span>
            <span>🍽️ Bonus pesanan</span>
            <span className="text-right">{formatRupiah(r.bonus)}</span>
            <span>🪙 Tip</span>
            <span className="text-right">{formatRupiah(r.tips)}</span>
            <span className="border-t-2 border-amber-200 pt-1 font-extrabold">💰 Total</span>
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
  );
}
