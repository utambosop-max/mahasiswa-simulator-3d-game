using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;

namespace MS.Inti
{
    /// <summary>
    /// Aksi kamar fase 1 (port sederhana dari sim.ts cekAksi/efekAksi).
    /// "tidurSiang" = tidur saat Pagi/Siang/Sore (di web: aksi "tidur" yang otomatis jadi tidur siang).
    /// </summary>
    public class PenerimaAksi : IPenerimaAksi
    {
        static readonly string[] AksiKamar = { "tidur", "tidurSiang", "rebahan", "belajar", "nugas", "masakMi", "mandi" };
        // Aksi luar ruangan berefek sederhana (efek & durasi dari aksi.json)
        static readonly string[] AksiLuar =
        {
            "kuliah", "belajarPerpus", "nongkrong", "periksa", "mainGame", "printTugas", "laundry", "santaiTaman",
            "mainFutsal", "naikAngkot", "jogging", "latihanGym", "tendangPenalti",
        };
        // Aksi beli menu (jenis "menu", tempat dari aksi.json)
        static readonly string[] AksiMenu = { "makanWarteg", "ngopi", "belanja", "makanPasar", "makanKafe", "gerobakNasgor" };
        static readonly string[] AksiKerja = { "kerjaWarteg", "kerjaWarkop" };
        /// <summary>Diisi GameInti: membuka mini-game kerja.</summary>
        public KerjaSambilan Kerja;
        public UpgradeKamar Upgrade;
        public Kehidupan Hidup;
        public Sosial Sosial;
        int BiayaKos => Sosial != null ? Sosial.HargaKos : data.Bal.bulanan.biayaKos;
        internal static readonly string[] NamaFase = { "pagi", "siang", "sore", "malam", "begadang" };

        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly Efek efek = new Efek(); // dipakai ulang, tanpa alokasi per aksi

        string _pesan;
        public string PesanTerakhir { get => _pesan; private set { _pesan = value; if (!string.IsNullOrEmpty(value)) PesanMasuk?.Invoke(value); } }
        public event Action<string> PesanMasuk; // setiap pesan baru (tidak tertimpa dalam satu frame)
        public event Action<string> AksiMulai;   // id aksi → hook animasi/audio
        internal event Action MenuDibeli;

        public PenerimaAksi(DataGame d, DataSimpan simpan, StatPemain st, JamGame j)
        { data = d; s = simpan; stat = st; jam = j; }

        // Jenis aksi yang cukup "terapkan efek + waktu" (data-driven dari aksi.json)
        static readonly string[] JenisUmum = { "santai", "kerjaLepas", "belajar", "ngobrol", "skripsi", "menu" };
        // Butuh sistem yang belum diport (motor, barang, toko, kebun, lomba, UKM, ojol)
        static readonly string[] BelumAda =
        {
            "keluar", "klakson", "minum",
        };

        bool Didukung(string id)
        {
            if (Array.IndexOf(AksiKamar, id) >= 0 || Array.IndexOf(AksiLuar, id) >= 0 || Array.IndexOf(AksiMenu, id) >= 0 || Array.IndexOf(AksiKerja, id) >= 0) return true;
            if (Array.IndexOf(BelumAda, id) >= 0) return false;
            if (Hidup != null && Array.IndexOf(AksiHidup, id) >= 0) return true;
            return data.Aksi.TryGetValue(id, out var a) && a != null && Array.IndexOf(JenisUmum, a.jenis) >= 0
                   && string.IsNullOrEmpty(a.butuhBarang) && string.IsNullOrEmpty(a.toko);
        }

        DataAkademik Ak => data.Akademik;
        static readonly string[] AksiHidup = { "naikMotor", "turunMotor", "isiBensin", "narikOjol", "belanjaBarang", "seduhKopi" };

        /// <summary>Syarat aksi motor/toko/kopi (null = boleh).</summary>
        string CekHidup(string id)
        {
            switch (id)
            {
                case "naikMotor": return Hidup.NaikMotor ? "🛵 Sudah di atas motor." : null;
                case "turunMotor": return Hidup.NaikMotor ? null : "Kamu tidak sedang naik motor.";
                case "isiBensin":
                    if (Hidup.Bensin >= 97f) return "⛽ Tangki masih penuh.";
                    return stat.Uang - Hidup.HargaIsiBensin < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup buat bensin." : null;
                case "narikOjol":
                    if (Hidup.Bensin < 10f) return "⛽ Bensin kurang buat narik. Isi dulu!";
                    return null;
                case "seduhKopi": return Hidup.BolehSeduh(out var a) ? null : a;
            }
            return null;
        }

