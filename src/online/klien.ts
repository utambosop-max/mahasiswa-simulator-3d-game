// Klien online: memproses pesan server dan menghubungkannya ke store game.
import { useGame, ambilSave } from '../game/store';
import {
  dataAwal,
  formatRupiah,
  menitMutlak,
  sinkronWaktu,
  teksJam,
  terapkanBonusBareng,
  ubahUang,
  cekTraktir,
  type SaveData,
} from '../game/sim';
import { rapikanSave } from '../game/save';
import { setPacarPemain } from '../game/m11';
import { profilAcak } from '../game/fitur';
import { playerPos } from '../game/playerPos';
import { kirim, poseLain, sambung, setPenangan, tutup } from './net';
import { simpanOnline } from './aksiOnline';
import { namaPemain, simpanIngatan, useOnline } from './onlineStore';
import { VERSI_PROTOKOL, type InfoKamar, type KeadaanKerjaBareng, type PesanKeGame, type Pose } from './protokol';
import { catatJamServer, sekarangMs } from './jamServer';
import {
  sfxBahan,
  sfxChat,
  sfxKecewa,
  sfxKoin,
  sfxNotifHP,
  sfxPelanggan,
  sfxSalah,
  sfxTemanDatang,
  sfxUpgrade,
} from '../audio/sfx';

let nextGelembung = 1;
const GELEMBUNG_MS = 4500;

function tampilGelembung(id: string, teks: string) {
  const gid = nextGelembung++;
  useOnline.setState((s) => ({ gelembung: { ...s.gelembung, [id]: { teks, id: gid } } }));
  setTimeout(() => {
    useOnline.setState((s) => {
      if (s.gelembung[id]?.id !== gid) return s;
      const g = { ...s.gelembung };
      delete g[id];
      return { gelembung: g };
    });
  }, GELEMBUNG_MS);
}

/** Kamar berdua → kos patungan & perabot dipakai bersama. */
function terapkanKamar(d: SaveData, kamar: InfoKamar): SaveData {
  const berdua = kamar.penghuni.length >= 2;
  return { ...d, kamarBerdua: berdua, level: berdua && kamar.level ? { ...kamar.level } : d.level };
}

function suaraKerja(lama: KeadaanKerjaBareng | null, baru: KeadaanKerjaBareng) {
  const saya = useOnline.getState().saya;
  if (baru.pelanggan && baru.pelanggan.no !== lama?.pelanggan?.no) sfxPelanggan();
  const nLama = lama?.pelanggan?.no === baru.pelanggan?.no ? (lama?.pelanggan?.terisi.length ?? 0) : 0;
  const nBaru = baru.pelanggan?.terisi.length ?? 0;
  if (nBaru > nLama) sfxBahan(nBaru - 1);
  if (baru.benar > (lama?.benar ?? 0)) sfxKoin();
  if (baru.gagal > (lama?.gagal ?? 0)) sfxKecewa();
  if (baru.salah && baru.salah.oleh === saya && baru.salah !== lama?.salah) sfxSalah();
}

