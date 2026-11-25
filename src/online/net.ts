// Sambungan WebSocket ke server online. Tidak mengimpor store game (hindari import melingkar).
import { urlWebSocket, type PesanKeGame, type PesanKeServer, type Pose } from './protokol';

let ws: WebSocket | null = null;
let penangan: (m: PesanKeGame) => void = () => {};
let saatPutus: () => void = () => {};

/** Posisi pemain lain terbaru (dibaca komponen 3D tiap frame, tanpa re-render React). */
export const poseLain = new Map<string, Pose>();

export function setPenangan(fn: (m: PesanKeGame) => void, putus: () => void) {
  penangan = fn;
  saatPutus = putus;
}

export function sambung(alamat: string): Promise<void> {
  tutup();
  return new Promise((ok, gagal) => {
    let terbuka = false;
    let s: WebSocket;
    try {
      s = new WebSocket(urlWebSocket(alamat));
    } catch {
      gagal(new Error('Alamat server tidak valid'));
      return;
    }
    ws = s;
    const batas = setTimeout(() => {
      if (!terbuka) {
        s.close();
        gagal(new Error('Server tidak menjawab. Cek alamat & pastikan server di PC sedang jalan.'));
      }
    }, 6000);
    s.onopen = () => {
      terbuka = true;
      clearTimeout(batas);
      ok();
    };
    s.onmessage = (e) => {
      try {
        penangan(JSON.parse(String(e.data)) as PesanKeGame);
      } catch (err) {
        console.error('Pesan server tidak bisa dibaca', err);
      }
    };
    s.onclose = () => {
      clearTimeout(batas);
      if (ws !== s) return; // sambungan lama yang sengaja ditutup
      ws = null;
      poseLain.clear();
      if (terbuka) saatPutus();
      else gagal(new Error('Tidak bisa tersambung ke server. Cek alamat (link dari PC) & koneksi internet.'));
    };
  });
}

export function kirim(p: PesanKeServer) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(p));
}

export function tutup() {
  const s = ws;
  ws = null;
  poseLain.clear();
  if (s) s.close();
}