        /// <summary>Batas "sekali per hari/fase" umum (disimpan di save.batasAksi).</summary>
        bool SudahHariIni(string kunci) => s.batasAksi != null && s.batasAksi.TryGetValue(kunci, out int h) && h == s.hari;
        int SlotFase => s.hari * 10 + (int)jam.Fase;
        bool SudahFaseIni(string kunci) => s.batasAksi != null && s.batasAksi.TryGetValue(kunci, out int h) && h == SlotFase;
        void Tandai(string kunci, int nilai) { if (s.batasAksi == null) s.batasAksi = new Dictionary<string, int>(); s.batasAksi[kunci] = nilai; }

        /// <summary>Dipakai AturanHarian untuk menampilkan pesan bolos/kiriman/kos.</summary>
        public void Umumkan(string pesan) { PesanTerakhir = pesan; }
        bool Malam => jam.Fase == Fase.Malam || jam.Fase == Fase.Begadang;

        public bool BolehDilakukan(PerintahAksi p, out string alasan)
        {
            alasan = null;
            string id = p.Id;
            if (jam.Sibuk) { alasan = "⏳ Tunggu dulu, masih sibuk."; return false; }
            if (id == "bukaUpgrade") return Upgrade != null;
            if (Sosial != null && Sosial.Tangani(id))
            {
                // Aksi sosial/layanan: cek jam buka dari aksi.json (bila ada), lalu syarat milik Sosial
                if (data.Aksi.TryGetValue(id, out var ad) && ad.fase != null && ad.fase.Count > 0 && !ad.fase.Contains(NamaFase[(int)jam.Fase]))
                { alasan = string.IsNullOrEmpty(ad.alasanTutup) ? ad.ikon + " " + ad.label + " tidak bisa dilakukan sekarang." : ad.alasanTutup; return false; }
                alasan = Sosial.Cek(p);
                return alasan == null;
            }
            if (id == "bayarKos")
            {
                if (s.kosLunas) { alasan = "✅ Kos bulan ini sudah lunas."; return false; }
                if (stat.Uang - BiayaKos < data.Bal.batas.uangMin) { alasan = "💸 Uangnya belum cukup buat bayar kos."; return false; }
                return true;
            }
            if (id == "masukKos" || id == "keluarKos" || id == "masukGedung" || id == "keluarGedung") return true; // pindah tempat: selalu boleh
            if (!Didukung(id)) { alasan = "🚧 Yang ini masih dibangun, sabar ya!"; return false; }
            if (id == "seduhKopi") { alasan = Hidup != null ? CekHidup(id) : "🚧"; return alasan == null; }
            if (id == "tidurSiang" && Malam) { alasan = "🌙 Sudah malam, tidur beneran aja!"; return false; }
            if (id == "tidurSiang") return true;

            if (!data.Aksi.TryGetValue(id, out var a)) { alasan = "Data aksi tidak ditemukan."; return false; }
            string fase = NamaFase[(int)jam.Fase];
            if (a.fase != null && !a.fase.Contains(fase))
            {
                alasan = a.alasanTutup ?? (a.ikon + " " + a.label + " tidak bisa dilakukan sekarang.");
                return false;
            }
            if (a.hariKerja && s.liburHari == s.hari) { alasan = "🎉 Dosen berhalangan, kuliah hari ini kosong!"; return false; }
            if (a.hariKerja && !AturanHarian.HariKerja(s.hari)) { alasan = "🎉 Hari ini libur kuliah!"; return false; }
            if (a.hari != null && a.hari.Count > 0 && !a.hari.Contains(AturanHarian.HariMinggu(s.hari)))
            { alasan = a.alasanTutup ?? "Belum waktunya."; return false; }
            if (id == "kuliah" && !CekKuliah(out alasan)) return false;
            if ((a.jenis == "makan" || a.jenis == "menu") && s.porsiFase >= data.Bal.kenyang.porsiPerFase)
            { alasan = "🤰 Masih kenyang! Tunggu fase berikutnya."; return false; }
            if (a.jenis == "kerja" && s.kerjaHari == s.hari && data.Bal.kerja.maksShiftPerHari <= 1)
            { alasan = "💼 Hari ini sudah kerja. Besok lagi ya!"; return false; }
            if (!CekBatasKhusus(id, a, out alasan)) return false;
            if (Sosial != null) { alasan = Sosial.CekSyarat(id); if (alasan != null) return false; }
            if (Hidup != null && Array.IndexOf(AksiHidup, id) >= 0) { alasan = CekHidup(id); if (alasan != null) return false; }
            if (id == "mandi" && s.mandiHari == s.hari)
            { alasan = "🧼 Sudah mandi hari ini, masih wangi kok!"; return false; }

            if (a.jenis == "menu")
            {
                if (PilihMenu(a, p.Target, out _) != null) return true;
                alasan = AdaMenu(a) ? "💸 Uangnya nggak cukup..." : "🍽️ Menunya belum tersedia di versi Unity.";
                return false;
            }

            HitungEfek(id, a);
            if (efek.energi < 0 && stat.Energi + efek.energi < 0)
            { alasan = "😮‍💨 Terlalu capek. Makan atau tidur dulu!"; return false; }
            if (efek.uang < 0 && stat.Uang + efek.uang < data.Bal.batas.uangMin)
            { alasan = "💸 Uangnya nggak cukup."; return false; }
            return true;
        }

