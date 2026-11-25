// Tes keseimbangan otomatis (skill mahasiswa-life-balancer §8) — bot memainkan 1 semester (120 hari game)
// dengan 5 gaya main, memakai fungsi simulasi ASLI (sim.ts, m12.ts). Angka acak memakai seed → hasil sama tiap dijalankan.
// PENTING: fungsi aksi dipanggil dengan online=true = mode jam real-time (sama seperti store.ts).
// Jalankan (dev server harus nyala): node scripts/uji/keseimbangan.mjs
import { writeFileSync } from 'node:fs';
import { SS, bukaBrowser, cek, halaman } from './bantu.mjs';

const HARI = 120;
const browser = await bukaBrowser();
const { p, errors } = await halaman(browser);
await p.goto(process.env.URL_GAME ?? 'http://localhost:5173/', { waitUntil: 'networkidle' });

const laporan = await p.evaluate(async (HARI) => {
  const S = await import('/src/game/sim.ts');
  const M = await import('/src/game/m12.ts');

  function main(gaya, seed) {
    // Math.random dipakai di dalam simulasi (event, lomba, dll.) → ganti dengan generator ber-seed
    let s = seed >>> 0;
    const asliRandom = Math.random;
    Math.random = () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);

    let d = S.lengkapiSave({ ...S.dataAwal(), profil: { nama: 'Bot', jurusan: 'teknik', asal: 'jawa', kulit: 1, rambut: '#3b2a20', baju: '#7cc6a4', gaya: 'pendek', ultah: { tanggal: 9, bulan: 2 } } });
    const ukur = { ipk30: null, uangMin: d.uang, hariMinus: null, tglMinus: null, stresMaks: d.stres, hidrasiMin: d.hidrasi, hidrasiRendahJam: 0, energiMin: d.energi, pulangPertama: null, makan: 0, aksi: {} };
    const catat = () => {
      if (d.uang < ukur.uangMin) ukur.uangMin = d.uang;
      if (d.uang < 0 && ukur.hariMinus === null) ((ukur.hariMinus = d.hari), (ukur.tglMinus = d.tanggal), (ukur.belanjaSaatMinus = { ...d.belanjaBulan }));
      ukur.stresMaks = Math.max(ukur.stresMaks, d.stres);
      ukur.hidrasiMin = Math.min(ukur.hidrasiMin, d.hidrasi);
      ukur.energiMin = Math.min(ukur.energiMin, d.energi);
      if ((d.stat.pulangKampung ?? 0) > 0 && ukur.pulangPertama === null) ukur.pulangPertama = d.hari;
      if (d.hari > 30 && ukur.ipk30 === null) ukur.ipk30 = d.ipk;
      if (d.listrikKwh <= 0 && !ukur.listrikHabis) ukur.listrikHabis = d.hari;
    };
    // Waktu berjalan + event random (pilih opsi pertama yang mampu dibayar)
    const lanjut = (menit, jenis = null, laptop = false) => {
      const r = S.majuMenit(d, menit, jenis, laptop);
      d = r.data;
      if (r.gantiFase > 0) {
        const ev = S.pilihEvent(d, Math.random);
        if (ev) {
          d = S.catatEvent(d, ev.id);
          // Pemain irit: pilih opsi yang paling sedikit mengeluarkan uang (di antara yang mampu)
          const mampu = ev.pilihan.filter((x) => S.cekPilihan(d, x).boleh);
          const pil = (mampu.length ? mampu : ev.pilihan).reduce((a, b) => ((b.efek.uang ?? 0) > (a.efek.uang ?? 0) ? b : a));
          const u0 = d.uang;
          const h = S.jalankanPilihan(d, pil, true);
          if (d.bulan === 1) (ukur.event ??= []).push(`hari ${d.hari}: ${ev.id} → ${pil.label} (${h.data.uang - u0})`);
          d = h.data;
          if (h.tunda) d = S.majuMenit(d, h.tunda.menit, h.tunda.jenis).data;
        }
      }
      catat();
    };
    const pakai = (h) => {
      if (h.ditolak) return false;
      d = h.data;
      if (h.tunda) lanjut(h.tunda.menit, h.tunda.jenis, d.lokasi === 'kamar' && h.tunda.jenis === 'aksi');
      catat();
      return true;
    };
    // Pindah tempat (diringkas): aktivitas kamar → kamar, selain itu → di luar. Penting untuk listrik kamar.
    const DI_KAMAR = ['belajar', 'nugas', 'tidur', 'rebahan', 'masakMi', 'kerjakanLomba', 'mainGitar', 'freelance'];
    const lakukan = (id) => {
      const tujuan = DI_KAMAR.includes(id) ? 'kamar' : 'dunia';
      if (d.lokasi !== tujuan) d = { ...d, lokasi: tujuan, gedung: null };
      if (!S.cekAksi(d, id).boleh) return false;
      ukur.aksi[id] = (ukur.aksi[id] ?? 0) + 1;
      return pakai(S.jalankanAksi(d, id, true));
    };
    const makan = (tempat, id) => {
      const item = S.daftarMenu(tempat).find((m) => m.id === id);
      if (!item || !S.cekBeli(d, tempat, item).boleh) return false;
      ukur.makan++;
      return pakai(S.beliMakanan(d, tempat, id, true));
    };
    const fiturLangsung = (fn) => {
      const h = fn(d);
      if (!h.ditolak) d = h.data;
      return !h.ditolak;
    };
    // Tip realistis: maks tipMaks (Rp1.000) × pesanan benar × sisa kesabaran → pemain cekatan ± Rp5.000/shift (dulu bot memakai 12.000 = mustahil dicapai)
    const kerja = (tempat) => { const ok = pakai(S.selesaiKerja(d, tempat, { benar: 7, gagal: 1, tips: 5000 }, true)); if (ok) ukur.aksi['shift_' + tempat] = (ukur.aksi['shift_' + tempat] ?? 0) + 1; return ok; };
    let belajarTerakhir = 0; // hari terakhir bot BELAJAR (d.belajarLog ikut terisi oleh kuliah, jadi tidak bisa dipakai)
    const akhirPekan = () => S.hariMinggu(d.hari) >= 5;

    const kerjaHari = () => S.isHariKerja ? S.isHariKerja(d.hari) : (d.hari - 1) % 7 < 5;
    const jam = () => Math.floor(d.menit / 60) + 5; // jam dinding (05.00 = menit 0)

    for (let iter = 0; iter < HARI * 400 && d.hari <= HARI; iter++) {
      const sudahMakan = d.porsiFase > 0;
      // --- kebutuhan dasar (semua gaya kecuali yang sengaja abai) ---
      if (gaya !== 'begadang' && gaya !== 'pemalas' && d.hidrasi < 45) {
        if (d.galonLiter < 1 && !fiturLangsung(M.beliGalon)) {
          /* uang habis: lanjut tanpa minum */
        }
        if (fiturLangsung(M.minumAir)) continue;
      }
      // Makan: pemain biasa makan 2× sehari di jam makan (pagi & malam) + kalau lapar
      const jamMakan = (d.fase === 'pagi' || d.fase === 'malam') && !sudahMakan && gaya !== 'pemalas' && gaya !== 'begadang';
      if ((d.energi < 45 && !sudahMakan) || jamMakan) {
        let ok = false;
        if (gaya === 'pemalas') ok = lakukan('masakMi');
        else if (gaya === 'hemat') ok = makan('warteg', 'nasi_tempe');
        else ok = makan('warteg', 'nasi_telur') || makan('warkop', 'mi_rebus_telur');
        if (ok) continue;
      }
      // Kuliah hari kerja: kalau kelas belum buka, TUNGGU (seperti pemain sungguhan), jangan melakukan hal lain dulu
      const sesi = d.fase === 'pagi' || d.fase === 'siang' ? d.fase : null;
      if (gaya !== 'pemalas' && sesi && kerjaHari() && !d.hadir[sesi] && !d.kuliahLibur) {
        if (lakukan('kuliah')) continue;
        const [buka] = S.JAM.kuliah[sesi];
        if (d.menit < buka) {
          lanjut(Math.min(30, buka - d.menit));
          continue;
        }
      }
      // --- jadwal per gaya ---
      let dilakukan = false;
      if (gaya === 'begadang') {
        if (d.fase === 'malam' || d.fase === 'begadang') dilakukan = lakukan('nugas');
        else if (kerjaHari() && (d.fase === 'pagi' || d.fase === 'siang') && !d.hadir[d.fase]) dilakukan = lakukan('kuliah');
      } else if (gaya === 'pemalas') {
        if (d.fase === 'malam' && jam() >= 22) dilakukan = lakukan('tidur');
        else dilakukan = d.stres > 30 ? lakukan('rebahan') : lakukan('mainGame') || lakukan('rebahan');
      } else {
        // rajin, pekerja, hemat
        if (d.tanggal >= 5 && d.tanggal <= 6 && gaya === 'rajin' && !(d.lomba && d.lomba.bulan === d.bulan)) fiturLangsung(M.daftarLomba);
        if ((d.fase === 'malam' && jam() >= 22) || d.fase === 'begadang') dilakukan = lakukan('tidur');
        else if (kerjaHari() && (d.fase === 'pagi' || d.fase === 'siang') && !d.hadir[d.fase]) dilakukan = lakukan('kuliah');
        else if (d.stres > 65) dilakukan = lakukan('santaiTaman') || lakukan('rebahan');
        else if (gaya === 'pekerja' && akhirPekan() && (d.fase === 'pagi' || d.fase === 'siang') && d.energi > 35 && lakukan('bantuPanen')) dilakukan = true; // M13: kerja sampingan akhir pekan
        else if (gaya === 'pekerja' && d.fase === 'sore' && d.energi > 35) dilakukan = kerja('warteg');
        else if (gaya === 'pekerja' && d.fase === 'malam' && d.energi > 35 && jam() < 20) dilakukan = kerja('warkop');
        else if (gaya === 'rajin' && M.lombaBisaDikerjakan(d) && d.energi > 40) dilakukan = lakukan('kerjakanLomba');
        else if (gaya === 'standar') {
          // Definisi checklist skill §8: 2 kuliah + 1 belajar per HARI KERJA, sisanya santai
          if (kerjaHari() && d.fase === 'sore' && belajarTerakhir !== d.hari && (dilakukan = lakukan('belajar'))) belajarTerakhir = d.hari;
          // M13: akhir pekan pagi → mancing di kali (aksi area baru ikut teruji)
          if (!dilakukan && akhirPekan() && d.fase === 'pagi') dilakukan = lakukan('mancing');
          if (!dilakukan) dilakukan = d.stres > 30 ? lakukan('santaiTaman') || lakukan('rebahan') : lakukan('rebahan');
        }
        else if (gaya === 'hemat') {
          if (d.fase === 'siang' && !sudahMakan) dilakukan = makan('minimarket', 'roti');
          if (!dilakukan) dilakukan = d.energi > 30 ? lakukan('belajar') : lakukan('rebahan');
        } else if (d.energi > 30) dilakukan = d.fase === 'sore' && !kerjaHari() ? lakukan('mainFutsal') || lakukan('belajar') : lakukan('belajar');
        else dilakukan = lakukan('rebahan');
      }
      if (!dilakukan) lanjut(30);
    }
    Math.random = asliRandom;
    return {
      gaya,
      hari: d.hari,
      ipk30: ukur.ipk30,
      ipk: d.ipk,
      uang: d.uang,
      uangMin: ukur.uangMin,
      hariMinus: ukur.hariMinus,
      tglMinus: ukur.tglMinus,
      stresMaks: ukur.stresMaks,
      pulang: d.stat.pulangKampung ?? 0,
      pulangPertama: ukur.pulangPertama,
      bolos: d.stat.bolos ?? 0,
      hidrasiMin: Math.round(ukur.hidrasiMin),
      energiMin: ukur.energiMin,
      listrik: Math.round(d.listrikKwh * 10) / 10,
      hariListrikHabis: ukur.listrikHabis,
      belanjaSaatMinus: ukur.belanjaSaatMinus ?? null,
      eventBulan1: ukur.event ?? [],
      lombaJuara: d.stat.juaraLomba ?? 0,
      kebugaran: d.kebugaran,
      aksi: ukur.aksi,
    };
  }

  // Cek statis: aksi 0 waktu tidak boleh menaikkan IPK (skill §5.1)
  const nolWaktuIpk = Object.entries(S.AKSI)
    .filter(([, a]) => (a.majuFase ?? 0) === 0 && !a.durasiJam && (a.efek?.ipk ?? 0) > 0)
    .map(([id]) => id);

  return { hasil: ['standar', 'rajin', 'pemalas', 'pekerja', 'begadang', 'hemat'].map((g, i) => main(g, 1000 + i)), nolWaktuIpk };
}, HARI);

