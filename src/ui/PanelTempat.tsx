// M12: panel layanan gedung baru — Bank, Pusat Karier, Toko Tani & Depot Air, Pangkas Rambut, Pos Polisi.
// Isi Bank / KHS / Lomba & Karier diekspor agar dipakai juga di tab HP (m-banking & info kampus).
// Semua tombol memanggil fungsi murni di m12.ts / fitur.ts lewat store.fitur() (suara + toast otomatis).
import { useGame, type PanelTempat as Jenis } from '../game/store';
import { F3 } from '../game/m11';
import { formatRupiah } from '../game/sim';
import { F4 } from '../game/fisika';
import {
  beliBibitCabai,
  beliEmas,
  beliGalon,
  beliToken,
  bayarPaylater,
  bikinSim,
  daftarLomba,
  daftarMatkul,
  gajiKarier,
  hargaEmasBeli,
  hargaEmasJual,
  jualEmas,
  nilaiMatkul,
  pilihKarier,
  pinjamPaylater,
  retensiMatkul,
  setorDeposito,
} from '../game/m12';
import { catRambut, potongRambut } from '../game/fitur';
import { Chip, Kartu, Ket, Panel, Tombol } from './kit';

const JUDUL: Record<Jenis, string> = {
  bank: '🏦 Bank Mahasiswa',
  karier: '🎓 Pusat Karier',
  tani: '🌱 Toko Tani & Depot Air',
  salon: '💈 Pangkas Rambut',
  polisi: '👮 Pos Polisi',
};

/** Tombol beli/aksi dengan harga di kanan */
function Beli({ label, harga, onTekan, mati }: { label: string; harga?: string; onTekan: () => void; mati?: boolean }) {
  return (
    <Tombol onTekan={onTekan} mati={mati} varian={mati ? 'biasa' : 'utama'}>
      <span className="min-w-0 flex-1">{label}</span>
      {harga && <span className="shrink-0 tabular-nums">{harga}</span>}
    </Tombol>
  );
}

const GRID3 = 'grid grid-cols-1 gap-2 sm:grid-cols-3';

export function IsiBank() {
  const s = useGame();
  const E = F4.ekonomi;
  const beli = hargaEmasBeli(s.hari);
  const jual = hargaEmasJual(s.hari);
  const totalDepo = s.deposito.reduce((a, d) => a + d.jumlah, 0);
  return (
    <div className={GRID3}>
      <Kartu judul="🪙 Emas" kanan={`${(s.emas / 10).toLocaleString('id-ID')} g`}>
        <Ket>Harga berubah tiap hari. Selisih beli–jual {E.emas.spread * 100}% → untung kalau disimpan lama.</Ket>
        <Beli label="Beli 0,1 g" harga={formatRupiah(beli)} onTekan={() => s.fitur(beliEmas, 'koin')} mati={s.uang < beli} />
        <Beli label="Jual 0,1 g" harga={formatRupiah(jual)} onTekan={() => s.fitur(jualEmas, 'koin')} mati={s.emas <= 0} />
      </Kartu>
      <Kartu judul="💰 Deposito" kanan={formatRupiah(totalDepo)}>
        <Ket>
          Bunga {(E.deposito.bungaBulanan * 100).toLocaleString('id-ID')}% per {E.deposito.tenorHari} hari. Uang dikunci sampai cair.
        </Ket>
        {s.deposito.map((d, i) => (
          <Ket key={i}>
            • {formatRupiah(d.jumlah)} — cair {Math.max(0, d.mulai + E.deposito.tenorHari - s.hari)} hari lagi
          </Ket>
        ))}
        {[100000, 500000].map((n) => (
          <Beli key={n} label="Setor" harga={formatRupiah(n)} onTekan={() => s.fitur((d) => setorDeposito(d, n), 'koin')} mati={s.uang < n} />
        ))}
      </Kartu>
      <Kartu judul="💳 Paylater" kanan={s.paylater ? 'ada tagihan' : 'bebas utang'}>
        {s.paylater ? (
          <>
            <Ket>
              Tagihan {formatRupiah(s.paylater.jumlah)}, jatuh tempo {Math.max(0, s.paylater.tempo - s.hari)} hari lagi. Telat = denda {formatRupiah(E.paylater.denda)}!
            </Ket>
            <Beli label="Lunasi" harga={formatRupiah(s.paylater.jumlah)} onTekan={() => s.fitur(bayarPaylater, 'koin')} mati={s.uang < s.paylater.jumlah} />
          </>
        ) : (
          <>
            <Ket>
              Bayar {E.paylater.tempoHari} hari lagi + bunga {E.paylater.bunga * 100}%. Pakai seperlunya ya 😬
            </Ket>
            {[200000, E.paylater.limit].map((n) => (
              <Tombol key={n} varian="biasa" onTekan={() => s.fitur((d) => pinjamPaylater(d, n), 'notif')}>
                <span className="flex-1">Pinjam</span>
                <span className="tabular-nums">{formatRupiah(n)}</span>
              </Tombol>
            ))}
          </>
        )}
      </Kartu>
    </div>
  );
}

