// Panel menu umum (IMenuLayanan): bank, pusat karier (beasiswa/lomba/UKM), salon, toko tani, info kos, menu warga.
// Isi daftar dibangun ulang setiap kali dibuka/dipilih (jarang → alokasi kecil tidak masalah).
using System.Collections.Generic;
using MS.Kontrak;

namespace MS.Inti
{
    public partial class Sosial : IMenuLayanan
    {
        readonly List<InfoOpsi> opsi = new List<InfoOpsi>();
        string jenisMenu, targetMenu;

        public bool Terbuka { get; private set; }
        public string Ikon { get; private set; }
        public string Judul { get; private set; }
        public string Info { get; private set; }
        public IReadOnlyList<InfoOpsi> Daftar => opsi;

        public void BukaMenu(string jenis, string target)
        {
            jenisMenu = jenis; targetMenu = target; Terbuka = true;
            Bangun();
            Kabari();
        }

        public void Tutup() { if (!Terbuka) return; Terbuka = false; Kabari(); }

        static string Rp(int n) => AturanHarian.Rupiah(n);

        void Tambah(string id, string ikon, string nama, string ket, int harga, string alasan, bool aktif = false) =>
            opsi.Add(new InfoOpsi { Id = id, Ikon = ikon, Nama = nama, Keterangan = ket, Harga = harga, Boleh = alasan == null, Alasan = alasan, Aktif = aktif });
        void Subjudul(string teks) => opsi.Add(new InfoOpsi { Id = "", Nama = teks, Judul = true, Boleh = false });

        void Bangun()
        {
            opsi.Clear();
            switch (jenisMenu)
            {
                case "bank": MenuBank(); break;
                case "karier": MenuKarier(); break;
                case "beasiswa": MenuBeasiswa(); break;
                case "ukm": MenuUkm(); break;
                case "salon": MenuSalon(); break;
                case "tani": MenuTani(); break;
                case "kos": MenuKos(); break;
                case "warga": MenuWarga(); break;
                case "bengkel": MenuBengkel(); break;
                case "polisi": MenuPolisi(); break;
                case "bukuSakti": MenuBukuSakti(); break;
            }
        }

        public void Pilih(string id)
        {
            if (!Terbuka || string.IsNullOrEmpty(id)) return;
            int n = 0;
            int Angka(string awalan) => int.TryParse(id.Substring(awalan.Length), out n) ? n : 0;
            if (id == "kembali") { BukaMenu("karier", null); return; }
            if (id.StartsWith("setor_")) Setor(Angka("setor_"));
            else if (id.StartsWith("tarik_")) Tarik(id == "tarik_semua" ? s.tabungan : Angka("tarik_"));
            else if (id.StartsWith("depo_")) Deposito(Angka("depo_"));
            else if (id.StartsWith("target_")) AturTarget(Angka("target_"));
            else if (id == "subBeasiswa") { BukaMenu("beasiswa", null); return; }
            else if (id == "subUkm") { BukaMenu("ukm", null); return; }
            else if (id == "daftarLomba") DaftarLomba();
            else if (id.StartsWith("beasiswa_")) DaftarBeasiswa(id.Substring(9));
            else if (id.StartsWith("ukm_")) GabungUkm(id.Substring(4));
            else if (id.StartsWith("gaya_")) PotongRambut(id.Substring(5));
            else if (id.StartsWith("cat_")) CatRambut(id.Substring(4));
            else if (id == "bibitCabai") BeliBibit();
            else if (id == "makananKucing") BeliMakananKucing();
            else if (id.StartsWith("kos_")) PindahKos(id.Substring(4));
            else if (id.StartsWith("lamar_")) Lamar(id.Substring(6));
            else if (id == "seminar") IkutSeminar();
            else if (id == "buatSim") BuatSim();
            else if (id.StartsWith("motor_")) UpgradeMotor(Angka("motor_"));
            else if (id.StartsWith("catMotor_")) CatMotor(id.Substring(9));
            else if (id == "nabung_setor") Cerita?.SetorNabung();
            else if (id == "nabung_kirim") Cerita?.KirimNabung();
            else if (id == "nabung_batal") Cerita?.BatalNabung();
            else if (jenisMenu == "warga")
            {
                JalankanSosial(id, targetMenu);
                if (id == "kencan" || id == "putus") { Tutup(); return; } // kencan memakan waktu → panel ditutup
            }
            if (Terbuka) { Bangun(); Kabari(); }
        }

