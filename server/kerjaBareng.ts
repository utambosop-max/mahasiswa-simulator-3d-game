// Shift "kerja bareng" di warteg/warkop: dijalankan di server supaya kedua pemain melihat hal yang sama.
// Bahan dibagi dua: pemain 1 pegang bahan ke-1,3,5 dan pemain 2 pegang bahan ke-2,4,6 → harus kompak!
import { BAL, KERJA, WAJAH_PELANGGAN, pesananKerja, type TempatKerja } from '../src/game/sim';
import type { KeadaanKerjaBareng } from '../src/online/protokol';

const JEDA_REAKSI = 900;
const acak = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export class ShiftBareng {
  k: KeadaanKerjaBareng;
  private batas = 0; // waktu (ms) kesabaran pelanggan habis
  private sabarMs = 0;
  private menuTerakhir = '';
  private detak: NodeJS.Timeout;
  private jeda: NodeJS.Timeout | null = null;

  constructor(
    tempat: TempatKerja,
    anggota: string[],
    private kirim: (k: KeadaanKerjaBareng) => void,
    private akhir: (k: KeadaanKerjaBareng) => void,
  ) {
    const kj = KERJA[tempat];
    this.k = {
      tempat,
      anggota,
      idx: 0,
      total: kj.jumlahPelanggan + BAL.online.kerjaBareng.tambahPelanggan,
      pelanggan: null,
      sisaMs: 0,
      reaksi: null,
      salah: null,
      benar: 0,
      gagal: 0,
      tips: 0,
      selesai: false,
    };
    this.detak = setInterval(() => this.cekWaktu(), 100);
    this.jeda = setTimeout(() => this.datang(), 1200); // beri waktu bersiap
    this.siar();
  }

  private siar() {
    this.k.sisaMs = this.k.pelanggan ? Math.max(0, this.batas - Date.now()) : 0;
    this.kirim(this.k);
  }

  private datang() {
    this.jeda = null;
    if (this.k.selesai) return;
    if (this.k.idx >= this.k.total) {
      this.selesai();
      return;
    }
    const kj = KERJA[this.k.tempat];
    const daftar = pesananKerja(this.k.tempat);
    let menu = acak(daftar);
    if (menu.id === this.menuTerakhir && daftar.length > 1) menu = daftar[(daftar.indexOf(menu) + 1) % daftar.length];
    this.menuTerakhir = menu.id;
    const sabar = Math.max(kj.kesabaranMin, kj.kesabaranAwal - this.k.idx * kj.kesabaranTurun) + BAL.online.kerjaBareng.tambahSabar;
    this.sabarMs = sabar * 1000;
    this.batas = Date.now() + this.sabarMs;
    this.k.pelanggan = { no: this.k.idx + 1, wajah: acak(WAJAH_PELANGGAN), menuId: menu.id, sabar, terisi: [] };
    this.k.reaksi = null;
    this.k.salah = null;
    this.siar();
  }

  private lanjut(teks: string, senang: boolean) {
    this.k.reaksi = { teks, senang };
    this.k.idx++;
    this.siar();
    this.jeda = setTimeout(() => this.datang(), JEDA_REAKSI);
  }

  private cekWaktu() {
    const p = this.k.pelanggan;
    if (this.k.selesai || !p || this.k.reaksi) return;
    if (Date.now() >= this.batas) {
      this.k.gagal++;
      this.lanjut('😤 Kelamaan! Pelanggan pergi...', false);
    }
  }

  tap(id: string, bahan: string) {
    const p = this.k.pelanggan;
    if (this.k.selesai || !p || this.k.reaksi) return;
    const kj = KERJA[this.k.tempat];
    const i = kj.bahan.findIndex((b) => b.id === bahan);
    if (i < 0 || this.k.anggota[i % this.k.anggota.length] !== id) return; // bukan bahan miliknya
    if (p.terisi.includes(bahan)) return;
    const menu = pesananKerja(this.k.tempat).find((m) => m.id === p.menuId);
    if (!menu) return;
    if (menu.resep.includes(bahan)) {
      p.terisi = [...p.terisi, bahan];
      this.k.salah = null;
      if (p.terisi.length === menu.resep.length) {
        const sisa = Math.max(0, this.batas - Date.now()) / this.sabarMs;
        const tip = Math.round((kj.tipMaks * sisa) / 100) * 100;
        this.k.benar++;
        this.k.tips += tip;
        this.lanjut(`😋 Kompak! +Rp${(kj.bayarPerPesanan + tip).toLocaleString('id-ID')}`, true);
      } else this.siar();
      return;
    }
    // Bahan salah → kesabaran berkurang
    this.batas -= kj.penaltiSalah * 1000;
    this.k.salah = { bahan, oleh: id };
    this.siar();
  }

  /** Salah satu pemain berhenti / putus → shift selesai, dibayar sebagian. */
  berhenti() {
    this.selesai();
  }

  private selesai() {
    if (this.k.selesai) return;
    this.k.selesai = true;
    this.k.pelanggan = null;
    this.k.reaksi = null;
    clearInterval(this.detak);
    if (this.jeda) clearTimeout(this.jeda);
    this.siar();
    this.akhir(this.k);
  }
}
