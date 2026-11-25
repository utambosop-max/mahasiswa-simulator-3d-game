// Tombol darurat 🆘: muncul otomatis saat pemain terdeteksi nyangkut (joystick ditekan tapi tidak bergerak).
import { useEffect } from 'react';
import { useGame } from '../game/store';

export function TombolNyangkut() {
  const nyangkut = useGame((s) => s.nyangkut);
  // Sembunyikan lagi setelah 8 detik jika tidak dipakai (mungkin cuma menabrak tembok sebentar)
  useEffect(() => {
    if (!nyangkut) return;
    const t = setTimeout(() => useGame.getState().setNyangkut(false), 8000);
    return () => clearTimeout(t);
  }, [nyangkut]);
  if (!nyangkut) return null;
  return (
    <button
      onPointerDown={() => useGame.getState().lepasNyangkut()}
      className="safe-x anim-datang absolute bottom-[11.5rem] left-4 z-30 min-h-14 rounded-2xl bg-rose-500 px-4 text-base font-extrabold text-white shadow-sm active:scale-[0.98]"
    >
      🆘 Nyangkut? Ketuk di sini
    </button>
  );
}