        // ---------- Bank ----------
        static readonly int[] Nominal = { 50000, 100000, 500000 };
        void MenuBank()
        {
            Ikon = "🏦"; Judul = "Bank Kampung";
            Info = "Dompet " + Rp(stat.Uang) + " · Tabungan " + Rp(s.tabungan) + (TotalDeposito > 0 ? " · Deposito " + Rp(TotalDeposito) : "")
                   + (s.targetTabungan > 0 ? " · 🎯 " + Rp(s.targetTabungan) : "");
            Subjudul("🐷 Tabungan (aman, tidak terpakai jajan)");
            foreach (int x in Nominal) Tambah("setor_" + x, "⬆️", "Setor " + Rp(x), null, x, CekSetor(x));
            foreach (int x in Nominal) Tambah("tarik_" + x, "⬇️", "Tarik " + Rp(x), null, 0, s.tabungan < x ? "Tabungan kurang." : null);
            Tambah("tarik_semua", "🏧", "Tarik semua", Rp(s.tabungan), 0, s.tabungan <= 0 ? "Tabungan kosong." : null);
            Subjudul("📈 Deposito " + F.deposito.tenorHari + " hari (bunga " + (F.deposito.bungaBulanan * PengaliJurusan("bungaTabungan", 1f) * 100f).ToString("0.0") + "%)");
            foreach (int x in new[] { 100000, 500000, 1000000 }) Tambah("depo_" + x, "🔒", "Deposito " + Rp(x), "cair ke tabungan setelah " + F.deposito.tenorHari + " hari", x, CekDeposito(x));
            Subjudul("🎯 Target tabungan");
            foreach (int x in F.targetTabungan) Tambah("target_" + x, "🎯", "Target " + Rp(x), null, 0, null, s.targetTabungan == x);
            if (s.targetTabungan > 0) Tambah("target_0", "✖️", "Hapus target", null, 0, null);
        }

        // ---------- Pusat karier ----------
        void MenuKarier()
        {
            Ikon = "🎓"; Judul = "Pusat Karier & Kemahasiswaan";
            Info = "IPK " + stat.Ipk.ToString("0.00") + " · " + s.sks + " SKS" + (BeasiswaNama != null ? " · " + BeasiswaNama : "") + (UkmNama != null ? " · " + UkmNama : "");
            Tambah("subBeasiswa", "🎗️", "Beasiswa", BeasiswaNama != null ? "Aktif: " + BeasiswaNama : "Lihat syarat & daftar", 0, null);
            string lomba = s.lombaBulan == s.bulan
                ? (s.lombaSelesai ? "Sudah diumumkan bulan ini" : "Terdaftar · sesi " + s.lombaSkor.Count + "/" + F.lomba.sesi + " (kerjakan di meja)")
                : "Buka tgl " + F.lomba.tanggalBuka + "–" + F.lomba.tanggalTutup + ", hadiah s.d. " + Rp(F.lomba.hadiah.Count > 0 ? F.lomba.hadiah[0] : 0);
            Tambah("daftarLomba", "🏆", "Daftar Lomba Bulanan", lomba, F.lomba.biaya, CekDaftarLomba());
            Tambah("subUkm", "🎪", "UKM (Unit Kegiatan Mahasiswa)", UkmNama != null ? "Anggota " + UkmNama : "Iuran " + Rp(F.ukmIuran) + "/bulan", 0, null);
            Tambah("seminar", "🎤", "Seminar Karier", "CV +" + F.seminar.cv + " · 😵 " + F.seminar.stres + " · 1×/minggu", F.seminar.biaya, CekSeminar());
            Subjudul("💼 Lowongan kerja (setelah lulus) · CV " + s.cv);
            foreach (var k in F.karier)
                Tambah("lamar_" + k.id, k.ikon, k.nama, k.ket + " · gaji ± " + Rp(HitungGaji(k.id)) + "/bln", 0, s.karier == k.id ? "✅ Kamu bekerja di sini." : CekLamar(k.id), s.karier == k.id);
        }

        void MenuBeasiswa()
        {
            Ikon = "🎗️"; Judul = "Beasiswa";
            Info = "Maks 1 beasiswa · cair tiap tanggal 1 · dicabut bila IPK turun";
            foreach (var b in F.beasiswa)
                Tambah("beasiswa_" + b.id, b.ikon, b.nama + " (" + Rp(b.uang) + "/bln)", b.deskripsi, 0, s.beasiswa == b.id ? "✅ Sedang kamu terima." : CekBeasiswa(b), s.beasiswa == b.id);
            Tambah("kembali", "⬅️", "Kembali", null, 0, null);
        }

