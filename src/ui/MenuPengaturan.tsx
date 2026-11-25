// Isi aplikasi "⚙️ Pengaturan" di HP (rombak-ui §3.7). Tombol ⚙️ HUD / setMenu(true) membuka HP langsung ke sini.
// Dua kolom di HP lebar (≥ 52rem), satu kolom di layar pendek. Reset tetap butuh konfirmasi 2 langkah.
import { useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '../game/store';
import { isMuted, setMuted, sfxPop } from '../audio/sfx';
import { keluarOnline } from '../online/klien';
import type { Grafik } from '../game/grafik';
import { getarNyala, setGetar } from '../game/getar';
import { setSuasana, suasanaNyala } from '../audio/ambience';
import { bacaTeksBesar, terapkanTeksBesar } from '../game/pengaturan';
import { bacaKurangiAnimasi, terapkanKurangiAnimasi } from './kurangiAnimasi';
import { Ket, Pilihan, Saklar, Tombol } from './kit';

const Judul = ({ children }: { children: ReactNode }) => <p className="mt-1 mb-0.5 px-1 text-mini font-black tracking-wide text-teks-2 uppercase">{children}</p>;

export function IsiPengaturan() {
  const { reset, grafik, setGrafik, online, setHP } = useGame(useShallow(({ reset, grafik, setGrafik, online, setHP }) => ({ reset, grafik, setGrafik, online, setHP })));
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [bisu, setBisu] = useState(isMuted());
  const [getarOn, setGetarOn] = useState(getarNyala());
  const [suasana, setSuasanaOn] = useState(suasanaNyala());
  const [teksBesar, setTeksBesar] = useState(bacaTeksBesar());
  const [kurangi, setKurangi] = useState(bacaKurangiAnimasi());

  if (konfirmasi) {
    return (
      <div className="flex flex-col gap-3 py-4 text-center">
        <p className="text-judul font-black text-bahaya-teks">Hapus semua progres?</p>
        <Ket className="text-center">Uang, IPK, kamar, teman — semuanya kembali ke awal. Tidak bisa dibatalkan.</Ket>
        <div className="grid grid-cols-2 gap-2">
          <Tombol varian="biasa" className="justify-center" onTekan={() => setKonfirmasi(false)}>
            Batal
          </Tombol>
          <Tombol
            varian="bahaya"
            className="justify-center"
            onTekan={() => {
              setKonfirmasi(false);
              setHP(false);
              reset();
            }}
          >
            Ya, hapus
          </Tombol>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Ket className="px-1">{online ? '🌐 Main online — progres tersimpan di server PC' : '💾 Progres tersimpan otomatis'}</Ket>
      <div className="grid gap-x-3 gap-y-2 @[52rem]:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Judul>Suara</Judul>
          <Saklar
            ikon="🔊"
            label="Efek suara"
            nyala={!bisu}
            onUbah={() => {
              setMuted(!bisu);
              setBisu(!bisu);
              if (bisu) sfxPop(); // bunyi konfirmasi saat suara dinyalakan
            }}
          />
          <Saklar
            ikon="🐦"
            label="Suasana"
            ket="Burung pagi, jangkrik malam, hujan"
            nyala={suasana}
            onUbah={() => {
              setSuasana(!suasana);
              setSuasanaOn(!suasana);
              sfxPop();
            }}
          />
          <Saklar
            ikon="📳"
            label="Getar"
            nyala={getarOn}
            onUbah={() => {
              setGetar(!getarOn);
              setGetarOn(!getarOn);
              sfxPop();
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Judul>Tampilan</Judul>
          <Pilihan<Grafik>
            opsi={[
              { id: 'hemat', label: '🔋 Hemat' },
              { id: 'tinggi', label: '✨ Bagus' },
              { id: 'ultra', label: '💎 Ultra' },
            ]}
            nilai={grafik}
            onPilih={(g) => {
              setGrafik(g);
              sfxPop();
            }}
          />
          <Ket className="px-1">{grafik === 'hemat' ? 'Tanpa bayangan — paling ringan untuk HP.' : grafik === 'ultra' ? 'Bayangan paling halus — untuk HP/PC kencang.' : 'Seimbang antara cantik & lancar.'}</Ket>
          <Saklar
            ikon="🔠"
            label="Teks besar"
            nyala={teksBesar}
            onUbah={() => {
              terapkanTeksBesar(!teksBesar);
              setTeksBesar(!teksBesar);
              sfxPop();
            }}
          />
          <Saklar
            ikon="🎞️"
            label="Kurangi animasi"
            ket="Tanpa geser, goyang, & membal"
            nyala={kurangi}
            onUbah={() => {
              terapkanKurangiAnimasi(!kurangi);
              setKurangi(!kurangi);
              sfxPop();
            }}
          />
        </div>
      </div>

      <Judul>Lainnya</Judul>
      <div className="grid grid-cols-2 gap-2 @[52rem]:grid-cols-4">
        <Tombol
          varian="biasa"
          onTekan={() => {
            setHP(false);
            useGame.getState().lepasNyangkut();
          }}
        >
          🆘 Saya nyangkut
        </Tombol>
        {!online && (
          <Tombol
            varian="biasa"
            onTekan={() => {
              sfxPop();
              setHP(false);
              useGame.setState({ buatKarakter: true });
            }}
          >
            🧑‍🎓 Ubah karakter
          </Tombol>
        )}
        {!online && (
          <Tombol
            varian="biasa"
            onTekan={() => {
              sfxPop();
              setHP(false);
              useGame.setState({ pembuka: true }); // putar ulang animasi pembuka
            }}
          >
            🎬 Tonton ulang pembuka
          </Tombol>
        )}
        {online ? (
          // Online: progres disimpan di server → tidak ada reset, cukup keluar (kembali ke save offline)
          <Tombol
            varian="bahaya"
            onTekan={() => {
              setHP(false);
              keluarOnline();
            }}
          >
            🚪 Keluar dari online
          </Tombol>
        ) : (
          <Tombol varian="bahaya" onTekan={() => setKonfirmasi(true)}>
            🗑️ Reset data
          </Tombol>
        )}
      </div>
    </div>
  );
}
