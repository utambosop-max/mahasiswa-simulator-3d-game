// Tes ambience area baru: kali, sawah (malam), pasar kaget (malam), gang + pembuka & mute.
// Jalankan (dev server harus nyala): node scripts/uji/ambience.mjs
import { SS, bukaBrowser, cek, halaman, jalankan, mulaiBaru } from './bantu.mjs';

/** Headless Chrome hanya menggambar saat diminta → screenshot berkala agar useFrame (teleport) jalan */
async function frame(p, detik) {
  for (let i = 0; i < detik * 4; i++) {
    await p.screenshot({ path: SS + 'amb-frame.png' });
    await p.waitForTimeout(250);
  }
}
const amb = (p) => jalankan(p, () => window.__ambArea(), null);
let idTp = 7000;
async function teleport(p, x, z) {
  await jalankan(p, (a) => window.__game.setState({ teleport: { x: a.x, z: a.z, rotY: 0, id: a.id } }), { x, z, id: ++idTp });
  await frame(p, 3);
}

const browser = await bukaBrowser();
const hasil = [];
try {
  const { p, errors } = await halaman(browser);
  await mulaiBaru(p);
  await p.mouse.click(5, 5); // interaksi pertama → unlock audio + mulai ambience
  await p.keyboard.press('Shift');
  await jalankan(p, () => {
    localStorage.setItem('mahasiswa-sim-suara', 'nyala');
    window.__game.setState({ fase: 'malam', menit: 800 });
  }, null);
  await jalankan(p, () => window.__game.getState().lakukan('keluar'), null);
  await frame(p, 2);

  const AREA = [
    ['kali', 0, -45],
    ['sawah', 73, -12],
    ['pasar', 15, 52],
    ['gang', -73, 20],
  ];
  for (const [id, x, z] of AREA) {
    await teleport(p, x, z);
    const a = await amb(p);
    const lain = Object.entries(a.target).filter(([k]) => k !== id).every(([, v]) => v < a.target[id]);
    cek(hasil, `teleport ${id} → gain ${id} naik & paling keras`, a.gain[id] > 0.005 && a.aktif[id] && lain, JSON.stringify({ pos: a.pos, gain: a.gain }));
  }

  // Siang: sawah & pasar diam
  await teleport(p, 73, -12);
  await jalankan(p, () => window.__game.setState({ fase: 'siang' }), null);
  await p.waitForTimeout(600);
  cek(hasil, 'siang → sawah 0 (malam saja)', (await amb(p)).target.sawah === 0);
  await jalankan(p, () => window.__game.setState({ fase: 'malam' }), null);

  // Pembuka aktif → semua 0
  await teleport(p, 15, 52);
  await jalankan(p, () => window.__game.setState({ pembuka: true }), null);
  await p.waitForTimeout(3500);
  let a = await amb(p);
  cek(hasil, 'pembuka aktif → ambience 0', Object.values(a.target).every((v) => v === 0) && a.gain.pasar < 0.002, JSON.stringify(a.gain));
  await jalankan(p, () => window.__game.setState({ pembuka: false }), null);
  await frame(p, 2);

  // Mute → 0
  await teleport(p, 0, -45);
  await jalankan(p, async () => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes('/src/audio/sfx.ts')) ?? '/src/audio/sfx.ts';
    (await import(url)).setMuted(true);
  }, null);
  await p.waitForTimeout(3500);
  a = await amb(p);
  cek(hasil, 'mute → ambience 0', Object.values(a.target).every((v) => v === 0) && a.gain.kali < 0.002, JSON.stringify(a.gain));
  await jalankan(p, async () => {
    const url = performance.getEntriesByType('resource').map((e) => e.name).find((u) => u.includes('/src/audio/sfx.ts')) ?? '/src/audio/sfx.ts';
    (await import(url)).setMuted(false);
  }, null);

  cek(hasil, '0 error konsol', errors.length === 0, errors.slice(0, 3).join(' | '));
} finally {
  await browser.close();
}
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(`\n${hasil.length - gagal}/${hasil.length} lulus`);
process.exit(gagal ? 1 : 0);
