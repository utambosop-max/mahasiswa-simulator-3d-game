// Tes aksi area baru (M13): node scripts/uji/area-baru.mjs  (butuh npm run dev di 5173)
// Teleport ke tiap area → cek titik interaksi terdeteksi → cek jam buka → jalankan aksi → cek efek & anti-spam.
import { SS, URL, bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

const MENIT = { pagi: 120, siang: 420, sore: 660, malam: 900, begadang: 1200 };
const browser = await bukaBrowser();
const hasil = [];
try {
  const { p, errors } = await halaman(browser);

  // ===== Bagian A: logika murni (sim.ts dipanggil langsung, mode online=true seperti store) =====
  await p.goto(URL, { waitUntil: 'networkidle' });
  const logika = await jalankan(p, async (MENIT) => {
    const S = await import('/src/game/sim.ts');
    const out = [];
    const ok = (nama, lulus, info = '') => out.push({ nama, lulus, info });
    const awal = (fase) => ({ ...S.dataAwal(), lokasi: 'dunia', fase, menit: MENIT[fase], energi: 100, stres: 60, uang: 500000 });
    const jalan = (d, id) => S.jalankanAksi(d, id, true);
    // Jam buka
    const tutup = [['jajanPasarKaget', 'siang'], ['ngopiTepiKali', 'begadang'], ['mancing', 'malam'], ['bantuPanen', 'sore'], ['jajanEsDegan', 'malam'], ['mainBolaKampung', 'malam'], ['jajanKopiKali', 'begadang']];
    for (const [id, f] of tutup) ok(`A: ${id} tutup saat ${f}`, !S.cekAksi(awal(f), id).boleh, S.cekAksi(awal(f), id).alasan);
    const buka = [['jajanPasarKaget', 'malam'], ['ngopiTepiKali', 'sore'], ['mancing', 'pagi'], ['jajanEsDegan', 'siang'], ['mainBolaKampung', 'sore']];
    for (const [id, f] of buka) ok(`A: ${id} buka saat ${f}`, S.cekAksi(awal(f), id).boleh);
    // Menu baru
    for (const t of ['pasarKaget', 'kopiKali', 'esDegan']) {
      const item = S.daftarMenu(t)[0];
      const r = S.beliMakanan(awal('malam'), t, item.id, true);
      ok(`A: beli ${t} → makan_${t}`, !r.ditolak && r.data.stat[`makan_${t}`] === 1 && r.data.porsiFase === 1);
    }
    // Ngopi: 2×/hari + kenyang + tunda waktu (online)
    let d = awal('sore');
    let r = jalan(d, 'ngopiTepiKali');
    ok('A: ngopi → stres turun, uang turun, tunda 60 menit, makan_kopiKali', !r.ditolak && r.data.stres < 60 && r.data.uang < 500000 && r.tunda?.menit === 60 && r.data.stat.makan_kopiKali === 1);
    d = jalan(r.data, 'ngopiTepiKali').data;
    r = jalan(d, 'ngopiTepiKali');
    ok('A: ngopi ke-3 ditolak', !!r.ditolak, r.pesan[0]);
    ok('A: ngopi kena aturan kenyang', !S.cekAksi({ ...awal('sore'), porsiFase: 3 }, 'ngopiTepiKali').boleh);
    // Mancing: 2×/hari, hasil acak dari tabel, undi deterministik
    d = awal('pagi');
    d = jalan(d, 'mancing').data;
    d = jalan(d, 'mancing').data;
    ok('A: mancing ke-3 ditolak', !!jalan(d, 'mancing').ditolak);
    ok('A: hasil mancing tercatat', Object.keys(d.stat).filter((k) => k.startsWith('mancing_')).length >= 1);
    ok('A: undi mancing (0.1→ikan_besar, 0.3→ikan_kecil, 0.6→sandal, 0.9→nihil)', ['ikan_besar', 'ikan_kecil', 'sandal', 'nihil'].join() === [0.1, 0.3, 0.6, 0.9].map((v) => S.undiMancing(() => v).id).join());
    ok('A: hari baru → mancing boleh lagi', S.cekAksi({ ...d, hari: d.hari + 1 }, 'mancing').boleh);
    // Panen: upah, 1×/hari, bukan shift, HANYA akhir pekan (penyesuaian M13: hari 6 = Sabtu)
    ok('A: panen tutup di hari kerja (Senin)', !S.cekAksi(awal('pagi'), 'bantuPanen').boleh, S.cekAksi(awal('pagi'), 'bantuPanen').alasan);
    d = { ...awal('pagi'), hari: 6, tanggal: 6 };
    r = jalan(d, 'bantuPanen');
    ok('A: panen → upah +20.000, kerja_sawah, uangKerja', !r.ditolak && r.data.uang - d.uang === 20000 && r.data.stat.kerja_sawah === 1 && r.data.stat.uangKerja === 20000);
    ok('A: panen bukan shift (kerjaHariTerakhir tetap, stat kerja 0)', r.data.kerjaHariTerakhir === d.kerjaHariTerakhir && !(r.data.stat.kerja > 0));
    ok('A: panen ke-2 ditolak', !!jalan(r.data, 'bantuPanen').ditolak);
    ok('A: sudah shift warteg hari ini → panen tetap boleh', S.cekAksi({ ...d, kerjaHariTerakhir: d.hari }, 'bantuPanen').boleh);
    // Main bola
    d = awal('sore');
    r = jalan(d, 'mainBolaKampung');
    ok('A: main bola → ⚡ & 😵 turun, kebugaran naik', !r.ditolak && r.data.energi < 100 && r.data.stres < 60 && r.data.kebugaran > d.kebugaran);
    ok('A: main bola ke-2 ditolak', !!jalan(r.data, 'mainBolaKampung').ditolak);
    ok('A: kategori bareng online', S.kategoriBareng('mainBolaKampung') === 'nongkrong' && S.kategoriBareng('mancing') === 'nongkrong');
    // Aksi 0-fase tidak menaikkan IPK; tidak ada aksi baru yang menaikkan IPK
    ok('A: tidak ada aksi baru yang menaikkan IPK', ['ngopiTepiKali', 'mancing', 'bantuPanen', 'mainBolaKampung'].every((id) => !(S.AKSI[id].efek.ipk > 0)));
    return out;
  }, MENIT);
  for (const o of logika) cek(hasil, o.nama, o.lulus, o.info);

  // ===== Bagian B: integrasi di game (teleport → titik interaksi → tombol aksi) =====
  try {
    await mulaiBaru(p);
  } catch (e) {
    // Game tidak ter-render (mis. modul UI rusak) → bagian B tidak bisa diuji; laporkan penyebabnya
    const sebab = await jalankan(p, async () => import('/src/App.tsx').then(() => 'App ok', (x) => `App.tsx: ${x.message}`));
    cek(hasil, 'B: game ter-render (window.__game ada)', false, `${e.message.split('\n')[0]} | ${sebab} | ${errors.slice(0, 2).join(' | ')}`);
    throw new Error('Bagian B dilewati: game tidak ter-render');
  }
  await jalankan(p, () => window.__game.getState().lakukan('keluar'));
  await p.waitForTimeout(1500);

  /** Pindah ke titik interaksi & set waktu; kembalikan id interaksi terdekat. */
  const ke = async (titik, fase) => {
    await jalankan(
      p,
      ({ titik, fase, menit }) => {
        window.__game.setState({
          teleport: { x: titik[0], z: titik[1], rotY: 0, id: Date.now() },
          fase,
          menit,
          energi: 100,
          stres: 60,
          uang: 500000,
          porsiFase: 0,
          sibuk: null,
          terkunci: false,
          transisi: null,
          menuMakan: null,
          toasts: [],
        });
      },
      { titik, fase, menit: MENIT[fase] },
    );
    await p.waitForTimeout(900);
    return jalankan(p, () => window.__game.getState().dekat);
  };
  const keadaan = () => jalankan(p, () => {
    const s = window.__game.getState();
    return { uang: s.uang, energi: s.energi, stres: s.stres, stat: s.stat, menu: s.menuMakan, kerjaHari: s.kerjaHariTerakhir };
  });
  const lakukan = async (aksi) => {
    await jalankan(p, (a) => {
      window.__game.setState({ sibuk: null, terkunci: false, transisi: null, toasts: [] });
      window.__game.getState().lakukan(a);
    }, aksi);
    await p.waitForTimeout(250);
  };
  const titikDari = (id) => jalankan(p, async (id) => {
    const m = await import('/src/game/interaksi.ts');
    return m.INTERAKSI.dunia.find((i) => i.id === id)?.titik ?? null;
  }, id);

  // ===== 1. Pasar Kaget (malam saja) =====
  const tPasar = await titikDari('pasarKagetBarat');
  cek(hasil, 'Pasar Kaget: titik terdeteksi', (await ke(tPasar, 'siang')) === 'pasarKagetBarat');
  await lakukan('jajanPasarKaget');
  let k = await keadaan();
  cek(hasil, 'Pasar Kaget: tutup siang', k.menu === null, (await toast(p)).join(' | '));
  await ke(tPasar, 'malam');
  await lakukan('jajanPasarKaget');
  k = await keadaan();
  cek(hasil, 'Pasar Kaget: menu terbuka malam', k.menu === 'pasarKaget');
  await jalankan(p, () => window.__game.getState().beli('pasarKaget', 'martabak_mini'));
  const k2 = await keadaan();
  cek(hasil, 'Pasar Kaget: beli martabak (uang turun, stres turun, makan_pasarKaget)', k2.uang < k.uang && k2.stres < k.stres && (k2.stat.makan_pasarKaget ?? 0) === 1);
  await p.screenshot({ path: SS + 'area-pasarKaget.png' });

  // ===== 2. Kopi Tepi Kali =====
  const tKopi = await titikDari('kopiKali');
  cek(hasil, 'Kopi Tepi Kali: titik terdeteksi', (await ke(tKopi, 'begadang')) === 'kopiKali');
  await lakukan('ngopiTepiKali');
  k = await keadaan();
  cek(hasil, 'Kopi Tepi Kali: tutup begadang', (k.stat.ngopiTepiKali ?? 0) === 0);
  for (let i = 0; i < 3; i++) {
    await ke(tKopi, 'sore');
    await lakukan('ngopiTepiKali');
  }
  k = await keadaan();
  cek(hasil, 'Kopi Tepi Kali: ngopi 2×, ke-3 ditolak (anti-spam)', k.stat.ngopiTepiKali === 2, (await toast(p)).join(' | '));
  cek(hasil, 'Kopi Tepi Kali: makan_kopiKali tercatat 2× (stres dicek di bagian A)', k.stat.makan_kopiKali === 2);
  await lakukan('jajanKopiKali');
  cek(hasil, 'Kopi Tepi Kali: menu kopiKali', (await keadaan()).menu === 'kopiKali');

  // ===== 3. Mancing =====
  const tMancing = await titikDari('mancing0');
  cek(hasil, 'Mancing: titik terdeteksi', (await ke(tMancing, 'malam')) === 'mancing0');
  await lakukan('mancing');
  cek(hasil, 'Mancing: tutup malam', ((await keadaan()).stat.mancing ?? 0) === 0);
  const hasilMancing = [];
  for (let i = 0; i < 3; i++) {
    await ke(tMancing, 'pagi');
    await lakukan('mancing');
    hasilMancing.push((await toast(p)).join(' | '));
  }
  k = await keadaan();
  const jenis = Object.keys(k.stat).filter((s) => s.startsWith('mancing_'));
  cek(hasil, 'Mancing: 2× per hari, ke-3 ditolak', k.stat.mancing === 2 && jenis.length >= 1, hasilMancing[2]);
  console.log('   hasil mancing:', jenis.join(', '));

  // ===== 4. Bantu panen =====
  const tSawah = await titikDari('saung0');
  await jalankan(p, () => window.__game.setState({ hari: 6, tanggal: 6 })); // panen hanya Sabtu–Minggu
  cek(hasil, 'Sawah: titik terdeteksi', (await ke(tSawah, 'sore')) === 'saung0');
  await lakukan('bantuPanen');
  cek(hasil, 'Panen: tutup sore', ((await keadaan()).stat.bantuPanen ?? 0) === 0);
  await ke(tSawah, 'pagi');
  const k0 = await keadaan();
  await lakukan('bantuPanen');
  await ke(tSawah, 'pagi');
  await lakukan('bantuPanen');
  k = await keadaan();
  cek(hasil, 'Panen: upah masuk, kerja_sawah tercatat, 1×/hari', k.stat.bantuPanen === 1 && k.stat.kerja_sawah === 1 && k.stat.uangKerja === (k0.stat.uangKerja ?? 0) + 20000);
  cek(hasil, 'Panen: bukan shift kerja (kerjaHariTerakhir tetap, stat kerja tidak naik)', k.kerjaHari === k0.kerjaHari && (k.stat.kerja ?? 0) === (k0.stat.kerja ?? 0));

  // ===== 5. Es degan =====
  const tDegan = await titikDari('esDegan');
  cek(hasil, 'Es Degan: titik terdeteksi', (await ke(tDegan, 'malam')) === 'esDegan');
  await lakukan('jajanEsDegan');
  cek(hasil, 'Es Degan: tutup malam', (await keadaan()).menu === null);
  await ke(tDegan, 'siang');
  await lakukan('jajanEsDegan');
  await jalankan(p, () => window.__game.getState().beli('esDegan', 'es_degan'));
  cek(hasil, 'Es Degan: beli → makan_esDegan', ((await keadaan()).stat.makan_esDegan ?? 0) === 1);
  await p.screenshot({ path: SS + 'area-esDegan.png' });

  // ===== 6. Lapangan kampung =====
  const tLap = await titikDari('lapanganKampung');
  cek(hasil, 'Lapangan Kampung: titik terdeteksi', (await ke(tLap, 'malam')) === 'lapanganKampung');
  await lakukan('mainBolaKampung');
  cek(hasil, 'Main bola: tutup malam', ((await keadaan()).stat.mainBolaKampung ?? 0) === 0);
  await ke(tLap, 'sore');
  const kb = await keadaan();
  await lakukan('mainBolaKampung');
  k = await keadaan();
  cek(hasil, 'Main bola: energi & stres turun', k.stat.mainBolaKampung === 1 && k.energi < kb.energi && k.stres < kb.stres);
  await ke(tLap, 'sore');
  await lakukan('mainBolaKampung');
  cek(hasil, 'Main bola: 1×/hari', (await keadaan()).stat.mainBolaKampung === 1);
  await p.screenshot({ path: SS + 'area-lapangan.png' });

  // ===== 7. Tiga jembatan: jalan LURUS utara–selatan pakai joystick (dikoreksi ke sudut kamera) =====
  for (const jx of [-32, 0, 32]) {
    for (const [z0, z1, arahZ] of [[-45.5, -55, -1], [-55, -45.5, 1]]) {
      const x = jx - 2.4; // trotoar jembatan (lajur kendaraan di jx ± 1)
      const r = await jalankan(p, async ({ x, z0, z1, arahZ }) => {
        const inp = await import('/src/game/input.ts');
        const g = window.__game;
        g.setState({ teleport: { x, z: z0, rotY: 0, id: Date.now() }, sibuk: null, terkunci: false, transisi: null, menuMakan: null, event: null });
        await new Promise((r) => setTimeout(r, 600));
        const t0 = performance.now();
        let xMaks = 0;
        // Joystick → dunia: wx = jx·cos + jy·sin, wz = −jx·sin + jy·cos  ⇒ untuk (0, arahZ): jx = −arahZ·sin, jy = arahZ·cos
        while (performance.now() - t0 < 9000) {
          const a = g.getState().kameraSudut;
          inp.joyInput.x = -arahZ * Math.sin(a);
          inp.joyInput.y = arahZ * Math.cos(a);
          // Tutup dialog cerita/transisi yang muncul sendiri (bukan yang diuji di sini)
          const st = g.getState();
          if (st.event || st.transisi || st.cerita.antrean.length) g.setState({ event: null, transisi: null, cerita: { ...st.cerita, antrean: [] } });
          await new Promise((r) => requestAnimationFrame(r));
          xMaks = Math.max(xMaks, Math.abs(window.__pos.x - x));
          if ((window.__pos.z - z1) * arahZ >= 0) break;
        }
        inp.joyInput.x = 0;
        inp.joyInput.y = 0;
        return { z: window.__pos.z, geserX: xMaks };
      }, { x, z0, z1, arahZ });
      const sampai = (r.z - z1) * arahZ >= 0;
      cek(hasil, `Jembatan x=${jx} ${arahZ < 0 ? 'ke utara' : 'ke selatan'}: bisa diseberangi lurus`, sampai && r.geserX < 0.3, `z=${r.z.toFixed(2)} geserX=${r.geserX.toFixed(2)}`);
    }
  }

  cek(hasil, 'Tanpa error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  cek(hasil, 'Skrip selesai tanpa pengecualian', false, e.message.split('\n')[0]);
} finally {
  await browser.close();
}
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek area baru lulus');
process.exit(gagal ? 1 : 0);
