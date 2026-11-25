// Tab HP: Keuangan (grafik uang 30 hari + target tabungan) & Kalender bulan ini.
import { useState, type PointerEvent } from 'react';
import { useGame } from '../../game/store';
import { AKADEMIK, BAL, F2, bulanSemester, cuacaHari, formatRupiah, hariMinggu, tanggalMerah } from '../../game/sim';
import { acaraHari, setTarget } from '../../game/fitur';

const W = 560;
const H = 170;
const PAD = { l: 56, r: 104, t: 14, b: 22 };
/** Label sumbu ringkas: 950rb, 1,2jt */
const ringkas = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt` : `${Math.round(v / 1000)}rb`);
// Satu seri → satu warna (oranye hangat palet game), garis 2px; teks memakai warna teks, bukan warna seri
const WARNA_SERI = '#e0782f';
const TEKS = '#78350f';
const GRID = '#e7d3b8';

/** Grafik garis uang di akhir tiap hari (maks 30 hari) + hari ini. Sentuh/arahkan untuk melihat nilai. */
function GrafikUang({ data }: { data: number[] }) {
  const [aktif, setAktif] = useState<number | null>(null);
  if (data.length < 2) return <p className="rounded-xl bg-white p-3 text-sm font-bold opacity-70">📈 Grafik muncul setelah 2 hari bermain.</p>;
  const min = Math.min(0, ...data);
  const maks = Math.max(...data) * 1.08 || 1;
  const x = (i: number) => PAD.l + (i / (data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (maks - min)) * (H - PAD.t - PAD.b);
  const garis = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${garis} L${x(data.length - 1)},${y(min)} L${x(0)},${y(min)} Z`;
  const ticks = [min, (min + maks) / 2, maks].map((v) => Math.round(v / 50000) * 50000);
  const akhir = data.length - 1;
  const pilih = (e: PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1));
    setAktif(Math.max(0, Math.min(akhir, i)));
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-white" role="img" aria-label={`Grafik uang ${data.length} hari, terakhir ${formatRupiah(data[akhir])}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fontWeight={700} fill={TEKS} opacity={0.7}>
            {ringkas(t)}
          </text>
        </g>
      ))}
      <path d={area} fill={WARNA_SERI} opacity={0.12} />
      <path d={garis} fill="none" stroke={WARNA_SERI} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* Label langsung di titik terakhir */}
      <circle cx={x(akhir)} cy={y(data[akhir])} r={4} fill={WARNA_SERI} stroke="#fff" strokeWidth={2} />
      <text x={x(akhir) + 8} y={y(data[akhir]) + 4} fontSize={12} fontWeight={800} fill={TEKS}>
        {formatRupiah(data[akhir])}
      </text>
      {aktif !== null && (
        <g>
          <line x1={x(aktif)} x2={x(aktif)} y1={PAD.t} y2={H - PAD.b} stroke={TEKS} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          <circle cx={x(aktif)} cy={y(data[aktif])} r={5} fill={WARNA_SERI} stroke="#fff" strokeWidth={2} />
          <rect x={Math.min(x(aktif) + 6, W - 150)} y={PAD.t} width={140} height={34} rx={8} fill="#fffaf2" stroke={GRID} />
          <text x={Math.min(x(aktif) + 14, W - 142)} y={PAD.t + 14} fontSize={11} fontWeight={700} fill={TEKS} opacity={0.7}>
            {aktif === akhir ? 'Hari ini' : `${akhir - aktif} hari lalu`}
          </text>
          <text x={Math.min(x(aktif) + 14, W - 142)} y={PAD.t + 28} fontSize={13} fontWeight={800} fill={TEKS}>
            {formatRupiah(data[aktif])}
          </text>
        </g>
      )}
      {/* Area sentuh lebih besar dari garisnya */}
      <rect x={PAD.l} y={0} width={W - PAD.l - PAD.r} height={H} fill="transparent" onPointerMove={pilih} onPointerDown={pilih} onPointerLeave={() => setAktif(null)} />
      <text x={PAD.l} y={H - 6} fontSize={10} fontWeight={700} fill={TEKS} opacity={0.6}>
        {data.length - 1} hari lalu
      </text>
      <text x={W - PAD.r} y={H - 6} fontSize={10} fontWeight={700} fill={TEKS} opacity={0.6} textAnchor="end">
        hari ini
      </text>
    </svg>
  );
}

