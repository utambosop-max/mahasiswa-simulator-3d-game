// HP dalam game (tema "HP mahasiswa", docs/GDD/rombak-ui.md): satu pintu semua informasi & layanan jarak jauh.
// Struktur: BingkaiHP (casing + status bar) → layar utama (widget + ikon aplikasi) ATAU layar aplikasi
// (header ‹ judul ✕ + sub-tab TabPil + isi Tab* lama). Aplikasi aktif disimpan di store (`hpApp`) supaya
// tombol lain (⚙️ HUD, Kembali Android) bisa membuka/menutup langsung.
import { useEffect, useState } from 'react';
import { useGame } from '../../game/store';
import { useOnline } from '../../online/onlineStore';
import { formatRupiah } from '../../game/sim';
import { sfxSalah } from '../../audio/sfx';
import { TabProfil, TabStatistik, TabPeringkat } from './TabProfil';
import { TabMisi, TabPencapaian } from './TabProgres';
import { TabBukuSakti } from './TabBukuSakti';
import { TabDompet, TabTas } from './TabDompet';
import { TabJadwal, TabRapor } from './TabAkademik';
import { TabKampus } from './TabKampus';
import { TabMedsos, TabTeman } from './TabSosial';
import { TabKalender, TabUang } from './TabUang';
import { TabBeasiswa, TabKos, TabWarga } from './TabKos';
import { IsiBank, IsiKarier, IsiKHS } from '../PanelTempat';
import { IsiPengaturan } from '../MenuPengaturan';
import { IsiPeta } from '../peta/PetaBesar';
import { Chip, Kartu, Ket, TabPil, Tombol, TombolKembali, TombolTutup } from '../kit';
import { BingkaiHP } from './BingkaiHP';
import { HomeHP } from './HomeHP';
import { DaftarNotif } from './NotifHP';
import { ALASAN_ONLINE, cariApp } from './daftarApp';
import { useUiHP } from './uiHP';

/** Tab "Foto" di Galeri: pintasan mode foto (📷 di baris alat tetap jadi jalan utama) */
function TabFoto() {
  return (
    <Kartu judul="📷 Mode foto">
      <Ket>HUD & tombol disembunyikan biar dunia bersih buat difoto. Pose dulu, jangan lupa senyum (walau tanggal tua).</Ket>
      <Tombol
        onTekan={() => {
          useGame.getState().setHP(false);
          useGame.setState({ modeFoto: true });
        }}
      >
        📷 Masuk mode foto
      </Tombol>
    </Kartu>
  );
}

/** Tab "Grup" di ChatYuk: membuka obrolan & traktir online (logika di ui/online/MenuChat) */
function TabGrup() {
  return (
    <Kartu judul="🌐 Grup online">
      <Ket>Kirim emoji, chat cepat, atau traktir teman yang lagi online bareng kamu.</Ket>
      <Tombol
        onTekan={() => {
          useGame.getState().setHP(false);
          useOnline.setState({ chatTerbuka: true });
        }}
      >
        💬 Buka obrolan & traktir
      </Tombol>
    </Kartu>
  );
}

/** Isi tiap sub-tab (komponen lama dipakai ulang) */
function IsiTab({ id }: { id: string }) {
  switch (id) {
    case 'buku':
      return <TabBukuSakti />;
    case 'misi':
      return <TabMisi />;
    case 'kalender':
      return <TabKalender />;
    case 'jadwal':
      return <TabJadwal />;
    case 'kampus':
      return <TabKampus />;
    case 'khs':
      return <IsiKHS />;
    case 'rapor':
      return <TabRapor />;
    case 'beasiswa':
      return <TabBeasiswa />;
    case 'karier':
      return <IsiKarier />;
    case 'dompet':
      return <TabDompet />;
    case 'bank':
      return <IsiBank />;
    case 'uang':
      return <TabUang />;
    case 'tas':
      return <TabTas />;
    case 'pesan':
      return <DaftarNotif />;
    case 'medsos':
      return <TabMedsos />;
    case 'teman':
      return <TabTeman />;
    case 'warga':
      return <TabWarga />;
    case 'grup':
      return <TabGrup />;
    case 'peringkat':
      return <TabPeringkat />;
    case 'profil':
      return <TabProfil />;
    case 'kos':
      return <TabKos />;
    case 'pencapaian':
      return <TabPencapaian />;
    case 'statistik':
      return <TabStatistik />;
    case 'foto':
      return <TabFoto />;
    case 'pengaturan':
      return <IsiPengaturan />;
    case 'peta':
      return <IsiPeta />;
    default:
      return null;
  }
}

