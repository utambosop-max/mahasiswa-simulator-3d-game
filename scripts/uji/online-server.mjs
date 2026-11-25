// Tes server online TANPA browser (skill coop-netcode-server + game-qa-automation).
// Menjalankan server sendiri di folder data sementara + port acak, lalu mensimulasikan 2–4 klien:
// pemain normal, klien NAKAL (data rusak, frame WebSocket rusak, banjir pesan), putus-sambung, sesi ganda,
// file data rusak, migrasi data lama, versi klien tidak cocok.
// Jalankan:  npx vite build -c vite.server.config.ts --outDir <folder>  lalu
//            $env:SERVER_MJS='<folder>/server.mjs'; node scripts/uji/online-server.mjs
// (tanpa SERVER_MJS → memakai dist-server/server.mjs hasil `npm run server:build`)
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SERVER = resolve(process.env.SERVER_MJS ?? 'dist-server/server.mjs');
const KODE = 'rahasia123';
const PORT = 20000 + Math.floor(Math.random() * 20000);
const DATA = mkdtempSync(join(process.env.TMP_UJI ?? tmpdir(), 'uji-online-'));
const hasil = [];
const cek = (nama, lulus, info = '') => {
  hasil.push({ nama, lulus: !!lulus });
  console.log(`${lulus ? '✅' : '❌'} ${nama}${info ? ` — ${info}` : ''}`);
};
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
const token = () => randomBytes(16).toString('hex');
const akhir = String(Math.floor(Math.random() * 900) + 100);

