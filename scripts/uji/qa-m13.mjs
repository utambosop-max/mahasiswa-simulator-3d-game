// Tes eksplorasi QA M13 (25 QA Lead): interaksi ANTAR-fitur M13.
// Jalankan (dev server harus nyala di 5173): node scripts/uji/qa-m13.mjs
// Screenshot: env QA_SS (default scripts/uji/hasil/qa-m13/)
// Bagian bisa dipilih: env BAGIAN="A,B,C" (default semua)
import { mkdirSync } from 'node:fs';
import { URL, bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

const SS = (process.env.QA_SS ?? 'scripts/uji/hasil/qa-m13').replace(/[\\/]$/, '') + '/';
mkdirSync(SS, { recursive: true });
const PILIH = (process.env.BAGIAN ?? 'A,B,C,D,E,F,G,H,I,J,K').split(',');
const PROFIL = { nama: 'Tester', jurusan: 'teknik', asal: 'jawa', kulit: 1, rambut: '#3b2a20', baju: '#7cc6a4', gaya: 'pendek', ultah: { tanggal: 9, bulan: 2 } };
const hasil = [];
const LAMA = 'synchronously unmount a root';
const bersih = (e) => e.filter((x) => !x.includes(LAMA));

/** Headless Chrome hanya menggambar saat screenshot → ambil screenshot berkala agar useFrame jalan. */
async function frame(p, detik, nama) {
  for (let i = 0; i < Math.max(1, detik * 4); i++) {
    await p.screenshot({ path: SS + (nama && i === detik * 4 - 1 ? nama : '_frame.png') }).catch(() => {});
    await p.waitForTimeout(250);
  }
}
const S = (p) => jalankan(p, () => {
  const s = window.__game.getState();
  return { pembuka: s.pembuka, selesai: s.pembukaSelesai, lokasi: s.lokasi, event: s.event?.id ?? null, antrean: s.cerita.antrean, bab: s.cerita.bab, notifBaru: s.notifBaru, uang: s.uang, menit: s.menit, hari: s.hari, fase: s.fase, hp: s.hpTerbuka, kerja: !!s.kerja, mini: s.miniFisika?.jenis ?? null };
});
let idTp = 90000;
const tp = (p, x, z) => jalankan(p, (a) => window.__game.setState({ teleport: { x: a.x, z: a.z, rotY: 0, id: a.id } }), { x, z, id: ++idTp });
const pos = (p) => jalankan(p, () => (window.__pos ? { x: window.__pos.x, z: window.__pos.z } : null));

async function bagian(browser, kode, judul, fn, w = 1280, h = 720, opsi = {}) {
  if (!PILIH.includes(kode)) return;
  console.log(`\n===== ${kode}. ${judul} =====`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...opsi });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.stack ?? e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    await fn(p, errors);
  } catch (e) {
    cek(hasil, `${kode}: skrip selesai tanpa pengecualian`, false, e.message.split('\n')[0]);
  } finally {
    const err = bersih(errors);
    cek(hasil, `${kode}: tanpa error konsol`, err.length === 0, err.slice(0, 2).join(' | ').slice(0, 300));
    await ctx.close().catch(() => {});
  }
}