        void MenuUkm()
        {
            Ikon = "🎪"; Judul = "UKM";
            Info = "Rapat tiap Rabu Sore di kampus · iuran " + Rp(F.ukmIuran) + "/bulan";
            foreach (var u in F.ukm) Tambah("ukm_" + u.id, u.ikon, u.nama, u.deskripsi, 0, s.ukm == u.id ? "✅ Kamu anggotanya." : null, s.ukm == u.id);
            if (!string.IsNullOrEmpty(s.ukm)) Tambah("ukm_", "🚪", "Keluar dari UKM", null, 0, null);
            Tambah("kembali", "⬅️", "Kembali", null, 0, null);
        }

        // ---------- Salon ----------
        void MenuSalon()
        {
            Ikon = "💈"; Judul = "Pangkas Rambut Bang Cukur";
            Info = "Gaya sekarang: " + (F.Gaya(s.rambut)?.nama ?? s.rambut);
            Subjudul("✂️ Gaya rambut");
            foreach (var g in F.gayaRambut) Tambah("gaya_" + g.id, "💇", g.nama, null, g.harga, CekGaya(g), g.id == s.rambut);
            Subjudul("🎨 Cat rambut (" + Rp(F.hargaCatRambut) + ")");
            foreach (var w in F.warnaRambut) Tambah("cat_" + w, "🎨", "Warna " + w, w, F.hargaCatRambut, CekCat(w), w == s.warnaRambut);
        }

