// Tab HP M11: cari & pindah kos, daftar beasiswa, dan kontak warga (teman & pacar).
import { useGame } from '../../game/store';
import { formatRupiah, levelSkill, teksJam } from '../../game/sim';
import { BEASISWA, DAFTAR_KOS, F3, WARGA, cekBeasiswa, cekPindahKos, daftarBeasiswa, hargaKos, kosDari, levelWarga, pindahKos, relasiWarga } from '../../game/m11';

const SIFAT: Record<string, string> = { baik: '😊 Baik hati', cuek: '😎 Cuek', galak: '😠 Galak', profesional: '🧑‍💼 Profesional', tegas: '🧐 Tegas tapi adil' };

export function TabKos() {
  const s = useGame();
  const kini = kosDari(s);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white p-3 font-extrabold">
        {kini.ikon} Tinggal di {kini.nama} · {formatRupiah(hargaKos(s))}/bulan {s.tinggalBareng || s.kamarBerdua ? '(patungan)' : ''}
        <div className="text-sm opacity-75">
          Pemilik: {kini.pemilik} ({SIFAT[kini.sifat] ?? kini.sifat}) · {kini.jamMalam === null ? '🌙 Bebas 24 jam' : `🔒 Jam malam ${teksJam(kini.jamMalam)}`} · Kos bulan ini {s.kosLunas ? '✅ lunas' : '⚠️ belum dibayar'}
        </div>
      </div>
      <p className="text-sm font-bold opacity-75">
        📦 Pindah kos: bayar sewa bulan ini di kos baru + angkut barang {formatRupiah(F3.kos.biayaPindah)}. Perabot ikut dibawa. Bisa pindah lagi setelah {F3.kos.jedaPindahHari} hari.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DAFTAR_KOS.map((k) => {
          const cek = cekPindahKos(s, k.id);
          const di = k.id === s.kos;
          return (
            <div key={k.id} className={`flex flex-col gap-1 rounded-2xl border-4 p-3 ${di ? 'border-orange-400 bg-orange-50' : 'border-white bg-white'}`}>
              <p className="text-lg font-black">
                {k.ikon} {k.nama}
              </p>
              <p className="text-mini font-extrabold text-orange-600">
                {k.tipe} · {formatRupiah(k.harga)}/bulan
              </p>
              <p className="text-mini font-bold opacity-80">{k.deskripsi}</p>
              <p className="text-mini font-bold opacity-70">
                👤 {k.pemilik} ({SIFAT[k.sifat] ?? k.sifat}) · 🚿 {k.toilet === 'shower' ? 'Shower air panas' : k.toilet === 'jongkok' ? 'Kloset jongkok' : 'Kloset + ember'}
                {k.tinggalBareng ? ' · 💑 Boleh tinggal bareng' : ''}
              </p>
              {!di && (
                <button
                  onPointerDown={() => s.fitur((d) => pindahKos(d, k.id), 'upgrade')}
                  className={`mt-1 min-h-14 rounded-tombol font-extrabold active:scale-[0.98] ${cek.boleh ? 'bg-aksen text-teks shadow-tombol' : 'bg-netral/60 text-teks-2'}`}
                >
                  📦 Pindah ({formatRupiah(cek.biaya)})
                </button>
              )}
              {di && <p className="text-sm font-black text-emerald-600">🏠 Kos kamu sekarang</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TabBeasiswa() {
  const s = useGame();
  const aktif = s.beasiswa ? BEASISWA.find((b) => b.id === s.beasiswa?.id) : null;
  const lv = (id: string) => levelSkill(s, id);
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-white p-3 font-extrabold">
        {aktif ? `${aktif.ikon} Penerima ${aktif.nama}: ${formatRupiah(aktif.uang)} tiap tanggal 1. Jaga IPK ≥ ${aktif.jagaIpk.toFixed(2)}!` : '🎓 Belum menerima beasiswa. Daftar di bawah kalau memenuhi syarat.'}
        <div className="text-sm opacity-75">Maks 1 beasiswa sekaligus. IPK turun di bawah batas → beasiswa dicabut saat tanggal 1.</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BEASISWA.map((b) => {
          const cek = cekBeasiswa(s, b, lv);
          const punya = s.beasiswa?.id === b.id;
          return (
            <div key={b.id} className={`flex flex-col gap-1 rounded-2xl border-4 p-3 ${punya ? 'border-emerald-400 bg-emerald-50' : 'border-white bg-white'}`}>
              <p className="text-lg font-black">
                {b.ikon} {b.nama}
              </p>
              <p className="text-mini font-extrabold text-emerald-700">{formatRupiah(b.uang)}/bulan · jaga IPK ≥ {b.jagaIpk.toFixed(2)}</p>
              <p className="text-mini font-bold opacity-80">{b.deskripsi}</p>
              {!punya && (
                <>
                  {!cek.boleh && <p className="text-mini font-extrabold text-rose-600">{cek.alasan}</p>}
                  <button
                    onPointerDown={() => s.fitur((d) => daftarBeasiswa(d, b.id, lv), 'notif')}
                    className={`mt-1 min-h-14 rounded-tombol font-extrabold active:scale-[0.98] ${cek.boleh ? 'bg-netral text-teks' : 'bg-netral/60 text-teks-2'}`}
                  >
                    📝 Daftar
                  </button>
                </>
              )}
              {punya && <p className="text-sm font-black text-emerald-600">✅ Sedang kamu terima</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Kontak warga: tingkat pertemanan & status pacar. */
export function TabWarga() {
  const s = useGame();
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl bg-pink-50 p-3 font-extrabold">
        {s.pacar ? `💞 Pacar: ${s.pacar.nama} (sejak hari ke-${s.pacar.sejak})${s.tinggalBareng ? ' · 🏠 tinggal bareng' : ''}` : '💗 Jomblo. Akrab dengan warga (pertemanan ≥ 60) lalu nyatakan cinta!'}
        <div className="text-mini opacity-75">Dekati warga yang lewat di jalan atau kunjungi rumahnya (🏡). Ngobrol 1×/hari, kasih hadiah, ajak kencan.</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {WARGA.map((w) => {
          const r = relasiWarga(s, w.id);
          const pacar = s.pacar?.jenis === 'npc' && s.pacar.id === w.id;
          return (
            <div key={w.id} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2">
              <span className="text-3xl">{pacar ? '💞' : w.ikon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  {w.nama} <span className="text-mini opacity-70">· {w.peran}</span>
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                  <div className="h-full rounded-full bg-pink-400" style={{ width: `${r}%` }} />
                </div>
                <p className="text-mini font-bold opacity-70">
                  Lv{levelWarga(s, w.id)} · {r}/100 · suka {w.suka}
                  {w.pacar ? '' : ' · teman baik'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