export function HPMenu() {
  const buka = useGame((s) => s.hpTerbuka);
  const appId = useGame((s) => s.hpApp);
  const setHP = useGame((s) => s.setHP);
  const uang = useGame((s) => s.uang);
  const misiBelum = useGame((s) => (s.misi.hari === s.hari ? s.misi.daftar.filter((m) => !m.klaim).length : 3));
  const jumlahHalaman = useGame((s) => Object.keys(s.cerita.bab).length);
  const online = useOnline((s) => s.status === 'main');
  const { bukuDilihat, tandaiBuku, riwayatTerbuka, setRiwayat } = useUiHP();
  // Sub-tab terakhir per aplikasi (kembali ke situ saat aplikasi dibuka lagi)
  const [pilihan, setPilihan] = useState<Record<string, string>>({});

  const keHome = () => {
    setRiwayat(false);
    useGame.setState({ hpApp: null });
  };
  const tutup = () => {
    setRiwayat(false);
    setHP(false);
  };

  // Esc (PC) = kembali satu tingkat: daftar notif → aplikasi → layar utama → tutup HP
  useEffect(() => {
    if (!buka) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return;
      const ui = useUiHP.getState();
      if (ui.riwayatTerbuka) ui.setRiwayat(false);
      else if (useGame.getState().hpApp) useGame.setState({ hpApp: null });
      else useGame.getState().setHP(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buka]);

  // Membuka Buku Sakti = halaman baru sudah dilihat (badge "Baru" hilang)
  useEffect(() => {
    if (buka && appId === 'buku' && jumlahHalaman !== bukuDilihat) tandaiBuku(jumlahHalaman);
  }, [buka, appId, jumlahHalaman, bukuDilihat, tandaiBuku]);

  if (!buka) return null;
  const app = cariApp(appId);

  // ===== Layar utama / daftar notifikasi =====
  if (!app) {
    return (
      <BingkaiHP onTutup={tutup} onBeranda={keHome}>
        {riwayatTerbuka ? (
          <div className="anim-app-buka flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 px-3 pb-2">
              <TombolKembali onTekan={() => setRiwayat(false)} />
              <h2 className="min-w-0 flex-1 truncate text-judul font-black">🔔 Notifikasi</h2>
              <TombolTutup onTekan={tutup} label="Tutup HP" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
              <DaftarNotif />
            </div>
          </div>
        ) : (
          <HomeHP
            onBuka={(id) => useGame.setState({ hpApp: id })}
            onTutup={tutup}
            onNotif={() => setRiwayat(true)}
            badge={{ todo: misiBelum }}
            baru={{ buku: jumlahHalaman > bukuDilihat }}
          />
        )}
      </BingkaiHP>
    );
  }

  // ===== Layar aplikasi =====
  const tabTerkunci = (t: { online?: boolean }) => !!t.online && !online;
  const tab = app.tab.find((t) => t.id === pilihan[app.id]) ?? app.tab[0];
  const terkunci = tabTerkunci(tab);
  const penuh = app.id === 'peta'; // peta memakai tinggi penuh tanpa gulir

  return (
    <BingkaiHP onTutup={tutup} onBeranda={keHome}>
      <div key={app.id} className="anim-app-buka flex min-h-0 flex-1 flex-col">
        {/* Header aplikasi: ‹ kiri (jempol kiri) · judul berwarna ikon · ✕ kanan (jempol kanan) */}
        <div className="mx-2 flex shrink-0 items-center gap-2 rounded-kartu px-1.5 py-1" style={{ backgroundColor: app.warna }}>
          <TombolKembali onTekan={keHome} label="Kembali ke layar utama" />
          <h2 className="min-w-0 flex-1 truncate text-judul font-black">
            {app.ikon} {app.judul}
          </h2>
          {(app.id === 'bank' || app.id === 'tas') && <span className="hidden @min-[25rem]:inline-flex"><Chip>💰 {formatRupiah(uang)}</Chip></span>}
          <TombolTutup onTekan={tutup} label="Tutup HP" />
        </div>
        {app.tab.length > 1 && (
          <div className="shrink-0 px-3 pt-2">
            <TabPil
              tab={app.tab.map((t) => ({
                id: t.id,
                ikon: tabTerkunci(t) ? '🔒' : t.ikon,
                nama: t.nama,
                titik: t.id === 'misi' && misiBelum > 0,
              }))}
              aktif={tab.id}
              onPilih={(id) => {
                const t = app.tab.find((x) => x.id === id);
                if (t && tabTerkunci(t)) {
                  // Terkunci: tetap bisa ditekan → jelaskan alasan & cara membuka
                  sfxSalah();
                  useGame.getState().toast(ALASAN_ONLINE[id] ?? 'Belum bisa dibuka');
                  return;
                }
                setPilihan((p) => ({ ...p, [app.id]: id }));
              }}
            />
          </div>
        )}
        <div key={tab.id} className={`@container min-h-0 flex-1 px-3 pt-1.5 pb-2 ${penuh ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'}`}>
          {terkunci ? <Ket>{ALASAN_ONLINE[tab.id]}</Ket> : <IsiTab id={tab.id} />}
        </div>
      </div>
    </BingkaiHP>
  );
}
