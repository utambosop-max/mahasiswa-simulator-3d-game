// Tes UI tema "HP mahasiswa" (rombak-ui UI-15): node scripts/uji/ui-hp.mjs
// Membuka HP, tiap aplikasi, notifikasi, event-chat (termasuk pilihan terkunci), pengaturan, tombol Kembali (window.__kembali)
// di 3 ukuran layar; screenshot + cek target sentuh ≥ 56 px, HUD ≤ 15% tinggi, dan 0 error konsol.
// Folder screenshot bisa diganti: set UI_SS=<folder>
import { mkdirSync } from 'node:fs';
import { SS, bukaBrowser, cek, halaman, jalankan, mulaiBaru } from './bantu.mjs';

const FOLDER = (process.env.UI_SS ?? SS + 'ui').replace(/[\\/]$/, '') + '/';
mkdirSync(FOLDER, { recursive: true });
const UKURAN = [
  [915, 412],
  [1280, 720],
  [2560, 1440],
];
const APPS = ['todo', 'buku', 'siakad', 'karier', 'bank', 'tas', 'chat', 'kgram', 'peta', 'kos', 'galeri', 'ktm', 'pengaturan'];

/** Halaman layar sentuh (pointer: coarse) agar aturan CSS HP (layar penuh, sembunyikan hint keyboard) aktif. */
async function halamanHP(browser, w, h) {
  const p = await (await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true })).newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.stack ?? e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { p, errors };
}

