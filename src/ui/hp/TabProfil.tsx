// Tab HP: KTM (profil), statistik hidup, peringkat teman (online).
import { useGame } from '../../game/store';
import { ASAL, JURUSAN, formatRupiah, namaHari, predikatIpk } from '../../game/sim';
import { statusBadan } from '../../game/fitur';
import { useOnline } from '../../online/onlineStore';

export function TabProfil() {
  const s = useGame();
  const p = s.profil;
  if (!p) return <p className="font-bold">Belum ada profil.</p>;
  const jur = JURUSAN.find((j) => j.id === p.jurusan);
  const asal = ASAL.find((a) => a.id === p.asal);
  const pr = predikatIpk(s.ipk);
  const badan = statusBadan(s);
  return (
    <div className="flex flex-col gap-3">
      {/* Kartu Tanda Mahasiswa */}
      <div className="flex gap-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 p-4 text-white shadow-sm">
        <div className="grid h-24 w-20 shrink-0 place-items-center rounded-xl text-5xl" style={{ backgroundColor: p.baju }}>
          🧑‍🎓
        </div>
        <div className="flex flex-col gap-0.5 text-sm font-bold">
          <span className="text-mini tracking-widest opacity-80">KARTU TANDA MAHASISWA · UNIV. KAMPUNG MAHASISWA</span>
          <span className="text-2xl font-black">{p.nama}</span>
          <span>
            {jur?.ikon} {jur?.nama} · Semester {s.semester}
          </span>
          <span>
            {asal?.ikon} Asal {asal?.nama} · 🎂 tgl {p.ultah.tanggal} (bulan ke-{p.ultah.bulan})
          </span>
          <span>
            🎓 IPK {s.ipk.toFixed(2)} {pr.ikon} {pr.nama}
          </span>
        </div>
      </div>
      <p className="rounded-xl bg-white px-3 py-2 text-sm font-bold">✨ Keahlian jurusan: {jur?.deskripsi}</p>
      <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold">
        <p className="mb-1 font-extrabold">🩺 Kondisi</p>
        {badan.length === 0 ? <p>💪 Sehat, kamar rapi, baju wangi. Mantap!</p> : badan.map((b) => <p key={b.teks}>{b.ikon} {b.teks}</p>)}
        <p className="mt-1 opacity-70">
          🧹 Kebersihan kamar {s.kebersihan}% · 👕 Baju kotor {s.bajuKotor} hari · {namaHari(s.hari)}, hari ke-{s.hari}
        </p>
      </div>
    </div>
  );
}

const LABEL_STAT: [string, string][] = [
  ['kuliah', '🎒 Kuliah'],
  ['bolos', '😬 Bolos'],
  ['belajarApa', '📖 Belajar & nugas'],
  ['ujian', '📝 Ujian diikuti'],
  ['kerja', '💼 Shift kerja'],
  ['shiftSempurna', '🌟 Shift sempurna'],
  ['ojol', '🛵 Order ojol'],
  ['freelance', '🖥️ Proyek freelance'],
  ['lesPrivat', '👩‍🏫 Les privat'],
  ['uangKerja', '💰 Total penghasilan'],
  ['makan', '🍛 Kali makan'],
  ['masakMi', '🍜 Mi instan'],
  ['tidur', '😴 Tidur'],
  ['mainGitar', '🎸 Main gitar'],
  ['elusKucing', '🐱 Elus Oyen'],
  ['mandi', '🚿 Mandi'],
  ['bersihKamar', '🧹 Bersih-bersih'],
  ['laundry', '🧺 Laundry'],
  ['kehujanan', '🌧️ Kehujanan'],
  ['sakit', '🤒 Sakit'],
  ['misi', '✅ Misi selesai'],
  ['pulangKampung', '🚌 Pulang kampung'],
];

export function TabStatistik() {
  const stat = useGame((s) => s.stat);
  const hari = useGame((s) => s.hari);
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-white px-3 py-2 font-extrabold">
        📅 Hari hidup di kos<div className="text-xl">{hari}</div>
      </div>
      {LABEL_STAT.map(([k, label]) => (
        <div key={k} className="rounded-xl bg-white px-3 py-2 text-sm font-extrabold">
          {label}
          <div className="text-xl">{k === 'uangKerja' ? formatRupiah(stat[k] ?? 0) : (stat[k] ?? 0)}</div>
        </div>
      ))}
    </div>
  );
}

/** Peringkat teman online (dari data yang dikirim server). */
export function TabPeringkat() {
  const pemain = useOnline((s) => s.pemain);
  const saya = useOnline((s) => s.saya);
  type P = (typeof pemain)[number];
  const urut = (f: (p: P) => number) => [...pemain].sort((a, b) => f(b) - f(a));
  const Daftar = ({ judul, data, nilai }: { judul: string; data: P[]; nilai: (p: P) => string }) => (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-900/5">
      <p className="mb-1.5 text-sm font-black">{judul}</p>
      {data.map((p, i) => (
        <div key={p.id} className={`flex min-h-9 items-center gap-2 rounded-xl px-2 text-sm font-extrabold ${p.id === saya ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}>
          <span className="w-6">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.warna }} />
          <span className="min-w-0 flex-1 truncate">
            {p.nama}
            {p.id === saya && <span className="text-teks-2"> (kamu)</span>}
          </span>
          <span className="tabular-nums">{nilai(p)}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Daftar judul="🎓 IPK tertinggi" data={urut((p) => p.ipk ?? 0)} nilai={(p) => (p.ipk ?? 0).toFixed(2)} />
      {/* M12: harta = uang + tabungan + deposito + emas (lebih adil daripada uang di dompet saja) */}
      <Daftar judul="💎 Harta terbanyak" data={urut((p) => p.harta ?? p.uang ?? 0)} nilai={(p) => formatRupiah(p.harta ?? p.uang ?? 0)} />
      <Daftar judul="🎮 Rekor mini-game" data={urut((p) => p.rekor ?? 0)} nilai={(p) => `${p.rekor ?? 0} poin`} />
    </div>
  );
}
