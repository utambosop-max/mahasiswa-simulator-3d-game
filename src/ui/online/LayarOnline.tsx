// Layar "Main Bareng": isi nama, pilih warna baju, alamat server → pilih kamar → masuk.
import { useState } from 'react';
import onlineJson from '../../data/online.json';
import { useOnline } from '../../online/onlineStore';
import { gabung, mulaiSambung } from '../../online/klien';
import { tutup } from '../../online/net';
import { BAL, formatRupiah } from '../../game/sim';
import { sfxPop } from '../../audio/sfx';
import { useGame } from '../../game/store';

const TOMBOL = 'min-h-14 rounded-2xl px-6 text-lg font-extrabold text-white active:scale-[0.98] touch-none';
const INPUT =
  'h-14 w-full rounded-2xl bg-white px-4 text-lg font-extrabold text-teks shadow-inner outline-none focus:border-orange-300';

export function LayarOnline() {
  const o = useOnline();
  const profil = useGame((s) => s.profil);
  // Nama & warna baju bawaan dari karakter offline (bisa diganti)
  const [nama, setNama] = useState(o.nama || profil?.nama || '');
  const [warna, setWarna] = useState(o.warna || profil?.baju || onlineJson.warna[0]);
  const [alamat, setAlamat] = useState(o.alamat);
  const [kode, setKode] = useState(o.kode);

  const kembali = () => {
    sfxPop();
    tutup();
    useOnline.setState({ layarOnline: false, status: 'mati', lobi: null, galat: null });
  };
  const sambung = () => {
    sfxPop();
    if (!nama.trim()) return useOnline.setState({ galat: 'Isi nama dulu ya!' });
    if (!alamat.trim()) return useOnline.setState({ galat: 'Isi alamat server (lihat jendela server di PC).' });
    void mulaiSambung(alamat.trim(), nama.trim(), warna, kode.trim());
  };

  return (
    <div className="safe-x absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-sky-100/90 via-amber-50/90 to-orange-100/95 text-teks">
      <div className="flex max-h-[94%] w-[min(92%,760px)] flex-col gap-3 overflow-y-auto rounded-3xl bg-hp-layar p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-black text-orange-600">🌐 Main Bareng Teman</h2>
          <button className={`${TOMBOL} bg-stone-400 shadow-sm`} onClick={kembali}>
            ← Kembali
          </button>
        </div>

        {o.status === 'lobi' && o.lobi ? (
          <PilihKamar />
        ) : (
          <div className="grid gap-4 min-[540px]:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-extrabold">👤 Nama kamu (maks 12 huruf)</label>
              <input className={INPUT} value={nama} maxLength={12} onChange={(e) => setNama(e.target.value)} placeholder="mis. Budi" />
              <label className="mt-1 text-sm font-extrabold">👕 Warna baju</label>
              <div className="flex flex-wrap gap-2">
                {onlineJson.warna.map((w, i) => (
                  <button
                    key={w}
                    aria-label={onlineJson.namaWarna[i]}
                    onClick={() => setWarna(w)}
                    className={`h-14 w-14 rounded-full border-4 shadow-sm ${warna === w ? 'scale-110 border-amber-900' : 'border-white'}`}
                    style={{ backgroundColor: w }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-extrabold">🖥️ Alamat server</label>
              <input
                className={INPUT}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="mis. abc-xyz.trycloudflare.com"
                inputMode="url"
              />
              <label className="text-sm font-extrabold">🔑 Kode rahasia server</label>
              <input className={INPUT} value={kode} maxLength={32} onChange={(e) => setKode(e.target.value)} placeholder="tanya ke pemilik server" />
              <p className="text-mini font-bold leading-snug opacity-75">
                🌐 Dari mana saja: isi link online dari jendela server di PC (🌍 https://....trycloudflare.com). 📶 Satu WiFi: isi alamat 192.168.x.x:8787.
              </p>
              <button
                className={`${TOMBOL} mt-auto bg-aksen text-teks! shadow-tombol disabled:opacity-60`}
                disabled={o.status === 'menyambung'}
                onClick={sambung}
              >
                {o.status === 'menyambung' ? '⏳ Menyambung...' : '🔌 Sambung'}
              </button>
            </div>
          </div>
        )}

        {o.galat && <p className="rounded-2xl bg-rose-100 px-4 py-2 text-center font-extrabold text-rose-700">⚠️ {o.galat}</p>}
      </div>
    </div>
  );
}

/** Langkah 2: pemain lama langsung masuk; pemain baru memilih kamar sendiri atau sekamar dengan teman. */
function PilihKamar() {
  const o = useOnline();
  const lobi = o.lobi;
  if (!lobi) return null;
  const masuk = (sekamar: string | null) => {
    sfxPop();
    gabung(sekamar);
  };
  if (lobi.dikenal) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-xl font-extrabold">👋 Selamat datang lagi, {o.nama}!</p>
        <p className="font-bold opacity-80">Progresmu tersimpan di server. Lanjutkan dari terakhir kali.</p>
        <button className={`${TOMBOL} bg-aksen text-teks! shadow-tombol`} onClick={() => masuk(null)}>
          ▶️ Masuk
        </button>
      </div>
    );
  }
  const patungan = formatRupiah(BAL.bulanan.biayaKos * BAL.online.kamarBerdua.pengaliKos);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-center font-extrabold">🏠 Pilih kamar di Kos Melati:</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          className="flex flex-col items-start gap-1 rounded-2xl bg-white p-4 text-left shadow-sm active:scale-[0.98]"
          onClick={() => masuk(null)}
        >
          <span className="text-lg font-extrabold">🚪 Kamar sendiri</span>
          <span className="text-sm font-semibold">• Perabot & upgrade milikmu sendiri</span>
          <span className="text-sm font-semibold">• Kos penuh {formatRupiah(BAL.bulanan.biayaKos)}/bulan</span>
          <span className="text-sm font-semibold">• Bebas, tenang, privasi terjaga</span>
        </button>
        <div className="flex flex-col gap-2 rounded-2xl bg-emerald-50 p-4 shadow-sm">
          <span className="text-lg font-extrabold">🛏️ Sekamar berdua</span>
          <span className="text-sm font-semibold">• Kos patungan: cuma {patungan}/bulan</span>
          <span className="text-sm font-semibold">• Upgrade perabot dipakai berdua</span>
          <span className="text-sm font-semibold">• Belajar & tidur bareng di kamar = bonus</span>
          {lobi.kamarTersedia.length === 0 ? (
            <span className="text-sm font-bold text-teks-2">Belum ada teman yang kamarnya kosong satu.</span>
          ) : (
            lobi.kamarTersedia.map((k) => (
              <button
                key={k.kamarId}
                className={`${TOMBOL} bg-emerald-500 text-base shadow-sm`}
                onClick={() => masuk(k.kamarId)}
              >
                Sekamar dengan {k.penghuni}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
