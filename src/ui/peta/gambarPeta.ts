// Penggambar peta 2D (kanvas) — dipakai minimap & peta besar.
// Peta diputar mengikuti sudut kamera (bawaan 45°) agar arahnya SAMA dengan dunia 3D di layar.
import {
  BANGUNAN,
  BEDENGAN,
  DUNIA,
  GANG,
  GEROBAK,
  HALTE,
  JALUR_SUNGAI,
  JEMBATAN_SETENGAH,
  KOS_PETAK,
  LAPAK,
  LAPAK_UKURAN,
  LAPANGAN,
  LAPANGAN_KAMPUNG,
  MENARA_AIR,
  PASAR_KAGET,
  PETAK_SAWAH,
  POHON,
  POHON_KELAPA,
  POHON_PISANG,
  SAUNG,
  SUNGAI,
  TAMAN,
  WARUNG,
  kotakWarung,
} from '../../game/duniaLayout';
import { KENDARAAN, UKURAN_KENDARAAN } from '../../game/lalulintas';

const WARNA = {
  luar: '#7fb86a',
  rumput: '#a6d785',
  taman: '#8fc76f',
  lapangan: '#6fc06a',
  jalan: '#8a8f99',
  kolam: '#8fd3ff',
  pohon: '#5aa45c',
  garis: '#3b2a20',
  // M13
  sawah: '#b9d98d',
  kebun: '#b98a5e',
  tanah: '#dcb98a',
  paving: '#e3cfa9',
  jembatan: '#e9605a',
};

export type OpsiPeta = {
  /** Pusat gambar di kanvas (px) */
  cx: number;
  cy: number;
  /** px per meter */
  skala: number;
  /** Titik dunia yang berada di pusat gambar */
  pusatX: number;
  pusatZ: number;
  label: boolean;
  pemain: { x: number; z: number; rotY: number } | null;
  motor: { x: number; z: number } | null;
  /** Sudut kamera (radian, bawaan π/4) — peta diputar sama dengan kamera */
  sudut?: number;
};

/** Ubah koordinat dunia (x, z) → koordinat kanvas. */
export function keLayar(x: number, z: number, o: OpsiPeta): [number, number] {
  const dx = (x - o.pusatX) * o.skala;
  const dz = (z - o.pusatZ) * o.skala;
  const c = Math.cos(o.sudut ?? Math.PI / 4);
  const s = Math.sin(o.sudut ?? Math.PI / 4);
  return [o.cx + dx * c - dz * s, o.cy + dx * s + dz * c];
}

// Kotak label yang sudah digambar di frame ini [x1, y1, x2, y2, ...] — dipakai ulang (tanpa alokasi baru)
const kotakLabel: number[] = [];
/** Nama pendek untuk peta: buang bagian setelah " & " dan nama orang ("Bang Cukur") */
const namaPendek = (n: string) => n.split(' & ')[0].replace(/ Bang Cukur$/, '');

function ikonDanLabel(g: CanvasRenderingContext2D, ikon: string, nama: string, x: number, z: number, o: OpsiPeta) {
  const [sx, sy] = keLayar(x, z, o);
  const ukuran = Math.max(12, Math.min(26, o.skala * 3));
  g.font = `${ukuran}px system-ui, sans-serif`;
  g.fillText(ikon, sx, sy);
  if (!o.label) return;
  g.font = `800 ${Math.max(9, Math.round(ukuran * 0.48))}px system-ui, sans-serif`;
  const ty = sy + ukuran * 0.85;
  nama = namaPendek(nama);
  // Lewati label yang akan menimpa label lain (ikon tetap tampil; nama ada di daftar Tempat)
  const lebar = g.measureText(nama).width / 2 + 2;
  const tinggi = ukuran * 0.3;
  for (let i = 0; i < kotakLabel.length; i += 4) {
    if (sx - lebar < kotakLabel[i + 2] && sx + lebar > kotakLabel[i] && ty - tinggi < kotakLabel[i + 3] && ty + tinggi > kotakLabel[i + 1]) return;
  }
  kotakLabel.push(sx - lebar, ty - tinggi, sx + lebar, ty + tinggi);
  g.lineWidth = 3.5;
  g.strokeStyle = 'rgba(255,255,255,0.92)';
  g.strokeText(nama, sx, ty);
  g.fillStyle = WARNA.garis;
  g.fillText(nama, sx, ty);
}