const browser = await bukaBrowser();
try {
  // ===== A. Pembuka → tombol Kembali → ambience → prolog → notif =====
  await bagian(browser, 'A', 'Pembuka → prolog → HP/notif', async (p) => {
    await p.goto(URL, { waitUntil: 'networkidle' });
    await jalankan(p, () => localStorage.clear());
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await p.mouse.click(5, 5); // buka kunci audio
    await jalankan(p, () => localStorage.setItem('mahasiswa-sim-suara', 'nyala'));
    await jalankan(p, () => window.__game.getState().mulaiMain(true));
    await p.waitForTimeout(300);
    await jalankan(p, (pr) => window.__game.getState().simpanProfil(pr), PROFIL);
    await frame(p, 2);
    let s = await S(p);
    cek(hasil, 'A: pembuka aktif setelah buat karakter', s.pembuka === true && s.selesai === false);
    // Laju waktu pembuka di headless (untuk menilai tes pembuka.mjs)
    const t0 = await jalankan(p, () => window.__pembuka?.t ?? 0);
    const w0 = Date.now();
    await frame(p, 4);
    const t1 = await jalankan(p, () => window.__pembuka?.t ?? 0);
    console.log(`   laju waktu pembuka: ${((t1 - t0) / ((Date.now() - w0) / 1000)).toFixed(2)} dtk-film / dtk-nyata`);
    // Ambience area saat pembuka (harus diam / tidak bocor)
    const amb = await jalankan(p, () => (window.__ambArea ? window.__ambArea() : null));
    const gainAmb = amb ? Math.max(...Object.values(amb.gain ?? {}).map(Number).filter(Number.isFinite), 0) : 0;
    cek(hasil, 'A: ambience area diam selama pembuka', gainAmb < 0.02, JSON.stringify(amb?.gain ?? amb));
    // Waktu game tidak berjalan & tidak ada event/cerita menyela pembuka
    const m0 = (await S(p)).menit;
    await frame(p, 3);
    s = await S(p);
    cek(hasil, 'A: jam game diam selama pembuka', s.menit === m0, `${m0}→${s.menit}`);
    cek(hasil, 'A: tidak ada dialog menyela pembuka', s.event === null, String(s.event));
    // Tombol Kembali saat pembuka
    await jalankan(p, () => window.__kembali?.());
    await frame(p, 1, 'A-kembali-pembuka.png');
    s = await S(p);
    console.log(`   setelah Kembali saat pembuka: pembuka=${s.pembuka} selesai=${s.selesai}`);
    const konf = await p.getByText(/Yakin keluar/).count();
    cek(hasil, 'A: Kembali saat pembuka tidak memunculkan konfirmasi keluar', konf === 0);
    // Selesaikan pembuka lewat tombol Lewati (jalur pemain)
    if (s.pembuka) {
      const lew = p.getByRole('button', { name: 'Lewati pembuka' });
      if (await lew.count()) await lew.click().catch(() => jalankan(p, () => window.__game.getState().selesaiPembuka()));
      else await jalankan(p, () => window.__game.getState().selesaiPembuka());
    }
    await frame(p, 4);
    s = await S(p);
    cek(hasil, 'A: setelah pembuka → kamar & pembukaSelesai', !s.pembuka && s.selesai && s.lokasi === 'kamar', JSON.stringify({ p: s.pembuka, s: s.selesai, l: s.lokasi }));
    // Prolog muncul (WA Ibu) setelah jeda ± 2 dtk
    let prolog = false;
    for (let i = 0; i < 16 && !prolog; i++) {
      await frame(p, 0.5);
      await jalankan(p, () => window.__game.getState().majukanJam(1));
      prolog = (await S(p)).event === 'cerita:d_prolog_wa';
    }
    await p.screenshot({ path: SS + 'A-prolog.png' });
    cek(hasil, 'A: prolog WA Ibu tampil setelah pembuka', prolog, String((await S(p)).event));
    // Notif sambutan tidak tertimpa/hilang; badge HP bertambah
    const riw = await jalankan(p, () => window.__game.getState().riwayat.map((r) => r.teks));
    cek(hasil, 'A: notif sambutan tercatat di riwayat', riw.some((t) => t.includes('Selamat datang')), riw.slice(-4).join(' | '));
    cek(hasil, 'A: badge notif HP > 0', (await S(p)).notifBaru > 0);
    // Kembali saat dialog cerita → dialog tetap, toast peringatan
    await jalankan(p, () => window.__kembali?.());
    await p.waitForTimeout(300);
    s = await S(p);
    cek(hasil, 'A: Kembali saat dialog cerita → dialog tetap', s.event === 'cerita:d_prolog_wa');
    await jalankan(p, () => window.__game.getState().pilihEventIni(0));
    await p.waitForTimeout(400);
    // Buka HP saat ada notif: Buku Sakti menampilkan prolog
    await jalankan(p, () => window.__game.getState().setHP(true));
    await frame(p, 1, 'A-hp-home.png');
    const tombolBuku = p.getByRole('button', { name: /^Buku Sakti/ }).first();
    if (await tombolBuku.count()) await tombolBuku.click();
    await frame(p, 1, 'A-bukusakti.png');
    cek(hasil, 'A: Buku Sakti menampilkan bab Prolog', (await p.getByText(/Berangkat/).count()) > 0);
    // Kembali ×3 → tutup app → tutup HP → konfirmasi keluar
    await jalankan(p, () => window.__kembali?.());
    await jalankan(p, () => window.__kembali?.());
    await p.waitForTimeout(200);
    cek(hasil, 'A: Kembali 2× menutup HP', !(await S(p)).hp);
  });

  // ===== B. Event acak vs dialog cerita (slot event sama) =====
  await bagian(browser, 'B', 'Event acak vs dialog cerita', async (p) => {
    await mulaiBaru(p);
    await frame(p, 1);
    // 1) Antrean cerita berisi prolog; event acak dipaksa tampil lebih dulu
    const evAcak = await jalankan(p, async () => {
      const m = await import('/src/game/sim.ts');
      const s = window.__game.getState();
      // Ambil event acak sungguhan dari data
      const daftar = (m.EVENTS ?? m.EVENT ?? []);
      const ev = Array.isArray(daftar) && daftar.length ? daftar[0] : null;
      if (ev) window.__game.setState({ event: ev });
      return ev?.id ?? null;
    });
    console.log('   event acak dipaksa:', evAcak);
    await frame(p, 3);
    let s = await S(p);
    if (evAcak) {
      cek(hasil, 'B: dialog cerita tidak menimpa event acak yang sedang tampil', s.event === evAcak, `event=${s.event} antrean=${s.antrean}`);
      await jalankan(p, () => window.__game.getState().pilihEventIni(0));
      let muncul = false;
      for (let i = 0; i < 12 && !muncul; i++) {
        await frame(p, 0.5);
        await jalankan(p, () => window.__game.getState().majukanJam(1));
        muncul = (await S(p)).event?.startsWith('cerita:') ?? false;
      }
      cek(hasil, 'B: dialog cerita muncul setelah event acak dijawab (tidak hilang)', muncul, JSON.stringify((await S(p)).antrean));
    } else cek(hasil, 'B: ekspor daftar event ditemukan (skrip)', false, 'EVENTS tidak diekspor dari sim.ts');
    // 2) Dialog cerita tampil; event acak diizinkan & waktu dimajukan lintas fase → dialog cerita tetap
    s = await S(p);
    const idCerita = s.event;
    await jalankan(p, () => {
      window.__game.setState({ eventHari: { hari: 0, jumlah: 0 }, eventTerakhir: {} });
      for (let i = 0; i < 3; i++) window.__game.getState().majukanJam(240);
    });
    await frame(p, 3);
    s = await S(p);
    cek(hasil, 'B: event acak tidak menimpa dialog cerita yang terbuka', s.event === idCerita, `${idCerita} → ${s.event}`);
    // 3) Jawab cerita; eventHari tercatat tapi dialog acak hilang? (catatEvent sebelum setTimeout)
    const eh = await jalankan(p, () => window.__game.getState().eventHari);
    console.log('   eventHari setelah lintas fase saat dialog cerita terbuka:', JSON.stringify(eh));
    cek(hasil, 'B: kuota event acak tidak terpakai oleh event yang batal tampil', eh.jumlah === 0, JSON.stringify(eh));
    await p.screenshot({ path: SS + 'B-dialog.png' });
  });

  // ===== C. Tombol Kembali saat minigame =====
  await bagian(browser, 'C', 'Tombol Kembali saat mini-game & panel', async (p) => {
    await mulaiBaru(p);
    await jalankan(p, () => { const s = window.__game.getState(); window.__game.setState({ cerita: { ...s.cerita, antrean: [] }, uang: 500000, fase: 'sore', menit: 660 }); });
    await jalankan(p, () => window.__game.getState().lakukan('mainGitar'));
    await frame(p, 1);
    let s = await S(p);
    cek(hasil, 'C: mini-game gitar terbuka', s.mini === 'gitar', String(s.mini));
    const uang0 = s.uang;
    await jalankan(p, () => window.__kembali?.());
    await frame(p, 1, 'C-kembali-mini.png');
    s = await S(p);
    const konf = await p.getByText(/Yakin keluar/).count();
    console.log(`   setelah Kembali di mini-game: mini=${s.mini}, konfirmasi=${konf}`);
    cek(hasil, 'C: Kembali di mini-game menutup/menjeda mini-game, tanpa konfirmasi keluar', konf === 0);
    cek(hasil, 'C: Kembali di mini-game tidak memberi efek aksi gratis', s.uang === uang0);
    // Spam Kembali 20× di dunia: hanya 1 konfirmasi, tidak crash
    await jalankan(p, () => { window.__game.setState({ miniFisika: null, kerja: null }); for (let i = 0; i < 20; i++) window.__kembali?.(); });
    await frame(p, 1, 'C-spam-kembali.png');
    const jml = await p.getByText(/Yakin keluar/).count();
    cek(hasil, 'C: spam Kembali → konfirmasi tampil (bergantian buka/tutup, tidak menumpuk)', jml <= 1, `${jml}`);
  });

  // ===== D. Aksi area baru: malam & mode online =====
  await bagian(browser, 'D', 'Aksi area baru di malam / online (logika)', async (p) => {
    await p.goto(URL, { waitUntil: 'networkidle' });
    const out = await jalankan(p, async () => {
      const S = await import('/src/game/sim.ts');
      const r = [];
      const baru = ['jajanPasarKaget', 'ngopiTepiKali', 'mancing', 'bantuPanen', 'jajanEsDegan', 'mainBolaKampung', 'jajanKopiKali'];
      for (const online of [false, true])
        for (const fase of ['pagi', 'siang', 'sore', 'malam', 'begadang']) {
          const MEN = { pagi: 120, siang: 420, sore: 660, malam: 900, begadang: 1200 };
          for (const id of baru) {
            if (!S.AKSI[id]) { r.push({ id, fase, online, err: 'tidak ada di AKSI' }); continue; }
            const d = { ...S.dataAwal(), lokasi: 'dunia', fase, menit: MEN[fase], energi: 100, stres: 50, uang: 500000, hari: 6, tanggal: 6 };
            const c = S.cekAksi(d, id);
            if (!c.boleh) continue;
            try {
              const h = S.jalankanAksi(d, id, online);
              const x = h.data;
              const nan = ['uang', 'energi', 'stres', 'ipk', 'menit'].filter((k) => !Number.isFinite(x[k]));
              const batas = x.energi < 0 || x.energi > 100 || x.stres < 0 || x.stres > 100;
              // aksi menyeberang tengah malam? menit harus < 1440
              if (nan.length || batas || x.menit >= 1440) r.push({ id, fase, online, err: `nan=${nan} energi=${x.energi} stres=${x.stres} menit=${x.menit}` });
              if (online && !h.ditolak && h.tunda && x.menit !== d.menit) r.push({ id, fase, online, err: `online: jam lokal maju ${d.menit}→${x.menit} padahal pakai tunda` });
            } catch (e) { r.push({ id, fase, online, err: String(e) }); }
          }
        }
      // Energi 0 / uang 0
      for (const id of baru) {
        if (!S.AKSI[id]) continue;
        const d = { ...S.dataAwal(), lokasi: 'dunia', fase: 'sore', menit: 660, energi: 0, stres: 100, uang: 0, hari: 6 };
        const c = S.cekAksi(d, id);
        if (c.boleh) {
          const x = S.jalankanAksi(d, id, false).data;
          // Utang sampai BAL.batas.uangMin (−100.000) memang dibolehkan desain
          if (x.uang < -100000) r.push({ id, err: `uang di bawah batas ${x.uang}` });
          if (x.energi < 0) r.push({ id, err: `energi negatif ${x.energi}` });
        }
      }
      return r;
    });
    cek(hasil, 'D: 7 aksi area baru × 5 fase × offline/online tanpa NaN/di luar batas', out.length === 0, JSON.stringify(out).slice(0, 400));
  });

  // ===== E. Teleport ke ujung dunia & sungai =====
  await bagian(browser, 'E', 'Ujung dunia & sungai', async (p) => {
    await mulaiBaru(p);
    await jalankan(p, () => { const s = window.__game.getState(); window.__game.setState({ cerita: { ...s.cerita, antrean: [] } }); window.__game.getState().lakukan('keluar'); });
    await frame(p, 2);
    const jalan = async (kunci, detik) => {
      await p.keyboard.down(kunci);
      await frame(p, detik);
      await p.keyboard.up(kunci);
    };
    const uji = [
      ['pojok barat laut', -80, -58],
      ['pojok tenggara', 80, 58],
      ['pojok timur laut', 80, -58],
      ['pojok barat daya', -80, 58],
    ];
    for (const [nama, x, z] of uji) {
      await tp(p, x, z);
      await frame(p, 1);
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD']) await jalan(k, 2);
      const q = await pos(p);
      const keluar = !q || Math.abs(q.x) > 84.5 || Math.abs(q.z) > 62.5;
      cek(hasil, `E: ${nama} — tidak bisa keluar peta`, !keluar, JSON.stringify(q));
      await p.screenshot({ path: SS + `E-${nama.replace(/ /g, '-')}.png` });
    }
    // Sungai z=-50 ±3: berjalan ke utara dari jalur tepi (x=16, bukan jembatan) tidak boleh menyeberang
    // Kamera lurus ke utara agar W tidak menggeser pemain ke pagar jembatan.
    await jalankan(p, () => window.__game.setState({ kameraSudut: 0 }));
    await tp(p, 16, -44.5);
    await frame(p, 1);
    await jalan('KeyW', 5);
    const tepi = await pos(p);
    cek(hasil, 'E: pemain mencapai tepi tanpa tembus sungai di luar jembatan', tepi?.z < -46.3 && tepi.z > -47.2, JSON.stringify(tepi));
    await p.screenshot({ path: SS + 'E-sungai.png' });
    // Teleport langsung ke tengah sungai (jalur angkot/debug): posisi tidak dikoreksi?
    await tp(p, 16, -50);
    await frame(p, 1, 'E-di-sungai.png');
    const qs = await pos(p);
    console.log('   teleport ke tengah sungai → posisi', JSON.stringify(qs));
    // Menyeberang lewat jembatan (x=0) harus bisa
    await tp(p, 0, -46);
    await frame(p, 0.5);
    await jalan('KeyW', 8);
    const jembatan = await pos(p);
    cek(hasil, 'E: jembatan x=0 bisa diseberangi', jembatan?.z < -53, JSON.stringify(jembatan));
  });

  // ===== F. Save → reload; save lama =====
  await bagian(browser, 'F', 'Save/reload & save lama', async (p) => {
    await mulaiBaru(p);
    await jalankan(p, () => {
      const s = window.__game.getState();
      window.__game.setState({
        cerita: { ...s.cerita, flag: { ...s.cerita.flag, ujiQA: 3, jujur: 2 }, nabung: { status: 'aktif', terkumpul: 150000, target: 300000, batas: 99 }, adegan: [...s.cerita.adegan, 'a_raka_warteg'] },
      });
      window.__game.getState().toast('🔔 notif uji QA');
      window.__game.getState().majukanJam(1);
    });
    await p.waitForTimeout(600);
    const a = await jalankan(p, () => { const s = window.__game.getState(); return { c: s.cerita, ps: s.pembukaSelesai, notif: s.notifBaru, riw: s.riwayat.length }; });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    const b = await jalankan(p, () => { const s = window.__game.getState(); return { c: s.cerita, ps: s.pembukaSelesai, notif: s.notifBaru, riw: s.riwayat.length }; });
    cek(hasil, 'F: cerita.flag utuh setelah reload', JSON.stringify(a.c.flag) === JSON.stringify(b.c.flag), JSON.stringify(b.c.flag));
    cek(hasil, 'F: cerita.nabung utuh setelah reload', JSON.stringify(a.c.nabung) === JSON.stringify(b.c.nabung), JSON.stringify(b.c.nabung));
    cek(hasil, 'F: cerita.bab & adegan utuh', JSON.stringify(a.c.bab) === JSON.stringify(b.c.bab) && JSON.stringify(a.c.adegan) === JSON.stringify(b.c.adegan));
    cek(hasil, 'F: pembukaSelesai utuh', a.ps === b.ps, `${a.ps}→${b.ps}`);
    console.log(`   notifBaru ${a.notif}→${b.notif}, riwayat ${a.riw}→${b.riw} (riwayat memang tidak disimpan)`);
    cek(hasil, 'F: badge notif belum dibaca bertahan setelah reload', b.notif === a.notif, `${a.notif}→${b.notif}`);
    // Save lama: hapus field M13
    await jalankan(p, () => {
      const raw = JSON.parse(localStorage.getItem('mahasiswa-sim-save-v1'));
      delete raw.cerita; delete raw.pembukaSelesai;
      localStorage.setItem('mahasiswa-sim-save-v1', JSON.stringify(raw));
    });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    const c = await jalankan(p, () => { const s = window.__game.getState(); return { ada: !!s.profil, c: s.cerita, ps: s.pembukaSelesai, uang: s.uang }; });
    cek(hasil, 'F: save lama tanpa cerita/pembukaSelesai termuat', c.ada && !!c.c && Array.isArray(c.c.antrean), JSON.stringify({ ps: c.ps, bab: c.c && Object.keys(c.c.bab) }));
    await jalankan(p, () => window.__game.getState().mulaiMain(false));
    await frame(p, 2);
    const d = await S(p);
    cek(hasil, 'F: save lama tidak memutar pembuka lagi', !d.pembuka, JSON.stringify({ p: d.pembuka, s: d.selesai }));
    // Save lama: prolog butuh pembukaSelesai === true — apakah pemain lama tetap dapat cerita?
    let ok = false;
    for (let i = 0; i < 10 && !ok; i++) {
      await jalankan(p, () => window.__game.getState().majukanJam(1));
      await frame(p, 0.5);
      ok = !!(await S(p)).bab.prolog;
    }
    cek(hasil, 'F: pemain save lama tetap mendapat prolog cerita', ok, JSON.stringify((await S(p)).bab));
    // Save rusak sebagian: cerita berisi tipe salah
    await jalankan(p, () => {
      const raw = JSON.parse(localStorage.getItem('mahasiswa-sim-save-v1'));
      raw.cerita = { bab: 'rusak', flag: null, antrean: 5, nabung: 'x' };
      localStorage.setItem('mahasiswa-sim-save-v1', JSON.stringify(raw));
    });
    await p.reload({ waitUntil: 'networkidle' });
    await p.waitForTimeout(1000);
    await jalankan(p, () => window.__game.getState().mulaiMain(false));
    await frame(p, 2);
    const e = await jalankan(p, () => { const s = window.__game.getState(); return { ok: typeof s.cerita.bab === 'object' && Array.isArray(s.cerita.antrean), c: s.cerita }; });
    cek(hasil, 'F: field cerita rusak dibersihkan (tidak crash)', e.ok, JSON.stringify(e.c).slice(0, 150));
  });

  // ===== G. Layar 915×412 & 2560×1440, teks besar, kurangi animasi =====
  for (const [w, h, hp] of [[915, 412, true], [2560, 1440, false]]) {
    await bagian(browser, 'G', `Layar ${w}×${h} + teks besar + kurangi animasi`, async (p) => {
      await p.goto(URL, { waitUntil: 'networkidle' });
      await jalankan(p, () => { localStorage.clear(); localStorage.setItem('mahasiswa-sim-teks-besar', 'ya'); localStorage.setItem('mhs-kurangi-animasi', '1'); });
      await mulaiBaruTanpaClear(p);
      await jalankan(p, () => { const s = window.__game.getState(); window.__game.setState({ cerita: { ...s.cerita, antrean: [] } }); window.__game.getState().lakukan('keluar'); });
      await frame(p, 2);
      const tag = `${w}x${h}`;
      const fs = await jalankan(p, () => [document.documentElement.style.fontSize, document.documentElement.classList.contains('kurangi-animasi')]);
      console.log(`   fontSize html=${fs[0]} kurangi-animasi=${fs[1]}`);
      cek(hasil, `G[${tag}]: kurangi animasi terpasang dari save`, fs[1] === true);
      const hud = await p.getByRole('button', { name: /^HP/ }).boundingBox();
      const kotak = await p.locator('.kotak-game').boundingBox();
      const porsi = hud && kotak ? (hud.y + hud.height - kotak.y) / kotak.height : 1;
      cek(hasil, `G[${tag}]: HUD ≤ 15% tinggi saat teks besar`, porsi <= 0.15, `${(porsi * 100).toFixed(1)}%`);
      await p.screenshot({ path: SS + `G-hud-${tag}.png` });
      // Dialog cerita panjang + 3 notif + HP Buku Sakti
      await jalankan(p, () => { const s = window.__game.getState(); window.__game.setState({ cerita: { ...s.cerita, antrean: ['d_raka_pinjam'] } }); s.majukanJam(1); });
      for (let i = 0; i < 8; i++) { await frame(p, 0.5); await jalankan(p, () => window.__game.getState().majukanJam(1)); if ((await S(p)).event) break; }
      await p.screenshot({ path: SS + `G-dialog-${tag}.png` });
      // Tombol pilihan dialog di dalam kotak game?
      const btn = await p.locator('[role=dialog] button').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { b: r.bottom, r: r.right, h: r.height, t: e.textContent?.slice(0, 20) }; }));
      const vh = h, vw = w;
      const luar = btn.filter((b) => b.b > vh + 1 || b.r > vw + 1);
      cek(hasil, `G[${tag}]: semua tombol dialog cerita di dalam layar`, btn.length > 0 && luar.length === 0, JSON.stringify(luar).slice(0, 200));
      const kecil = btn.filter((b) => b.h < 55.5);
      cek(hasil, `G[${tag}]: tombol dialog ≥ 56 px`, kecil.length === 0, JSON.stringify(kecil).slice(0, 200));
      await jalankan(p, () => window.__game.getState().pilihEventIni(2));
      await p.waitForTimeout(300);
      await jalankan(p, () => window.__game.getState().setHP(true));
      await frame(p, 1);
      const tb = p.getByRole('button', { name: /^Buku Sakti/ }).first();
      if (await tb.count()) await tb.click();
      await frame(p, 1, `G-bukusakti-${tag}.png`);
      // Overflow horizontal di HP?
      const of = await jalankan(p, () => [...document.querySelectorAll('[role=dialog] *')].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0).length);
      cek(hasil, `G[${tag}]: Buku Sakti tanpa teks meluber horizontal`, of === 0, `${of} elemen`);
    }, w, h, hp ? { hasTouch: true, isMobile: true } : {});
  }

  // ===== H. Eksploitasi: celengan, spam aksi, ganti jam =====
  await bagian(browser, 'H', 'Eksploitasi', async (p) => {
    await mulaiBaru(p);
    const r = await jalankan(p, async () => {
      const C = await import('/src/game/cerita.ts');
      const S = await import('/src/game/sim.ts');
      const out = {};
      let d = { ...S.dataAwal(), profil: { nama: 'x' }, uang: 1000000 };
      d = { ...d, cerita: { ...d.cerita, nabung: { status: 'aktif', terkumpul: 0, target: 300000, batas: d.hari + 60 } } };
      const u0 = d.uang;
      // setor 3×, batal, setor lagi? (batal → status batal → setor ditolak)
      for (let i = 0; i < 3; i++) d = C.setorNabung(d).data;
      const b = C.batalNabung(d); d = b.data;
      const b2 = C.batalNabung(d);
      out.batalGanda = { ditolak: !!b2.ditolak, uang: b2.data.uang };
      out.selisihSetelahBatal = d.uang - u0;
      // Setor → kirim → batal (setelah terkirim) tidak boleh kembalikan uang
      let e = { ...S.dataAwal(), profil: { nama: 'x' }, uang: 1000000 };
      e = { ...e, cerita: { ...e.cerita, nabung: { status: 'aktif', terkumpul: 0, target: 300000, batas: e.hari + 60 } } };
      for (let i = 0; i < 10; i++) e = C.setorNabung(e).data;
      out.terkumpulMaks = e.cerita.nabung.terkumpul;
      out.uangSetelah10Setor = e.uang;
      e = C.kirimNabung(e).data;
      const k2 = C.kirimNabung(e);
      out.kirimGanda = !!k2.ditolak;
      const bt = C.batalNabung(e);
      out.batalSetelahKirim = { ditolak: !!bt.ditolak, uang: bt.data.uang - e.uang };
      // Tenggat lewat → dikembalikan sekali saja (cekCerita dipanggil berulang)
      let f = { ...S.dataAwal(), profil: { nama: 'x' }, uang: 0 };
      f = { ...f, cerita: { ...f.cerita, nabung: { status: 'aktif', terkumpul: 200000, target: 300000, batas: 1 } }, hari: 5 };
      for (let i = 0; i < 5; i++) f = C.cekCerita(f).data;
      out.refundTenggat = f.uang;
      // Uang negatif: setor saat uang 49.999
      const g = C.setorNabung({ ...e, uang: 49999, cerita: { ...e.cerita, nabung: { status: 'aktif', terkumpul: 0, target: 300000, batas: 999 } } });
      out.setorKurangUang = !!g.ditolak;
      return out;
    });
    console.log('   ', JSON.stringify(r));
    cek(hasil, 'H: celengan — batal ganda ditolak', r.batalGanda.ditolak);
    cek(hasil, 'H: celengan — setor 3× lalu batal: uang kembali persis (tidak ganda)', r.selisihSetelahBatal === 0, String(r.selisihSetelahBatal));
    cek(hasil, 'H: celengan — tidak bisa melebihi target', r.terkumpulMaks === 300000, String(r.terkumpulMaks));
    cek(hasil, 'H: celengan — kirim ganda ditolak', r.kirimGanda);
    cek(hasil, 'H: celengan — batal setelah terkirim ditolak', r.batalSetelahKirim.ditolak && r.batalSetelahKirim.uang === 0);
    cek(hasil, 'H: celengan — refund tenggat hanya sekali', r.refundTenggat === 200000, String(r.refundTenggat));
    cek(hasil, 'H: celengan — setor ditolak bila uang kurang', r.setorKurangUang);

    // Spam setor lewat store (klik cepat 30× dalam 1 tick) + reload → uang+celengan konsisten
    const sp = await jalankan(p, async () => {
      const C = await import(performance.getEntriesByType('resource').map((e) => e.name).find((x) => x.includes('/src/game/cerita.ts')) ?? '/src/game/cerita.ts');
      const g = window.__game;
      const s = g.getState();
      g.setState({ uang: 1000000, cerita: { ...s.cerita, nabung: { status: 'aktif', terkumpul: 0, target: 300000, batas: s.hari + 60 } } });
      for (let i = 0; i < 30; i++) g.getState().fitur(C.setorNabung, 'koin');
      for (let i = 0; i < 5; i++) g.getState().fitur(C.batalNabung, 'koin');
      const t = g.getState();
      return { uang: t.uang, n: t.cerita.nabung };
    });
    cek(hasil, 'H: spam setor 30× + batal 5× → total uang tetap Rp1.000.000', sp.uang === 1000000, JSON.stringify(sp));

    // Spam aksi area baru di 1 tick
    const sa = await jalankan(p, () => {
      const g = window.__game;
      g.setState({ lokasi: 'dunia', fase: 'sore', menit: 660, uang: 500000, energi: 100, stres: 50, hari: 6, tanggal: 6, sibuk: null, terkunci: false });
      const st0 = { ...g.getState().stat };
      for (let i = 0; i < 25; i++) for (const a of ['ngopiTepiKali', 'mainBolaKampung', 'mancing']) { g.setState({ sibuk: null, terkunci: false }); g.getState().lakukan(a); }
      const st = g.getState().stat;
      return { ngopi: (st.ngopiTepiKali ?? 0) - (st0.ngopiTepiKali ?? 0), bola: (st.mainBolaKampung ?? 0) - (st0.mainBolaKampung ?? 0), mancing: (st.mancing ?? 0) - (st0.mancing ?? 0) };
    });
    cek(hasil, 'H: spam 25× aksi area baru tetap kena batas harian (ngopi≤2, bola≤1, mancing≤2)', sa.ngopi <= 2 && sa.bola <= 1 && sa.mancing <= 2, JSON.stringify(sa));

    // Ganti jam HP (Date.now maju 1 hari) — game offline tidak boleh melompat hari / dapat kiriman
    const jam = await jalankan(p, async () => {
      const g = window.__game;
      const h0 = g.getState().hari;
      const u0 = g.getState().uang;
      const asli = Date.now;
      const geser = 86400000 * 3;
      Date.now = () => asli() + geser;
      const pAsli = performance.now.bind(performance);
      await new Promise((r) => setTimeout(r, 2500));
      Date.now = asli;
      void pAsli;
      return { dh: g.getState().hari - h0, du: g.getState().uang - u0 };
    });
    cek(hasil, 'H: memajukan jam perangkat 3 hari tidak melompatkan hari game', jam.dh === 0, JSON.stringify(jam));

    // Pilih event cerita yang sama 2× (klik ganda) → efek ganda?
    const dbl = await jalankan(p, () => {
      const g = window.__game;
      const s = g.getState();
      g.setState({ uang: 600000, event: null, cerita: { ...s.cerita, antrean: [] } });
      return null;
    });
    void dbl;
    await jalankan(p, () => { const s = window.__game.getState(); window.__game.setState({ cerita: { ...s.cerita, antrean: ['d_raka_pinjam'] }, sibuk: null }); s.majukanJam(1); });
    let ada = false;
    for (let i = 0; i < 10 && !ada; i++) { await frame(p, 0.5); await jalankan(p, () => window.__game.getState().majukanJam(1)); ada = (await S(p)).event === 'cerita:d_raka_pinjam'; }
    if (ada) {
      const u = await jalankan(p, () => { const g = window.__game; const u0 = g.getState().uang; g.getState().pilihEventIni(0); g.getState().pilihEventIni(0); g.getState().pilihEventIni(0); return u0 - g.getState().uang; });
      cek(hasil, 'H: klik ganda pilihan "Pinjami Rp50.000" hanya memotong sekali', u === 50000, `terpotong ${u}`);
    } else cek(hasil, 'H: dialog d_raka_pinjam tampil dari antrean (persiapan tes klik ganda)', false);
  });

  // ===== I. Bab 2 tidak terpicu (reproduksi kegagalan cerita.mjs) =====
  await bagian(browser, 'I', 'Reproduksi pemicu Bab 2', async (p) => {
    await mulaiBaru(p);
    const r = await jalankan(p, async () => {
      const C = await import('/src/game/cerita.ts');
      const g = window.__game;
      const s = g.getState();
      const bab = { prolog: { s: 'selesai', mulai: 1, dasar: {}, tujuan: [] }, bab1: { s: 'selesai', mulai: 2, dasar: {}, tujuan: [] } };
      g.setState({ cerita: { ...s.cerita, bab, antrean: [] }, hari: 21, tanggal: 21, fase: 'malam', menit: 900, lokasi: 'kamar', uang: 600000 });
      g.getState().majukanJam(1);
      const t = g.getState();
      const d = { ...t };
      return { bab: Object.keys(t.cerita.bab), antrean: t.cerita.antrean, fase: t.fase, lokasi: t.lokasi, tanggal: t.tanggal, menit: t.menit, pemicuLangsung: Object.keys(C.cekCerita(d).data.cerita.bab) };
    });
    console.log('   ', JSON.stringify(r));
    cek(hasil, 'I: Bab 2 aktif saat tgl 21, kamar, malam (bab1 selesai)', r.bab.includes('bab2'), JSON.stringify(r));
  });

  // ===== J. Jalan lama + percepatan waktu: memori & error =====
  await bagian(browser, 'J', 'Jalan lama (memori/geometri)', async (p) => {
    await mulaiBaru(p);
    await jalankan(p, () => { const s = window.__game.getState(); window.__game.setState({ cerita: { ...s.cerita, antrean: [] }, uang: 5000000 }); s.lakukan('keluar'); });
    await frame(p, 2);
    const ukur = () => jalankan(p, () => {
      const t = window.__tiga;
      const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1;
      return { mem, geo: t?.gl.info.memory.geometries ?? -1, tex: t?.gl.info.memory.textures ?? -1, prog: t?.gl.info.programs?.length ?? -1, calls: t?.gl.info.render.calls ?? -1, hari: window.__game.getState().hari };
    });
    const sampel = [];
    const titik = [[0, 0], [-73, -16], [73, -12], [0, -45], [-45, 52], [16, 52], [-73, 45], [30, -30]];
    const T0 = Date.now();
    let i = 0;
    while (Date.now() - T0 < 150000) {
      const [x, z] = titik[i % titik.length];
      await tp(p, x, z);
      // Waktu dipercepat: 1 jam game tiap langkah + ganti lokasi kamar/dunia sesekali
      await jalankan(p, (n) => {
        const g = window.__game;
        g.setState({ event: null, sibuk: null, terkunci: false, energi: 80, stres: 30 });
        g.getState().majukanJam(60);
        if (n % 10 === 5) g.getState().lakukan('masukKos');
        if (n % 10 === 7) g.getState().lakukan('keluar');
      }, i);
      await frame(p, 1);
      if (i % 4 === 0) sampel.push(await ukur());
      i++;
    }
    console.log('   sampel:', JSON.stringify(sampel.map((s) => [s.hari, s.mem, s.geo, s.tex])));
    const awal = sampel.slice(1, 4);
    const akhir = sampel.slice(-3);
    const rata = (a, k) => a.reduce((n, s) => n + s[k], 0) / a.length;
    const naikGeo = rata(akhir, 'geo') - rata(awal, 'geo');
    const naikTex = rata(akhir, 'tex') - rata(awal, 'tex');
    const naikMem = rata(akhir, 'mem') - rata(awal, 'mem');
    cek(hasil, 'J: geometri GPU tidak naik terus (Δ < 50)', naikGeo < 50, `Δgeo=${naikGeo.toFixed(0)} (${sampel[1]?.geo}→${sampel.at(-1)?.geo})`);
    cek(hasil, 'J: tekstur GPU tidak naik terus (Δ < 20)', naikTex < 20, `Δtex=${naikTex.toFixed(0)} (${sampel[1]?.tex}→${sampel.at(-1)?.tex})`);
    cek(hasil, 'J: heap JS tidak naik terus (Δ < 60 MB)', naikMem < 60, `Δ=${naikMem.toFixed(0)} MB`);
    console.log(`   hari game berjalan: ${sampel[0]?.hari} → ${sampel.at(-1)?.hari}, langkah=${i}`);
    await p.screenshot({ path: SS + 'J-akhir.png' });
  });
} finally {
  await browser.close().catch(() => {});
}

async function mulaiBaruTanpaClear(p) {
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.evaluate((pr) => { const g = window.__game; g.setState({ profil: pr }); g.getState().mulaiMain(false); }, PROFIL);
  await p.waitForTimeout(700);
  await p.evaluate(() => window.__game.setState({ eventHari: { hari: 999, jumlah: 99 }, toasts: [] }));
}
void toast;
const gagal = hasil.filter((h) => !h.lulus);
console.log(`\nHasil: ${hasil.length - gagal.length}/${hasil.length} lulus`);
for (const g of gagal) console.log('  ❌', g.nama);
process.exit(gagal.length ? 1 : 0);
