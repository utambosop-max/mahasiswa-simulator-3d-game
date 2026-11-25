// Chat cepat (emoji & kalimat siap pakai — tanpa mengetik panjang di HP) + traktir teman.
import { useState } from 'react';
import onlineJson from '../../data/online.json';
import { BAL, formatRupiah } from '../../game/sim';
import { useGame } from '../../game/store';
import { useOnline } from '../../online/onlineStore';
import { ajakPacaran, kirimChat, putusOnline, traktir } from '../../online/klien';
import { sfxPop } from '../../audio/sfx';
import { poseLain } from '../../online/net';
import { playerPos } from '../../game/playerPos';
import { kencanPemain } from '../../game/m11';

// Gaya tema HP (rombak-ui): kartu putih bertoken, satu aksen, tombol lain netral
const KARTU = 'rounded-tombol bg-kartu text-teks shadow-tipis ring-1 ring-hp-casing/10 active:scale-[0.98] touch-none';
const TOMBOL_NETRAL = 'min-h-14 rounded-tombol bg-netral px-4 font-extrabold text-teks active:scale-[0.98]';

export function MenuChat() {
  const o = useOnline();
  const uang = useGame((s) => s.uang);
  const pacar = useGame((s) => s.pacar);
  const [tujuan, setTujuan] = useState<string | null>(null);
  if (!o.chatTerbuka) return null;

  const tutup = () => {
    sfxPop();
    setTujuan(null);
    useOnline.setState({ chatTerbuka: false });
  };
  const kirim = (teks: string) => {
    kirimChat(teks);
    sfxPop();
    useOnline.setState({ chatTerbuka: false });
  };
  const teman = o.pemain.filter((p) => p.id !== o.saya && p.status !== 'offline');

  return (
    <div className="safe-x absolute inset-0 z-40 flex items-center justify-center bg-redup" onPointerDown={(e) => e.target === e.currentTarget && tutup()}>
      <div className="anim-chat-masuk flex max-h-[92%] w-[min(94%,52rem)] flex-col gap-3 overflow-y-auto rounded-layar bg-hp-layar p-3 text-teks shadow-hp ring-4 ring-hp-casing">
        <div className="flex items-center justify-between">
          <h2 className="text-judul font-black">💬 ChatYuk · Grup online</h2>
          <button
            onPointerDown={tutup}
            aria-label="Tutup"
            className="grid h-14 w-14 place-items-center rounded-tombol bg-netral text-xl font-black text-teks active:scale-95"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-8 gap-2">
          {onlineJson.emoji.map((e) => (
            <button key={e} className={`${KARTU} h-14 text-3xl`} onPointerDown={() => kirim(e)}>
              {e}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {onlineJson.chatCepat.map((c) => (
            <button key={c} className={`${KARTU} min-h-14 px-2 text-sm font-extrabold`} onPointerDown={() => kirim(c)}>
              {c}
            </button>
          ))}
        </div>

        <div className="rounded-kartu bg-kartu p-3 shadow-tipis ring-1 ring-hp-casing/5">
          <p className="mb-2 font-extrabold">🎁 Traktir teman (uangmu: {formatRupiah(uang)})</p>
          {teman.length === 0 ? (
            <p className="text-ket font-bold text-teks-2">Belum ada teman yang online. Grupnya sepi kayak kos pas libur semester.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {teman.map((p) => (
                <button
                  key={p.id}
                  onPointerDown={() => {
                    sfxPop();
                    setTujuan(p.id);
                  }}
                  className={`flex min-h-14 items-center gap-2 rounded-2xl border-4 px-4 font-extrabold active:scale-[0.98] ${
                    tujuan === p.id ? 'border-aksen-tepi bg-kartu' : 'border-transparent bg-netral'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.warna }} />
                  {p.nama}
                </button>
              ))}
              {tujuan &&
                (BAL.online.traktir as number[]).map((n) => (
                  <button
                    key={n}
                    onPointerDown={() => {
                      traktir(tujuan, n);
                      useOnline.setState({ chatTerbuka: false });
                      setTujuan(null);
                    }}
                    className="min-h-14 rounded-tombol bg-aksen px-4 font-extrabold text-teks shadow-tombol active:translate-y-0.5 active:shadow-none"
                  >
                    {formatRupiah(n)}
                  </button>
                ))}
              {/* M11: pacaran dengan teman online (harus disetujui) */}
              {tujuan && pacar?.jenis === 'pemain' && pacar.id === tujuan && (
                <button
                  onPointerDown={() => {
                    const pose = poseLain.get(tujuan);
                    const st = useGame.getState();
                    const dekat = !!pose && pose.lokasi === st.lokasi && Math.hypot(pose.x - playerPos.x, pose.z - playerPos.z) < 4;
                    if (!dekat) st.toast(`💑 Samperin ${pacar.nama} dulu (jarak < 4 m) baru bisa kencan!`);
                    else st.fitur(kencanPemain, 'notif');
                    useOnline.setState({ chatTerbuka: false });
                    setTujuan(null);
                  }}
                  className={TOMBOL_NETRAL}
                >
                  💑 Kencan (Rp50.000)
                </button>
              )}
              {tujuan && pacar?.jenis === 'pemain' && pacar.id === tujuan && (
                <button
                  onPointerDown={() => {
                    putusOnline();
                    useOnline.setState({ chatTerbuka: false });
                    setTujuan(null);
                  }}
                  className={TOMBOL_NETRAL}
                >
                  💔 Putus
                </button>
              )}
              {tujuan && !pacar && !o.pemain.find((p) => p.id === tujuan)?.pacar && (
                <button
                  onPointerDown={() => {
                    ajakPacaran(tujuan);
                    useOnline.setState({ chatTerbuka: false });
                    setTujuan(null);
                  }}
                  className={TOMBOL_NETRAL}
                >
                  💘 Ajak pacaran
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