        public void Lakukan(PerintahAksi p)
        {
            if (!BolehDilakukan(p, out var alasan)) { PesanTerakhir = alasan; return; }
            string id = p.Id;
            if ((id == "masukKos" || id == "masukGedung") && Hidup != null) Hidup.Turun(); // motor diparkir saat masuk bangunan
            if (id == "masukKos") { PesanTerakhir = "🏠 Pulang ke kamar."; AksiMulai?.Invoke(id); PindahScene.Ke("KamarKos", "pintuKamar"); return; }
            if (id == "keluarKos") { PesanTerakhir = "🚪 Keluar kos."; AksiMulai?.Invoke(id); Hidup?.SaatKeluarKos(); PindahScene.Ke("Kampung", "pintuKos"); return; }
            if (Hidup != null && Array.IndexOf(AksiHidup, id) >= 0 && LakukanHidup(id)) return;
            // Masuk/keluar interior gedung: Target = id gedung (scene Gedung_<id>)
            if (id == "masukGedung" && !string.IsNullOrEmpty(p.Target)) { PesanTerakhir = "🚪 Masuk."; AksiMulai?.Invoke(id); PindahScene.Ke("Gedung_" + p.Target, "masuk"); return; }
            if (id == "keluarGedung" && !string.IsNullOrEmpty(p.Target)) { PesanTerakhir = "🚪 Keluar."; AksiMulai?.Invoke(id); PindahScene.Ke("Kampung", "keluar_" + p.Target); return; }
            if (id == "bukaUpgrade") { Upgrade.Buka(); AksiMulai?.Invoke(id); return; }
            if (Sosial != null && Sosial.Tangani(id)) { AksiMulai?.Invoke(id); Sosial.Lakukan(p); return; }
            if (id == "bayarKos")
            {
                int biaya = BiayaKos;
                stat.TambahUang(-biaya);
                s.kosLunas = true;
                PesanTerakhir = "💸 Kos lunas −" + AturanHarian.Rupiah(biaya) + ". Bu Kos: \"Makasih ya, Dek!\"";
                AksiMulai?.Invoke(id);
                return;
            }
            bool tidur = id == "tidur" || id == "tidurSiang";
            data.Aksi.TryGetValue(tidur ? "tidur" : id, out var a);
            if (a != null && a.jenis == "menu") { BeliMenu(id, a, p.Target); return; }
            if (a != null && a.jenis == "kerja" && Kerja != null) { Kerja.Buka(a.kerja); AksiMulai?.Invoke(id); return; }
            if (tidur) HitungEfekTidur(); else HitungEfek(id, a);

            // Catatan khusus sebelum stat berubah
            if (a != null && a.jenis == "makan")
            {
                bool perutProtes = a.menuId == "mi_instan" && s.streakMi >= data.Bal.miInstan.batasBeruntun;
                s.streakMi = a.menuId == "mi_instan" ? s.streakMi + 1 : 0;
                s.porsiFase++;
                PesanTerakhir = perutProtes ? "🤢 Perutmu protes, kebanyakan mi instan!" : a.pesan;
            }
            else PesanTerakhir = a?.pesan;
            if (id == "mandi") s.mandiHari = s.hari;
            var ujian = id == "kuliah" ? Ak.UjianAktif(s) : null;
            if (id == "kuliah" || (a != null && a.jenis == "belajar"))
            {
                s.hariBelajar = s.hari;
                s.belajarLog.Add(s.hari);
                s.belajarLog.RemoveAll(h => h <= s.hari - 14); // simpan 2 minggu terakhir saja
            }
            CatatSetelahAksi(id, a, ujian);
            Hidup?.SetelahAksi(id);
            Sosial?.Setelah(tidur ? "tidur" : id, a);
            if (id == "kuliah") { if (jam.Fase == Fase.Pagi) s.hadirPagi = true; else s.hadirSiang = true; }

            float lama = tidur ? LamaTidur() : LamaAksi(a);
            stat.Terapkan(efek); // web: efek diterapkan lalu waktu dimajukan
            AksiMulai?.Invoke(id);
            if (lama > 0f) jam.MulaiSibuk(lama, tidur);
        }

