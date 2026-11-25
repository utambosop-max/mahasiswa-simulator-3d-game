// Tab HP: Teman (pertemanan NPC), Medsos (posting & follower), Telepon ortu, Pesan (riwayat notifikasi).
import { useGame } from '../../game/store';
import { F2, formatRupiah, levelRelasi, slotWaktu } from '../../game/sim';
import { postingMedsos, teleponOrtu } from '../../game/fitur';
import { sfxPosting, sfxTelepon } from '../../audio/sfx';

const TEMPAT_NPC: Record<string, string> = {
  buKos: 'depan Kos Melati',
  mbakSri: 'Warteg Barokah',
  bangUdin: 'Warkop Begadang',
  pakDosen: 'Kampus (Pagi–Sore)',
  oyen: 'depan kos (kasih makanan kucing)',
};

export function TabTeman() {
  const s = useGame();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-bold opacity-75">🤝 Ngobrol 1×/hari di tempat mereka (+{F2.relasiNgobrol}). Makin akrab = makin banyak bonus!</p>
      {F2.npc.map((n) => {
        const nilai = s.relasi[n.id] ?? 0;
        const lv = levelRelasi(s, n.id);
        const sudah = s.ngobrolHari[n.id] === s.hari;
        return (
          <div key={n.id} className="flex items-center gap-3 rounded-2xl bg-white px-3 py-2">
            <span className="text-4xl">{n.ikon}</span>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">
                {n.nama} · {'❤️'.repeat(lv)}
                {'🤍'.repeat(3 - lv)} <span className="text-mini opacity-60">({nilai}/100)</span>
              </p>
              <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-pink-100">
                <div className="h-full rounded-full bg-pink-400" style={{ width: `${nilai}%` }} />
              </div>
              <p className="mt-0.5 text-mini font-bold opacity-75">
                📍 {TEMPAT_NPC[n.id]} · {sudah ? '✅ sudah ngobrol hari ini' : '💬 belum ngobrol hari ini'}
              </p>
              <p className="text-mini font-bold">
                {n.perk.map((p, i) => (
                  <span key={p} className={i < lv ? 'text-emerald-600' : 'opacity-40'}>
                    {i < lv ? '✔' : '🔒'} {p}
                    {i < 2 ? ' · ' : ''}
                  </span>
                ))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TabMedsos() {
  const s = useGame();
  const m = F2.medsos;
  const berikut = m.milestone[s.milestoneMedsos];
  const sudahPosting = s.postingSlot === slotWaktu(s);
  const sudahTelepon = s.teleponHari === s.hari;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-pink-400 to-orange-300 p-4 text-white">
        <span className="text-5xl">📸</span>
        <div className="flex-1 font-extrabold">
          <p className="text-sm opacity-90">@{(s.profil?.nama ?? 'anakkos').toLowerCase().replace(/\s+/g, '_')}_kos</p>
          <p className="text-3xl font-black">{s.follower.toLocaleString('id-ID')} follower</p>
          <p className="text-mini">
            {berikut ? `Target berikut: ${berikut} (hadiah ${formatRupiah(m.hadiahMilestone[s.milestoneMedsos])})` : 'Semua target tercapai! 🌟'} · Endorse tiap tgl 1:{' '}
            {formatRupiah(Math.floor(s.follower / 100) * m.endorsePer100)}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onPointerDown={() => {
            if (s.fitur((d) => postingMedsos(d), 'pop')) sfxPosting();
          }}
          className={`min-h-16 rounded-tombol text-lg font-extrabold active:scale-[0.98] ${sudahPosting ? 'bg-netral/60 text-teks-2' : 'bg-aksen text-teks shadow-tombol'}`}
        >
          📷 Posting Foto {sudahPosting && '(tunggu fase berikut)'}
          <div className="text-mini font-bold">1×/fase · 😵 {m.stres} · peluang viral {Math.round(m.viralPeluang * 100)}%</div>
        </button>
        <button
          onPointerDown={() => {
            if (s.fitur((d) => teleponOrtu(d), 'pop')) sfxTelepon();
          }}
          className={`min-h-16 rounded-tombol text-lg font-extrabold active:scale-[0.98] ${sudahTelepon ? 'bg-netral/60 text-teks-2' : 'bg-netral text-teks'}`}
        >
          📞 Telepon Ortu {sudahTelepon && '(besok lagi)'}
          <div className="text-mini font-bold">1×/hari · 😵 {F2.teleponOrtu.stres} · kalau tanggal tua & bokek, siapa tahu dikirimi 😉</div>
        </button>
      </div>
    </div>
  );
}

export function TabPesan() {
  const riwayat = useGame((s) => s.riwayat);
  return (
    <div className="flex flex-col gap-1.5">
      {riwayat.length === 0 && <p className="font-bold opacity-70">Belum ada pesan. Semua notifikasi akan terkumpul di sini.</p>}
      {[...riwayat].reverse().map((r, i) => (
        <div key={i} className="rounded-xl bg-white px-3 py-1.5 text-sm font-bold">
          <span className="mr-2 text-mini opacity-60">{r.waktu}</span>
          {r.teks}
        </div>
      ))}
    </div>
  );
}
