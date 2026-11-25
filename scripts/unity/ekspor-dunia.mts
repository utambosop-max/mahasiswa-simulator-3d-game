// Ekspor tata letak dunia web (src/game/duniaLayout.ts) ke JSON untuk Unity — TANPA salin angka manual.
// Jalankan: node scripts/unity/ekspor-dunia.mts   (Node >= 23 bisa menjalankan TypeScript langsung)
//
// KEPUTUSAN KOORDINAT: Three.js kanan-tangan, Unity kiri-tangan. Agar peta TIDAK terbalik cermin,
// sumbu Z dibalik: zUnity = -zWeb (x & y tetap). Akibatnya "utara" web (z negatif, sungai) menjadi
// z positif di Unity (atas layar bila kamera menghadap +Z). Rotasi Y: rotYUnity(derajat) = 180 - rotYWeb(derajat);
// arah hadap '+z' <-> '-z' ditukar. Semua angka di dunia.json SUDAH dalam koordinat Unity.
import { register } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Hook loader kecil: impor tanpa ekstensi -> .ts, dan file .json -> modul "export default".
const hook = `
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (e) {
    if (spec.startsWith('.') && !/\.\w+$/.test(spec)) return next(spec + '.ts', ctx);
    throw e;
  }
}
export async function load(url, ctx, next) {
  if (url.endsWith('.json')) {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL(url), 'utf8');
    return { format: 'module', source: 'export default ' + src, shortCircuit: true };
  }
  return next(url, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(hook));

const akar = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const L = await import(pathToFileURL(resolve(akar, 'src/game/duniaLayout.ts')).href);

type H = '+z' | '-z' | '+x' | '-x';
const bulat = (n: number) => Math.round(n * 1000) / 1000;
const zU = (z: number) => bulat(-z);
const hadapU = (h: H): H => (h === '+z' ? '-z' : h === '-z' ? '+z' : h);
const rotU = (rad: number) => bulat(((180 - (rad * 180) / Math.PI) % 360 + 360) % 360);
const titik = ([x, z]: [number, number]) => ({ x: bulat(x), z: zU(z) });
const titikS = ([x, z, s]: [number, number, number]) => ({ x: bulat(x), z: zU(z), s: bulat(s) });
const titikR = ([x, z, r]: [number, number, number]) => ({ x: bulat(x), z: zU(z), rotY: rotU(r) });
// AABB: min/max Z ditukar karena tanda Z dibalik
const kotak = (k: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  ({ minX: bulat(k.minX), maxX: bulat(k.maxX), minZ: zU(k.maxZ), maxZ: zU(k.minZ) });

const D = L.DUNIA;
const data = {
  catatan: 'Dibuat otomatis oleh scripts/unity/ekspor-dunia.mts dari src/game/duniaLayout.ts. Koordinat Unity: zUnity = -zWeb. JANGAN edit manual.',
  dunia: { halfW: D.halfW, halfD: D.halfD, jalan: D.jalan, trotoar: D.trotoar, jalanH: D.jalanH.map(zU), jalanV: [...D.jalanV] },
  bangunan: L.BANGUNAN.map((b: any) => {
    const [px, pz] = L.titikDepan(b, 0.8);
    return {
      id: b.id, jenis: b.jenis, x: b.x, z: zU(b.z), w: b.w, d: b.d, hadap: hadapU(b.hadap),
      rotY: rotU(L.rotasiHadap(b.hadap)), depan: b.depan, tinggi: b.tinggi, warna: b.warna, atap: b.atap,
      nama: b.nama, papan: b.papan ?? '', aksen: b.aksen ?? '', lantai: b.lantai ?? 1, atapLimas: !!b.atapLimas,
      kanopi: !!b.kanopi, aksi: b.aksi ?? [], pintu: titik([px, pz]),
    };
  }),
  taman: { ...kotak(L.TAMAN), kolam: { x: L.TAMAN.kolam.x, z: zU(L.TAMAN.kolam.z), r: L.TAMAN.kolam.r }, bangku: titik([L.TAMAN.bangku.x, L.TAMAN.bangku.z]) },
  lapangan: { x: L.LAPANGAN.x, z: zU(L.LAPANGAN.z), w: L.LAPANGAN.w, d: L.LAPANGAN.d },
  lapanganKampung: { x: L.LAPANGAN_KAMPUNG.x, z: zU(L.LAPANGAN_KAMPUNG.z), w: L.LAPANGAN_KAMPUNG.w, d: L.LAPANGAN_KAMPUNG.d },
  halte: L.HALTE.map((h: any) => ({ id: h.id, nama: h.nama, x: h.x, z: zU(h.z), hadap: hadapU(h.hadap), rotY: rotU(L.rotasiHadap(h.hadap)) })),
  gerobak: { x: L.GEROBAK.x, z: zU(L.GEROBAK.z), hadap: hadapU(L.GEROBAK.hadap), rotY: rotU(L.rotasiHadap(L.GEROBAK.hadap)) },
  kosPetak: L.KOS_PETAK.map((p: any) => ({ x: p.x, z: zU(p.z), w: p.w, d: p.d, hadap: hadapU(p.hadap), rotY: rotU(L.rotasiHadap(p.hadap)), warna: p.warna, atap: p.atap })),
  sungai: { z: zU(L.SUNGAI.z), setengah: L.SUNGAI.setengah, jembatanSetengah: L.JEMBATAN_SETENGAH },
  jalurSungai: { z: zU(L.JALUR_SUNGAI.z), lebar: L.JALUR_SUNGAI.lebar, x0: L.JALUR_SUNGAI.x0, x1: L.JALUR_SUNGAI.x1 },
  gang: { x: L.GANG.x, lebar: L.GANG.lebar, z0: zU(L.GANG.z1), z1: zU(L.GANG.z0) },
  gapura: L.GAPURA.map((g: any) => ({ x: g.x, z: zU(g.z), teks: g.teks })),
  gapuraTiang: L.GAPURA_TIANG,
  menaraAir: { x: L.MENARA_AIR.x, z: zU(L.MENARA_AIR.z), tinggi: L.MENARA_AIR.tinggi },
  sawahBlok: L.SAWAH_BLOK.map(kotak),
  petakSawah: L.PETAK_SAWAH.map(kotak),
  kebun: L.KEBUN.map(kotak),
  bedengan: L.BEDENGAN.map(kotak),
  kebunPisang: kotak(L.KEBUN_PISANG),
  pasarKaget: { z: zU(L.PASAR_KAGET.z), lorong: L.PASAR_KAGET.lorong, x0: L.PASAR_KAGET.x0, x1: L.PASAR_KAGET.x1 },
  lapak: L.LAPAK.map((p: any) => ({ x: p.x, z: zU(p.z), hadap: hadapU(p.hadap), rotY: rotU(L.rotasiHadap(p.hadap)), atap: p.atap, w: L.LAPAK_UKURAN.w, d: L.LAPAK_UKURAN.d })),
  saung: L.SAUNG.map(titik),
  warung: L.WARUNG.map((w: any) => ({ x: w.x, z: zU(w.z), hadap: hadapU(w.hadap), rotY: rotU(L.rotasiHadap(w.hadap)), teks: w.teks, warna: w.warna, atap: w.atap, w: L.WARUNG_UKURAN.w, d: L.WARUNG_UKURAN.d })),
  spawn: { x: L.SPAWN_DUNIA.x, z: zU(L.SPAWN_DUNIA.z), rotY: rotU(L.SPAWN_DUNIA.rotY) },
  parkirMotor: { x: L.PARKIR_MOTOR.x, z: zU(L.PARKIR_MOTOR.z), rotY: rotU(L.PARKIR_MOTOR.rotY) },
  motor: L.MOTOR.map(titikR),
  pertamini: titik([L.PERTAMINI.x, L.PERTAMINI.z]),
  bendera: titik([L.BENDERA.x, L.BENDERA.z]),
  kursiWarkop: titik([L.KURSI_WARKOP.x, L.KURSI_WARKOP.z]),
  tiangLalin: L.TIANG_LALIN.map((t: any) => ({ x: t.x, z: zU(t.z), rotY: rotU(t.rotY), sumbu: t.sumbu })),
  lampu: L.LAMPU.map(titik),
  pohon: L.POHON.map(titikS),
  pohonKelapa: L.POHON_KELAPA.map(titikS),
  pohonPisang: L.POHON_PISANG.map(titikS),
  colliders: L.DUNIA_COLLIDERS.map(kotak),
};

// ---------- Interior gedung (src/game/gedungLayout.ts) -> gedung.json ----------
// Ruang 10 x 7 m berpusat di (0,0). Konversi sama: zUnity = -zWeb. Rotasi perabot (radian web) -> derajat Unity = -derajatWeb.
// Hanya gedung yang punya aksi; "kos" dilewati (pintunya menuju scene KamarKos).
const G = await import(pathToFileURL(resolve(akar, 'src/game/gedungLayout.ts')).href);
const dataGedung = {
  catatan: 'Dibuat otomatis oleh scripts/unity/ekspor-dunia.mts dari src/game/gedungLayout.ts. Koordinat Unity: zUnity = -zWeb. JANGAN edit manual.',
  ruang: { halfW: G.RUANG.halfW, halfD: G.RUANG.halfD, tinggi: G.RUANG.tinggi },
  gedung: L.BANGUNAN.filter((b: any) => b.id !== 'kos' && (b.aksi ?? []).length > 0).map((b: any) => {
    const t = G.tataGedung(b.id);
    const pj = G.PENJAGA[b.id];
    return {
      id: b.id, nama: b.nama, jenis: b.jenis, warna: b.warna, aksen: b.aksen ?? '',
      aksi: G.aksiKonter(b),
      perabot: t.perabot.map((p: any) => ({ jenis: p.jenis, x: bulat(p.x), z: zU(p.z), w: bulat(p.w), d: bulat(p.d),
        rotY: bulat(-((p.rot ?? 0) * 180) / Math.PI) + 0, warna: p.warna ?? '' })),
      adaKonter: !!t.konter,
      konter: t.konter ? titik([t.konter.x, t.konter.z]) : { x: 0, z: 0 },
      penjaga: titik([t.penjaga.x, t.penjaga.z]),
      namaPenjaga: pj?.nama ?? '', bajuPenjaga: pj?.baju ?? '', rambutPenjaga: pj?.rambut ?? '',
      pintu: titik([G.PINTU_GEDUNG.x, G.PINTU_GEDUNG.z]),
      spawn: { x: G.SPAWN_GEDUNG.x, z: zU(G.SPAWN_GEDUNG.z), rotY: rotU(G.SPAWN_GEDUNG.rotY) },
    };
  }),
};
const keGedung = resolve(akar, 'unity/MahasiswaSim3D/Assets/_Game/Data/gedung.json');
writeFileSync(keGedung, JSON.stringify(dataGedung, null, 1) + '\n', 'utf8');
console.log(`[ekspor-dunia] ${dataGedung.gedung.length} interior gedung -> ${keGedung}`);

const ke = resolve(akar, 'unity/MahasiswaSim3D/Assets/_Game/Data/dunia.json');
mkdirSync(dirname(ke), { recursive: true });
writeFileSync(ke, JSON.stringify(data, null, 1) + '\n', 'utf8');
console.log(`[ekspor-dunia] ${data.bangunan.length} bangunan, ${data.pohon.length} pohon, ${data.lampu.length} lampu -> ${ke}`);