// ===== Tabel ringkas =====
const rp = (n) => `${n < 0 ? '−' : ''}${Math.round(Math.abs(n) / 1000)}rb`;
console.log('\nGaya      IPK30  IPK120  Uang akhir  Uang min  Minus(tgl)  Stres maks  Pulang(hari1st)  Bolos  Hidrasi min  Listrik  Juara');
for (const h of laporan.hasil) {
  console.log(
    [
      h.gaya.padEnd(9),
      String(h.ipk30?.toFixed(2) ?? '-').padStart(5),
      h.ipk.toFixed(2).padStart(7),
      rp(h.uang).padStart(11),
      rp(h.uangMin).padStart(9),
      String(h.hariMinus ? `${h.hariMinus}(${h.tglMinus})` : '-').padStart(11),
      String(h.stresMaks).padStart(11),
      `${h.pulang}(${h.pulangPertama ?? '-'})`.padStart(16),
      String(h.bolos).padStart(6),
      String(h.hidrasiMin).padStart(12),
      String(h.listrik).padStart(8),
      String(h.lombaJuara).padStart(6),
    ].join(' '),
  );
}
writeFileSync(SS + 'keseimbangan.json', JSON.stringify(laporan, null, 2));

// ===== Cek terhadap checklist keseimbangan =====
const g = Object.fromEntries(laporan.hasil.map((h) => [h.gaya, h]));
const hasil = [];
cek(hasil, 'Pemalas: tidak bangkrut di hari pertama', !g.pemalas.hariMinus || g.pemalas.hariMinus > 1, `minus hari ${g.pemalas.hariMinus ?? '-'}`);
// Target dari docs/GDD/ekonomi-semester.md §2 (keputusan CEO A1·B1·C1, 2026-11-22)
// Keputusan CEO (KEPUTUSAN.md): pemain super-irit DIBIARKAN bertahan tanpa minus → yang dicek kini: hemat tidak minus
// di luar utang warung DAN tidak lebih kaya dari pekerja (hidup irit = bertahan, bukan jalan pintas jadi kaya).
cek(hasil, 'Hemat tanpa kerja: bertahan (≥ −Rp100 rb) tapi tidak lebih kaya dari pekerja (keputusan CEO: super-irit dibiarkan)', g.hemat.uangMin >= -100000 && g.hemat.uang < g.pekerja.uang, `min ${rp(g.hemat.uangMin)}, akhir ${rp(g.hemat.uang)} vs pekerja ${rp(g.pekerja.uang)}`);
cek(hasil, 'Standar tidak minus parah (≥ −Rp100 rb utang warung)', g.standar.uangMin >= -100000, `min ${rp(g.standar.uangMin)}`);
cek(hasil, 'Standar: IPK tidak mudah mentok (< 3,95 setelah 1 semester)', g.standar.ipk < 3.95, `IPK ${g.standar.ipk.toFixed(2)}`);
// Keputusan CEO 2026-11-23 (opsi tengah): target dilonggarkan Rp10 jt → Rp12 jt
cek(hasil, 'Pekerja tidak jadi mesin uang (< Rp12 jt/semester)', g.pekerja.uang < 12000000, rp(g.pekerja.uang));
cek(hasil, 'Begadang terus: pulang kampung (stres 100) dalam ≤ 6 hari', g.begadang.pulangPertama !== null && g.begadang.pulangPertama <= 6, `pertama hari ${g.begadang.pulangPertama ?? '-'}`);
cek(hasil, 'Standar (2 kuliah + 1 belajar/hari kerja): IPK 3,3–3,7 setelah 1 bulan', g.standar.ipk30 >= 3.3 && g.standar.ipk30 <= 3.7, `IPK ${g.standar.ipk30?.toFixed(2)}`);
cek(hasil, 'Listrik: token awal cukup ≥ 2 minggu', !g.rajin.hariListrikHabis || g.rajin.hariListrikHabis >= 14, `habis hari ${g.rajin.hariListrikHabis ?? '-'}`);
cek(hasil, 'Pemalas: IPK turun di bawah 3,0 setelah 1 semester', g.pemalas.ipk < 3.0, `IPK ${g.pemalas.ipk.toFixed(2)}`);
cek(hasil, 'Pekerja: uang akhir semester lebih banyak dari rajin', g.pekerja.uang > g.rajin.uang, `${rp(g.pekerja.uang)} vs ${rp(g.rajin.uang)}`);
cek(hasil, 'Rajin tetap bisa bertahan (tidak minus lebih dari utang warung)', g.rajin.uangMin >= -100000, `min ${rp(g.rajin.uangMin)}`);
cek(hasil, 'Tidak ada aksi 0-waktu yang menaikkan IPK', laporan.nolWaktuIpk.length === 0, laporan.nolWaktuIpk.join(', '));
cek(hasil, 'M12 hidrasi: pemain yang minum tidak dehidrasi parah', g.rajin.hidrasiMin >= 20, `min ${g.rajin.hidrasiMin}`);
// Catatan: pemalas makan mi instan berkuah (menambah cairan), jadi yang diuji "tidak minum" = bot begadang
cek(hasil, 'M12 hidrasi: pemain yang tidak pernah minum memang haus', g.begadang.hidrasiMin < 25, `min ${g.begadang.hidrasiMin}`);
cek(hasil, 'M12 listrik: token awal habis dalam 1 semester tanpa beli', g.rajin.listrik < 15, `sisa ${g.rajin.listrik} kWh`);
cek(hasil, 'M12 lomba: bisa juara tapi tidak selalu (rajin, 4 lomba)', g.rajin.lombaJuara >= 1 && g.rajin.lombaJuara <= 3, `juara ${g.rajin.lombaJuara}×`);
cek(hasil, 'Tanpa error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n⚠️ ${gagal} cek keseimbangan meleset (lihat angka di atas)` : '\n✅ Semua cek keseimbangan lulus');
process.exit(gagal ? 1 : 0);
