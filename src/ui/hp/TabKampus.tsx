// Tab HP: Kampus (SKS, skripsi, wisuda) + Skill + UKM.
import { useGame } from '../../game/store';
import { F2, formatRupiah, levelSkill } from '../../game/sim';
import { gabungUKM } from '../../game/fitur';

function Bar({ nilai, maks, warna }: { nilai: number; maks: number; warna: string }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-amber-100">
      <div className={`h-full rounded-full ${warna}`} style={{ width: `${Math.min(100, (nilai / maks) * 100)}%` }} />
    </div>
  );
}

export function TabKampus() {
  const s = useGame();
  const bisaSkripsi = s.sks >= F2.sks.skripsiMinSks;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white p-3 font-extrabold">
        <div className="flex justify-between">
          <span>📘 SKS: {s.sks} / {F2.sks.lulus}</span>
          <span className="text-sm opacity-70">kuliah +{F2.sks.perKuliah} · ujian +{F2.sks.perUjian}</span>
        </div>
        <Bar nilai={s.sks} maks={F2.sks.lulus} warna="bg-sky-400" />
        <div className="mt-2 flex justify-between">
          <span>📄 Skripsi: {bisaSkripsi ? `${s.skripsi}%` : `🔒 mulai di ${F2.sks.skripsiMinSks} SKS`}</span>
          <span className="text-sm opacity-70">Nulis di meja · Bimbingan Sore di kampus</span>
        </div>
        <Bar nilai={s.skripsi} maks={100} warna="bg-violet-400" />
        <p className="mt-2 text-sm">
          {s.lulus
            ? '🎓 Kamu sudah LULUS! Selamat, Sarjana!'
            : `🎯 Wisuda: ${F2.sks.lulus} SKS + skripsi 100% → sidang di kampus (Pagi). Hadiah ortu ${formatRupiah(F2.wisuda.hadiahOrtu)}.`}
        </p>
      </div>

      <div className="rounded-2xl bg-white p-3">
        <p className="mb-2 font-extrabold">⭐ Skill (naik dengan latihan)</p>
        <div className="grid grid-cols-2 gap-2">
          {F2.skill.map((sk) => {
            const lv = levelSkill(s, sk.id);
            const total = sk.stat.reduce((n, k) => n + (s.stat[k] ?? 0), 0);
            const berikut = F2.skillLevel[lv] ?? F2.skillLevel[F2.skillLevel.length - 1];
            return (
              <div key={sk.id} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold">
                <p className="font-extrabold">
                  {sk.ikon} {sk.nama} · Lv {lv}/4
                </p>
                <Bar nilai={total} maks={berikut} warna="bg-orange-400" />
                <p className="text-mini opacity-75">{sk.bonus}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-3">
        <p className="mb-2 font-extrabold">
          🎪 UKM (rapat tiap Rabu Sore di kampus · iuran {formatRupiah(F2.ukmIuran)}/bulan)
        </p>
        <div className="grid grid-cols-2 gap-2">
          {F2.ukm.map((u) => {
            const ikut = s.ukm === u.id;
            return (
              <button
                key={u.id}
                onPointerDown={() => s.fitur((d) => gabungUKM(d, ikut ? null : u.id), 'notif')}
                className={`min-h-14 rounded-xl border-4 px-3 text-left text-sm font-extrabold active:scale-[0.98] ${ikut ? 'border-orange-400 bg-orange-50' : 'border-white bg-amber-50'}`}
              >
                {u.ikon} {u.nama} {ikut && '✅'}
                <div className="text-mini font-bold opacity-75">{ikut ? 'Ketuk untuk keluar' : u.deskripsi}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