        // ---------- Toko tani ----------
        void MenuTani()
        {
            Ikon = "🌱"; Judul = "Toko Tani";
            Info = s.cabai >= 0f ? "Pot cabai: " + UnityEngine.Mathf.RoundToInt(s.cabai * 100f) + "%" : "Pot cabai di kamar masih kosong";
            Tambah("bibitCabai", "🌶️", "Bibit Cabai", "Tanam di pot kamar, siram tiap hari, panen ± " + F.cabai.panen + " cabai", F.cabai.hargaBibit, CekBibit());
            var mk = data.Fitur.Barang("makananKucing");
            int harga = mk != null ? mk.harga : 15000;
            Tambah("makananKucing", "🐟", mk?.nama ?? "Makanan Kucing", (mk?.deskripsi ?? "Untuk Oyen") + " · punya " + s.makananKucing, harga,
                stat.Uang - harga < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup..." : null);
        }

        void BeliMakananKucing()
        {
            var mk = data.Fitur.Barang("makananKucing");
            int harga = mk != null ? mk.harga : 15000, isi = mk != null && mk.isi > 0 ? mk.isi : 5;
            if (stat.Uang - harga < data.Bal.batas.uangMin) { Umumkan("💸 Uangnya nggak cukup..."); return; }
            stat.TambahUang(-harga); s.makananKucing += isi;
            Umumkan("🐟 Beli makanan kucing (" + isi + "×) −" + Rp(harga));
        }

        // ---------- Info kos ----------
        void MenuKos()
        {
            Ikon = "📋"; Judul = "Info Kos Sekitar Kampus";
            Info = "Sekarang: " + KosIkon + " " + KosNama + " (" + Rp(HargaKos) + "/bln) · pindah = sewa baru + " + Rp(F.biayaPindahKos);
            foreach (var k in F.kos)
                Tambah("kos_" + k.id, k.ikon, k.nama + " · " + Rp(k.harga) + "/bln",
                    k.tipe + " · " + (k.jamMalam.HasValue ? "jam malam " + TeksJam(k.jamMalam.Value) : "bebas") + ". " + k.deskripsi,
                    k.harga + F.biayaPindahKos, CekPindahKos(k.id), k.id == s.kos);
        }

        // ---------- Bengkel ----------
        void MenuBengkel()
        {
            Ikon = "🔧"; Judul = "Bengkel Pak Jo";
            Info = "Motor level " + LevelMotor + " · kecepatan ×" + PengaliMotor.ToString("0.00") + " · bensin ×" + PengaliHemat.ToString("0.00");
            Subjudul("🏍️ Upgrade mesin");
            foreach (var u in F.motorUpgrade) Tambah("motor_" + u.level, "🔧", u.nama, "kecepatan ×" + u.kecepatan.ToString("0.00") + ", bensin ×" + u.hemat.ToString("0.00"), HargaUpgrade(u), CekUpgradeMotor(u), u.level <= LevelMotor);
            Subjudul("🎨 Cat motor (" + Rp(F.hargaCatMotor) + ")");
            foreach (var w in F.warnaMotor) Tambah("catMotor_" + w, "🎨", "Warna " + w, w, F.hargaCatMotor, CekCatMotor(w), w == s.warnaMotor);
        }

        // ---------- Pos polisi ----------
        void MenuPolisi()
        {
            Ikon = "👮"; Judul = "Pos Polisi · Layanan SIM";
            Info = s.punyaSim ? "🪪 SIM C kamu aktif. Hati-hati di jalan!" : "Tanpa SIM, razia di jalan bisa kena denda " + Rp(F.lalin.dendaTanpaSim) + ".";
            Tambah("buatSim", "🪪", "Bikin SIM C", "Tes tulis & praktik zig-zag (lulus kok, tenang)", F.lalin.hargaSim, CekSim(), s.punyaSim);
        }

        // ---------- Buku Sakti ----------
        /// <summary>Cerita utama (diisi GameInti) untuk halaman Buku Sakti & celengan Ibu.</summary>
        public Cerita Cerita;
        void MenuBukuSakti()
        {
            Ikon = "📒"; Judul = "Buku Sakti Ibu";
            if (Cerita == null) { Info = ""; return; }
            Info = Cerita.BabJudul != null ? Cerita.BabIkon + " " + Cerita.BabJudul + " · sisa " + Cerita.SisaHari + " hari" : Cerita.Ending != null ? "🎓 " + Cerita.Ending : "Halaman berikutnya belum terbuka";
            if (!string.IsNullOrEmpty(Cerita.Halaman)) Subjudul("\"" + Cerita.Halaman + "\"");
            foreach (var t in Cerita.Tujuan) opsi.Add(new InfoOpsi { Id = "", Ikon = t.Selesai ? "✅" : "⬜", Nama = t.Teks, Keterangan = t.Sekarang + "/" + t.Target, Judul = true, Boleh = false, Aktif = t.Selesai });
            var n = Cerita.Nabung;
            if (n != null && n.status == "aktif")
            {
                Subjudul("🐷 Celengan bantu warung Ibu: " + Rp(n.terkumpul) + "/" + Rp(n.target) + " (sampai hari " + n.batas + ")");
                Tambah("nabung_setor", "🐷", "Sisihkan " + Rp(Cerita.SetorPerKali), null, Cerita.SetorPerKali, Cerita.CekSetor());
                Tambah("nabung_kirim", "📤", "Kirim ke Ibu", null, 0, Cerita.CekKirim());
                Tambah("nabung_batal", "↩️", "Batalkan (uang kembali)", "Ibu tetap paham kok", 0, null);
            }
        }

        // ---------- Warga ----------
        void MenuWarga()
        {
            var w = F.Warga(targetMenu);
            if (w == null) { Tutup(); return; }
            int rel = Relasi("w_" + w.id);
            Ikon = w.ikon; Judul = w.nama + " · " + w.peran;
            Info = "💗 Relasi " + rel + "/100 · level " + F.LevelRelasi(rel) + (PacarDengan(w.id) ? " · ❤️ Pacarmu" + (s.tinggalBareng ? " (tinggal bareng)" : "") : "");
            foreach (var a in DaftarAksiWarga(w.id))
            {
                string alasan = CekSosial(a, w.id);
                switch (a)
                {
                    case "ngobrolWarga": Tambah(a, "💬", "Ngobrol", "Relasi +" + SOS.ngobrolRelasi, 0, alasan); break;
                    case "kasihHadiah": Tambah(a, "🎁", "Kasih Hadiah", "Kalau cocok kesukaannya, makin senang", SOS.hadiahHarga, alasan); break;
                    case "tembak": Tambah(a, "💘", "Nyatakan Cinta", "Butuh relasi " + SOS.tembakMinRelasi + "+", 0, alasan); break;
                    case "kencan": Tambah(a, "💑", jam.TanggalTua ? "Kencan hemat" : "Kencan", "2 jam · 😵 " + SOS.kencan.stres, -BiayaKencan, alasan); break;
                    case "ajakTinggal": Tambah(a, "🏠", "Ajak Tinggal Bareng", "Sewa kos jadi patungan", 0, alasan); break;
                    case "putus": Tambah(a, "💔", "Putus", null, 0, alasan); break;
                }
            }
        }
    }
}
