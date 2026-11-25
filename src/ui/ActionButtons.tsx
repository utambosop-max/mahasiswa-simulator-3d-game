import { useEffect } from 'react';
import { useGame, ambilSave, uiTerbuka } from '../game/store';
import { AKSI, F2, cekAksi, hariMinggu, type AksiId } from '../game/sim';
import { ID_MOTOR, cariInteraksi, idWarga } from '../game/interaksi';
import { INFO_SOSIAL, cekSosial, daftarAksiWarga, levelWarga, pacarNpc, relasiWarga, wargaDari } from '../game/m11';
import { sfxSalah } from '../audio/sfx';
import { getar } from '../game/getar';
import { lombaBisaDikerjakan } from '../game/m12';

/** Jalankan aksi, atau tampilkan alasan jika belum bisa. */
function tekan(id: AksiId) {
  const st = useGame.getState();
  const cek = cekAksi(ambilSave(st), id);
  getar(10);
  if (cek.boleh) st.lakukan(id);
  else {
    sfxSalah();
    st.toast(cek.alasan ?? 'Belum bisa sekarang');
  }
}

/**
 * Sembunyikan aksi yang belum relevan agar tombol tidak menumpuk (UI hanya yang penting):
 * skripsi sebelum cukup SKS, pasar malam selain Sabtu, rapat UKM jika belum ikut UKM.
 */
function aksiTampil(st: ReturnType<typeof useGame.getState>, a: AksiId): boolean {
  const def = AKSI[a];
  if (def.jenis === 'skripsi') return st.sks >= F2.sks.skripsiMinSks && !st.lulus;
  if (def.hari && a !== 'rapatUKM') return def.hari.includes(hariMinggu(st.hari));
  if (a === 'rapatUKM') return !!st.ukm;
  // M12: tombol cabai & lomba hanya muncul saat relevan
  if (a === 'siramCabai') return !!st.cabai && st.cabai.siramHari !== st.hari;
  if (a === 'panenCabai') return !!st.cabai && st.cabai.tumbuh >= 0.95;
  if (a === 'kerjakanLomba') return lombaBisaDikerjakan(st);
  return true;
}

