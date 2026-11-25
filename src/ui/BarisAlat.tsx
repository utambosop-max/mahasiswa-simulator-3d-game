// Baris alat kecil di bawah tengah (terjangkau kedua jempol): emote, putar kamera, tunggu 1 jam, mode foto.
import { useEffect, useState } from 'react';
import { useGame, uiTerbuka } from '../game/store';
import { kirimChat } from '../online/klien';
import { sfxPop } from '../audio/sfx';

// Minimalis: satu pita berisi ikon-ikon (bukan 5 kotak terpisah berbingkai tebal)
const TOMBOL = 'pointer-events-auto grid h-14 w-14 touch-none place-items-center rounded-xl text-2xl active:bg-stone-900/10 active:scale-95';
const EMOTE = [
  { jenis: 'lambai', ikon: '👋' },
  { jenis: 'lompat', ikon: '🤸' },
  { jenis: 'putar', ikon: '💃' },
] as const;

export function BarisAlat() {
  const s = useGame();
  const [emoteBuka, setEmoteBuka] = useState(false);
  if (s.layarUtama || (uiTerbuka(s) && !s.terkunci) || s.modeFoto) return null;
  return (
    <div className="safe-x pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2">
      <div className="pointer-events-auto flex items-end gap-0.5 rounded-2xl bg-white/85 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
        {emoteBuka && (
          <div className="flex gap-0.5 border-r border-stone-200 pr-1">
            {EMOTE.map((e) => (
              <button
                key={e.jenis}
                className="grid h-14 w-14 place-items-center rounded-xl text-2xl active:bg-amber-100"
                onPointerDown={() => {
                  s.setEmote(e.jenis);
                  if (s.online) kirimChat(e.ikon); // teman melihat emote di atas kepala
                  setEmoteBuka(false);
                }}
              >
                {e.ikon}
              </button>
            ))}
          </div>
        )}
        <button className={TOMBOL} aria-label="Emote" onPointerDown={() => { sfxPop(); setEmoteBuka(!emoteBuka); }}>
          😄
        </button>
        <button className={TOMBOL} aria-label="Putar kamera kiri" onPointerDown={() => s.putarKamera(-Math.PI / 4)}>
          ⟲
        </button>
        <button className={TOMBOL} aria-label="Putar kamera kanan" onPointerDown={() => s.putarKamera(Math.PI / 4)}>
          ⟳
        </button>
        {/* Tunggu 1 jam (pengganti tombol lewati fase). Zoom: cubit 2 jari / roda mouse / menu ⚙️ */}
        {!s.sibuk && (
          <button className={TOMBOL} aria-label="Tunggu 1 jam" onPointerDown={() => s.tunggu()}>
            ⏳
          </button>
        )}
        <button
          className={TOMBOL}
          aria-label="Mode foto"
          onPointerDown={() => {
            sfxPop();
            useGame.setState({ modeFoto: true });
          }}
        >
          📷
        </button>
      </div>
    </div>
  );
}

/** Saat mode foto: semua tampilan disembunyikan, hanya tombol keluar kecil. */
export function KeluarModeFoto() {
  const modeFoto = useGame((s) => s.modeFoto);
  if (!modeFoto) return null;
  return (
    <button
      onPointerDown={() => useGame.setState({ modeFoto: false })}
      className="safe-x absolute top-3 right-3 z-50 min-h-14 rounded-2xl bg-black/40 px-4 font-extrabold text-white active:scale-[0.98]"
    >
      ✕ Keluar mode foto
    </button>
  );
}

/** Kilatan putih singkat saat petir (dipicu dari ambience hujan). */
export function Kilat() {
  const kilat = useGame((s) => s.kilat);
  const luar = useGame((s) => s.lokasi === 'dunia');
  const [tampil, setTampil] = useState(false);
  useEffect(() => {
    if (kilat === 0) return;
    setTampil(true);
    const t = setTimeout(() => setTampil(false), 180);
    return () => clearTimeout(t);
  }, [kilat]);
  if (!tampil) return null;
  return <div className={`pointer-events-none absolute inset-0 z-20 ${luar ? 'bg-white/60' : 'bg-white/25'}`} />;
}