const hasil = [];
const browser = await bukaBrowser();
try {
  for (const [w, h] of UKURAN) {
    // 915×412 = HP sungguhan (layar sentuh → kotak game layar penuh 20:9); lainnya = browser PC (kotak 16:9)
    const { p, errors } = w === 915 ? await halamanHP(browser, w, h) : await halaman(browser, w, h);
    const tag = `${w}x${h}`;
    try {
      await mulaiBaru(p);
      await jalankan(p, () => window.__game.getState().lakukan('keluar'));
      await p.waitForTimeout(1500);
      // Kosongkan antrean adegan cerita (prolog) agar tidak menyela urutan tes
      await jalankan(p, () => {
        const s = window.__game.getState();
        window.__game.setState({ toasts: [], transisi: null, event: null, cerita: { ...s.cerita, antrean: [] } });
      });

      // ===== HUD (≤ 15% tinggi) =====
      const hud = await p.getByRole('button', { name: /^HP/ }).boundingBox();
      const kotak = await p.locator('.kotak-game').boundingBox();
      const porsi = hud && kotak ? (hud.y + hud.height - kotak.y) / kotak.height : 1;
      cek(hasil, `[${tag}] HUD ≤ 15% tinggi`, porsi <= 0.15, `${(porsi * 100).toFixed(1)}%`);
      await p.screenshot({ path: FOLDER + `hud-${tag}.png` });

      // ===== Notifikasi push =====
      await jalankan(p, () => {
        const g = window.__game.getState();
        g.toast('💰 Uang kiriman ortu Rp1.500.000 masuk 🙏');
        g.toast('📒 Halaman baru di Buku Sakti: 🍱 Toga & Rantang');
        g.toast('🔋 Baterai badan tinggal dikit. Colok ke kasur dulu!');
      });
      await p.waitForTimeout(350);
      await p.screenshot({ path: FOLDER + `notif-${tag}.png` });
      const jmlBanner = await p.locator('.anim-notif-masuk').count();
      cek(hasil, `[${tag}] Banner notif maks 3`, jmlBanner > 0 && jmlBanner <= 3, `${jmlBanner}`);

      // ===== HP: layar utama =====
      await jalankan(p, () => window.__game.getState().setHP(true));
      await p.waitForTimeout(400);
      await p.screenshot({ path: FOLDER + `hp-home-${tag}.png` });
      const ikon = await p.locator('[role=dialog] button[aria-label]').count();
      cek(hasil, `[${tag}] Home HP tampil (ikon aplikasi)`, ikon >= APPS.length);
      // Semua target sentuh di HP ≥ 56 px (kecuali garis Beranda yang hanya hiasan)
      const kecil = await p.evaluate(() =>
        [...document.querySelectorAll('[role=dialog] button')]
          .filter((b) => b.getAttribute('aria-label') !== 'Beranda')
          .map((b) => ({ n: b.getAttribute('aria-label') ?? b.textContent?.slice(0, 20), r: b.getBoundingClientRect() }))
          .filter((x) => x.r.height > 0 && (x.r.height < 55.5 || x.r.width < 55.5))
          .map((x) => `${x.n} ${Math.round(x.r.width)}×${Math.round(x.r.height)}`),
      );
      cek(hasil, `[${tag}] Target sentuh home ≥ 56 px`, kecil.length === 0, kecil.slice(0, 4).join(', '));
      // Home tanpa gulir
      const gulir = await p.evaluate(() => {
        const g = document.querySelector('[role=dialog] .flex-wrap')?.parentElement;
        return g ? g.scrollHeight - g.clientHeight : 0;
      });
      cek(hasil, `[${tag}] Home HP muat tanpa gulir`, gulir <= 2, `${gulir}px`);

      // ===== Riwayat notif (🔔) =====
      await p.getByRole('button', { name: /^Notifikasi/ }).dispatchEvent('pointerdown');
      await p.waitForTimeout(300);
      cek(hasil, `[${tag}] Daftar notifikasi`, (await p.getByText('Uang kiriman ortu').count()) > 0);
      cek(hasil, `[${tag}] Notif ditandai dibaca`, (await jalankan(p, () => window.__game.getState().notifBaru)) === 0);
      if (w === 1280) await p.screenshot({ path: FOLDER + `hp-notif-${tag}.png` });
      await jalankan(p, () => window.__kembali());
      await p.waitForTimeout(150);

      // ===== Tiap aplikasi =====
      const daftar = w === 1280 ? APPS : ['bank', 'buku', 'chat', 'peta', 'pengaturan', 'siakad'];
      for (const id of daftar) {
        await jalankan(p, (x) => window.__game.setState({ hpApp: x }), id);
        await p.waitForTimeout(id === 'peta' ? 500 : 250);
        await p.screenshot({ path: FOLDER + `app-${id}-${tag}.png` });
      }
      cek(hasil, `[${tag}] Buku Sakti dibuka → badge "Baru" hilang`, (await jalankan(p, () => window.__game.getState().hpApp)) !== null);

      // Tab terkunci (Peringkat saat offline) tetap bisa ditekan → alasan
      await jalankan(p, () => window.__game.setState({ hpApp: 'ktm', toasts: [] }));
      await p.waitForTimeout(200);
      await p.getByRole('button', { name: /Peringkat/ }).click();
      await p.waitForTimeout(200);
      const alasan = await jalankan(p, () => window.__game.getState().toasts.map((t) => t.teks).join(' '));
      cek(hasil, `[${tag}] Tab terkunci memberi alasan`, alasan.includes('online'), alasan.slice(0, 60));

      // ===== Tombol Kembali (logika sama dengan tombol fisik Android) =====
      await jalankan(p, () => window.__game.getState().setHP(true, 'bank'));
      await jalankan(p, () => window.__kembali());
      const k1 = await jalankan(p, () => [window.__game.getState().hpTerbuka, window.__game.getState().hpApp]);
      await jalankan(p, () => window.__kembali());
      const k2 = await jalankan(p, () => window.__game.getState().hpTerbuka);
      await jalankan(p, () => window.__kembali());
      await p.waitForTimeout(200);
      const konfirm = (await p.getByText('Yakin keluar?').count()) > 0;
      if (w === 915) await p.screenshot({ path: FOLDER + `keluar-${tag}.png` });
      await jalankan(p, () => window.__kembali());
      await p.waitForTimeout(150);
      const k4 = (await p.getByText('Yakin keluar?').count()) === 0;
      cek(hasil, `[${tag}] Kembali: app → home → tutup → konfirmasi → batal`, k1[0] === true && k1[1] === null && k2 === false && konfirm && k4);

      // ===== ⚙️ HUD → HP › Pengaturan =====
      await p.getByRole('button', { name: 'Pengaturan' }).dispatchEvent('pointerdown');
      await p.waitForTimeout(300);
      cek(hasil, `[${tag}] ⚙️ membuka HP › Pengaturan`, (await p.getByText('Kurangi animasi').count()) > 0 && (await p.getByText('Tonton ulang pembuka').count()) > 0);
      await p.screenshot({ path: FOLDER + `pengaturan-${tag}.png` });
      await jalankan(p, () => window.__game.getState().setHP(false));

      // ===== Event = chat (pilihan terkunci tetap tampil + alasan) =====
      await jalankan(p, () =>
        window.__game.setState({
          event: {
            id: 'tes-ui',
            ikon: '🏠',
            judul: 'Ibu Kos',
            teks: 'Dik, uang kos bulan ini kapan dibayar? Jangan sampai tanggal 15 ya 😊',
            peluang: 0,
            pilihan: [
              { label: '💸 Bayar sekarang', efek: { uang: -50000, stres: -5 } },
              { label: '🙏 Minta waktu', efek: { stres: 4 }, terkunci: '🔒 Akrab dulu sama Ibu Kos (❤️ 2) biar boleh ngutang.' },
            ],
          },
        }),
      );
      await p.waitForTimeout(350);
      await p.screenshot({ path: FOLDER + `event-chat-${tag}.png` });
      cek(hasil, `[${tag}] Event chat: alasan terkunci tampil`, (await p.getByText('Akrab dulu sama Ibu Kos').count()) > 0);
      await jalankan(p, () => window.__game.setState({ event: null }));

      cek(hasil, `[${tag}] Tanpa error konsol`, errors.length === 0, errors.slice(0, 2).join(' | ').slice(0, 300));
    } finally {
      await p.context().close();
    }
  }
} finally {
  await browser.close();
}
const gagal = hasil.filter((x) => !x.lulus).length;
console.log(`\nScreenshot: ${FOLDER}`);
console.log(gagal ? `❌ ${gagal} cek gagal` : '✅ Semua cek UI HP lulus');
process.exit(gagal ? 1 : 0);
