import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { BAL, LABEL_FASE, cuacaHari, formatRupiah, isTanggalTua, namaHari, teksJam, ujianAktif } from '../game/sim';
import { statusBadan } from '../game/fitur';
import { kosDari } from '../game/m11';
import { BANGUNAN } from '../game/duniaLayout';
import { getar } from '../game/getar';
import { sfxPop } from '../audio/sfx';
import { Speedometer } from './Speedometer';

// HUD ramping (rombak-ui §3.1): pita putih tipis, maks. 1 baris tombol 56 px → ≤ 15% tinggi layar di 412 px.
// Info tambahan (tanggal tua, bensin, ujian, kondisi badan) jadi chip ikon maks. 3 di baris kedua pita kalender.
const PITA = 'rounded-tombol bg-white/90 text-teks shadow-tipis ring-1 ring-hp-casing/10';
const IKON_BTN = `${PITA} pointer-events-auto relative grid h-[var(--hud-h,3.5rem)] w-[var(--hud-h,3.5rem)] shrink-0 place-items-center text-2xl active:scale-95`;

/** Indikator berbatang (energi/stres): ikon + bar + angka (tidak bergantung warna saja) */
function Bar({ ikon, nilai, kritis, warna, label }: { ikon: string; nilai: number; kritis: boolean; warna: string; label: string }) {
  return (
    <div className={`flex items-center gap-1 ${kritis ? 'text-bahaya-teks' : ''}`} aria-label={`${label} ${nilai}${kritis ? ', kritis' : ''}`}>
      <span className={kritis ? 'animate-pulse' : ''}>{ikon}</span>
      <div className="h-2 w-10 overflow-hidden rounded-full bg-hp-casing/10">
        <div className={`h-full rounded-full transition-all duration-500 ${kritis ? 'bg-stat-bahaya' : warna}`} style={{ width: `${nilai}%` }} />
      </div>
      <span className="w-6 text-right text-ket tabular-nums">{nilai}</span>
    </div>
  );
}

type ChipInfo = { ikon: string; teks: string; bahaya?: boolean };