export function gambarPeta(g: CanvasRenderingContext2D, o: OpsiPeta): void {
  const { halfW, halfD, jalan, jalanH, jalanV } = DUNIA;
  g.save();
  g.translate(o.cx, o.cy);
  g.rotate(o.sudut ?? Math.PI / 4);
  g.scale(o.skala, o.skala);
  g.translate(-o.pusatX, -o.pusatZ);

  // Rumput, taman, lapangan
  g.fillStyle = WARNA.luar;
  g.fillRect(-halfW - 60, -halfD - 60, halfW * 2 + 120, halfD * 2 + 120);
  g.fillStyle = WARNA.rumput;
  g.fillRect(-halfW, -halfD, halfW * 2, halfD * 2);
  g.fillStyle = WARNA.taman;
  g.fillRect(TAMAN.minX, TAMAN.minZ, TAMAN.maxX - TAMAN.minX, TAMAN.maxZ - TAMAN.minZ);
  g.fillStyle = WARNA.lapangan;
  g.fillRect(LAPANGAN.x - LAPANGAN.w / 2, LAPANGAN.z - LAPANGAN.d / 2, LAPANGAN.w, LAPANGAN.d);
  g.fillStyle = WARNA.kolam;
  g.beginPath();
  g.arc(TAMAN.kolam.x, TAMAN.kolam.z, TAMAN.kolam.r, 0, Math.PI * 2);
  g.fill();

  // M13: area baru — sungai, sawah, kebun, lapangan kampung, pasar kaget, gang, jalur tepi sungai
  g.fillStyle = WARNA.kolam;
  g.fillRect(-halfW - 60, SUNGAI.z - SUNGAI.setengah, halfW * 2 + 120, SUNGAI.setengah * 2);
  g.fillStyle = WARNA.sawah;
  for (const p of PETAK_SAWAH) g.fillRect(p.minX, p.minZ, p.maxX - p.minX, p.maxZ - p.minZ);
  g.fillStyle = WARNA.kebun;
  for (const b of BEDENGAN) g.fillRect(b.minX, b.minZ, b.maxX - b.minX, b.maxZ - b.minZ);
  g.fillStyle = WARNA.tanah;
  g.fillRect(LAPANGAN_KAMPUNG.x - LAPANGAN_KAMPUNG.w / 2, LAPANGAN_KAMPUNG.z - LAPANGAN_KAMPUNG.d / 2, LAPANGAN_KAMPUNG.w, LAPANGAN_KAMPUNG.d);
  g.fillStyle = WARNA.paving;
  g.fillRect(-PASAR_KAGET.x1, PASAR_KAGET.z - PASAR_KAGET.lorong / 2, PASAR_KAGET.x1 * 2, PASAR_KAGET.lorong);
  g.fillRect(GANG.x - GANG.lebar / 2, GANG.z0, GANG.lebar, GANG.z1 - GANG.z0);
  g.fillRect(JALUR_SUNGAI.x0, JALUR_SUNGAI.z - JALUR_SUNGAI.lebar / 2, JALUR_SUNGAI.x1 - JALUR_SUNGAI.x0, JALUR_SUNGAI.lebar);

  // Jalan (jembatan = jalan yang melintas di atas sungai)
  g.fillStyle = WARNA.jalan;
  for (const jz of jalanH) g.fillRect(-halfW, jz - jalan, halfW * 2, jalan * 2);
  for (const jx of jalanV) g.fillRect(jx - jalan, -halfD, jalan * 2, halfD * 2);
  g.fillStyle = WARNA.jembatan;
  for (const jx of jalanV) {
    g.fillRect(jx - JEMBATAN_SETENGAH, SUNGAI.z - SUNGAI.setengah - 0.6, 0.5, SUNGAI.setengah * 2 + 1.2);
    g.fillRect(jx + JEMBATAN_SETENGAH - 0.5, SUNGAI.z - SUNGAI.setengah - 0.6, 0.5, SUNGAI.setengah * 2 + 1.2);
  }

  // Pohon (bulat, kelapa, pisang)
  g.fillStyle = WARNA.pohon;
  for (const daftar of [POHON, POHON_KELAPA, POHON_PISANG]) {
    for (const [x, z, s] of daftar) {
      g.beginPath();
      g.arc(x, z, 1.1 * s, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Kos petak, lapak, warung, saung (kotak kecil tanpa label)
  g.lineWidth = 0.25;
  g.strokeStyle = WARNA.garis;
  for (const p of KOS_PETAK) {
    g.fillStyle = p.atap;
    g.fillRect(p.x - p.w / 2, p.z - p.d / 2, p.w, p.d);
    g.strokeRect(p.x - p.w / 2, p.z - p.d / 2, p.w, p.d);
  }
  for (const l of LAPAK) {
    g.fillStyle = l.atap;
    g.fillRect(l.x - LAPAK_UKURAN.w / 2, l.z - LAPAK_UKURAN.d / 2, LAPAK_UKURAN.w, LAPAK_UKURAN.d);
  }
  for (const w of WARUNG) {
    const k = kotakWarung(w);
    g.fillStyle = w.atap;
    g.fillRect(k.minX, k.minZ, k.maxX - k.minX, k.maxZ - k.minZ);
  }
  g.fillStyle = '#8a5a35';
  for (const [x, z] of SAUNG) g.fillRect(x - 1.5, z - 1.5, 3, 3);
  g.fillStyle = '#7fb3e0';
  g.beginPath();
  g.arc(MENARA_AIR.x, MENARA_AIR.z, 1.4, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Bangunan
  g.lineWidth = 0.35;
  g.strokeStyle = WARNA.garis;
  for (const b of BANGUNAN) {
    g.fillStyle = b.jenis === 'rumah' ? b.warna : b.atap;
    g.beginPath();
    g.roundRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d, 0.8);
    g.fill();
    g.stroke();
  }

  // Kendaraan (titik kecil berwarna)
  for (const k of KENDARAAN) {
    const u = UKURAN_KENDARAAN[k.def.jenis];
    const sb = k.def.lajur.sumbu === 'x';
    g.fillStyle = k.def.warna;
    g.fillRect(k.x - (sb ? u.panjang : u.lebar), k.z - (sb ? u.lebar : u.panjang), (sb ? u.panjang : u.lebar) * 2, (sb ? u.lebar : u.panjang) * 2);
  }
  g.restore();

  // Ikon & label (digambar tegak, tidak ikut diputar)
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  kotakLabel.length = 0;
  for (const b of BANGUNAN) if (b.ikon) ikonDanLabel(g, b.ikon, b.nama, b.x, b.z, o);
  ikonDanLabel(g, '🌳', 'Taman', (TAMAN.minX + TAMAN.maxX) / 2, TAMAN.minZ + 2.5, o);
  ikonDanLabel(g, '⚽', 'Lapangan', LAPANGAN.x, LAPANGAN.z, o);
  ikonDanLabel(g, '🍳', 'Nasi Goreng', GEROBAK.x, GEROBAK.z, o);
  for (const h of HALTE) ikonDanLabel(g, '🚏', h.nama, h.x, h.z, o);
  // M13: area baru
  ikonDanLabel(g, '🏘️', 'Gang Kos Mawar', GANG.x, 18, o);
  ikonDanLabel(g, '🌾', 'Sawah', 73, -13, o);
  ikonDanLabel(g, '🥬', 'Kebun', 73, 37.5, o);
  ikonDanLabel(g, '🛍️', 'Pasar Kaget', 0, PASAR_KAGET.z, o);
  ikonDanLabel(g, '🏐', 'Lapangan Kampung', LAPANGAN_KAMPUNG.x, LAPANGAN_KAMPUNG.z, o);
  ikonDanLabel(g, '🌊', 'Kali', -50, SUNGAI.z, o);
  ikonDanLabel(g, '🗼', 'Menara Air', MENARA_AIR.x, MENARA_AIR.z, o);
  if (o.motor) ikonDanLabel(g, '🛵', 'Motormu', o.motor.x, o.motor.z, o);

  // Pemain: panah oranye menunjuk arah hadap
  if (o.pemain) {
    const [px, py] = keLayar(o.pemain.x, o.pemain.z, o);
    // Arah hadap dunia (sin, cos) → arah di kanvas (ikut rotasi peta)
    const hx = Math.sin(o.pemain.rotY);
    const hz = Math.cos(o.pemain.rotY);
    const c = Math.cos(o.sudut ?? Math.PI / 4);
    const s = Math.sin(o.sudut ?? Math.PI / 4);
    const sudut = Math.atan2(hx * s + hz * c, hx * c - hz * s);
    const r = Math.max(7, Math.min(12, o.skala * 1.4));
    g.save();
    g.translate(px, py);
    g.rotate(sudut);
    g.beginPath();
    g.moveTo(r * 1.3, 0);
    g.lineTo(-r * 0.8, r * 0.85);
    g.lineTo(-r * 0.4, 0);
    g.lineTo(-r * 0.8, -r * 0.85);
    g.closePath();
    g.fillStyle = '#ff8a3d';
    g.fill();
    g.lineWidth = 2.5;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.restore();
  }
}
