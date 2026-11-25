// WebSocket server mini (RFC 6455) tanpa library tambahan.
// Hanya mendukung pesan teks — cukup untuk game ini (semua pesan berupa JSON kecil).
// Frame yang melanggar aturan (tanpa masker, bit RSV, kontrol terlalu besar, biner, terlalu besar) → koneksi diputus.
import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { Socket } from 'node:net';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAKS_PESAN = 256 * 1024; // satu pesan (termasuk gabungan fragmen) lebih besar dari ini = mencurigakan → putus
/** Antrean kirim yang belum terkirim ke HP lebih dari ini → HP terlalu lambat / macet → putus (cegah memori server bengkak) */
const MAKS_ANTREAN_KIRIM = 2 * 1024 * 1024;

export class Soket {
  private buf: Buffer = Buffer.alloc(0);
  private potongan: Buffer[] = [];
  private panjangPotongan = 0;
  private terakhirAktif = Date.now();
  private ping: NodeJS.Timeout;
  terbuka = true;
  onPesan: (teks: string) => void = () => {};
  onTutup: () => void = () => {};

  constructor(private s: Duplex) {
    s.on('data', (d: Buffer) => this.terima(d));
    s.on('close', () => this.tutup());
    // Server HTTP Node memakai allowHalfOpen → saat HP menutup TCP (FIN) tanpa frame close, 'close' tidak muncul
    // sampai kita menutup sendiri. Tanpa ini sesi "hantu" bertahan 45 dtk & menghalangi sambung ulang.
    s.on('end', () => this.tutup());
    s.on('error', () => this.tutup());
    // Ping tiap 15 detik; jika 45 detik tidak ada kabar → anggap putus (HP mati/WiFi hilang)
    this.ping = setInterval(() => {
      if (Date.now() - this.terakhirAktif > 45000) this.tutup();
      else this.kirimFrame(0x9, Buffer.alloc(0));
    }, 15000);
  }

  kirim(teks: string) {
    this.kirimFrame(0x1, Buffer.from(teks, 'utf8'));
  }

  /** Tutup koneksi. `kode` = kode close RFC 6455 (1000 normal, 1002 protokol, 1008 pelanggaran, 1009 terlalu besar). */
  tutup(kode?: number) {
    if (!this.terbuka) return;
    if (process.env.DEBUG_WS) console.log('[ws] tutup()', new Error().stack?.split('\n').slice(2, 5).join(' <- '));
    this.terbuka = false;
    if (kode) {
      // Frame close langsung (tanpa lewat kirimFrame agar tidak memanggil tutup() lagi)
      try {
        this.s.write(Buffer.from([0x88, 2, (kode >> 8) & 0xff, kode & 0xff]));
      } catch {
        // abaikan
      }
    }
    clearInterval(this.ping);
    this.buf = Buffer.alloc(0);
    this.potongan = [];
    try {
      this.s.end();
      this.s.destroy();
    } catch {
      // abaikan
    }
    try {
      this.onTutup();
    } catch (e) {
      console.error('Error saat menutup sesi:', e);
    }
  }

  private kirimFrame(op: number, data: Buffer) {
    if (!this.terbuka) return;
    // HP yang tidak membaca data (macet / sinyal jelek) → jangan biarkan antrean kirim menumpuk tanpa batas
    if (this.s.writableLength > MAKS_ANTREAN_KIRIM) {
      console.warn('🐢 Koneksi terlalu lambat (antrean kirim penuh), diputus');
      this.tutup();
      return;
    }
    const n = data.length;
    let kepala: Buffer;
    if (n < 126) {
      kepala = Buffer.from([0x80 | op, n]);
    } else if (n < 65536) {
      kepala = Buffer.alloc(4);
      kepala[0] = 0x80 | op;
      kepala[1] = 126;
      kepala.writeUInt16BE(n, 2);
    } else {
      kepala = Buffer.alloc(10);
      kepala[0] = 0x80 | op;
      kepala[1] = 127;
      kepala.writeBigUInt64BE(BigInt(n), 2);
    }
    try {
      this.s.write(Buffer.concat([kepala, data]));
    } catch {
      this.tutup();
    }
  }