function proses(m: PesanKeGame) {
  const o = useOnline.getState();
  const g = useGame.getState();
  switch (m.t) {
    case 'lobi':
      useOnline.setState({ status: 'lobi', lobi: { dikenal: m.dikenal, kamarTersedia: m.kamarTersedia }, menit: m.menit, galat: null });
      return;

    case 'tolak':
      // Sesi ini diganti tab/HP lain, atau sambung ulang ditolak → jangan sambung ulang otomatis (cegah saling tendang)
      if (m.ganda || (g.online && o.status !== 'main')) {
        otomatis = false;
        batalUlang();
        useOnline.setState({ status: 'putus', galat: m.alasan });
        useGame.setState({ terkunci: true });
        tutup();
        return;
      }
      useOnline.setState({ status: o.status === 'main' ? 'main' : 'mati', galat: m.alasan });
      if (o.status !== 'main') tutup();
      return;

    case 'selamat': {
      percobaan = 0;
      otomatis = true;
      batalUlang();
      // Sambung ULANG di tengah main (id sama): progres di HP ini paling baru → dipakai, lalu dikirim ke server.
      // Kecuali jam server jauh di belakang (server dipulihkan dari backup lama) → ikut save server.
      const lokal = g.online && o.saya === m.id ? ambilSave(g) : null;
      const pakaiLokal = !!lokal && menitMutlak(lokal) <= m.menit + 10;
      // Save dari server (pemain lama) atau data awal (pemain baru), lalu samakan dengan jam bersama
      let d: SaveData = (pakaiLokal && lokal) || (m.save && rapikanSave(m.save)) || dataAwal();
      // Karakter online: pakai profil offline (jurusan, asal, penampilan) dengan nama & warna online
      if (!d.profil) d = { ...d, profil: { ...(g.profil ?? profilAcak(o.nama)), nama: o.nama, baju: o.warna } };
      const sinkron = sinkronWaktu(d, m.menit);
      d = terapkanKamar(sinkron.data, m.kamar);
      // Masih sibuk dari sesi sebelumnya (mis. keluar game saat tidur) → lanjutkan sibuknya
      const masihSibuk = m.sampai > m.menit && m.jenis !== null;
      const sibuk =
        masihSibuk && m.jenis
          ? { sampai: m.sampai, jenis: m.jenis, label: m.jenis === 'tidur' ? '😴 Tidur' : m.jenis === 'pulang' ? '🚌 Pulang kampung' : '⏳ Sibuk', mulai: m.menit }
          : null;
      useOnline.setState({
        status: 'main',
        saya: m.id,
        menit: m.menit,
        laju: 1,
        kamar: m.kamar,
        lobi: null,
        layarOnline: false,
        galat: null,
      });
      useGame.setState({
        ...d,
        online: true,
        terkunci: sibuk !== null,
        sibuk,
        layarUtama: false,
        event: null,
        kerja: null,
        menuUpgrade: false,
        menuMakan: null,
        menuTerbuka: false,
        dekat: null,
        naikMotor: false,
      });
      simpanOnline(d, true);
      const toast = useGame.getState().toast;
      if (lokal) {
        toast(`🔌 Tersambung lagi! Jam bersama sekarang ${teksJam(d.menit)}.`);
        sinkron.pesan.slice(-2).forEach(toast);
        return;
      }
      toast(m.save ? `💾 Selamat datang lagi, ${o.nama}! Progres online dimuat.` : `🎉 Selamat datang di Kampung Mahasiswa, ${o.nama}!`);
      if (d.kamarBerdua) toast(`🛏️ Kamu sekamar dengan ${m.kamar.penghuni.filter((n) => n.toLowerCase() !== m.id).join(', ')} — kos patungan!`);
      toast(`👥 Jam bersama: sekarang jam ${teksJam(d.menit)}. Jam dipercepat kalau SEMUA pemain sedang sibuk / tidur.`);
      sinkron.pesan.slice(-2).forEach(toast);
      return;
    }

    case 'pemain': {
      const sebelum = new Map(o.pemain.map((p) => [p.id, p.status]));
      const datang = m.daftar.some((p) => p.id !== o.saya && p.status !== 'offline' && (sebelum.get(p.id) ?? 'offline') === 'offline');
      if (datang && o.pemain.length > 0) sfxTemanDatang();
      // Hapus posisi pemain yang sudah offline agar karakternya hilang
      m.daftar.filter((p) => p.status === 'offline').forEach((p) => poseLain.delete(p.id));
      const kamar = o.kamar;
      useOnline.setState({ pemain: m.daftar });
      if (kamar) {
        const penghuni = m.daftar.filter((p) => p.kamarId === kamar.kamarId).map((p) => p.nama);
        if (penghuni.length !== kamar.penghuni.length) useOnline.setState({ kamar: { ...kamar, penghuni } });
      }
      return;
    }

    case 'pose':
      for (const { id, pose } of m.daftar) if (id !== o.saya) poseLain.set(id, pose);
      return;

    case 'jam': {
      // Jam bersama dari server → majukan jam di save SAYA sebanyak selisihnya
      useOnline.setState({ menit: m.menit, laju: m.laju });
      if (typeof m.ms === 'number') catatJamServer(m.ms); // jam dinding server → lampu & cilok sama di semua HP
      if (g.layarUtama) return;
      const selisih = m.menit - menitMutlak(ambilSave(g));
      // Selisih sangat besar (mis. HP baru bangun dari sleep) tetap diproses, majuMenit menangani pergantian hari
      if (selisih > 0) g.majukanJam(selisih);
      return;
    }

    case 'ajak': {
      if (m.jenis === 'putus') {
        if (g.pacar?.jenis === 'pemain' && g.pacar.id === m.dari) {
          g.terapkanOnline({ ...ambilSave(g), pacar: null }, [`💔 ${m.nama} memutuskan hubungan... Semangat, kamu pasti bisa move on!`]);
        }
        return;
      }
      // Ajakan pacaran masuk → tampilkan dialog setuju / tolak
      if (g.pacar) {
        kirim({ t: 'jawabAjak', ke: m.dari, jenis: 'pacaran', terima: false });
        return;
      }
      useOnline.setState({ ajakan: { dari: m.dari, nama: m.nama } });
      sfxNotifHP();
      return;
    }

    case 'jawabAjak': {
      if (m.terima) {
        g.terapkanOnline(setPacarPemain(ambilSave(g), m.dari, m.nama), [`💘 ${m.nama} menerima! Kalian resmi pacaran 🥰`]);
        useGame.setState((s) => ({ konfeti: s.konfeti + 1 }));
      } else g.toast(`💔 ${m.nama} belum mau pacaran... tetap berteman ya.`);
      sfxNotifHP();
      return;
    }

    case 'bonus': {
      // Bonus aksi bareng: ada teman yang melakukan aksi sekategori di tempat yang sama
      const b = terapkanBonusBareng(ambilSave(g), m.kat);
      g.terapkanOnline(b.data, [`${b.pesan} (bareng ${m.teman})`]);
      sfxNotifHP();
      return;
    }

    case 'chat': {
      tampilGelembung(m.dari, m.teks);
      if (m.dari !== o.saya) {
        sfxChat();
        g.toast(`💬 ${namaPemain(m.dari)}: ${m.teks}`);
      }
      return;
    }

    case 'traktir': {
      g.terapkanOnline(ubahUang(ambilSave(g), m.jumlah), [`🎁 ${namaPemain(m.dari)} mentraktirmu ${formatRupiah(m.jumlah)}!`]);
      sfxKoin();
      useGame.setState((s) => ({ konfeti: s.konfeti + 1 }));
      return;
    }

    case 'traktirHasil': {
      // ok = server SUDAH memberikan uangnya ke teman → wajib dipotong di sini juga (dulu bisa lolos jika
      // uang berubah sebelum jawaban datang → uang teman bertambah tanpa uang kita berkurang)
      if (m.ok) {
        g.terapkanOnline(ubahUang(ambilSave(g), -m.jumlah), [`💸 Kamu mentraktir ${namaPemain(m.ke)} ${formatRupiah(m.jumlah)}. Baik banget!`]);
        sfxKoin();
      } else {
        sfxSalah();
        g.toast('😕 Traktir gagal — temanmu mungkin sedang offline.');
      }
      return;
    }

    case 'kamar': {
      useOnline.setState({ kamar: m.kamar });
      const d = terapkanKamar(ambilSave(g), m.kamar);
      const pesan: string[] = [];
      if (m.oleh) {
        pesan.push(`🛋️ ${m.oleh} meng-upgrade perabot kamar kalian!`);
        sfxUpgrade();
      } else if (d.kamarBerdua && !g.kamarBerdua) {
        pesan.push(`🛏️ ${m.kamar.penghuni.filter((n) => n !== o.nama).join(', ')} jadi teman sekamarmu! Kos sekarang patungan.`);
        sfxTemanDatang();
      }
      g.terapkanOnline(d, pesan);
      return;
    }

    case 'kerjaLobi':
      useOnline.setState({ kerjaLobi: m.ids.length > 0 ? { tempat: m.tempat, ids: m.ids } : null });
      return;

    case 'kerja':
      suaraKerja(o.kerjaBareng, m.k);
      useOnline.setState({ kerjaBareng: m.k, kerjaDiterima: performance.now(), kerjaLobi: null });
      // Teman memulai shift bareng → pastikan layar kerja terbuka juga di sini
      if (!g.kerja) useGame.setState({ kerja: m.k.tempat });
      return;

    case 'kerjaSelesai':
      useOnline.setState({ kerjaHasil: { tempat: m.tempat, benar: m.benar, gagal: m.gagal, tips: m.tips } });
      return;
  }
}