export function TabUang() {
  const s = useGame();
  const data = [...s.riwayatUang, s.uang];
  const t = s.targetTabungan;
  return (
    <div className="flex flex-col gap-3">
      <p className="font-extrabold">📈 Uang di dompet ({data.length} hari terakhir)</p>
      <GrafikUang data={data} />
      <div className="rounded-2xl bg-white p-3">
        <p className="font-extrabold">🎯 Target tabungan {t ? `${formatRupiah(s.tabungan)} / ${formatRupiah(t)}` : '(belum diatur)'}</p>
        {t > 0 && (
          <div className="my-1 h-3 overflow-hidden rounded-full bg-pink-100">
            <div className="h-full rounded-full bg-pink-400" style={{ width: `${Math.min(100, (s.tabungan / t) * 100)}%` }} />
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          {F2.targetTabungan.map((n) => (
            <button
              key={n}
              onPointerDown={() => s.fitur((d) => setTarget(d, n))}
              className={`min-h-14 rounded-xl border-2 px-3 text-sm font-extrabold active:scale-[0.98] ${t === n ? 'border-pink-400 bg-pink-50' : 'border-white bg-amber-50'}`}
            >
              {formatRupiah(n)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TabKalender() {
  const s = useGame();
  const awal = s.hari - (s.tanggal - 1); // nomor hari tanggal 1 bulan ini
  const bs = bulanSemester(s.bulan);
  const kosBatas = BAL.bulanan.batasBayarKos;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-extrabold">
        📅 Bulan {s.bulan} (bulan ke-{bs} semester {s.semester})
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-mini font-extrabold">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((h) => (
          <div key={h} className="opacity-60">
            {h}
          </div>
        ))}
        {Array.from({ length: hariMinggu(awal) }, (_, i) => (
          <div key={`k${i}`} />
        ))}
        {Array.from({ length: 30 }, (_, i) => {
          const tgl = i + 1;
          const h = awal + i;
          const merah = tanggalMerah(h);
          const ujian = AKADEMIK.ujian.find((u) => u.bulanSemester === bs && tgl >= u.tanggalMulai && tgl <= u.tanggalSelesai);
          const ultah = s.profil && s.profil.ultah.tanggal === tgl && s.profil.ultah.bulan === bs;
          const tanda = [
            merah ? '🔴' : '',
            ujian ? '📝' : '',
            ultah ? '🎂' : '',
            tgl === 1 ? '💌' : '',
            tgl === kosBatas ? '🏠' : '',
            tgl === F2.tagihan.tanggal ? '🧾' : '',
            hariMinggu(h) === F2.pasarMalam.hari ? '🎡' : '',
            h >= s.hari && h <= s.hari + 1 ? cuacaHari(h).ikon : '',
          ].join('');
          return (
            <div
              key={tgl}
              title={merah?.nama}
              className={`min-h-11 rounded-lg p-0.5 ${tgl === s.tanggal ? 'bg-orange-300' : merah || hariMinggu(h) >= 5 ? 'bg-rose-50' : 'bg-white'} ${h < s.hari ? 'opacity-50' : ''}`}
            >
              <div className={merah || hariMinggu(h) === 6 ? 'text-rose-600' : ''}>{tgl}</div>
              <div className="text-mini leading-tight">{tanda}</div>
            </div>
          );
        })}
      </div>
      <p className="text-mini font-bold opacity-75">
        🔴 libur nasional · 📝 ujian · 🎂 ultah · 💌 kiriman · 🏠 batas kos · 🧾 tagihan · 🎡 pasar malam · hari ini: {acaraHari(s.hari).join(' · ') || 'tidak ada acara'}
      </p>
    </div>
  );
}
