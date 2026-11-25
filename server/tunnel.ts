// Cloudflare Quick Tunnel: membuat link publik https://xxxx.trycloudflare.com yang menuju server di PC ini.
// Gratis & tanpa akun. Link berganti setiap kali server dinyalakan ulang.
// Program cloudflared resmi diunduh sekali dari GitHub Cloudflare jika belum ada.
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, existsSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const RILIS = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';

function namaFile(): { unduh: string; simpan: string } | null {
  if (process.platform === 'win32' && process.arch === 'x64') return { unduh: 'cloudflared-windows-amd64.exe', simpan: 'cloudflared.exe' };
  if (process.platform === 'win32' && process.arch === 'ia32') return { unduh: 'cloudflared-windows-386.exe', simpan: 'cloudflared.exe' };
  if (process.platform === 'linux' && process.arch === 'x64') return { unduh: 'cloudflared-linux-amd64', simpan: 'cloudflared' };
  if (process.platform === 'linux' && process.arch === 'arm64') return { unduh: 'cloudflared-linux-arm64', simpan: 'cloudflared' };
  return null;
}

async function siapkanCloudflared(folder: string): Promise<string> {
  const f = namaFile();
  if (!f) throw new Error('Sistem operasi ini belum didukung otomatis. Pasang cloudflared manual.');
  const tujuan = join(folder, f.simpan);
  if (existsSync(tujuan) && statSync(tujuan).size > 1_000_000) return tujuan;
  console.log('⬇️  Mengunduh cloudflared (± 50 MB, sekali saja) dari GitHub Cloudflare...');
  const res = await fetch(RILIS + f.unduh, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Gagal mengunduh cloudflared (HTTP ${res.status}). Cek internet PC.`);
  const sementara = tujuan + '.unduh';
  await pipeline(Readable.fromWeb(res.body as import('node:stream/web').ReadableStream), createWriteStream(sementara, { mode: 0o755 }));
  if (statSync(sementara).size < 1_000_000) {
    unlinkSync(sementara);
    throw new Error('File cloudflared yang terunduh rusak. Coba lagi.');
  }
  renameSync(sementara, tujuan);
  console.log('✅ cloudflared siap.');
  return tujuan;
}

let proses: ChildProcess | null = null;

/** Nyalakan tunnel ke http://localhost:PORT. `onLink` dipanggil saat link publik sudah jadi. */
export async function mulaiTunnel(port: number, folder: string, onLink: (url: string) => void) {
  let exe: string;
  try {
    exe = await siapkanCloudflared(folder);
  } catch (e) {
    console.error('❌', e instanceof Error ? e.message : e);
    console.error('   Server tetap jalan untuk satu WiFi saja.');
    return;
  }
  // Hapus link lama agar tidak ada yang membagikan link yang sudah mati
  try {
    unlinkSync(join(process.cwd(), 'link-online.txt'));
  } catch {
    // belum ada
  }
  console.log('🌍 Membuat link online lewat Cloudflare Tunnel...');
  proses = spawn(exe, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let dapat = false;
  const baca = (buf: Buffer) => {
    const m = buf.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && !dapat) {
      dapat = true;
      try {
        writeFileSync(join(process.cwd(), 'link-online.txt'), m[0] + '\n');
      } catch {
        // abaikan
      }
      onLink(m[0]);
    }
  };
  proses.stdout?.on('data', baca);
  proses.stderr?.on('data', baca);
  proses.on('exit', (code) => {
    if (!dapat) console.error(`❌ Tunnel berhenti (kode ${code}). Cek internet PC.`);
    else console.warn('⚠️ Tunnel terputus.');
    proses = null;
    // Keluar dengan kode 1 → penjaga (JALAN-TERUS.bat) menyalakan ulang server + tunnel baru
    console.warn('🔄 Server dimatikan agar dinyalakan ulang otomatis...');
    setTimeout(() => process.exit(1), 1000);
  });
  // Matikan tunnel saat server ditutup
  const tutup = () => {
    proses?.kill();
    process.exit(0);
  };
  process.on('SIGINT', tutup);
  process.on('SIGTERM', tutup);
  process.on('exit', () => proses?.kill());
}