// ===== Sambung ulang otomatis: backoff eksponensial + jitter (1, 2, 4, 8, 16, 30 dtk; maks 7 percobaan) =====
// Jitter = jeda diacak supaya semua HP tidak menyerbu server di detik yang sama setelah server restart.
let percobaan = 0;
let otomatis = true;
let timerUlang: ReturnType<typeof setTimeout> | null = null;
let timerJawab: ReturnType<typeof setTimeout> | null = null;
const MAKS_PERCOBAAN = 7;

function batalUlang() {
  if (timerUlang) clearTimeout(timerUlang);
  if (timerJawab) clearTimeout(timerJawab);
  timerUlang = null;
  timerJawab = null;
}

function jadwalUlang() {
  batalUlang();
  if (!otomatis || percobaan >= MAKS_PERCOBAAN) {
    useOnline.setState({ ulangDalam: null });
    return;
  }
  const dasar = Math.min(30000, 1000 * 2 ** percobaan);
  const jeda = Math.round(dasar / 2 + Math.random() * (dasar / 2));
  percobaan++;
  useOnline.setState({ ulangDalam: Date.now() + jeda });
  timerUlang = setTimeout(() => {
    timerUlang = null;
    void sambungUlang(false);
  }, jeda);
}

function saatPutus() {
  const o = useOnline.getState();
  if (useGame.getState().online && o.status !== 'mati') {
    // Sedang main (atau sedang mencoba sambung ulang) → layar "putus" + coba lagi otomatis
    useOnline.setState({ status: 'putus' });
    useGame.setState({ terkunci: true });
    jadwalUlang();
  } else useOnline.setState({ status: 'mati', galat: 'Sambungan ke server terputus.' });
}

