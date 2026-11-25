// Tes browser online: 2–3 pemain sungguhan (Chrome) + server yang dimatikan & dinyalakan ulang.
// Cek: lampu/cilok sinkron walau jam HP meleset 40 dtk, sambung ulang otomatis (backoff) setelah server restart,
// progres tidak hilang, tab ganda (HP sama) menendang sesi lama tanpa saling tendang, tanpa error konsol.
// Butuh: npm run dev (port 5173) + server hasil build:  $env:SERVER_MJS='<folder>/server.mjs'
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { bukaBrowser, cek as cekBantu, halaman, jalankan, URL, SS } from './bantu.mjs';

const SERVER = resolve(process.env.SERVER_MJS ?? 'dist-server/server.mjs');
const KODE = 'ujiUlang123';
const PORT = 20000 + Math.floor(Math.random() * 20000);
const DATA = mkdtempSync(join(process.env.TMP_UJI ?? tmpdir(), 'uji-ulang-'));
const WEB = resolve('dist'); // hanya untuk /sehat; game dibuka dari dev server (butuh window.__onlineUji)
const URL_GAME = URL;
const hasil = [];
const cek = (nama, lulus, info = '') => cekBantu(hasil, nama, !!lulus, info);
const akhir = String(Math.floor(Math.random() * 900) + 100);

let srv = null;
function nyalakan() {
  return new Promise((ok, gagal) => {
    srv = spawn(process.execPath, [SERVER], { cwd: DATA, env: { ...process.env, PORT: String(PORT), KODE_SERVER: KODE, WEB_DIR: WEB } });
    let log = '';
    const t = setTimeout(() => gagal(new Error('server tidak menyala')), 8000);
    const baca = (b) => {
      log += b.toString();
      if (log.includes('Biarkan jendela')) {
        clearTimeout(t);
        ok();
      }
    };
    srv.stdout.on('data', baca);
    srv.stderr.on('data', baca);
  });
}
async function matikan() {
  if (!srv || srv.exitCode !== null) return;
  const s = srv;
  const keluar = new Promise((r) => s.once('exit', r));
  s.kill();
  await Promise.race([keluar, new Promise((r) => setTimeout(r, 3000))]);
}

const urlModul = (p, nama) =>
  jalankan(p, (n) => performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes(`/src/${n}`)) ?? `/src/${n}`, nama);
// Error "WebSocket connection ... failed" saat server sengaja dimatikan = wajar, bukan bug
const errorAsli = (e) => e.filter((x) => !/WebSocket|ERR_CONNECTION_REFUSED|Failed to load resource/i.test(x));

async function pemain(browser, nama, { geserJam = 0, token = null } = {}) {
  const { p, errors } = await halaman(browser);
  if (geserJam) {
    // Jam HP ini sengaja meleset → lampu/cilok harus tetap sama berkat jam server
    await p.addInitScript((g) => {
      const asli = Date.now.bind(Date);
      Date.now = () => asli() + g;
    }, geserJam);
  }
  await p.goto(URL_GAME, { waitUntil: 'networkidle' });
  await p.evaluate((tok) => {
    localStorage.clear();
    if (tok) localStorage.setItem('mahasiswa-sim-online', JSON.stringify({ nama: '', warna: '', alamat: '', kode: '', token: tok }));
  }, token);
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.waitForFunction(() => !!window.__onlineUji, null, { timeout: 15000 });
  await jalankan(p, ([n, k, port]) => window.__onlineUji.mulaiSambung(`localhost:${port}`, n, '#ff9aa2', k), [nama, KODE, PORT]);
  await p.waitForFunction(() => window.__online.getState().status === 'lobi', null, { timeout: 15000 });
  await jalankan(p, () => window.__onlineUji.gabung(null));
  await p.waitForFunction(() => window.__online.getState().status === 'main', null, { timeout: 15000 });
  await p.waitForTimeout(800);
  await jalankan(p, () => {
    const g = window.__game;
    if (!g.getState().profil) g.setState({ profil: { nama: 'Uji', jurusan: 'teknik', asal: 'jawa', kulit: 1, rambut: '#3b2a20', baju: '#7cc6a4', gaya: 'pendek', ultah: { tanggal: 9, bulan: 2 } } });
    g.setState({ buatKarakter: false, layarUtama: false });
  });
  return { p, errors };
}