// ===== Server =====
let srv = null;
let logServer = '';
function nyalakan() {
  return new Promise((ok, gagal) => {
    srv = spawn(process.execPath, [SERVER], { cwd: DATA, env: { ...process.env, PORT: String(PORT), KODE_SERVER: KODE, WEB_DIR: resolve('dist') } });
    const t = setTimeout(() => gagal(new Error('server tidak menyala')), 8000);
    const awal = logServer.length; // hanya cari di log proses YANG BARU ini
    const baca = (b) => {
      logServer += b.toString();
      if (logServer.slice(awal).includes('Biarkan jendela')) {
        clearTimeout(t);
        ok();
      }
    };
    srv.stdout.on('data', baca);
    srv.stderr.on('data', baca);
    srv.on('exit', (c) => {
      logServer += `\n[server keluar kode ${c}]\n`;
    });
  });
}
async function matikan() {
  if (!srv || srv.exitCode !== null) return;
  const s = srv;
  const keluar = new Promise((r) => s.once('exit', r));
  s.kill();
  await keluar;
}
async function sehat() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/sehat`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// ===== Klien WebSocket mentah (agar bisa mengirim frame rusak) =====
class Klien {
  constructor() {
    this.pesan = [];
    this.tertutup = false;
    this.buf = Buffer.alloc(0);
  }
  buka() {
    return new Promise((ok, gagal) => {
      const s = connect(PORT, '127.0.0.1');
      this.s = s;
      const key = randomBytes(16).toString('base64');
      let sudah = false;
      s.on('connect', () =>
        s.write(`GET /ws HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`),
      );
      s.on('data', (d) => {
        if (!sudah) {
          const teks = d.toString('latin1');
          const i = teks.indexOf('\r\n\r\n');
          if (i < 0 || !teks.startsWith('HTTP/1.1 101')) return gagal(new Error('handshake gagal'));
          const harap = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
          if (!teks.includes(harap)) return gagal(new Error('accept salah'));
          sudah = true;
          ok(this);
          d = d.subarray(i + 4);
        }
        this.urai(d);
      });
      s.on('close', () => {
        this.tertutup = true;
        if (!sudah) gagal(new Error('ditutup sebelum handshake'));
      });
      s.on('error', () => {});
    });
  }
  urai(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 2) {
      const op = this.buf[0] & 0x0f;
      let len = this.buf[1] & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        len = Number(this.buf.readBigUInt64BE(2));
        off = 10;
      }
      if (this.buf.length < off + len) return;
      const isi = this.buf.subarray(off, off + len);
      this.buf = this.buf.subarray(off + len);
      if (op === 1) {
        try {
          this.pesan.push(JSON.parse(isi.toString('utf8')));
        } catch {
          /* abaikan */
        }
      } else if (op === 9) this.frame(0xa, isi);
    }
  }
  /** Kirim frame mentah. opsi: masker (bawaan true), fin, rsv, panjangPalsu */
  frame(op, data, o = {}) {
    if (this.tertutup) return;
    const isi = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const masker = o.masker ?? true;
    const n = o.panjangPalsu ?? isi.length;
    let kepala;
    const b0 = ((o.fin ?? true) ? 0x80 : 0) | ((o.rsv ?? 0) << 4) | op;
    if (n < 126) kepala = Buffer.from([b0, (masker ? 0x80 : 0) | n]);
    else if (n < 65536) {
      kepala = Buffer.alloc(4);
      kepala[0] = b0;
      kepala[1] = (masker ? 0x80 : 0) | 126;
      kepala.writeUInt16BE(n, 2);
    } else {
      kepala = Buffer.alloc(10);
      kepala[0] = b0;
      kepala[1] = (masker ? 0x80 : 0) | 127;
      kepala.writeBigUInt64BE(BigInt(n), 2);
    }
    let badan = isi;
    let m = Buffer.alloc(0);
    if (masker) {
      m = randomBytes(4);
      badan = Buffer.from(isi);
      for (let i = 0; i < badan.length; i++) badan[i] ^= m[i & 3];
    }
    try {
      this.s.write(Buffer.concat([kepala, m, badan]));
    } catch {
      /* abaikan */
    }
  }
  kirim(obj) {
    this.frame(1, typeof obj === 'string' ? obj : JSON.stringify(obj));
  }
  /** Tunggu pesan yang memenuhi syarat (dicari dari pesan yang sudah ada juga). */
  async tunggu(syarat, ms = 3000) {
    const batas = Date.now() + ms;
    while (Date.now() < batas) {
      const m = this.pesan.find(syarat);
      if (m) return m;
      if (this.tertutup) break;
      await tidur(25);
    }
    return this.pesan.find(syarat) ?? null;
  }
  async tungguTutup(ms = 3000) {
    const batas = Date.now() + ms;
    while (Date.now() < batas && !this.tertutup) await tidur(25);
    return this.tertutup;
  }
  putus() {
    this.s.destroy(); // tanpa frame close (seperti HP kehilangan sinyal)
    this.tertutup = true;
  }
}
const buka = () => new Klien().buka();

/** Masuk lengkap: halo → lobi → gabung → selamat. */
async function masuk(nama, tok = token(), ekstra = {}) {
  const k = await buka();
  k.kirim({ t: 'halo', nama, kode: KODE, token: tok, v: 2 });
  const lobi = await k.tunggu((m) => m.t === 'lobi' || m.t === 'tolak');
  if (lobi?.t !== 'lobi') return { k, tok, gagal: lobi?.alasan ?? 'tanpa jawaban' };
  k.kirim({ t: 'gabung', nama, warna: '#7cc6a4', sekamarDengan: null, kode: KODE, token: tok, v: 2, ...ekstra });
  const sel = await k.tunggu((m) => m.t === 'selamat' || m.t === 'tolak');
  return { k, tok, sel, gagal: sel?.t === 'selamat' ? null : (sel?.alasan ?? 'tanpa jawaban') };
}

try {
  await nyalakan();
  cek('Server menyala', !!(await sehat()));

  // ===== 1. Pintu masuk =====
  {
    const k = await buka();
    k.kirim({ t: 'halo', nama: 'Salah', kode: 'ngawur', token: token() });
    const m = await k.tunggu((x) => x.t === 'tolak');
    cek('Kode salah ditolak + diputus', !!m && (await k.tungguTutup()), m?.alasan);
  }
  {
    const k = await buka();
    k.kirim({ t: 'halo', nama: 'Lama', kode: KODE }); // APK lama tanpa token
    const m = await k.tunggu((x) => x.t === 'tolak');
    cek('Klien lama (tanpa token) ditolak dengan pesan ramah', !!m && /Perbarui|lama/i.test(m.alasan), m?.alasan);
    k.putus();
  }
  {
    const k = await buka();
    k.kirim({ t: 'halo', nama: 'Baru', kode: KODE, token: token(), v: 99 });
    const m = await k.tunggu((x) => x.t === 'tolak');
    cek('Klien versi lebih baru dari server ditolak ramah', !!m && /server/i.test(m.alasan), m?.alasan);
    k.putus();
  }
  for (const nama of ['__proto__', 'constructor', 'prototype']) {
    const r = await masuk(nama);
    cek(`Nama berbahaya "${nama}" ditolak`, !!r.gagal, r.gagal ?? 'DITERIMA');
    r.k.putus();
  }
  cek('Server tetap hidup setelah nama berbahaya', !!(await sehat()));

  // ===== 2. Dua pemain normal =====
  const A = await masuk(`Ayu${akhir}`);
  const B = await masuk(`Budi${akhir}`);
  cek('Ayu & Budi masuk', !A.gagal && !B.gagal, `${A.gagal ?? ''} ${B.gagal ?? ''}`);
  const jamA = await A.k.tunggu((m) => m.t === 'jam', 2500);
  const jamB = await B.k.tunggu((m) => m.t === 'jam', 2500);
  cek('Jam bersama terkirim ke keduanya', !!jamA && !!jamB);
  cek('Pesan jam membawa jam server (ms) untuk sinkron lampu/cilok', typeof jamA?.ms === 'number' && Math.abs(jamA.ms - Date.now()) < 5000);
  A.k.kirim({ t: 'simpan', save: { uang: 500000, ipk: 3.5, hari: 3, menit: 200, pakai: ['topi'], rekorMini: { penalti: 1 } } });
  B.k.kirim({ t: 'simpan', save: { uang: 5000, ipk: 3.1, hari: 3, menit: 200 } });
  A.k.kirim({ t: 'pose', pose: { x: 1, z: 2, rotY: 0, lokasi: 'dunia', gedung: null, motor: false, gerak: true } });
  const poseB = await B.k.tunggu((m) => m.t === 'pose' && m.daftar.some((d) => d.pose.x === 1));
  cek('Pose Ayu sampai ke Budi', !!poseB);

  // ===== 3. Klien NAKAL =====
  const C = await masuk(`Nakal${akhir}`);
  cek('Klien nakal masuk', !C.gagal, C.gagal ?? '');
  const sampah = [
    'bukan json',
    '{"t":5}',
    'null',
    '[]',
    '{"t":"pose","pose":{"x":1e999,"z":0,"rotY":0,"lokasi":"dunia"}}',
    { t: 'pose', pose: { x: 'a', z: 0, rotY: 0, lokasi: 'dunia' } },
    { t: 'pose', pose: { x: 1, z: 1, rotY: 0, lokasi: '__proto__' } },
    { t: 'pose' },
    { t: 'chat', teks: 'x'.repeat(5000) },
    { t: 'chat', teks: { a: 1 } },
    { t: 'simpan', save: { uang: 1, pakai: 5, hari: 1e15, emas: 50, deposito: [null, { jumlah: 1e308 }, { jumlah: 1e308 }], ipk: 'abc', profil: { kulit: 'x'.repeat(3000), rambut: 'y'.repeat(3000) } } },
    { t: 'simpan', save: [1, 2, 3] },
    { t: 'simpan', save: { uang: 'banyak' } },
    { t: 'upgradeKamar', level: { kasur: 999, meja: -1, racun: 'x' }, oleh: 'x' },
    { t: 'upgradeKamar', level: 'rusak' },
    { t: 'kerjaLobi', tempat: '__proto__' },
    { t: 'kerjaMulai', tempat: '__proto__' },
    { t: 'kerjaMulai', tempat: 'constructor' },
    { t: 'kerjaTap', bahan: { x: 1 } },
    { t: 'traktir', ke: A.sel?.id, jumlah: 1e12 },
    { t: 'traktir', ke: A.sel?.id, jumlah: 50000 }, // uang di save cuma 1 → harus ditolak server
    { t: 'jawabAjak', ke: A.sel?.id, jenis: 'pacaran', terima: true }, // tanpa pernah diajak
    { t: 'siap', sampai: 'NaN', jenis: 'aksi' },
    { t: 'siap', sampai: -5, jenis: 'tidur' },
    { t: 'siap', sampai: 1e300, jenis: 'tidur' },
    { t: 'ajak', ke: { toString: null }, jenis: 'pacaran' },
    { t: 'gabung', nama: 'Kedua', warna: '#000000', sekamarDengan: null, kode: KODE, token: token() }, // satu soket 2 nama
    { t: 'halo', nama: 12345, kode: KODE, token: token() },
    { t: '__proto__' },
    { t: 'toString' },
  ];
  const t0 = Date.now();
  for (const s of sampah) C.k.kirim(s);
  await tidur(900);
  cek('Server tetap hidup setelah pesan rusak', !!(await sehat()) && srv.exitCode === null, `${Date.now() - t0} ms`);
  // Server harus tetap responsif (bukan macet menghitung harga emas 10^15 hari)
  const s1 = Date.now();
  const sh = await sehat();
  cek('Server responsif (< 500 ms)', !!sh && Date.now() - s1 < 500, `${Date.now() - s1} ms`);
  await tidur(3300); // tunggu siaran daftar pemain (tiap 3 dtk)
  cek('Server tidak crash di siaran daftar pemain (save.pakai = 5)', srv.exitCode === null && !!(await sehat()));
  const daftar = [...A.k.pesan].reverse().find((m) => m.t === 'pemain');
  const infoC = daftar?.daftar.find((p) => p.id === C.sel?.id);
  const angkaOk = (v) => v === undefined || (typeof v === 'number' && Number.isFinite(v));
  cek(
    'Data pemain nakal disaring sebelum disiarkan',
    !!infoC && angkaOk(infoC.harta) && angkaOk(infoC.ipk) && angkaOk(infoC.uang) && (infoC.aks === undefined || Array.isArray(infoC.aks)) &&
      (infoC.rambut === undefined || infoC.rambut.length <= 16) && (infoC.kulit === undefined || typeof infoC.kulit === 'number'),
    JSON.stringify(infoC)?.slice(0, 160),
  );
  cek('Nama kedua dari soket yang sama tidak terdaftar', !daftar?.daftar.some((p) => p.nama === 'Kedua'));
  cek('Ayu tidak menerima traktir palsu', !A.k.pesan.some((m) => m.t === 'traktir'));
  cek('Ayu tidak menerima "jawabAjak" tanpa pernah mengajak', !A.k.pesan.some((m) => m.t === 'jawabAjak'));
  const chatPanjang = A.k.pesan.filter((m) => m.t === 'chat' && m.dari === C.sel?.id).every((m) => typeof m.teks === 'string' && m.teks.length <= 60);
  cek('Chat dipotong ≤ 60 karakter', chatPanjang);

  // Ajakan sah: Budi mengajak Ayu → Ayu menjawab → Budi menerima jawaban
  B.k.kirim({ t: 'ajak', ke: A.sel.id, jenis: 'pacaran' });
  const aj = await A.k.tunggu((m) => m.t === 'ajak');
  A.k.kirim({ t: 'jawabAjak', ke: B.sel.id, jenis: 'pacaran', terima: true });
  const jw = await B.k.tunggu((m) => m.t === 'jawabAjak');
  cek('Ajakan pacaran sah tetap berjalan', !!aj && !!jw?.terima);
  // Jawaban kedua (ulangan) tidak diteruskan lagi
  B.k.pesan.length = 0;
  A.k.kirim({ t: 'jawabAjak', ke: B.sel.id, jenis: 'pacaran', terima: true });
  await tidur(300);
  cek('Jawaban ajakan ganda diabaikan', !B.k.pesan.some((m) => m.t === 'jawabAjak'));

  // Traktir sah: Ayu (uang 500rb) → Budi
  A.k.kirim({ t: 'traktir', ke: B.sel.id, jumlah: 10000 });
  const tr = await B.k.tunggu((m) => m.t === 'traktir');
  const trH = await A.k.tunggu((m) => m.t === 'traktirHasil');
  cek('Traktir sah tetap berjalan', !!tr && trH?.ok === true);

  // Banjir chat: hanya sebagian kecil yang diteruskan
  B.k.pesan.length = 0;
  for (let i = 0; i < 25; i++) C.k.kirim({ t: 'chat', teks: `spam ${i}` });
  await tidur(500);
  const nSpam = B.k.pesan.filter((m) => m.t === 'chat' && m.dari === C.sel.id).length;
  cek('Banjir chat dibatasi', nSpam <= 6, `${nSpam} dari 25 diteruskan`);

  // Banjir pesan → koneksi diputus
  for (let i = 0; i < 200; i++) C.k.kirim({ t: 'kerjaTap', bahan: 'x' });
  cek('Banjir pesan (200/dtk) → diputus', await C.k.tungguTutup(2000));
  await tidur(300);
  cek('Ayu & Budi tetap tersambung setelah klien nakal diputus', !A.k.tertutup && !B.k.tertutup);

  // ===== 4. Frame WebSocket rusak =====
  const uji = async (nama, kirimRusak) => {
    const k = await buka();
    kirimRusak(k);
    const putus = await k.tungguTutup(2000);
    cek(`Frame rusak: ${nama} → diputus`, putus);
    if (!putus) k.putus();
  };
  await uji('tanpa masker', (k) => k.frame(1, '{"t":"halo"}', { masker: false }));
  await uji('panjang 2^40', (k) => k.frame(1, 'x', { panjangPalsu: 2 ** 40 }));
  await uji('bit RSV', (k) => k.frame(1, '{}', { rsv: 4 }));
  await uji('frame kontrol > 125 byte', (k) => k.frame(9, 'p'.repeat(200)));
  await uji('pesan biner', (k) => k.frame(2, Buffer.from([1, 2, 3])));
  await uji('fragmen menumpuk > 256 KB', (k) => {
    k.frame(1, 'a'.repeat(60000), { fin: false });
    for (let i = 0; i < 6; i++) k.frame(0, 'a'.repeat(60000), { fin: false });
  });
  await uji('pesan besar sebelum lolos kode', (k) => k.frame(1, JSON.stringify({ t: 'halo', nama: 'x'.repeat(20000) })));
  cek('Server tetap hidup setelah frame rusak', !!(await sehat()));

  // ===== 5. Putus-sambung & sesi ganda =====
  // Ayu "hilang sinyal": soket lama masih dianggap hidup oleh server, lalu HP yang sama menyambung lagi
  const A1 = A.k;
  A1.s.pause(); // berhenti membaca (seperti HP di terowongan)
  const A2 = await masuk(`Ayu${akhir}`, A.tok);
  cek('Sambung ulang dengan token sama langsung diterima (tidak menunggu 45 dtk)', !A2.gagal, A2.gagal ?? '');
  A1.s.resume();
  const ditendang = await A1.tunggu((m) => m.t === 'tolak', 2000);
  cek('Sesi lama ditutup dengan pesan "dipakai di tempat lain"', !!ditendang && (await A1.tungguTutup()), ditendang?.alasan);
  cek('Save Ayu tetap ada setelah sambung ulang', A2.sel?.save?.uang === 490000 || A2.sel?.save?.uang === 500000, `uang=${A2.sel?.save?.uang}`);
  await tidur(400);
  const lihatB = [...B.k.pesan].reverse().find((m) => m.t === 'pemain');
  cek('Budi melihat Ayu tetap 1 entri & online', lihatB?.daftar.filter((p) => p.id === A.sel.id).length === 1 && lihatB.daftar.find((p) => p.id === A.sel.id).status !== 'offline');
  // HP lain memakai nama Ayu → ditolak
  const maling = await masuk(`Ayu${akhir}`, token());
  cek('HP lain tidak bisa memakai nama Ayu', !!maling.gagal, maling.gagal ?? 'DITERIMA');
  maling.k.putus();
  // Putus mendadak (tanpa frame close) → server membersihkan sesi
  const sebelumPutus = await sehat();
  B.k.putus();
  await tidur(700);
  console.log('   koneksi sebelum/sesudah Budi putus:', sebelumPutus?.koneksi, (await sehat())?.koneksi);
  const daftar2 = [...A2.k.pesan].reverse().find((m) => m.t === 'pemain');
  cek('Pemain putus mendadak jadi offline', daftar2?.daftar.find((p) => p.id === B.sel.id)?.status === 'offline');
  const B2 = await masuk(`Budi${akhir}`, B.tok);
  cek('Budi bisa masuk lagi', !B2.gagal, B2.gagal ?? '');

  // ===== 6. Batas koneksi per IP =====
  const banyak = [];
  for (let i = 0; i < 14; i++) {
    try {
      banyak.push(await buka());
    } catch {
      banyak.push(null);
    }
  }
  await tidur(300);
  const ditolak = banyak.filter((k) => !k || k.tertutup).length;
  cek('Satu IP tidak bisa memborong semua slot koneksi', ditolak > 0, `${ditolak} dari 14 ditolak`);
  banyak.forEach((k) => k?.putus());
  await tidur(300);
  const sh2 = await sehat();
  cek('Koneksi lobi yang putus dibersihkan', sh2?.koneksi === undefined || sh2.koneksi <= 2, JSON.stringify(sh2));

  // ===== 7. Simpan atomik, data rusak & backup =====
  A2.k.kirim({ t: 'simpan', save: { uang: 777777, ipk: 3.9, hari: 4, menit: 100 } });
  await tidur(3600);
  const fileData = join(DATA, 'data-online.json');
  let isi = null;
  try {
    isi = JSON.parse(readFileSync(fileData, 'utf8'));
  } catch {
    /* gagal */
  }
  cek('data-online.json valid & berisi save terbaru', isi?.pemain?.[A.sel.id]?.save?.uang === 777777);
  cek('data-online.json punya nomor versi', typeof isi?.versi === 'number', `versi=${isi?.versi}`);
  cek('Tidak ada file .tmp tertinggal', !existsSync(fileData + '.tmp'));
  A2.k.putus();
  B2.k.putus();
  await tidur(300);
  await matikan();
  // Rusakkan file → server harus memakai backup, BUKAN mulai dunia kosong
  mkdirSync(join(DATA, 'backup'), { recursive: true });
  writeFileSync(join(DATA, 'backup', 'data-2000-01-01.json'), JSON.stringify(isi));
  writeFileSync(fileData, '{"pemain": {rusak');
  await nyalakan();
  const L = await buka();
  L.kirim({ t: 'halo', nama: `Ayu${akhir}`, kode: KODE, token: A.tok, v: 2 });
  const lobiL = await L.tunggu((m) => m.t === 'lobi' || m.t === 'tolak');
  cek('Data rusak → dipulihkan dari backup (Ayu dikenal)', lobiL?.dikenal === true, JSON.stringify(lobiL)?.slice(0, 100));
  cek('Salinan file rusak disimpan untuk diperiksa', readdirSync(DATA).some((f) => f.includes('rusak')));
  L.putus();
  await matikan();

  // ===== 8. Migrasi data versi lama (jam per slot, field hilang) =====
  writeFileSync(
    fileData,
    JSON.stringify({ slot: 7, pemain: { lama: { nama: 'Lama', warna: '#ffffff', kamarId: 'kamar-lama', save: { uang: 1000 } } }, kamar: {} }),
  );
  rmSync(join(DATA, 'backup'), { recursive: true, force: true });
  await nyalakan();
  const M = await masuk('Lama', token());
  cek('Data lama (slot) dimigrasi & pemain lama bisa masuk', !M.gagal && typeof M.sel?.menit === 'number' && M.sel.menit >= 1440, M.gagal ?? `menit=${M.sel?.menit}`);
  cek('Pemain lama (tanpa kamar) dapat kamar', M.sel?.kamar?.penghuni?.length === 1);
  M.k.putus();
  await tidur(3500);
  const isi2 = JSON.parse(readFileSync(fileData, 'utf8'));
  cek('Data hasil migrasi disimpan dengan versi baru', typeof isi2.versi === 'number' && !('slot' in isi2));
  const sh3 = await sehat();
  cek('Semua sesi bersih setelah semua keluar', sh3?.online === 0, JSON.stringify(sh3));
} catch (e) {
  cek('Tes berjalan tanpa exception', false, e?.stack ?? String(e));
} finally {
  await matikan();
  if (process.env.LOG_SERVER) console.log(logServer);
  const crash = /Error|TypeError|RangeError/.test(logServer) && /at .*server\.mjs/.test(logServer);
  cek('Log server tanpa stack trace crash', !crash, crash ? logServer.split('\n').filter((l) => /Error/.test(l)).slice(0, 3).join(' | ') : '');
  try {
    rmSync(DATA, { recursive: true, force: true });
  } catch {
    /* abaikan */
  }
}
const gagal = hasil.filter((h) => !h.lulus).length;
console.log(gagal ? `\n❌ ${gagal} dari ${hasil.length} cek gagal` : `\n✅ Semua ${hasil.length} cek server online lulus`);
process.exit(gagal ? 1 : 0);