        /// <summary>Aksi motor/toko/kopi. True = sudah ditangani.</summary>
        bool LakukanHidup(string id)
        {
            switch (id)
            {
                case "naikMotor": Hidup.Naik(); PesanTerakhir = "🛵 Brum brum! Hati-hati di jalan."; break;
                case "turunMotor": Hidup.Turun(); PesanTerakhir = "🅿️ Motor diparkir."; break;
                case "isiBensin":
                    int harga = Hidup.HargaIsiBensin;
                    stat.TambahUang(-harga); Hidup.IsiBensin();
                    PesanTerakhir = "⛽ Tangki bensin penuh! −" + AturanHarian.Rupiah(harga);
                    break;
                case "belanjaBarang": Hidup.BukaToko(); break;
                case "seduhKopi": Hidup.Seduh(); break;
                case "narikOjol":
                {
                    data.Aksi.TryGetValue(id, out var a);
                    int uang = Hidup.HitungOjol(out int order);
                    efek.Kosongkan();
                    if (a != null && a.efek != null) efek.Isi(a.efek);
                    efek.uang = uang;
                    stat.Terapkan(efek);
                    PesanTerakhir = "📦 Narik ojol selesai: " + order + " order ✅  +" + AturanHarian.Rupiah(uang);
                    AksiMulai?.Invoke(id);
                    float lama = LamaAksi(a);
                    if (lama > 0f) jam.MulaiSibuk(lama, false);
                    return true;
                }
                default: return false;
            }
            AksiMulai?.Invoke(id);
            return true;
        }

        /// <summary>Batas tiap aksi khusus (anti-spam §5 skill life-balancer).</summary>
        bool CekBatasKhusus(string id, DataAksi a, out string alasan)
        {
            alasan = null;
            if (a == null) return true;
            if (!string.IsNullOrEmpty(a.npc) && SudahHariIni("npc_" + a.npc)) { alasan = "💬 Sudah ngobrol hari ini. Besok lagi ya!"; return false; }
            if ((id == "elusKucing" || id == "kasihMakanOyen") && SudahFaseIni(id)) { alasan = "😺 Oyen lagi tidur, jangan diganggu dulu."; return false; }
            if ((id == "bersihKamar" || id == "kasihMakanIkan" || id == "siramTanaman") && SudahHariIni(id)) { alasan = "✨ Sudah dikerjakan hari ini."; return false; }
            if (id == "lesPrivat" && stat.Ipk < Ak.lesIpkMin) { alasan = "👩‍🏫 Orang tua murid minta guru les ber-IPK ≥ " + Ak.lesIpkMin.ToString("0.00") + "."; return false; }
            if (a.jenis == "skripsi")
            {
                if (s.lulus) { alasan = "🎓 Kamu sudah lulus!"; return false; }
                if (s.sks < Ak.skripsiMinSks) { alasan = "📘 Skripsi bisa dimulai setelah " + Ak.skripsiMinSks + " SKS (sekarang " + s.sks + ")."; return false; }
                if (id == "sidang" && (s.skripsi < 100 || s.sks < Ak.sksLulus)) { alasan = "🎓 Syarat sidang: skripsi 100% (" + s.skripsi + "%) & " + Ak.sksLulus + " SKS (" + s.sks + ")."; return false; }
                if ((id == "bimbingan" || id == "sidang") && !AturanHarian.HariKerja(s.hari)) { alasan = "🏫 Dosen cuma ada di hari kerja."; return false; }
            }
            return true;
        }