  /** Urai frame-frame yang masuk (bisa terpotong atau beberapa sekaligus). */
  terima(d: Buffer) {
    if (!this.terbuka) return;
    if (process.env.DEBUG_WS) console.log(`[ws] data ${d.length} B: ${d.subarray(0, 12).toString('hex')} t=${Date.now() % 100000}`);
    this.terakhirAktif = Date.now();
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    // Berhenti segera jika koneksi ditutup di tengah jalan (mis. kena batas laju di onPesan)
    while (this.terbuka && this.buf.length >= 2) {
      const b0 = this.buf[0];
      const b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      const rsv = (b0 >> 4) & 7;
      const op = b0 & 0x0f;
      const bermasker = (b1 & 0x80) !== 0;
      // RFC 6455 §5.1–5.2: frame dari klien WAJIB bermasker; bit RSV harus 0 (tidak ada ekstensi)
      if (!bermasker || rsv !== 0) return this.tutup(1002);
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        const besar = this.buf.readBigUInt64BE(2);
        if (besar > BigInt(MAKS_PESAN)) return this.tutup(1009);
        len = Number(besar);
        off = 10;
      }
      const kontrol = op >= 0x8;
      // Frame kontrol: maks 125 byte & tidak boleh terfragmentasi (§5.5)
      if (kontrol && (len > 125 || !fin)) return this.tutup(1002);
      if (len > MAKS_PESAN) return this.tutup(1009);
      if (this.buf.length < off + 4 + len) return; // tunggu data berikutnya
      const masker = this.buf.subarray(off, off + 4);
      const isi = Buffer.from(this.buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < isi.length; i++) isi[i] ^= masker[i & 3];
      this.buf = this.buf.subarray(off + 4 + len);

      if (op === 0x8) {
        this.tutup(1000);
        return;
      } else if (op === 0x9) {
        this.kirimFrame(0xa, isi); // balas ping
      } else if (op === 0xa) {
        // pong: cukup memperbarui terakhirAktif
      } else if (op === 0x1 || op === 0x0) {
        // Continuation tanpa awal, atau frame teks baru saat fragmen lama belum selesai → protokol rusak
        if (op === 0x0 && this.potongan.length === 0) return this.tutup(1002);
        if (op === 0x1 && this.potongan.length > 0) return this.tutup(1002);
        this.panjangPotongan += isi.length;
        if (this.panjangPotongan > MAKS_PESAN) return this.tutup(1009);
        this.potongan.push(isi);
        if (fin) {
          const teks = Buffer.concat(this.potongan).toString('utf8');
          this.potongan = [];
          this.panjangPotongan = 0;
          try {
            this.onPesan(teks);
          } catch (e) {
            console.error('Error memproses pesan:', e);
          }
        }
      } else {
        // Biner (0x2) & opcode tak dikenal: game ini hanya memakai teks
        return this.tutup(1003);
      }
    }
  }
}

/** Terima permintaan "upgrade" HTTP → WebSocket. `head` = data yang sudah ikut terbaca bersama header. */
export function terimaUpgrade(req: IncomingMessage, socket: Duplex, head?: Buffer): Soket | null {
  const key = req.headers['sec-websocket-key'];
  if (
    typeof key !== 'string' ||
    !/^[A-Za-z0-9+/]{22}==$/.test(key) ||
    (req.headers.upgrade ?? '').toLowerCase() !== 'websocket'
  ) {
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    } catch {
      // abaikan
    }
    socket.destroy();
    return null;
  }
  (socket as Socket).setNoDelay?.(true); // kirim langsung, jangan ditahan (latensi kecil)
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  const ws = new Soket(socket);
  if (head && head.length) ws.terima(head);
  return ws;
}
