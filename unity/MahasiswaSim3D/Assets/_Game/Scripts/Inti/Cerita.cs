// Mesin cerita "Buku Sakti Ibu" (port src/game/cerita.ts). Berbasis PEMICU: tempat, fase, stat, flag, relasi.
// Alur: Periksa() dipanggil GameInti tiap detik → memulai/menutup bab, mencatat tujuan, menaruh id dialog
// di antrean. Dialog ditampilkan lewat panel event yang sudah ada (EventAcak.TampilkanLuar) saat layar kosong.
using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Inti
{
    public class Cerita : ICerita
    {
        const string Epilog = "epilog", AwalanEnd = "end:";
        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly Efek efek = new Efek();
        readonly List<InfoTujuan> tujuan = new List<InfoTujuan>();
        DataCerita C => data.Cerita;
        CeritaSimpan c => s.cerita;

        public event Action<string> Pesan;
        public event Action Berubah;
        /// <summary>Nama scene aktif (bisa diganti di tes).</summary>
        public Func<string> Scene = () => SceneManager.GetActiveScene().name;
        public Func<string> Fase = () => "pagi";
        public Func<int> OngkosPulang = () => 50000;
        public Func<bool> PunyaPacar = () => false;
        public Func<string> PemilikKos = () => "Bu Ratna";

        public Cerita(DataGame d, DataSimpan simpan, StatPemain st)
        {
            data = d; s = simpan; stat = st;
            if (s.cerita == null) s.cerita = new CeritaSimpan();
        }

        void Umumkan(string p) => Pesan?.Invoke(p);

        // ===================== Syarat =====================

        string Lokasi
        {
            get
            {
                string n = Scene() ?? "";
                return n == "KamarKos" ? "kamar" : n.StartsWith("Gedung_") ? "gedung" : "dunia";
            }
        }
        string Gedung { get { string n = Scene() ?? ""; return n.StartsWith("Gedung_") ? n.Substring(7) : ""; } }
        static int BulanDari(int hari) => (hari - 1) / 30 + 1;
        string KunciRelasi(string id) => data.Fitur3.Warga(id) != null ? "w_" + id : id;

        /// <summary>Nilai statistik; kunci "a+b" = dijumlah. "kerja" = jumlah shift.</summary>
        public int NilaiStat(string kunci)
        {
            int n = 0;
            foreach (var k in kunci.Split('+')) n += k == "kerja" ? s.jumlahShift : s.Ambil(s.latihan, k);
            return n;
        }

        int JumlahAkrab(int nilai)
        {
            int n = 0;
            foreach (var kv in s.relasi) if (kv.Key != "oyen" && kv.Value >= nilai) n++;
            return n;
        }

        bool AdaFlag(string f) => c.flag.ContainsKey(f);

        public bool Cek(SyaratCerita q, ProgresBabSimpan bab = null)
        {
            if (q == null) return true;
            if (q.pembukaSelesai.HasValue && s.profilDibuat != q.pembukaSelesai.Value) return false;
            if (q.hariMin.HasValue && s.hari < q.hariMin) return false;
            if (q.hariMaks.HasValue && s.hari > q.hariMaks) return false;
            if (q.tanggalMin.HasValue && s.tanggal < q.tanggalMin) return false;
            if (q.tanggalMaks.HasValue && s.tanggal > q.tanggalMaks) return false;
            if (q.bulanMin.HasValue && s.bulan < q.bulanMin) return false;
            if (q.uangMin.HasValue && s.uang < q.uangMin) return false;
            if (q.uangMaks.HasValue && s.uang > q.uangMaks) return false;
            if (q.sksMin.HasValue && s.sks < q.sksMin) return false;
            if (q.skripsiMin.HasValue && s.skripsi < q.skripsiMin) return false;
            if (q.ipkMin.HasValue && s.ipk < q.ipkMin) return false;
            if (q.ipkMaks.HasValue && s.ipk > q.ipkMaks) return false;
            if (q.stresMin.HasValue && s.stres < q.stresMin) return false;
            if (q.fase != null && !q.fase.Contains(Fase())) return false;
            if (q.lokasi != null && !q.lokasi.Contains(Lokasi)) return false;
            if (q.gedung != null && !q.gedung.Contains(Gedung)) return false;
            if (q.kos != null && !q.kos.Contains(s.kos)) return false;
            if (q.flag != null) foreach (var f in q.flag) if (!AdaFlag(f)) return false;
            if (q.tanpaFlag != null) foreach (var f in q.tanpaFlag) if (AdaFlag(f)) return false;
            if (q.flagSalahSatu != null) { bool ada = false; foreach (var f in q.flagSalahSatu) ada |= AdaFlag(f); if (!ada) return false; }
            if (q.flagUmur != null) foreach (var kv in q.flagUmur) if (!c.flag.TryGetValue(kv.Key, out int h) || s.hari - h < kv.Value) return false;
            if (q.lulus.HasValue && s.lulus != q.lulus.Value) return false;
            if (q.relasiMin != null) foreach (var kv in q.relasiMin) if (s.Ambil(s.relasi, KunciRelasi(kv.Key)) < kv.Value) return false;
            if (q.statMin != null) foreach (var kv in q.statMin) if (NilaiStat(kv.Key) < kv.Value) return false;
            if (q.punyaBeasiswa && string.IsNullOrEmpty(s.beasiswa)) return false;
            if (q.punyaPacar.HasValue && PunyaPacar() != q.punyaPacar.Value) return false;
            if (q.tabunganMin.HasValue && s.tabungan < q.tabunganMin) return false;
            if (q.celenganMin.HasValue && (c.nabung == null || (c.nabung.terkumpul < q.celenganMin && c.nabung.status != "terkirim"))) return false;
            if (q.raporMin.HasValue && s.semester - 1 < q.raporMin) return false;
            if (q.followerMaks.HasValue && s.follower > q.followerMaks) return false;
            if (q.wargaRelasiMin != null && JumlahAkrab(q.wargaRelasiMin.nilai) < q.wargaRelasiMin.jumlah) return false;
            if (q.wargaRelasiMaks != null && JumlahAkrab(q.wargaRelasiMaks.nilai) > q.wargaRelasiMaks.jumlah) return false;
            if (q.bulanBaru == true && (bab == null || BulanDari(s.hari) <= BulanDari(bab.mulai))) return false;
            if (q.atau != null && q.atau.Count > 0) { bool ada = false; foreach (var x in q.atau) if (Cek(x, bab)) { ada = true; break; } if (!ada) return false; }
            return true;
        }

        // ===================== Tujuan & bab =====================

        int Selisih(ProgresBabSimpan p, string k) => NilaiStat(k) - (p.dasar.TryGetValue(k, out int v) ? v : 0);

        /// <summary>Progres satu tujuan: sekarang / target.</summary>
        public void ProgresTujuan(BabCerita b, TujuanBab t, out int sekarang, out int target)
        {
            target = t.jumlah ?? 1;
            sekarang = 0;
            if (!c.bab.TryGetValue(b.id, out var p)) return;
            if (p.tujuan.Contains(t.id) || p.s == "selesai") { sekarang = target; return; }
            if (t.stat != null && t.stat.Count > 0)
            {
                if (!t.jumlah.HasValue) foreach (var v in t.stat.Values) { target = v; break; }
                int n = int.MaxValue;
                foreach (var k in t.stat.Keys) n = Math.Min(n, Selisih(p, k));
                sekarang = Mathf.Clamp(n, 0, target);
                return;
            }
            target = 1;
            sekarang = t.syarat != null && p.s == "aktif" && Cek(t.syarat, p) ? 1 : 0;
        }

        void PasangFlag(string f) { if (!string.IsNullOrEmpty(f) && !c.flag.ContainsKey(f)) c.flag[f] = s.hari; }

        void BeriHadiah(HadiahCerita h)
        {
            if (h == null) return;
            if (h.efek != null)
            {
                efek.Isi(h.efek); stat.Terapkan(efek);
                string r = Ringkas(h.efek);
                if (r.Length > 0) Umumkan("🎁 Hadiah Buku Sakti  " + r);
            }
            if (h.relasi != null)
                foreach (var kv in h.relasi) { string k = KunciRelasi(kv.Key); s.relasi[k] = Mathf.Clamp(s.Ambil(s.relasi, k) + kv.Value, 0, 100); }
        }

        static string Ringkas(Efek e)
        {
            string t = "";
            if (e.uang != 0) t += (e.uang > 0 ? "💰+" : "💰") + AturanHarian.Rupiah(Mathf.RoundToInt(e.uang)) + "  ";
            if (e.energi != 0) t += "⚡" + (e.energi > 0 ? "+" : "") + e.energi + "  ";
            if (e.stres != 0) t += "😵" + (e.stres > 0 ? "+" : "") + e.stres + "  ";
            if (e.ipk != 0) t += "🎓" + (e.ipk > 0 ? "+" : "") + e.ipk.ToString("0.00");
            return t.Trim();
        }

        readonly List<string> kunciSementara = new List<string>();

        /// <summary>Cek semua pemicu cerita. Murah bila tidak ada yang berubah.</summary>
        public void Periksa()
        {
            if (!s.profilDibuat) return;
            bool ubah = false;

            // 1) Bab aktif: tujuan, adegan, selesai / Rencana B
            foreach (var b in C.bab)
            {
                if (b.ending || !c.bab.TryGetValue(b.id, out var p) || p.s != "aktif") continue;
                foreach (var t in b.tujuan)
                {
                    if (p.tujuan.Contains(t.id)) continue;
                    ProgresTujuan(b, t, out int n, out int target);
                    if (n >= target) { p.tujuan.Add(t.id); Umumkan("📒 Buku Sakti ✅ " + t.teks); ubah = true; }
                }
                foreach (var a in b.adegan)
                {
                    if (c.adegan.Contains(a.id)) continue;
                    bool ok = true;
                    if (a.progres != null) foreach (var kv in a.progres) if (Selisih(p, kv.Key) < kv.Value) { ok = false; break; }
                    if (ok && Cek(a.pemicu, p)) { c.adegan.Add(a.id); c.antrean.Add(a.dialog); ubah = true; }
                }
                bool semua = true;
                foreach (var t in b.tujuan) if (!p.tujuan.Contains(t.id)) { semua = false; break; }
                if (semua)
                {
                    p.s = "selesai"; p.akhir = s.hari;
                    PasangFlag(b.flagSelesai);
                    BeriHadiah(b.hadiah);
                    if (!string.IsNullOrEmpty(b.dialogSelesai)) c.antrean.Add(b.dialogSelesai);
                    Umumkan("📒 " + b.ikon + " Bab \"" + b.judul + "\" selesai!");
                    ubah = true;
                }
                else if (s.hari > p.mulai + b.batasHari)
                {
                    p.s = "rencanaB"; p.akhir = s.hari;
                    PasangFlag(b.rencanaB?.flag);
                    if (!string.IsNullOrEmpty(b.rencanaB?.dialog)) c.antrean.Add(b.rencanaB.dialog);
                    Umumkan("📒 Halaman Rencana B: \"" + (b.rencanaB?.teks ?? "Nggak apa-apa, pelan-pelan.") + "\"");
                    ubah = true;
                }
            }

            // 2) Bab berikutnya (berurutan). Setelah lulus, bab biasa yang belum mulai dilompati.
            bool adaAktif = false; BabCerita berikut = null;
            foreach (var b in C.bab)
            {
                if (b.ending) continue;
                if (c.bab.TryGetValue(b.id, out var p)) { if (p.s == "aktif") adaAktif = true; }
                else if (berikut == null) berikut = b;
            }
            if (s.lulus && berikut != null)
            {
                foreach (var b in C.bab) if (!b.ending && !c.bab.ContainsKey(b.id)) c.bab[b.id] = new ProgresBabSimpan { s = "lewat", mulai = s.hari };
                ubah = true;
            }
            else if (berikut != null && !adaAktif && Cek(berikut.pemicu))
            {
                var p = new ProgresBabSimpan { s = "aktif", mulai = s.hari };
                kunciSementara.Clear();
                foreach (var t in berikut.tujuan) if (t.stat != null) kunciSementara.AddRange(t.stat.Keys);
                foreach (var a in berikut.adegan) if (a.progres != null) kunciSementara.AddRange(a.progres.Keys);
                foreach (var k in kunciSementara) p.dasar[k] = NilaiStat(k);
                c.bab[berikut.id] = p;
                if (!string.IsNullOrEmpty(berikut.dialogAwal)) c.antrean.Add(berikut.dialogAwal);
                Umumkan("📒 Halaman baru di Buku Sakti: " + berikut.ikon + " " + berikut.judul);
                ubah = true;
            }

            // 3) Ending saat wisuda
            BabCerita babEnd = null;
            foreach (var b in C.bab) if (b.ending) { babEnd = b; break; }
            if (babEnd != null && c.ending == null && Cek(babEnd.pemicu))
            {
                var e = TentukanEnding();
                if (e != null)
                {
                    c.ending = e.id;
                    c.bab[babEnd.id] = new ProgresBabSimpan { s = "selesai", mulai = s.hari, akhir = s.hari };
                    c.antrean.Add(AwalanEnd + e.id);
                    Umumkan("📒 Halaman terakhir Buku Sakti terbuka: " + e.ikon + " " + e.judul);
                    ubah = true;
                }
            }

            // 4) Adegan sampingan (sekali tampil)
            foreach (var x in C.sampingan)
                if (!c.adegan.Contains(x.id) && Cek(x.pemicu)) { c.adegan.Add(x.id); c.antrean.Add(x.dialog); ubah = true; }

            // 5) Celengan Ibu: tenggat lewat → uang kembali, tanpa hukuman
            var nb = c.nabung;
            if (nb != null && nb.status == "aktif" && s.hari > nb.batas)
            {
                nb.status = "lewat";
                if (nb.terkumpul > 0) { stat.TambahUang(nb.terkumpul); Umumkan("🐷 Celengan Ibu dikembalikan +" + AturanHarian.Rupiah(nb.terkumpul)); }
                PasangFlag("belumBisaBantu");
                c.antrean.Add("d_nabung_lewat");
                ubah = true;
            }

            // Buang id dialog yang tidak dikenal agar antrean tidak macet
            if (c.antrean.RemoveAll(id => !DialogValid(id)) > 0) ubah = true;
            if (ubah) { BangunTujuan(); Berubah?.Invoke(); }
        }

        bool DialogValid(string id)
        {
            if (string.IsNullOrEmpty(id)) return false;
            if (id == Epilog || C.PetaDialog.ContainsKey(id)) return true;
            if (id.StartsWith(AwalanEnd)) foreach (var e in C.ending) if (AwalanEnd + e.id == id) return true;
            return false;
        }

        public EndingCerita TentukanEnding()
        {
            foreach (var e in C.ending) if (Cek(e.syarat)) return e;
            return C.ending.Count > 0 ? C.ending[C.ending.Count - 1] : null;
        }

        // ===================== Dialog =====================

        string Isi(string t) => (t ?? "").Replace("{nama}", string.IsNullOrEmpty(s.nama) ? "Nak" : s.nama).Replace("{pemilikKos}", PemilikKos());

        public bool AdaDialog => c.antrean.Count > 0;

        /// <summary>Tampilkan kepala antrean lewat panel event. Dipanggil GameInti saat layar kosong.</summary>
        public void TampilkanBerikut(EventAcak ev)
        {
            if (c.antrean.Count == 0 || ev.Aktif != null) return;
            string id = c.antrean[0];
            var de = new DataEvent { id = "cerita:" + id };
            if (id.StartsWith(AwalanEnd))
            {
                EndingCerita e = null;
                foreach (var x in C.ending) if (AwalanEnd + x.id == id) e = x;
                if (e == null) { c.antrean.RemoveAt(0); return; }
                de.ikon = e.ikon; de.judul = "🎓 Ending: " + e.judul; de.teks = Isi(e.teks);
                de.pilihan.Add(new PilihanEvent { label = "📒 Buka halaman terakhir" });
            }
            else if (id == Epilog)
            {
                string teks = "\"" + C.halamanTerakhir + "\"";
                foreach (var x in C.epilog) if (Cek(x.syarat)) teks += " · " + x.teks;
                de.ikon = "📒"; de.judul = "Halaman Terakhir Buku Sakti"; de.teks = Isi(teks);
                de.pilihan.Add(new PilihanEvent { label = "🥹 Tutup buku (game tetap lanjut)", hasil = "📒 Buku Sakti tamat. Hidupmu belum!" });
            }
            else
            {
                var dl = C.PetaDialog[id];
                de.ikon = dl.ikon; de.judul = dl.judul; de.teks = Isi(dl.teks);
                foreach (var p in dl.pilihan)
                {
                    var e = new Efek();
                    if (p.efek != null) e.Isi(p.efek);
                    if (p.aksi == "ongkosPulang") e.uang -= OngkosPulang();
                    de.pilihan.Add(new PilihanEvent
                    {
                        label = p.teks, efek = e, hasil = Isi(p.hasil),
                        terkunci = p.syarat != null && !Cek(p.syarat) ? (p.kunci ?? "🔒 Belum bisa dipilih.") : null,
                    });
                }
            }
            ev.TampilkanLuar(de, i => Jawab(id, i));
        }

        /// <summary>Setelah pemain memilih (efek uang/stat sudah diterapkan EventAcak).</summary>
        public void Jawab(string id, int pilihan)
        {
            if (c.antrean.Count > 0 && c.antrean[0] == id) c.antrean.RemoveAt(0); else c.antrean.Remove(id);
            if (id.StartsWith(AwalanEnd)) { c.antrean.Insert(0, Epilog); Berubah?.Invoke(); return; }
            if (!C.PetaDialog.TryGetValue(id, out var dl) || pilihan < 0 || pilihan >= dl.pilihan.Count) { Berubah?.Invoke(); return; }
            var p = dl.pilihan[pilihan];
            if (p.setFlag != null) foreach (var f in p.setFlag) PasangFlag(f);
            if (p.relasi != null) BeriHadiah(new HadiahCerita { relasi = p.relasi });
            if (p.aksi == "mulaiNabung" && c.nabung == null)
                c.nabung = new MisiNabungSimpan { target = C.nabung.target, mulai = s.hari, batas = s.hari + C.nabung.durasiHari };
            string lanjut = p.ke;
            if (p.keJika != null) foreach (var k in p.keJika) if (Cek(k.syarat)) { lanjut = k.ke; break; }
            if (!string.IsNullOrEmpty(lanjut)) c.antrean.Insert(0, lanjut);
            BangunTujuan();
            Berubah?.Invoke();
        }

        // ===================== Celengan Ibu =====================

        public string CekSetor()
        {
            var n = c.nabung;
            if (n == null || n.status != "aktif") return "🐷 Celengan Ibu belum dibuka.";
            int j = Math.Min(C.nabung.setor, n.target - n.terkumpul);
            if (j <= 0) return "🐷 Celengan sudah penuh! Tinggal kirim ke Ibu.";
            return s.uang < j ? "💸 Uangnya belum cukup buat nyisihin " + AturanHarian.Rupiah(j) + "." : null;
        }
        public void SetorNabung()
        {
            string a = CekSetor(); if (a != null) { Umumkan(a); return; }
            var n = c.nabung;
            int j = Math.Min(C.nabung.setor, n.target - n.terkumpul);
            stat.TambahUang(-j); n.terkumpul += j;
            Umumkan("🐷 Disisihkan " + AturanHarian.Rupiah(j) + " · celengan " + AturanHarian.Rupiah(n.terkumpul) + "/" + AturanHarian.Rupiah(n.target));
            Berubah?.Invoke();
        }
        public string CekKirim()
        {
            var n = c.nabung;
            if (n == null || n.status != "aktif") return "🐷 Celengan Ibu belum dibuka.";
            return n.terkumpul < n.target ? "🐷 Kurang " + AturanHarian.Rupiah(n.target - n.terkumpul) + " lagi." : null;
        }
        public void KirimNabung()
        {
            string a = CekKirim(); if (a != null) { Umumkan(a); return; }
            c.nabung.status = "terkirim";
            PasangFlag("bantuWarung");
            c.antrean.Add("d_nabung_terkirim");
            Umumkan("📤 Celengan terkirim ke Ibu!");
            BeriHadiah(new HadiahCerita { efek = C.nabung.hadiah });
            Berubah?.Invoke();
        }
        public void BatalNabung()
        {
            var n = c.nabung;
            if (n == null || n.status != "aktif") return;
            n.status = "batal"; PasangFlag("belumBisaBantu");
            stat.TambahUang(n.terkumpul);
            Umumkan("🐷 Celengan dibatalkan, " + AturanHarian.Rupiah(n.terkumpul) + " kembali ke dompet. Ibu tetap paham kok ❤️");
            Berubah?.Invoke();
        }
        public MisiNabungSimpan Nabung => c.nabung;
        public int SetorPerKali => C.nabung.setor;

        // ===================== ICerita (HUD / Buku Sakti) =====================

        BabCerita BabAktif
        {
            get
            {
                foreach (var b in C.bab) if (!b.ending && c.bab.TryGetValue(b.id, out var p) && p.s == "aktif") return b;
                return null;
            }
        }
        public string BabIkon => BabAktif?.ikon;
        public string BabJudul => BabAktif?.judul;
        public string Halaman => BabAktif?.halaman;
        public int SisaHari { get { var b = BabAktif; return b == null ? 0 : Math.Max(0, c.bab[b.id].mulai + b.batasHari - s.hari); } }
        public string Ending { get { foreach (var e in C.ending) if (e.id == c.ending) return e.judul; return null; } }
        public IReadOnlyList<InfoTujuan> Tujuan { get { BangunTujuan(); return tujuan; } }

        void BangunTujuan()
        {
            tujuan.Clear();
            var b = BabAktif;
            if (b == null) return;
            foreach (var t in b.tujuan)
            {
                ProgresTujuan(b, t, out int n, out int target);
                tujuan.Add(new InfoTujuan { Teks = t.teks, Sekarang = n, Target = target, Selesai = n >= target });
            }
        }

        /// <summary>Diisi GameInti: buka halaman Buku Sakti di panel menu umum.</summary>
        public Action BukaBukuSaktiAksi;
        public void BukaBukuSakti() => BukaBukuSaktiAksi?.Invoke();
    }
}