/** KHS sementara: nilai huruf & seberapa ingat materi tiap mata kuliah (kurva lupa). */
export function IsiKHS() {
  const s = useGame();
  return (
    <Kartu judul="📋 KHS sementara" kanan={`IPK ${s.ipk.toFixed(2)} · ${s.sks} SKS`}>
      <div className="flex flex-col divide-y divide-stone-100">
        {daftarMatkul(s).map((m) => {
          const belum = !s.matkul[m]; // belum pernah kuliah/belajar matkul ini
          const n = nilaiMatkul(s, m);
          const r = Math.round(retensiMatkul(s, m) * 100);
          return (
            <div key={m} className="flex min-h-11 items-center gap-3 text-sm font-bold">
              <span className="min-w-0 flex-1 truncate">{m}</span>
              {belum ? (
                <span className="text-mini text-teks-2">belum ada nilai</span>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-mini text-teks-2" aria-label={`Ingat ${r}%`}>
                    🧠
                    <span className="h-1.5 w-12 overflow-hidden rounded-full bg-stone-200">
                      <span className={`block h-full rounded-full ${r < 50 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${r}%` }} />
                    </span>
                    <span className="w-8 tabular-nums">{r}%</span>
                  </span>
                  <span className="w-6 text-center text-base font-black">{n.huruf}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <Ket>🧠 = seberapa ingat materinya. Lama tidak belajar → makin lupa (kurva lupa Ebbinghaus).</Ket>
    </Kartu>
  );
}

/** Lomba bulanan & lowongan kerja setelah wisuda. */
export function IsiKarier() {
  const s = useGame();
  const L = F4.kampus.lomba;
  const lombaIni = s.lomba && s.lomba.bulan === s.bulan ? s.lomba : null;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Kartu judul="🏆 Lomba bulan ini" kanan={`CV ${s.cv} · Reputasi ${Math.round(s.reputasi)}`}>
        <Ket>
          {lombaIni
            ? lombaIni.selesai
              ? 'Sudah diumumkan. Sampai jumpa bulan depan!'
              : `Terdaftar ✅ Sesi ${lombaIni.skor.length}/${L.sesi} (kerjakan di meja belajar). Pengumuman tgl ${L.tanggalUmum}.`
            : `Daftar tgl ${L.tanggalBuka}–${L.tanggalTutup}. Juara 1: ${formatRupiah(L.hadiah[0])} + CV.`}
        </Ket>
        {!lombaIni && (
          <Beli label="Daftar lomba" harga={formatRupiah(L.biaya)} onTekan={() => s.fitur(daftarLomba, 'notif')} mati={s.tanggal < L.tanggalBuka || s.tanggal > L.tanggalTutup} />
        )}
      </Kartu>
      <Kartu judul="💼 Lowongan kerja" kanan={s.lulus ? 'siap melamar' : 'setelah wisuda'}>
        {s.karier ? (
          <Ket>Kamu bekerja di {F4.kampus.karier.find((k) => k.id === s.karier)?.nama}. Semangat! 💪</Ket>
        ) : (
          F4.kampus.karier.map((k) => (
            <Tombol key={k.id} onTekan={() => s.fitur((d) => pilihKarier(d, k.id), 'upgrade')} mati={!s.lulus} varian={s.lulus ? 'utama' : 'biasa'}>
              <span className="min-w-0 flex-1">
                {k.ikon} {k.nama}
                <span className="block text-mini font-semibold opacity-75">{k.ket}</span>
              </span>
              <span className="shrink-0 tabular-nums">{formatRupiah(gajiKarier(s, k.id))}</span>
            </Tombol>
          ))
        )}
        {!s.lulus && <Ket>Gaji naik kalau IPK, CV (lomba, magang), & reputasi bagus.</Ket>}
      </Kartu>
    </div>
  );
}

function IsiTani() {
  const s = useGame();
  const G = F4.galon;
  const L = F4.listrik;
  return (
    <div className={GRID3}>
      <Kartu judul="💧 Galon" kanan={`${s.galonLiter} L`}>
        <Ket>Minum di kamar biar tidak dehidrasi.</Ket>
        <Beli label="Isi ulang" harga={formatRupiah(G.harga)} onTekan={() => s.fitur(beliGalon, 'koin')} mati={s.uang < G.harga} />
      </Kartu>
      <Kartu judul="🌶️ Bibit cabai" kanan={s.cabai ? `tumbuh ${Math.round(s.cabai.tumbuh * 100)}%` : 'pot kosong'}>
        <Ket>Ditanam di pot kamar, siram tiap hari.</Ket>
        <Beli label={s.cabai ? 'Pot masih terisi' : 'Beli & tanam'} harga={formatRupiah(F4.cabai.hargaBibit)} onTekan={() => s.fitur(beliBibitCabai, 'koin')} mati={!!s.cabai || s.uang < F4.cabai.hargaBibit} />
      </Kartu>
      <Kartu judul="⚡ Token listrik" kanan={`${Math.round(s.listrikKwh)} kWh`}>
        <Ket>Lampu, kipas & laptop memakai listrik. Habis = mati lampu!</Ket>
        <Beli label={`+${L.tokenKwh} kWh`} harga={formatRupiah(L.tokenHarga)} onTekan={() => s.fitur(beliToken, 'koin')} mati={s.uang < L.tokenHarga} />
      </Kartu>
    </div>
  );
}

function IsiSalon() {
  const s = useGame();
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {F3.gayaRambut.map((g) => {
          const kini = (s.profil?.gaya ?? 'pendek') === g.id;
          return (
            <Tombol key={g.id} varian={kini ? 'gelap' : 'biasa'} onTekan={() => s.fitur((d) => potongRambut(d, g.id), 'upgrade')}>
              <span className="min-w-0 flex-1 truncate">💇 {g.nama}</span>
              <span className="shrink-0 text-mini tabular-nums">{kini ? '✓ kini' : formatRupiah(g.harga)}</span>
            </Tombol>
          );
        })}
      </div>
      <Kartu judul="🎨 Cat rambut" kanan={formatRupiah(F3.hargaCatRambut)}>
        <div className="flex flex-wrap gap-2">
          {F3.warnaRambut.map((w) => (
            <button
              key={w}
              aria-label={`Cat rambut ${w}`}
              onPointerDown={() => s.fitur((d) => catRambut(d, w), 'upgrade')}
              className={`grid h-14 w-14 place-items-center rounded-2xl text-white ring-2 ${s.profil?.rambut === w ? 'ring-stone-800' : 'ring-transparent'}`}
              style={{ backgroundColor: w }}
            >
              {s.profil?.rambut === w ? '✓' : ''}
            </button>
          ))}
        </div>
      </Kartu>
    </div>
  );
}

function IsiPolisi() {
  const s = useGame();
  const L = F4.lalin;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Kartu judul="🪪 SIM C" kanan={s.punyaSim ? 'sudah punya ✓' : 'belum punya'}>
        <Ket>
          Punya SIM = denda tilang {formatRupiah(L.denda)} (tanpa SIM {formatRupiah(L.dendaTanpaSim)}). Ujian praktik rem dulu ya.
        </Ket>
        <Beli
          label={s.punyaSim ? 'SIM sudah ada' : 'Ujian praktik'}
          harga={formatRupiah(L.hargaSim)}
          mati={s.punyaSim || s.uang < L.hargaSim}
          onTekan={() => {
            // Belum bisa (sudah punya / uang kurang) → tampilkan alasannya; selain itu ujian praktik dulu
            if (s.punyaSim || s.uang < L.hargaSim) s.fitur(bikinSim);
            else useGame.setState({ panelTempat: null, miniFisika: { jenis: 'sim', aksi: null } });
          }}
        />
      </Kartu>
      <Kartu judul="🚦 Catatan tilang" kanan={`${s.stat.tilang ?? 0}×`}>
        <Ket>Pak Polisi Hendra: "Lampu merah artinya berhenti ya, Dik. Kuning juga jangan ngebut!"</Ket>
      </Kartu>
    </div>
  );
}

export function PanelTempat() {
  const jenis = useGame((s) => s.panelTempat);
  const uang = useGame((s) => s.uang);
  if (!jenis) return null;
  return (
    <Panel judul={JUDUL[jenis]} kanan={<Chip>💰 {formatRupiah(uang)}</Chip>} onTutup={() => useGame.setState({ panelTempat: null })} lebar="lg">
      {jenis === 'bank' && <IsiBank />}
      {jenis === 'karier' && (
        <div className="flex flex-col gap-2">
          <IsiKarier />
          <IsiKHS />
        </div>
      )}
      {jenis === 'tani' && <IsiTani />}
      {jenis === 'salon' && <IsiSalon />}
      {jenis === 'polisi' && <IsiPolisi />}
    </Panel>
  );
}