setPenangan(proses, saatPutus);

// Akses debug untuk uji otomatis — hanya saat `npm run dev`
if (import.meta.env.DEV) {
  (window as unknown as { __online: typeof useOnline }).__online = useOnline;
  // Fungsi klien untuk skrip uji (scripts/uji/online-sambung-ulang.mjs) — tidak ada di build rilis
  (window as unknown as { __onlineUji: object }).__onlineUji = { mulaiSambung, gabung, sambungUlang, sekarangMs };
}

/** Sambung ke server lalu kirim "halo" (server membalas dengan data lobi). */
export async function mulaiSambung(alamat: string, nama: string, warna: string, kode: string) {
  const token = useOnline.getState().token;
  useOnline.setState({ status: 'menyambung', galat: null, alamat, nama, warna, kode });
  simpanIngatan(nama, warna, alamat, kode, token);
  try {
    await sambung(alamat);
    kirim({ t: 'halo', nama, kode, token, v: VERSI_PROTOKOL });
  } catch (e) {
    useOnline.setState({ status: 'mati', galat: e instanceof Error ? e.message : 'Gagal tersambung.' });
  }
}

export function gabung(sekamarDengan: string | null) {
  const o = useOnline.getState();
  kirim({ t: 'gabung', nama: o.nama, warna: o.warna, sekamarDengan, kode: o.kode, token: o.token, v: VERSI_PROTOKOL });
}

/**
 * Sambung ulang setelah putus (memakai nama, warna & token yang sama → server mengganti sesi lama
 * dan mengirim "snapshot" penuh: selamat + jam + daftar pemain). manual = ditekan pemain (hitungan diulang).
 */