        /// <summary>Catatan setelah aksi: batas harian, SKS, ujian, skripsi, wisuda.</summary>
        void CatatSetelahAksi(string id, DataAksi a, DataUjian ujian)
        {
            if (a == null) return;
            if (!string.IsNullOrEmpty(a.npc)) Tandai("npc_" + a.npc, s.hari);
            if (id == "elusKucing" || id == "kasihMakanOyen") Tandai(id, SlotFase);
            if (id == "bersihKamar" || id == "kasihMakanIkan" || id == "siramTanaman") Tandai(id, s.hari);
            if (id == "kuliah")
            {
                int tambah = Ak.sksPerKuliah;
                if (ujian != null)
                {
                    float p = Ak.Persiapan(s);
                    tambah = p >= 0.4f ? Ak.sksPerUjian : 0;
                    s.ujianSelesai.Add(DataAkademik.Kunci(ujian, s));
                    Sosial?.Catat("ujian");
                    a = null; // pesan ujian menggantikan pesan kuliah
                    PesanTerakhir = "📝 " + ujian.nama + " selesai! Persiapan " + Mathf.RoundToInt(p * 100f) + "% → "
                                    + (p >= 0.8f ? "😎 Lancar!" : p >= 0.4f ? "😅 Lumayan..." : "😵 Banyak yang kosong...");
                }
                int lama = s.sks;
                s.sks = Math.Min(Ak.sksLulus + 20, s.sks + tambah);
                if (s.sks >= Ak.skripsiMinSks && lama < Ak.skripsiMinSks)
                    PesanTerakhir = "📄 " + Ak.skripsiMinSks + " SKS tercapai! Sekarang kamu boleh mulai skripsi (meja belajar).";
            }
            if (id == "nulisSkripsi" || id == "bimbingan")
            {
                int naik = id == "nulisSkripsi" ? Ak.progresNulis + (Sosial != null ? Sosial.LevelSkill("pemrograman") : 0)
                                                : UnityEngine.Mathf.RoundToInt(Ak.progresBimbingan * (Sosial != null ? Sosial.PengaliBimbingan : 1f));
                s.skripsi = Math.Min(100, s.skripsi + naik);
                PesanTerakhir = "📄 Skripsi " + s.skripsi + "% (+" + naik + "%)" + (s.skripsi >= 100 ? " — selesai! Daftar sidang di kampus 🎓" : "");
            }
            if (id == "sidang")
            {
                s.lulus = true;
                stat.TambahUang(Ak.hadiahWisuda);
                PesanTerakhir = "🎓 LULUS! Selamat, kamu resmi jadi Sarjana! Ortu kirim hadiah " + AturanHarian.Rupiah(Ak.hadiahWisuda) + " 🎉";
            }
        }

        /// <summary>Kuliah hanya di jendela jam sesi Pagi/Siang dan sekali per sesi.</summary>
        bool CekKuliah(out string alasan)
        {
            alasan = null;
            Fase f = jam.Fase;
            if (f != Fase.Pagi && f != Fase.Siang) return true; // fase lain sudah ditolak oleh aksi.json
            if (f == Fase.Pagi ? s.hadirPagi : s.hadirSiang) { alasan = "Kamu sudah kuliah di sesi ini."; return false; }
            if (data.Bal.jam.kuliah != null && data.Bal.jam.kuliah.TryGetValue(NamaFase[(int)f], out var w) && w != null && w.Length >= 2
                && (jam.Menit < w[0] || jam.Menit >= w[1]))
            {
                alasan = "🏫 Kelas " + NamaFase[(int)f] + " jam " + TeksJam(w[0]) + "–" + TeksJam(w[1]) + ". Sekarang jam " + TeksJam((int)jam.Menit) + ".";
                return false;
            }
            return true;
        }

        string TeksJam(int menit)
        {
            int t = (data.Bal.jam.mulaiHariJam * 60 + menit) % 1440;
            return (t / 60).ToString("00") + "." + (t % 60).ToString("00");
        }

        // ===== Menu (warteg, warkop, minimarket, pasar, kafe, gerobak) =====

        bool AdaMenu(DataAksi a) =>
            a.tempat != null && data.Menu.TryGetValue(a.tempat, out var d) && d != null && d.Count > 0;