/** HUD atas: kalender (+ chip info), 4 indikator dalam satu pita, tombol HP (badge notif) & pengaturan. */
export function HUD() {
  const s = useGame();
  const { uang, ipk, energi, stres, hari, tanggal, fase, lokasi } = s;
  const tua = isTanggalTua(tanggal);
  const cuaca = cuacaHari(hari);
  const badan = statusBadan(s);
  const ujian = ujianAktif(s);
  const motor = s.naikMotor && lokasi === 'dunia';
  const misiBelum = s.misi.hari === hari ? s.misi.daftar.filter((m) => !m.klaim).length : 3;
  // Badge 📱 = notifikasi belum dibaca (+ misi belum diklaim bila belum ada notif)
  const badge = s.notifBaru > 0 ? s.notifBaru : misiBelum;
  const tempat =
    lokasi === 'kamar'
      ? `${kosDari(s).ikon} ${kosDari(s).nama}`
      : lokasi === 'gedung'
        ? `🚪 ${BANGUNAN.find((b) => b.id === s.gedung)?.jenis === 'rumah' ? 'Rumah Warga' : (BANGUNAN.find((b) => b.id === s.gedung)?.nama ?? 'Gedung')}`
        : '🗺️ Kampung';

  // Chip info tambahan — prioritas: ujian, bensin, tanggal tua, badan (maks. 3)
  const chip: ChipInfo[] = [];
  if (ujian) chip.push({ ikon: '📝', teks: `${ujian.nama} sedang berlangsung!`, bahaya: true });
  if (motor) chip.push({ ikon: '⛽', teks: `Bensin ${Math.round(s.bensin)}%`, bahaya: s.bensin < 15 });
  if (tua) chip.push({ ikon: '😱', teks: 'Tanggal tua — uang kiriman masih lama, hemat!', bahaya: true });
  badan.forEach((b) => chip.push({ ikon: b.ikon, teks: b.teks, bahaya: true }));
  const chipTampil = chip.slice(0, 3);

  // Notif baru → ikon 📱 goyang sekali + getar 10 ms
  const [goyang, setGoyang] = useState(0);
  const notifTadi = useRef(s.notifBaru);
  useEffect(() => {
    if (s.notifBaru > notifTadi.current) {
      setGoyang((g) => g + 1);
      getar(10);
    }
    notifTadi.current = s.notifBaru;
  }, [s.notifBaru]);

  return (
    <>
      <div className="safe-x pointer-events-none absolute inset-x-0 top-0">
        {/* pt-1 + tombol 56 px = 60 px = 14.6% dari 412 px */}
        <div className="flex items-start gap-2 px-1.5 pt-1">
          {/* Kalender & jam (ketuk → penjelasan chip) */}
          <button
            onPointerDown={() => {
              sfxPop();
              const st = useGame.getState();
              if (chip.length) chip.forEach((c) => st.toast(`${c.ikon} ${c.teks}`));
              else st.toast(`🗓️ ${LABEL_FASE[fase]} · ${tempat} · bulan ke-${s.bulan}`);
            }}
            aria-label="Kalender dan info"
            className={`${PITA} pointer-events-auto flex h-[var(--hud-h,3.5rem)] min-w-0 flex-col overflow-hidden justify-center px-3 text-left leading-tight font-extrabold`}
          >
            <span className="text-isi whitespace-nowrap">
              {namaHari(hari).slice(0, 3)}, {tanggal} · <span className="tabular-nums">{teksJam(s.menit)}</span> <span title={cuaca.nama}>{cuaca.ikon}</span>
            </span>
            {chipTampil.length > 0 ? (
              <span className="flex gap-1 pt-0.5">
                {chipTampil.map((c) => (
                  <span
                    key={c.ikon}
                    className={`rounded-full px-1.5 text-mini leading-5 ${c.bahaya ? 'bg-bahaya text-bahaya-teks' : 'bg-netral text-teks'}`}
                  >
                    {c.ikon}
                    {c.ikon === '⛽' ? ` ${Math.round(s.bensin)}%` : ''}
                  </span>
                ))}
                {chip.length > 3 && <span className="text-mini text-teks-2">+{chip.length - 3}</span>}
              </span>
            ) : (
              <span className="truncate text-mini text-teks-2">
                {LABEL_FASE[fase]} · {tempat}
              </span>
            )}
          </button>

          {/* 4 indikator utama dalam satu pita (+ speedometer saat naik motor) */}
          <div className="flex min-w-0 flex-1 justify-center">
            <div className={`${PITA} flex h-[var(--hud-h,3.5rem)] items-center gap-3 px-3 text-isi font-extrabold whitespace-nowrap`}>
              <span className={`tabular-nums ${uang < 100000 ? 'text-bahaya-teks' : ''}`} aria-label="Uang">
                💰 {formatRupiah(uang)}
              </span>
              <span className="tabular-nums" aria-label="IPK">
                🎓 {ipk.toFixed(2)}
              </span>
              <Bar ikon="⚡" label="Energi" nilai={energi} warna="bg-stat-energi" kritis={energi < BAL.ambang.energiLemas} />
              <Bar ikon="😵" label="Stres" nilai={stres} warna="bg-stat-stres" kritis={stres > BAL.ambang.stresTinggi} />
              {motor && <Speedometer />}
            </div>
          </div>

          {/* HP dalam game & pengaturan (membuka HP › Pengaturan) */}
          <button
            onPointerDown={() => {
              sfxPop();
              s.setHP(true);
            }}
            className={IKON_BTN}
            aria-label={`HP${badge > 0 ? `, ${badge} baru` : ''}`}
          >
            <span key={goyang} className={goyang ? 'anim-goyang-badge' : ''}>
              📱
            </span>
            {badge > 0 && (
              <span className="absolute -top-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full bg-[#c2381f] px-1 text-mini font-black text-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
          <button
            onPointerDown={() => {
              sfxPop();
              s.setHP(true, 'pengaturan');
            }}
            className={IKON_BTN}
            aria-label="Pengaturan"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="hint-desktop pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 rounded-xl bg-black/40 px-3 py-1 text-ket font-semibold whitespace-nowrap text-white">
        WASD jalan · E aksi · H HP{lokasi === 'dunia' ? ' · M peta' : ''} · Esc tutup
      </div>
    </>
  );
}