const browser = await bukaBrowser();
try {
  await nyalakan();
  const A = await pemain(browser, `Ani${akhir}`, { geserJam: 40000 });
  const B = await pemain(browser, `Bayu${akhir}`);
  cek('Dua pemain tersambung', (await jalankan(B.p, () => window.__online.getState().pemain.filter((x) => x.status !== 'offline').length)) >= 2);

  // 1) Lampu & cilok sinkron walau jam HP Ani maju 40 detik
  await A.p.waitForTimeout(2500); // beberapa pesan jam (ms) untuk menghitung selisih
  const bacaDunia = async (x) => {
    const ul = await urlModul(x.p, 'game/lalulintas.ts');
    const uc = await urlModul(x.p, 'game/cilok.ts');
    return jalankan(x.p, async ([a, b]) => {
      const l = await import(a);
      const c = await import(b);
      c.langkahCilok();
      return { x: l.warnaLampu('x'), z: l.warnaLampu('z'), cilok: c.CILOK.x, ciz: c.CILOK.z };
    }, [ul, uc]);
  };
  let sama = 0;
  let selisih = 0;
  for (let i = 0; i < 6; i++) {
    const [a, b] = await Promise.all([bacaDunia(A), bacaDunia(B)]);
    if (a.x === b.x && a.z === b.z) sama++;
    selisih = Math.max(selisih, Math.hypot(a.cilok - b.cilok, a.ciz - b.ciz));
    await A.p.waitForTimeout(1100);
  }
  cek('Lampu sama walau jam HP meleset 40 dtk', sama >= 5, `${sama}/6 sampel sama`);
  cek('Gerobak cilok sama walau jam HP meleset', selisih < 0.5, `selisih maks ${selisih.toFixed(2)} m`);

  // 2) Server mati lalu menyala lagi → HP menyambung ulang otomatis, progres tidak hilang
  await jalankan(A.p, () => window.__game.setState({ uang: 123456 }));
  await jalankan(A.p, () => window.__game.getState().terapkanOnline({ ...window.__game.getState(), uang: 123457 }, []));
  await A.p.waitForTimeout(4000); // save terkirim & tertulis ke disk
  await matikan();
  await A.p.waitForFunction(() => window.__online.getState().status !== 'main', null, { timeout: 8000 });
  const stPutus = await jalankan(A.p, () => ({ s: window.__online.getState().status, u: window.__online.getState().ulangDalam }));
  cek('Server mati → layar putus + sambung ulang otomatis dijadwalkan', stPutus.s === 'putus' || stPutus.s === 'menyambung', JSON.stringify(stPutus));
  await A.p.screenshot({ path: SS + 'online-putus.png', timeout: 5000 }).catch(() => {});
  // Ani main sebentar saat putus? Terkunci → tidak bisa. Ubah uang lokal untuk memastikan HP tidak ditimpa save lama.
  await A.p.waitForTimeout(1500);
  await nyalakan();
  const t0 = Date.now();
  await Promise.all([
    A.p.waitForFunction(() => window.__online.getState().status === 'main', null, { timeout: 40000 }),
    B.p.waitForFunction(() => window.__online.getState().status === 'main', null, { timeout: 40000 }),
  ]).catch(() => {});
  const stA = await jalankan(A.p, () => ({ s: window.__online.getState().status, uang: window.__game.getState().uang, kunci: window.__game.getState().terkunci, sibuk: !!window.__game.getState().sibuk }));
  const stB = await jalankan(B.p, () => window.__online.getState().status);
  cek('Keduanya tersambung lagi otomatis setelah server restart', stA.s === 'main' && stB === 'main', `${Math.round((Date.now() - t0) / 1000)} dtk, A=${stA.s} B=${stB}`);
  cek('Progres Ani tidak hilang', stA.uang === 123457, `uang=${stA.uang}`);
  cek('Ani tidak terkunci setelah sambung ulang', !stA.kunci || stA.sibuk);
  await B.p.waitForTimeout(1500);
  const lihat = await jalankan(B.p, (n) => window.__online.getState().pemain.filter((x) => x.nama === n).map((x) => x.status), `Ani${akhir}`);
  cek('Bayu melihat Ani online lagi (1 entri)', lihat.length === 1 && lihat[0] !== 'offline', JSON.stringify(lihat));

  // 3) Tab ganda: HP/tab lain dengan token Bayu → sesi lama ditendang dengan pesan, TIDAK saling tendang
  const tokenB = await jalankan(B.p, () => window.__online.getState().token);
  const B2 = await pemain(browser, `Bayu${akhir}`, { token: tokenB });
  await B.p.waitForTimeout(2500);
  const st1 = await jalankan(B.p, () => ({ s: window.__online.getState().status, g: window.__online.getState().galat, u: window.__online.getState().ulangDalam }));
  const st2 = await jalankan(B2.p, () => window.__online.getState().status);
  cek('Tab lama Bayu ditutup dengan pesan & tanpa sambung ulang otomatis', st1.s === 'putus' && /tab\/HP lain/.test(st1.g ?? '') && st1.u === null, JSON.stringify(st1));
  cek('Tab baru Bayu tetap main', st2 === 'main');
  await B.p.screenshot({ path: SS + 'online-tab-ganda.png', timeout: 5000 }).catch(() => {});
  const layar = await B.p.getByText('Sambung lagi').count();
  cek('Tab lama masih punya tombol (tidak terkunci tanpa jalan keluar)', layar > 0, layar > 0 ? '' : (await B.p.evaluate(() => document.body.innerText.slice(0, 200))).replace(/\s+/g, ' '));

  cek('Tanpa error konsol (Ani)', errorAsli(A.errors).length === 0, errorAsli(A.errors).slice(0, 2).join(' | '));
  cek('Tanpa error konsol (Bayu)', errorAsli(B.errors).length === 0, errorAsli(B.errors).slice(0, 2).join(' | '));
  cek('Tanpa error konsol (Bayu tab 2)', errorAsli(B2.errors).length === 0, errorAsli(B2.errors).slice(0, 2).join(' | '));
} catch (e) {
  cek('Tes berjalan tanpa exception', false, e?.stack ?? String(e));
} finally {
  await browser.close();
  await matikan();
  try {
    rmSync(DATA, { recursive: true, force: true });
  } catch {
    /* abaikan */
  }
}
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} dari ${hasil.length} cek gagal` : `\n✅ Semua ${hasil.length} cek sambung-ulang lulus`);
process.exit(gagal ? 1 : 0);