/** Tombol aksi sosial saat dekat warga (ngobrol, hadiah, nyatakan cinta, kencan...). */
function TombolWarga({ id }: { id: string }) {
  const s = useGame();
  const w = wargaDari(id);
  if (!w || uiTerbuka(s)) return null;
  const save = ambilSave(s);
  const aksi = daftarAksiWarga(save, id);
  const rel = relasiWarga(save, id);
  const pacar = pacarNpc(save, id);
  return (
    <div className="safe-x pointer-events-none absolute right-0 bottom-0">
      <div className="flex flex-col items-end gap-2 p-4">
        <div className="rounded-xl bg-white/90 px-3 py-1 text-right text-sm font-extrabold text-teks shadow-sm ring-1 ring-black/5">
          {w.ikon} {w.nama} · {w.peran}
          <div className="text-mini">
            {pacar ? '💞 Pacarmu' : `🤝 Pertemanan ${rel}/100`} {levelWarga(save, id) > 0 && `· Lv${levelWarga(save, id)}`}
          </div>
        </div>
        <div className="flex items-end gap-3">
          {aksi
            .map((a, i) => ({ a, i, cek: cekSosial(save, a, id) }))
            .reverse()
            .map(({ a, i, cek }) => (
              <div key={a} className="flex flex-col items-center gap-1">
                <button
                  onPointerDown={() => {
                    if (cek.boleh) s.lakukanSosial(a);
                    else {
                      sfxSalah();
                      s.toast(cek.alasan ?? 'Belum bisa');
                    }
                  }}
                  className={`pointer-events-auto grid touch-none place-items-center rounded-full shadow-md active:scale-95 ${i === 0 ? 'h-20 w-20 text-4xl' : 'h-16 w-16 text-3xl'} ${
                    !cek.boleh ? 'bg-stone-300/90 opacity-70' : i === 0 ? 'bg-pink-400' : 'bg-white/95 ring-1 ring-black/5'
                  }`}
                  aria-label={INFO_SOSIAL[a].label}
                >
                  {INFO_SOSIAL[a].ikon}
                </button>
                <span className="max-w-24 rounded-lg bg-stone-900/60 px-2 py-0.5 text-center text-mini font-bold text-white">{INFO_SOSIAL[a].label}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/** Daftar aksi yang tersedia sekarang (objek terdekat + turun motor jika sedang naik). */
function daftarAksi(st: ReturnType<typeof useGame.getState>): { nama: string; aksi: AksiId[] } | null {
  const it = cariInteraksi(st.lokasi, st.dekat, st.gedung);
  const aksi: AksiId[] = it ? it.aksi.filter((a) => aksiTampil(st, a)) : [];
  if (st.naikMotor && st.lokasi === 'dunia') {
    aksi.push('turunMotor');
    if (!st.ojol) aksi.push('narikOjol'); // ojol hanya bisa dimulai sambil naik motor
    aksi.push('klakson');
  }
  if (aksi.length === 0) return null;
  return { nama: it?.nama ?? '🛵 Motor Kamu', aksi };
}

/** Tombol aksi kanan-bawah: muncul saat pemain dekat objek interaktif / sedang naik motor. */
export function ActionButtons() {
  const s = useGame();

  // Keyboard PC: E / Spasi / Enter = aksi utama, F = naik/turun motor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Tombol yang sudah dipakai panel lain (mis. Enter di layar utama) jangan dipakai lagi
      if (e.repeat || e.defaultPrevented) return;
      const st = useGame.getState();
      if (uiTerbuka(st)) return;
      if (e.code === 'KeyH') {
        st.setHP(true);
        return;
      }
      if (e.code === 'KeyF') {
        if (st.naikMotor) tekan('turunMotor');
        else if (st.dekat === ID_MOTOR) tekan('naikMotor');
        return;
      }
      if (!['KeyE', 'Space', 'Enter'].includes(e.code)) return;
      // Dekat warga: E = ngobrol (atau kencan kalau pacar)
      const w = idWarga(st.dekat);
      if (w) {
        e.preventDefault();
        const save = ambilSave(st);
        const a = daftarAksiWarga(save, w).find((x) => cekSosial(save, x, w).boleh);
        if (a) st.lakukanSosial(a);
        return;
      }
      const d = daftarAksi(st);
      if (!d) return;
      e.preventDefault();
      const save = ambilSave(st);
      const pilihan = d.aksi.find((a) => cekAksi(save, a).boleh) ?? d.aksi[0];
      tekan(pilihan);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const w = idWarga(s.dekat);
  if (w) return <TombolWarga id={w} />;
  const d = daftarAksi(s);
  if (!d || uiTerbuka(s)) return null;
  const save = ambilSave(s);

  return (
    <div className="safe-x pointer-events-none absolute right-0 bottom-0">
      <div className="flex flex-col items-end gap-2 p-4">
        <div className="rounded-xl bg-white/90 px-3 py-1 text-sm font-extrabold text-teks shadow-sm ring-1 ring-black/5">{d.nama}</div>
        <div className="flex items-end gap-3">
          {d.aksi
            .map((id, i) => ({ id, i, def: AKSI[id], cek: cekAksi(save, id) }))
            .reverse() // aksi utama paling kanan (dekat jempol)
            .map(({ id, i, def, cek }) => {
              const utama = i === 0;
              return (
                <div key={id} className="flex flex-col items-center gap-1">
                  <button
                    onPointerDown={() => tekan(id)}
                    // Minimalis: hanya aksi UTAMA berwarna oranye; aksi lain putih. Belum bisa = abu (tetap bisa ditekan → alasan)
                    className={`pointer-events-auto grid touch-none place-items-center rounded-full shadow-md transition-transform active:scale-95 ${
                      utama ? 'h-20 w-20 text-4xl' : 'h-16 w-16 text-3xl'
                    } ${!cek.boleh ? 'bg-stone-300/90 opacity-70' : utama ? 'bg-aksen shadow-tombol' : 'bg-white/95 ring-1 ring-black/5'}`}
                    aria-label={def.label}
                  >
                    {def.ikon}
                  </button>
                  <span className="rounded-lg bg-stone-900/60 px-2 py-0.5 text-mini font-bold text-white">{def.label}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
