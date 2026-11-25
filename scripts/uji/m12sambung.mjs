// Tes fitur M12 yang baru disambungkan: minum galon, siram & panen cabai, kerjakan lomba, hidrasi & listrik berjalan.
// Jalankan (dev server harus nyala): node scripts/uji/m12sambung.mjs
import { bukaBrowser, cek, halaman, jalankan, mulaiBaru, toast } from './bantu.mjs';

const browser = await bukaBrowser();
const { p, errors } = await halaman(browser);
const hasil = [];
await mulaiBaru(p);
const st = () => jalankan(p, () => {
  const s = window.__game.getState();
  return { hidrasi: s.hidrasi, galon: s.galonLiter, cabai: s.cabai, lomba: s.lomba, listrik: s.listrikKwh, uang: s.uang, sibuk: !!s.sibuk };
});

// Minum air dari galon
await jalankan(p, () => window.__game.setState({ hidrasi: 40, transisi: null }));
const a0 = await st();
await jalankan(p, () => window.__game.getState().lakukan('minum'));
const a1 = await st();
cek(hasil, 'Minum: hidrasi naik & galon berkurang', a1.hidrasi > a0.hidrasi && a1.galon < a0.galon, `hidrasi ${a0.hidrasi}→${a1.hidrasi}, galon ${a0.galon}→${a1.galon} L`);

// Hidrasi & listrik berjalan seiring waktu (60 menit di kamar)
await jalankan(p, () => window.__game.setState({ menit: 900, fase: 'malam' })); // 20.00 malam → lampu menyala (fase harus ikut diubah)
const b0 = await st();
await jalankan(p, () => window.__game.getState().majukanJam(60));
const b1 = await st();
cek(hasil, 'Waktu berjalan: hidrasi turun', b1.hidrasi < b0.hidrasi, `${b0.hidrasi}→${b1.hidrasi}`);
cek(hasil, 'Waktu berjalan: listrik kamar terpakai', b1.listrik < b0.listrik, `${b0.listrik}→${b1.listrik} kWh`);

// Cabai: tanam (beli bibit) → siram → panen
await jalankan(p, async () => {
  const u = performance.getEntriesByType('resource').map((e) => e.name).find((x) => x.includes('/src/game/m12.ts')) ?? '/src/game/m12.ts';
  const m = await import(u);
  window.__game.getState().fitur(m.beliBibitCabai, 'koin');
});
await jalankan(p, () => window.__game.setState((s) => ({ cabai: s.cabai ? { ...s.cabai, siramHari: s.hari - 1 } : null })));
await jalankan(p, () => window.__game.getState().lakukan('siramCabai'));
const c1 = await st();
cek(hasil, 'Siram cabai tercatat hari ini', c1.cabai && c1.cabai.siramHari === (await jalankan(p, () => window.__game.getState().hari)));
await jalankan(p, () => window.__game.setState((s) => ({ cabai: { ...s.cabai, tumbuh: 1 } })));
await jalankan(p, () => window.__game.getState().lakukan('panenCabai'));
const c2 = await st();
cek(hasil, 'Panen cabai: pot kosong lagi', c2.cabai === null, JSON.stringify(c2.cabai));

// Lomba: daftar → kerjakan sesi di meja → skor tercatat
await jalankan(p, () => window.__game.setState({ tanggal: 6, uang: 500000, energi: 90, stres: 35, sibuk: null, transisi: null }));
await jalankan(p, async () => {
  const u = performance.getEntriesByType('resource').map((e) => e.name).find((x) => x.includes('/src/game/m12.ts')) ?? '/src/game/m12.ts';
  const m = await import(u);
  window.__game.getState().fitur(m.daftarLomba, 'notif');
});
await jalankan(p, () => window.__game.getState().lakukan('kerjakanLomba'));
await p.waitForTimeout(300);
const d1 = await st();
cek(hasil, 'Kerjakan lomba: 1 sesi skor tercatat', d1.lomba && d1.lomba.skor.length === 1 && d1.lomba.skor[0] > 0, JSON.stringify(d1.lomba));

cek(hasil, 'Tanpa error konsol', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log('Toast terakhir:', await toast(p));
await browser.close();
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} cek gagal` : '\n✅ Semua cek sambungan M12 lulus');
process.exit(gagal ? 1 : 0);
