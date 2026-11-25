// Tab HP: jadwal (kuliah, ujian, kos, ramalan cuaca) & rapor semester.
import { useGame } from '../../game/store';
import { AKADEMIK, BAL, bulanSemester, cuacaHari, isHariKerja, namaHari, persiapanUjian, ujianAktif } from '../../game/sim';

export function TabJadwal() {
  const s = useGame();
  const ujian = ujianAktif(s);
  const besok = cuacaHari(s.hari + 1);
  const kini = cuacaHari(s.hari);
  const bs = bulanSemester(s.bulan);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-3 font-extrabold">
          🌤️ Cuaca hari ini: {kini.ikon} {kini.nama}
          <div className="text-sm opacity-75">
            Besok: {besok.ikon} {besok.nama}
            {besok.id === 'hujan' && !s.tas.payung ? ' — beli payung!' : ''}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-3 font-extrabold">
          🏠 Kos bulan ini: {s.kosLunas ? '✅ Lunas' : `⚠️ Belum dibayar (batas tgl ${BAL.bulanan.batasBayarKos})`}
          <div className="text-sm opacity-75">Kiriman ortu masuk tiap tanggal 1</div>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-3">
        <p className="mb-1 font-extrabold">🗓️ Jadwal kuliah (Senin–Jumat, Pagi & Siang)</p>
        <div className="grid grid-cols-7 gap-1 text-center text-mini font-extrabold">
          {Array.from({ length: 7 }, (_, i) => s.hari - ((s.hari - 1) % 7) + i).map((h) => (
            <div key={h} className={`rounded-lg py-1 ${h === s.hari ? 'bg-orange-300' : isHariKerja(h) ? 'bg-sky-100' : 'bg-emerald-100'}`}>
              {namaHari(h).slice(0, 3)}
              <div>{isHariKerja(h) ? '🎒🎒' : '🎉'}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-white p-3 font-bold">
        <p className="font-extrabold">📝 Ujian semester {s.semester} (sekarang bulan ke-{bs})</p>
        {AKADEMIK.ujian.map((u) => {
          const sudah = s.ujianSelesai.includes(`${u.id}-${s.semester}`);
          return (
            <p key={u.id} className="text-sm">
              {sudah ? '✅' : '⏳'} {u.nama}: bulan ke-{u.bulanSemester}, tgl {u.tanggalMulai}–{u.tanggalSelesai}
            </p>
          );
        })}
        <p className="mt-1 text-sm">
          📚 Persiapan ujian (belajar/kuliah 7 hari terakhir): <b>{Math.round(persiapanUjian(s) * 100)}%</b>
          {ujian && <span className="ml-2 font-extrabold text-rose-600">🔔 {ujian.nama} sedang berlangsung — datang kuliah untuk ikut ujian!</span>}
        </p>
        <p className="mt-1 text-sm opacity-75">🏆 IPK ≥ {AKADEMIK.beasiswaIpk.toFixed(2)} di awal bulan = beasiswa. Les privat butuh IPK ≥ {AKADEMIK.lesIpkMin.toFixed(2)}.</p>
      </div>
    </div>
  );
}

export function TabRapor() {
  const s = useGame();
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl bg-white p-3 font-extrabold">
        📈 Semester {s.semester} berjalan · IPK awal {s.ipkAwalSemester.toFixed(2)} → sekarang {s.ipk.toFixed(2)}
        <div className="text-sm opacity-75">Rapor keluar setiap 4 bulan (awal bulan ke-1 semester berikutnya).</div>
      </div>
      {s.rapor.length === 0 && <p className="font-bold opacity-75">Belum ada rapor. Bertahan sampai akhir semester dulu ya!</p>}
      {[...s.rapor].reverse().map((r) => (
        <div key={r.semester} className="flex items-center gap-3 rounded-2xl bg-amber-100 px-4 py-2">
          <span className="text-4xl">{r.ikon}</span>
          <div className="flex-1 font-extrabold">
            Semester {r.semester}: IPK {r.ipk.toFixed(2)}
            <div className="text-sm opacity-75">
              {r.predikat} · {r.selisih >= 0 ? '▲' : '▼'} {Math.abs(r.selisih).toFixed(3)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
