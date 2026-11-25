// Tes fitur M12: 7 gedung baru, panel layanan, lampu lalu lintas, tilang, gerobak cilok.
// Jalankan (dev server harus nyala): node scripts/uji/m12gedung.mjs
import { SS, bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

/**
 * Impor modul game yang SAMA dengan yang dipakai aplikasi. Vite kadang memuatnya dengan "?t=..."
 * (setelah file berubah); impor tanpa itu = salinan modul lain yang tidak pernah bergerak.
 */
const impor = (p, nama) =>
  jalankan(p, async (n) => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes(`/src/game/${n}.ts`)) ?? `/src/game/${n}.ts`;
    return url;
  }, nama);
/** Headless Chrome hanya menggambar frame saat diminta → ambil screenshot berkala agar useFrame berjalan */
async function jalankanFrame(p, detik) {
  for (let i = 0; i < detik * 4; i++) {
    await p.screenshot({ path: SS + 'm12-frame.png' });
    await p.waitForTimeout(250);
  }
}

const browser = await bukaBrowser();
const { p, errors } = await halaman(browser);
const hasil = [];
await mulaiBaru(p);

// Siang hari kerja, uang cukup, keluar ke dunia
await jalankan(p, () => {
  const g = window.__game;
  g.setState({
    uang: 2000000,
    fase: 'pagi',
    menit: 240,
    event: null,
    cerita: { ...g.getState().cerita, antrean: [] },
  });
});
await jalankan(p, () => window.__game.getState().lakukan('keluar'));
await p.waitForTimeout(1500);

const GEDUNG = [
  ['bank', 'bukaBank', 'bank'],
  ['gor', null, null],
  ['karier', 'bukaKarier', 'karier'],
  ['tani', 'bukaTokoTani', 'tani'],
  ['pasar', null, null],
  ['salon', 'potongRambut', 'salon'],
  ['polisi', 'bukaPosPolisi', 'polisi'],
];

for (const [id, aksi, panel] of GEDUNG) {
  await jalankan(p, (g) => {
    window.__game.setState({ dekat: g, transisi: null });
    window.__game.getState().lakukan('masukGedung');
  }, id);
  await p.waitForTimeout(1500);
  cek(hasil, `Masuk ${id}`, (await jalankan(p, () => window.__game.getState().gedung)) === id);
  if (aksi) {
    await jalankan(p, (a) => {
      window.__game.setState({ dekat: 'konter', transisi: null });
      window.__game.getState().lakukan(a);
    }, aksi);
    await p.waitForTimeout(400);
    cek(hasil, `Panel ${panel} terbuka`, (await jalankan(p, () => window.__game.getState().panelTempat)) === panel);
    await p.screenshot({ path: SS + `m12-panel-${id}.png` });
    await jalankan(p, () => window.__game.setState({ panelTempat: null }));
  } else {
    await p.screenshot({ path: SS + `m12-dalam-${id}.png` });
  }
  await jalankan(p, () => {
    window.__game.setState({ transisi: null });
    window.__game.getState().lakukan('keluarGedung');
  });
  await p.waitForTimeout(1500);
}

// Bank: beli emas & setor deposito lewat fungsi yang sama dengan tombol panel
const uang0 = await jalankan(p, () => window.__game.getState().uang);
await jalankan(p, () => {
  window.__game.setState({ dekat: 'bank', transisi: null });
  window.__game.getState().lakukan('masukGedung');
});
await p.waitForTimeout(1500);
await jalankan(p, () => {
  window.__game.setState({ dekat: 'konter', transisi: null });
  window.__game.getState().lakukan('bukaBank');
});
await p.waitForTimeout(300);
await p.getByRole('button', { name: /Beli 0,1 g/ }).click();
await p.waitForTimeout(200);
cek(hasil, 'Beli emas (tombol panel)', (await jalankan(p, () => window.__game.getState().emas)) === 1, `uang ${uang0} → ${await jalankan(p, () => window.__game.getState().uang)}`);
await jalankan(p, () => window.__game.setState({ panelTempat: null, transisi: null }));
await jalankan(p, () => window.__game.getState().lakukan('keluarGedung'));
await p.waitForTimeout(1500);

// Pemandangan perempatan + gerobak cilok
await jalankan(p, () => window.__game.setState({ teleport: { x: -6, z: 6, rotY: Math.PI, id: 9001 } }));
await p.waitForTimeout(1200);
await p.screenshot({ path: SS + 'm12-perempatan.png' });

// Gerobak cilok bergerak & lampu lalu lintas berjalan (baca modul yang dipakai aplikasi)
const urlCilok = await impor(p, 'cilok');
const urlLalin = await impor(p, 'lalulintas');
const bacaDunia = () =>
  jalankan(p, async ([uc, ul]) => {
    const c = await import(uc);
    const l = await import(ul);
    return { cilok: c.CILOK.x, t: l.JAM_LALIN.t, x: l.warnaLampu('x'), z: l.warnaLampu('z') };
  }, [urlCilok, urlLalin]);
const d0 = await bacaDunia();
await jalankanFrame(p, 9);
const d1 = await bacaDunia();
cek(hasil, 'Gerobak cilok bergerak', d0.cilok !== d1.cilok, `${d0.cilok.toFixed(2)} → ${d1.cilok.toFixed(2)}`);
cek(hasil, 'Jam lampu lalu lintas berjalan', d1.t > d0.t + 3, `${d0.t.toFixed(1)} → ${d1.t.toFixed(1)} dtk`);
cek(hasil, 'Lampu x & z tidak hijau bersamaan', !(d1.x === 'hijau' && d1.z === 'hijau'), `x=${d1.x} z=${d1.z}`);

// Tilang: fungsi kenaTilang memotong uang (tanpa SIM = denda dobel)
const t = await jalankan(p, async () => {
  const m = await import('/src/game/m12.ts');
  const s = window.__game.getState();
  const h = m.kenaTilang({ ...s, punyaSim: false });
  return s.uang - h.data.uang;
});
cek(hasil, 'Denda tilang tanpa SIM = 100rb', t === 100000, String(t));

cek(hasil, 'Tanpa error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log('Toast terakhir:', await toast(p));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek M12 gedung lulus');
process.exit(gagal ? 1 : 0);
