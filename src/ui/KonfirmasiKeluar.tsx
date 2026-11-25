// Konfirmasi keluar game (muncul dari tombol Kembali fisik Android saat tidak ada panel yang terbuka).
import { simpanSekarang } from '../game/store';
import { Panel, Tombol } from './kit';
import { useUiHP } from './hp/uiHP';
import { keluarAplikasi } from './tombolKembaliAndroid';

export function KonfirmasiKeluar() {
  const buka = useUiHP((s) => s.konfirmasiKeluar);
  const set = useUiHP((s) => s.setKonfirmasiKeluar);
  if (!buka) return null;
  return (
    <Panel judul="🚪 Yakin keluar?" sub="Progres sudah tersimpan." lebar="sm" onTutup={() => set(false)}>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Tombol varian="biasa" className="justify-center" onTekan={() => set(false)}>
          Main lagi
        </Tombol>
        <Tombol
          varian="bahaya"
          className="justify-center"
          onTekan={() => {
            simpanSekarang();
            set(false);
            void keluarAplikasi();
          }}
        >
          Keluar
        </Tombol>
      </div>
    </Panel>
  );
}