        /// <summary>Kontrak: harga resmi menu untuk UI (−1 bila aksi/menu tidak dikenal).</summary>
        public int HargaMenu(string idAksi, string idMenu)
        {
            if (idAksi == null || idMenu == null || !data.Aksi.TryGetValue(idAksi, out var a) || a.tempat == null) return -1;
            if (!data.Menu.TryGetValue(a.tempat, out var daftar) || daftar == null) return -1;
            for (int i = 0; i < daftar.Count; i++) if (daftar[i].id == idMenu) return HargaMenu(a.tempat, daftar[i]);
            return -1;
        }

        /// <summary>Harga warteg naik saat tanggal tua; semua menu x hargaMakan.pengali; dibulatkan Rp500 (min Rp1.000).</summary>
        public int HargaMenu(string tempat, DataMenu m)
        {
            int naik = tempat == "warteg" && jam.TanggalTua ? data.NaikTanggalTua : 0;
            if (Sosial != null) naik -= Sosial.DiskonMenu(tempat, m.id); // akrab dengan penjual -> lebih murah
            float h = (m.harga + naik) * data.Bal.hargaMakan.pengali;
            return Math.Max(1000, (int)Math.Round(h / 500f) * 500);
        }

        /// <summary>Menu sesuai Target (id menu) bila diisi; kalau kosong -> menu pertama yang terjangkau.</summary>
        public DataMenu PilihMenu(DataAksi a, string target, out int harga)
        {
            harga = 0;
            if (a.tempat == null || !data.Menu.TryGetValue(a.tempat, out var daftar) || daftar == null) return null;
            for (int i = 0; i < daftar.Count; i++)
            {
                var m = daftar[i];
                if (!string.IsNullOrEmpty(target) && m.id != target) continue;
                int h = HargaMenu(a.tempat, m);
                if (stat.Uang - h >= data.Bal.batas.uangMin) { harga = h; return m; }
                if (!string.IsNullOrEmpty(target)) return null; // menu pilihan tidak terjangkau
            }
            return null;
        }

        void BeliMenu(string id, DataAksi a, string target)
        {
            var m = PilihMenu(a, target, out int harga);
            if (m == null) return; // sudah dicek di BolehDilakukan
            efek.Kosongkan();
            if (m.efek != null) efek.Isi(m.efek);
            efek.uang = -harga;
            s.porsiFase++;
            if (a.tempat == "warteg" || a.tempat == "gerobak") s.streakMi = 0; // makan bergizi -> perut lega
            stat.Terapkan(efek);
            PesanTerakhir = m.ikon + " " + m.nama + "  −" + AturanHarian.Rupiah(harga);
            Sosial?.Setelah(id, a); // statistik cerita (mis. makan_warteg)
            MenuDibeli?.Invoke();
            AksiMulai?.Invoke(id);
        }

