// Panel online di dalam game: daftar teman + status, tombol chat, dan layar "koneksi putus".
// (Layar "sedang sibuk / tidur" dipakai bersama mode offline → lihat src/ui/OverlaySibuk.tsx)
import { useGame, uiTerbuka } from '../../game/store';
import { useOnline } from '../../online/onlineStore';
import { jawabAjakan, keluarOnline, sambungUlang } from '../../online/klien';
import type { StatusPemain } from '../../online/protokol';
import { sfxPop } from '../../audio/sfx';

export const IKON_STATUS: Record<StatusPemain, string> = {
  bebas: '🚶',
  siap: '⏳',
  tidur: '😴',
  pulang: '🚌',
  kerja: '💼',
  offline: '⚫',
};
export const LABEL_STATUS: Record<StatusPemain, string> = {
  bebas: 'jalan-jalan',
  siap: 'sedang beraksi',
  tidur: 'tidur',
  pulang: 'pulang kampung',
  kerja: 'kerja sambilan',
  offline: 'offline',
};

const TOMBOL_BULAT =
  'pointer-events-auto grid h-14 w-14 touch-none place-items-center rounded-2xl text-2xl shadow-sm active:scale-[0.98]';

export function PanelOnline() {
  const online = useGame((s) => s.online);
  if (!online) return null;
  return (
    <>
      <DaftarTeman />
      <TombolOnline />
      <DialogAjakan />
      <LayarPutus />
    </>
  );
}

/** Ajakan pacaran dari teman online: setuju / tolak. */
function DialogAjakan() {
  const ajakan = useOnline((s) => s.ajakan);
  if (!ajakan) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-redup">
      <div className="anim-datang flex max-h-[94%] w-[min(90%,460px)] overflow-y-auto flex-col items-center gap-3 rounded-3xl bg-pink-50 p-5 text-center text-teks shadow-sm">
        <div className="text-6xl">💌</div>
        <h2 className="text-2xl font-black">{ajakan.nama} ngajak pacaran!</h2>
        <p className="font-bold">"Aku suka sama kamu... mau jadi pacarku?"</p>
        <div className="flex w-full gap-3">
          <button
            onPointerDown={() => jawabAjakan(false)}
            className="min-h-14 flex-1 rounded-2xl bg-stone-400 font-extrabold text-white shadow-sm active:scale-[0.98]"
          >
            🙏 Temenan aja
          </button>
          <button
            onPointerDown={() => jawabAjakan(true)}
            className="min-h-14 flex-1 rounded-2xl bg-pink-500 font-extrabold text-white shadow-sm active:scale-[0.98]"
          >
            💘 Mau!
          </button>
        </div>
      </div>
    </div>
  );
}

/** Daftar teman kecil di kiri (di bawah kalender) beserta kegiatannya. */
function DaftarTeman() {
  const { pemain, saya } = useOnline();
  const daftar = pemain.filter((p) => p.status !== 'offline');
  return (
    <div className="safe-x pointer-events-none absolute top-[4.6rem] left-0 pl-2.5">
      <div className="flex flex-col gap-1">
        {daftar.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 rounded-xl bg-white/80 px-2 py-0.5 text-mini font-extrabold text-teks"
            title={LABEL_STATUS[p.status]}
          >
            <span className="h-3 w-3 rounded-full border border-amber-900/30" style={{ backgroundColor: p.warna }} />
            <span>{p.nama}{p.id === saya ? ' (kamu)' : ''}</span>
            <span>{IKON_STATUS[p.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tombol 💬 (chat & traktir), mudah dijangkau jempol kanan. */
function TombolOnline() {
  const g = useGame();
  // Saat sibuk/tidur chat tetap boleh dibuka
  const tertutup = uiTerbuka(g) && !g.terkunci;
  if (tertutup) return null;
  return (
    // Satu baris di atas baris alat (😄 ⏳ 📷) agar tidak bertumpuk
    <div className="safe-x pointer-events-none absolute right-[27%] bottom-[5.2rem] z-30">
      <button
        className={`${TOMBOL_BULAT} bg-white/85`}
        aria-label="Chat & traktir"
        onPointerDown={() => {
          sfxPop();
          useOnline.setState({ chatTerbuka: true });
        }}
      >
        💬
      </button>
    </div>
  );
}

function LayarPutus() {
  const status = useOnline((s) => s.status);
  const galat = useOnline((s) => s.galat);
  const ulangDalam = useOnline((s) => s.ulangDalam);
  // Status 'mati' saat masih di dalam game online (mis. sambung ulang ditolak) juga harus tetap menampilkan layar ini,
  // kalau tidak pemain terkunci tanpa tombol apa pun
  if (status !== 'putus' && status !== 'menyambung' && status !== 'mati') return null;
  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-stone-900/75 px-6 text-center text-white">
      <div className="text-5xl">📡</div>
      <p className="text-2xl font-black">{status === 'menyambung' ? 'Menyambung lagi...' : 'Koneksi ke server terputus'}</p>
      {galat ? (
        <p className="max-w-xl rounded-2xl bg-rose-100 px-4 py-2 font-extrabold text-rose-700">⚠️ {galat}</p>
      ) : (
        <p className="font-bold opacity-80">Cek WiFi, dan pastikan jendela server di PC masih terbuka.</p>
      )}
      {status === 'putus' && ulangDalam !== null && <p className="text-sm font-bold opacity-80">🔄 Mencoba menyambung lagi otomatis...</p>}
      {status !== 'menyambung' && (
        <div className="flex gap-3">
          <button
            className="min-h-14 rounded-2xl bg-stone-500 px-6 font-extrabold shadow-sm active:scale-[0.98]"
            onPointerDown={keluarOnline}
          >
            🚪 Keluar
          </button>
          <button
            className="min-h-14 rounded-tombol bg-aksen px-6 font-extrabold text-teks shadow-tombol active:scale-[0.98]"
            onPointerDown={() => void sambungUlang()}
          >
            🔄 Sambung lagi
          </button>
        </div>
      )}
    </div>
  );
}