export async function sambungUlang(manual = true) {
  const o = useOnline.getState();
  if (o.status === 'menyambung' || o.status === 'main') return;
  if (manual) {
    percobaan = 0;
    otomatis = true;
    batalUlang();
  }
  useOnline.setState({ status: 'menyambung', ulangDalam: null });
  try {
    await sambung(o.alamat);
    kirim({ t: 'gabung', nama: o.nama, warna: o.warna, sekamarDengan: null, kode: o.kode, token: o.token, v: VERSI_PROTOKOL });
    // Server tidak menjawab "selamat" dalam 8 dtk → anggap gagal, coba lagi nanti
    if (timerJawab) clearTimeout(timerJawab);
    timerJawab = setTimeout(() => {
      timerJawab = null;
      if (useOnline.getState().status !== 'menyambung') return;
      tutup();
      useOnline.setState({ status: 'putus' });
      jadwalUlang();
    }, 8000);
  } catch {
    // Gagal tersambung (server mati / sinyal hilang) → tetap di layar putus & coba lagi nanti
    if (useOnline.getState().status === 'menyambung') {
      useOnline.setState({ status: 'putus' });
      jadwalUlang();
    }
  }
}

/** Keluar dari mode online → muat ulang halaman (kembali ke save offline). */
export function keluarOnline() {
  const st = useGame.getState();
  if (st.online) simpanOnline(ambilSave(st), true);
  setTimeout(() => {
    tutup();
    window.location.reload();
  }, 150);
}

export function kirimChat(teks: string) {
  kirim({ t: 'chat', teks });
}

export function traktir(ke: string, jumlah: number) {
  const cek = cekTraktir(ambilSave(useGame.getState()), jumlah);
  if (!cek.boleh) {
    sfxSalah();
    useGame.getState().toast(cek.alasan ?? 'Tidak bisa');
    return;
  }
  kirim({ t: 'traktir', ke, jumlah });
}

/** M11: ajak teman online pacaran (dia harus menyetujui). */
export function ajakPacaran(ke: string) {
  kirim({ t: 'ajak', ke, jenis: 'pacaran' });
  useGame.getState().toast(`💌 Ajakan terkirim ke ${namaPemain(ke)}. Tunggu jawabannya ya!`);
}
/** Jawab ajakan pacaran yang masuk. */
export function jawabAjakan(terima: boolean) {
  const a = useOnline.getState().ajakan;
  useOnline.setState({ ajakan: null });
  if (!a) return;
  kirim({ t: 'jawabAjak', ke: a.dari, jenis: 'pacaran', terima });
  const g = useGame.getState();
  if (terima) {
    g.terapkanOnline(setPacarPemain(ambilSave(g), a.dari, a.nama), [`💘 Kamu dan ${a.nama} resmi pacaran!`]);
    useGame.setState((s) => ({ konfeti: s.konfeti + 1 }));
  }
}
export function putusOnline() {
  const g = useGame.getState();
  const p = g.pacar;
  if (!p || p.jenis !== 'pemain') return;
  kirim({ t: 'ajak', ke: p.id, jenis: 'putus' });
  g.terapkanOnline({ ...ambilSave(g), pacar: null }, [`💔 Kamu putus dengan ${p.nama}.`]);
}

// Kirim posisi saya ± 10×/detik (hanya jika berubah, atau tiap 1 detik sebagai "detak")
let poseTerakhir = '';
let kirimTerakhir = 0;
setInterval(() => {
  if (useOnline.getState().status !== 'main') return;
  const st = useGame.getState();
  const pose: Pose = {
    x: Math.round(playerPos.x * 100) / 100,
    z: Math.round(playerPos.z * 100) / 100,
    rotY: Math.round(playerPos.rotY * 100) / 100,
    lokasi: st.lokasi,
    gedung: st.lokasi === 'gedung' ? st.gedung : null,
    motor: st.naikMotor,
    gerak: playerPos.gerak,
  };
  const kunci = JSON.stringify(pose);
  const now = performance.now();
  if (kunci === poseTerakhir && now - kirimTerakhir < 1000) return;
  poseTerakhir = kunci;
  kirimTerakhir = now;
  kirim({ t: 'pose', pose });
}, 100);