        /// <summary>Efek aksi biasa ke field `efek` (tanpa alokasi).</summary>
        void HitungEfek(string id, DataAksi a)
        {
            efek.Kosongkan();
            if (id == "tidur" || id == "tidurSiang") { HitungEfekTidur(); return; }
            if (a == null) return;
            if (a.efek != null) efek.Isi(a.efek);

            if (!string.IsNullOrEmpty(a.menuId))
            {
                var m = data.CariMenu(a.menuId);
                if (m != null) { efek.energi += m.efek.energi; efek.stres += m.efek.stres; efek.ipk += m.efek.ipk; efek.uang -= m.harga; }
                // Kebanyakan mi instan → energi berkurang, stres bertambah
                if (a.menuId == "mi_instan" && s.streakMi >= data.Bal.miInstan.batasBeruntun)
                {
                    efek.energi = Mathf.Round(efek.energi * data.Bal.miInstan.pengaliEnergi);
                    efek.stres += data.Bal.miInstan.stresTambahan;
                }
            }

            // Minggu ujian: kuliah = ikut UTS/UAS. Nilai dari persiapan 7 hari terakhir.
            if (id == "kuliah")
            {
                var u = Ak.UjianAktif(s);
                if (u != null)
                {
                    float p = Ak.Persiapan(s);
                    efek.ipk = Mathf.Round((Ak.ujianIpkMin + (Ak.ujianIpkMaks - Ak.ujianIpkMin) * p) * 1000f) / 1000f;
                    efek.stres += Ak.ujianStres;
                    return;
                }
            }
            if (Hidup != null)
            {
                if (id == "kuliah") efek.stres += Hidup.PengaliJurusan("stresKuliah", 0f);
                if (a.jenis == "santai" && efek.stres < 0f) efek.stres = Mathf.Round(efek.stres * Hidup.PengaliJurusan("stresSantai"));
                if (id == "periksa" && efek.uang != 0f) efek.uang = Mathf.Round(efek.uang * Hidup.PengaliJurusan("hargaKlinik"));
                if (id == "freelance" && efek.uang != 0f) efek.uang = Mathf.Round(efek.uang * Hidup.PengaliJurusan("gajiFreelance") / 500f) * 500f;
            }
            if ((a.jenis == "belajar" || id == "kuliah") && efek.ipk > 0f)
            {
                float k = 1f;
                if (Hidup != null)
                {
                    k *= Hidup.PengaliJurusan(id == "kuliah" ? "ipkKuliah" : "ipkBelajar");
                    if (Hidup.Sakit) k *= data.Fitur.kehidupan.sakitPengaliIpk; // sakit → susah fokus
                }
                if (a.pakaiMeja) { float pm = data.EfekPerabot("meja", s.LevelPerabot("meja"), "pengaliBelajar", 1f); k *= pm > 0f ? pm : 1f; }
                if (stat.Lemas) k *= data.Bal.pengali.ipkSaatLemas;
                if (stat.StresTinggi) k *= data.Bal.pengali.ipkSaatStres;
                efek.ipk *= k;
            }
            Sosial?.UbahEfek(id, a, efek); // skill, relasi NPC, kos
            // Makin dekat 4,0 makin sulit naik (ekonomi-semester A1)
            if (efek.ipk > 0f) efek.ipk = Mathf.Round(efek.ipk * PengaliIpkAtas(stat.Ipk) * 1000f) / 1000f;
        }

        void HitungEfekTidur()
        {
            efek.Kosongkan();
            int kasur = s.LevelPerabot("kasur");
            if (Malam)
            {
                // Pemulihan eksponensial: jam pertama paling memulihkan (m12.ts energiTidur)
                float maks = data.EfekPerabot("kasur", kasur, "energiTidurMalam", 55f);
                efek.energi = Mathf.Round(maks * DataGame.SkalaTidur * (1f - Mathf.Exp(-LamaTidur() / DataGame.TauPulihMenit)));
                if (Hidup != null && Hidup.Sakit) efek.energi = Mathf.Round(efek.energi * data.Fitur.kehidupan.sakitPengaliTidur);
                efek.stres = data.EfekPerabot("kasur", kasur, "stresTidur", -8f)
                           + data.EfekPerabot("dekorasi", s.LevelPerabot("dekorasi"), "stresTidur", 0f); // poster/lampu hias
            }
            else
            {
                efek.energi = data.EfekPerabot("kasur", kasur, "energiTidurSiang", 20f);
                efek.stres = data.Bal.tidurSiang.stres;
            }
            Sosial?.UbahEfekTidur(efek, Malam);
        }

        public float PengaliIpkAtas(float ipk)
        {
            var c = data.Bal.ipkAtas;
            if (ipk <= c.mulai) return 1f;
            return Mathf.Max(c.minimal, (4f - ipk) / (4f - c.mulai));
        }

        /// <summary>Tidur malam sampai 06.00; sangat larut → kesiangan 10.00. Siang: 2 jam.</summary>
        float LamaTidur()
        {
            var j = data.Bal.jam;
            if (!Malam) return j.tidurSiangMenit;
            float m = jam.Menit;
            bool larut = m >= j.tidurLarutMulai || m < j.bangunPagi;
            int bangun = larut ? j.bangunKesiangan : j.bangunPagi;
            float n = (bangun - m + 1440f) % 1440f;
            return n <= 0f ? 1440f : n;
        }

        /// <summary>Dipakai KerjaSambilan setelah shift: kirim pesan + hook, mulai sibuk.</summary>
        internal void SelesaiShift(string idAksi, string pesan, float menit)
        {
            PesanTerakhir = pesan;
            if (menit > 0f) jam.MulaiSibuk(menit, false);
        }

        internal static float LamaAksi(DataAksi a)
        {
            if (a == null) return 0f;
            return Mathf.Round((a.durasiJam ?? a.majuFase * 2f) * 60f);
        }
    }
}
