// Bank (tabungan, deposito, target), beasiswa, UKM, skill, lomba, kebun cabai, salon,
// serta "kait" ke PenerimaAksi: syarat tambahan, bonus efek, dan catatan setelah aksi.
using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;

namespace MS.Inti
{
    public partial class Sosial
    {
        // ===================== Skill (latihan) =====================

        void Latih(string id, int n = 1) { if (!string.IsNullOrEmpty(id)) s.latihan[id] = s.Ambil(s.latihan, id) + n; }
        /// <summary>Catat statistik dari sistem lain (ujian, shift per tempat) — dipakai tujuan cerita.</summary>
        public void Catat(string id) => Latih(id);

        /// <summary>Total latihan sebuah skill = jumlah semua aksi penyumbangnya ("kerja" = jumlah shift).</summary>
        int TotalLatihan(DataSkill sk)
        {
            int n = 0;
            foreach (var k in sk.stat) n += k == "kerja" ? s.jumlahShift : s.Ambil(s.latihan, k);
            return n;
        }

        public int LevelSkill(string id)
        {
            foreach (var sk in F.skill) if (sk.id == id) return F.LevelSkill(TotalLatihan(sk));
            return 0;
        }

        // ===================== Kait aksi (dipanggil PenerimaAksi) =====================

        /// <summary>Aksi yang seluruhnya ditangani di sini (bukan efek+waktu biasa).</summary>
        static readonly string[] AksiSendiri =
        {
            "ngobrolWarga", "menuWarga", "bukaInfoKos", "bukaBank", "bukaKarier", "potongRambut", "bukaTokoTani",
            "siramCabai", "panenCabai", "kasihMakanOyen", "bukaBengkel", "bukaPosPolisi", "bukaBukuSakti",
        };
        public bool Tangani(string id) => System.Array.IndexOf(AksiSendiri, id) >= 0;

        /// <summary>Syarat aksi milik Sosial (null = boleh).</summary>
        public string Cek(PerintahAksi p)
        {
            switch (p.Id)
            {
                case "ngobrolWarga": return CekSosial("ngobrolWarga", p.Target);
                case "menuWarga": return F.Warga(p.Target) == null ? "Orangnya sudah pergi." : null;
                case "siramCabai":
                    if (s.cabai < 0f) return "🌱 Pot masih kosong. Beli bibit cabai di Toko Tani.";
                    return s.cabaiSiram == s.hari ? "🌱 Sudah disiram hari ini." : null;
                case "panenCabai":
                    return s.cabai < 0.95f ? "🌱 Belum siap panen (" + Mathf.RoundToInt(Mathf.Max(0f, s.cabai) * 100f) + "%)." : null;
                case "kasihMakanOyen":
                    if (s.makananKucing <= 0) return "🐟 Makanan kucing habis. Beli di Toko Tani.";
                    return s.Ambil(s.batasAksi, "oyenMakan") == SlotFase && s.batasAksi.ContainsKey("oyenMakan") ? "😺 Oyen masih kenyang." : null;
            }
            return null;
        }

        int SlotFase => s.hari * 10 + (int)jam.Fase;

        public void Lakukan(PerintahAksi p)
        {
            switch (p.Id)
            {
                case "ngobrolWarga": JalankanSosial("ngobrolWarga", p.Target); Latih("ngobrol_" + p.Target); return;
                case "menuWarga": BukaMenu("warga", p.Target); return;
                case "bukaInfoKos": BukaMenu("kos", null); return;
                case "bukaBank": BukaMenu("bank", null); return;
                case "bukaKarier": BukaMenu("karier", null); return;
                case "potongRambut": BukaMenu("salon", null); return;
                case "bukaTokoTani": BukaMenu("tani", null); return;
                case "bukaBengkel": BukaMenu("bengkel", null); return;
                case "bukaBukuSakti": BukaMenu("bukuSakti", null); return;
                case "bukaPosPolisi": BukaMenu("polisi", null); return;
                case "siramCabai":
                    s.cabaiSiram = s.hari; Latih("siramCabai");
                    Umumkan("🌱 Cabai disiram. Pertumbuhan " + Mathf.RoundToInt(s.cabai * 100f) + "%");
                    break;
                case "panenCabai":
                    s.cabai = -1f; s.cabaiStok += F.cabai.panen; Latih("panenCabai");
                    Umumkan("🌶️ Panen " + F.cabai.panen + " cabai! Mi instan berikutnya jadi pedas mantap.");
                    break;
                case "kasihMakanOyen":
                    s.makananKucing--; s.batasAksi["oyenMakan"] = SlotFase;
                    TambahRelasiNpc("oyen", F.relasiMakanKucing);
                    Ubah(0, 0, -3);
                    Umumkan("🐟 Oyen makan dengan lahap! 😻 (sisa " + s.makananKucing + ")");
                    break;
            }
            Kabari();
        }

        /// <summary>Syarat tambahan untuk aksi biasa dari aksi.json (null = boleh).</summary>
        public string CekSyarat(string id)
        {
            if (id == "rapatUKM" && string.IsNullOrEmpty(s.ukm)) return "🎪 Kamu belum gabung UKM. Daftar di Pusat Karier kampus.";
            if (id == "kerjakanLomba" && !LombaBisaDikerjakan) return "🏆 Tidak ada lomba yang sedang kamu ikuti. Daftar di Pusat Karier (tgl " + F.lomba.tanggalBuka + "–" + F.lomba.tanggalTutup + ").";
            return null;
        }

        /// <summary>Bonus/penalti efek dari skill, relasi NPC, dan kos. Dipanggil sebelum pengali IPK-atas.</summary>
        public void UbahEfek(string id, DataAksi a, Efek e)
        {
            var k = EfekKos;
            switch (id)
            {
                case "freelance": if (e.uang > 0f) e.uang = Mathf.Round(e.uang * (1f + 0.1f * LevelSkill("pemrograman")) / 500f) * 500f; break;
                case "masakMi":
                    e.energi += 2 * LevelSkill("memasak");
                    if (s.cabaiStok > 0) { e.energi += 2; e.stres -= 3; }
                    break;
                case "mainGitar": e.stres -= 2 * LevelSkill("musik"); break;
                case "mainFutsal": case "jogging": if (e.energi < 0f) e.energi = Mathf.Min(0f, e.energi + 2 * LevelSkill("olahraga")); break;
                case "nongkrong": if (Lv("bangUdin") >= 2 && e.energi < 0f) e.energi = 0f; break;
                case "elusKucing": if (Lv("oyen") >= 1) e.stres = Mathf.Min(e.stres, -6f); break;
                case "mandi": e.energi += k.mandiEnergi; break;
                case "kuliah": if (Lv("pakDosen") >= 1 && e.ipk > 0f) e.ipk *= 1.1f; break;
            }
            if (a != null && a.jenis == "belajar" && e.ipk > 0f) e.ipk *= k.pengaliBelajar;
        }

        /// <summary>Tambahan efek tidur malam: kos, tidur bareng pacar, Oyen ikut tidur.</summary>
        public void UbahEfekTidur(Efek e, bool malam)
        {
            if (!malam) return;
            e.energi += EfekKos.energiTidur;
            if (s.tinggalBareng) e.stres += SOS.tidurBarengStres;
            if (Lv("oyen") >= 2) e.stres -= 3;
        }

        /// <summary>Catatan setelah aksi biasa: latihan skill, relasi NPC, lomba, UKM, cabai.</summary>
        public void Setelah(string id, DataAksi a)
        {
            var lvLama = LevelSemuaSkill();
            Latih(id);
            switch (id)
            {
                case "kuliah" or "belajarPerpus" or "bimbingan": TambahCircle("akademisi", 4); break;
                case "nongkrong" or "ngopi": TambahCircle("warkop", 3); break;
                case "rapatUKM" or "kerjakanLomba": TambahCircle("aktivis", 5); break;
                case "ngobrolBuKos" or "makanWarteg" or "bayarKos": TambahCircle("gang", 4); break;
                case "makanKafe" or "freelance": TambahCircle("sultan", 4); break;
            }
            if (id is "freelance" or "narikOjol" && a?.efek?.uang > 0)
                s.pendapatanKerja += Mathf.RoundToInt(a.efek.uang);
            if (a != null && !string.IsNullOrEmpty(a.npc)) { TambahRelasiNpc(a.npc, F.relasiNgobrol); Latih("ngobrol"); }
            if (a != null && a.jenis == "menu" && !string.IsNullOrEmpty(a.tempat)) Latih("makan_" + a.tempat);
            if (id == "masakMi" && s.cabaiStok > 0) { s.cabaiStok--; Umumkan("🌶️ Mi pedas level dewa! (cabai sisa " + s.cabaiStok + ")"); }
            if (id == "rapatUKM" && !string.IsNullOrEmpty(s.ukm))
            {
                Latih("ukm_" + s.ukm);
                if (s.ukm == "pers") { s.follower += 30; Umumkan("📰 Beritamu terbit di buletin kampus! Follower +30"); }
            }
            if (id == "kerjakanLomba") CatatSesiLomba();
            CekNaikSkill(lvLama);
            Kabari();
        }

        readonly List<int> lvSkill = new List<int>();
        List<int> LevelSemuaSkill()
        {
            lvSkill.Clear();
            foreach (var sk in F.skill) lvSkill.Add(F.LevelSkill(TotalLatihan(sk)));
            return lvSkill;
        }
        void CekNaikSkill(List<int> lama)
        {
            for (int i = 0; i < F.skill.Count && i < lama.Count; i++)
            {
                var sk = F.skill[i];
                int lv = F.LevelSkill(TotalLatihan(sk));
                if (lv > lama[i]) Umumkan(sk.ikon + " Skill " + sk.nama + " naik ke level " + lv + "! " + sk.bonus);
            }
        }

        // ===================== Pagi: bank, beasiswa, UKM, lomba, cabai =====================

        void PagiEkonomi()
        {
            // Deposito jatuh tempo → masuk tabungan + bunga (Ekonomi: bunga ×2)
            for (int i = s.deposito.Count - 1; i >= 0; i--)
            {
                var d = s.deposito[i];
                if (s.hari - d.mulai < F.deposito.tenorHari) continue;
                int hasil = Mathf.RoundToInt(d.jumlah * (1f + F.deposito.bungaBulanan * PengaliJurusan("bungaTabungan", 1f)));
                s.tabungan += hasil;
                s.deposito.RemoveAt(i);
                Umumkan("🏦 Deposito cair " + AturanHarian.Rupiah(hasil) + " (bunga " + AturanHarian.Rupiah(hasil - d.jumlah) + ") masuk tabungan.");
            }
            if (s.tanggal == 1 && s.hari > 1)
            {
                CairBeasiswa();
                GajiKarier();
                if (!string.IsNullOrEmpty(s.ukm))
                {
                    stat.TambahUang(-F.ukmIuran);
                    Umumkan("🎪 Iuran " + (F.Ukm(s.ukm)?.nama ?? "UKM") + " −" + AturanHarian.Rupiah(F.ukmIuran));
                }
            }
            if (s.lombaBulan == s.bulan && !s.lombaSelesai && s.tanggal >= F.lomba.tanggalUmum) UmumkanLomba();
            // Cabai tumbuh (logistik): dN = r·N·(1 − N); disiram kemarin/hari ini = laju penuh
            if (s.cabai >= 0f && s.cabai < 1f)
            {
                float r = s.cabaiSiram >= s.hari - 1 ? F.cabai.laju : F.cabai.lajuTanpaSiram;
                float n = s.cabai;
                float n1 = AsliCpp.CabaiTumbuh(n, r); // C++ bila ada
                s.cabai = n1;
                if (n < 0.95f && n1 >= 0.95f) Umumkan("🌶️ Cabai di pot sudah merah! Siap dipanen.");
            }
            CekTargetTabungan();
        }

        // ===================== Bank =====================

        public int Tabungan => s.tabungan;
        public int TargetTabungan => s.targetTabungan;
        public int TotalDeposito { get { int n = 0; foreach (var d in s.deposito) n += d.jumlah; return n; } }

        public string CekSetor(int n) => n <= 0 ? "Jumlahnya nol." : stat.Uang - n < 0 ? "💸 Uang di dompet nggak cukup." : null;
        public void Setor(int n)
        {
            string a = CekSetor(n); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-n); s.tabungan += n; Latih("menabung");
            Umumkan("🐷 Menabung " + AturanHarian.Rupiah(n) + ". Hebat!");
            CekTargetTabungan(); Kabari();
        }
        public void Tarik(int n)
        {
            n = Mathf.Min(n, s.tabungan);
            if (n <= 0) { Umumkan("🐷 Tabunganmu masih kosong."); return; }
            s.tabungan -= n; stat.TambahUang(n);
            Umumkan("🏧 Tarik tabungan " + AturanHarian.Rupiah(n)); Kabari();
        }
        public string CekDeposito(int n) =>
            n < F.deposito.minimal ? "Minimal " + AturanHarian.Rupiah(F.deposito.minimal) + "." : stat.Uang - n < 0 ? "💸 Uang di dompet nggak cukup." : null;
        public void Deposito(int n)
        {
            string a = CekDeposito(n); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-n);
            s.deposito.Add(new SimpanDeposito { jumlah = n, mulai = s.hari });
            int cair = Mathf.RoundToInt(n * (1f + F.deposito.bungaBulanan * PengaliJurusan("bungaTabungan", 1f)));
            Umumkan("🏦 Deposito " + AturanHarian.Rupiah(n) + " selama " + F.deposito.tenorHari + " hari → cair " + AturanHarian.Rupiah(cair) + ".");
            Kabari();
        }
        public void AturTarget(int n) { s.targetTabungan = n; Umumkan(n > 0 ? "🎯 Target tabungan: " + AturanHarian.Rupiah(n) : "🎯 Target tabungan dihapus"); Kabari(); }
        void CekTargetTabungan()
        {
            if (s.targetTabungan > 0 && s.tabungan >= s.targetTabungan)
            {
                Umumkan("🎯 Target tabungan " + AturanHarian.Rupiah(s.targetTabungan) + " tercapai! Hebat!");
                s.targetTabungan = 0; Latih("targetTercapai");
            }
        }

        // ===================== Beasiswa =====================

        public string BeasiswaNama => F.Beasiswa(s.beasiswa)?.nama;

        public string CekBeasiswa(DataBeasiswa b)
        {
            var q = b.syarat;
            if (!string.IsNullOrEmpty(s.beasiswa)) return "Kamu sudah menerima " + (BeasiswaNama ?? "beasiswa") + ". Maks 1 beasiswa.";
            if (s.beasiswaTolak.TryGetValue(b.id, out int sem) && sem == s.semester) return "⏳ Sudah daftar/dicabut semester ini. Coba lagi semester depan.";
            if (stat.Ipk < q.ipkMin) return "🎓 IPK minimal " + q.ipkMin.ToString("0.00") + " (kamu " + stat.Ipk.ToString("0.00") + ").";
            if (q.hartaMaks.HasValue && stat.Uang + s.tabungan + TotalDeposito >= q.hartaMaks.Value) return "💰 Khusus yang uang + tabungan < " + AturanHarian.Rupiah(q.hartaMaks.Value) + ".";
            if (q.sksMin.HasValue && s.sks < q.sksMin.Value) return "📘 Minimal " + q.sksMin.Value + " SKS (kamu " + s.sks + ").";
            if (q.jurusan != null && q.jurusan.Count > 0 && !q.jurusan.Contains(s.jurusan ?? "")) return "🏫 Jurusanmu tidak termasuk.";
            if (q.ukm && string.IsNullOrEmpty(s.ukm)) return "🎪 Harus aktif di UKM.";
            if (q.skillMin != null && q.skillMin.Count > 0)
            {
                bool ada = false; string teks = "";
                foreach (var kv in q.skillMin) { if (LevelSkill(kv.Key) >= kv.Value) ada = true; teks += (teks.Length > 0 ? " atau " : "") + kv.Key + " lv" + kv.Value; }
                if (!ada) return "🏅 Butuh skill " + teks + ".";
            }
            return null;
        }

        public void DaftarBeasiswa(string id)
        {
            var b = F.Beasiswa(id);
            if (b == null) return;
            string a = CekBeasiswa(b); if (a != null) { Umumkan(a); return; }
            s.beasiswa = b.id; Latih("beasiswaDiterima");
            Umumkan(b.ikon + " Selamat! Kamu lolos " + b.nama + "! " + AturanHarian.Rupiah(b.uang) + " cair tiap tanggal 1. Jaga IPK ≥ " + b.jagaIpk.ToString("0.00") + " ya!");
            Kabari();
        }

        void CairBeasiswa()
        {
            var b = F.Beasiswa(s.beasiswa);
            if (b == null) { s.beasiswa = null; return; }
            if (stat.Ipk < b.jagaIpk)
            {
                Umumkan("😢 " + b.nama + " dicabut karena IPK di bawah " + b.jagaIpk.ToString("0.00") + ". Daftar lagi semester depan!");
                s.beasiswaTolak[b.id] = s.semester; s.beasiswa = null;
                return;
            }
            stat.TambahUang(b.uang);
            Umumkan(b.ikon + " " + b.nama + " cair " + AturanHarian.Rupiah(b.uang) + "!");
        }

        // ===================== UKM =====================

        public string UkmNama => F.Ukm(s.ukm)?.nama;
        public void GabungUkm(string id)
        {
            var u = F.Ukm(id);
            if (u == null) { s.ukm = null; Umumkan("🎪 Kamu keluar dari UKM."); Kabari(); return; }
            s.ukm = u.id;
            Umumkan("🎪 Selamat bergabung di " + u.ikon + " " + u.nama + "! Rapat tiap Rabu Sore di kampus. Iuran " + AturanHarian.Rupiah(F.ukmIuran) + "/bulan.");
            Kabari();
        }

        // ===================== Lomba =====================

        public bool LombaBisaDikerjakan => s.lombaBulan == s.bulan && !s.lombaSelesai && s.lombaSkor.Count < F.lomba.sesi && s.tanggal < F.lomba.tanggalUmum;

        public string CekDaftarLomba()
        {
            var L = F.lomba;
            if (s.lombaBulan == s.bulan) return "Kamu sudah terdaftar lomba bulan ini.";
            if (s.tanggal < L.tanggalBuka || s.tanggal > L.tanggalTutup) return "Pendaftaran lomba dibuka tgl " + L.tanggalBuka + "–" + L.tanggalTutup + ".";
            return stat.Uang - L.biaya < data.Bal.batas.uangMin ? "💸 Uang pendaftaran nggak cukup." : null;
        }

        public void DaftarLomba()
        {
            string a = CekDaftarLomba(); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-F.lomba.biaya);
            s.lombaBulan = s.bulan; s.lombaSkor.Clear(); s.lombaSelesai = false;
            Umumkan("🏆 Terdaftar Lomba Coding & Karya Tulis! Kerjakan " + F.lomba.sesi + "× di meja belajar sebelum tgl " + F.lomba.tanggalUmum + ".");
            Kabari();
        }

        /// <summary>Kualitas sesi 0..1 = stres ideal (Yerkes–Dodson) × segar × pemahaman (IPK) × sedikit keberuntungan.</summary>
        void CatatSesiLomba()
        {
            if (!LombaBisaDikerjakan) return;
            float segar = stat.Lemas ? 0.6f : 1f;
            float paham = 0.6f + 0.4f * (stat.Ipk / 4f);
            float skor = Mathf.Clamp01(F.EfisiensiStres(stat.Stres) * segar * paham * (0.8f + 0.2f * acak()));
            s.lombaSkor.Add(Mathf.Round(skor * 100f) / 100f);
            Umumkan("🏆 Sesi lomba " + s.lombaSkor.Count + "/" + F.lomba.sesi + ": kualitas " + Mathf.RoundToInt(skor * 100f) + "%"
                    + (s.lombaSkor.Count >= F.lomba.sesi ? " — karya terkirim! Tunggu pengumuman tgl " + F.lomba.tanggalUmum : ""));
        }

        static float Logistik(float x) => 1f / (1f + Mathf.Exp(-x));

        void UmumkanLomba()
        {
            var L = F.lomba;
            s.lombaSelesai = true;
            float total = 0f; foreach (var x in s.lombaSkor) total += x;
            float rata = total / Mathf.Max(1, L.sesi);
            float z = 6f * rata + 2f * (stat.Ipk - 3f) - L.kesulitan;
            float r = acak();
            int juara = r < Logistik(z - 2f) ? 0 : r < Logistik(z - 1f) ? 1 : r < Logistik(z) ? 2 : -1;
            if (juara < 0 || juara >= L.hadiah.Count) { Umumkan("🏆 Pengumuman lomba: belum juara kali ini (skor " + Mathf.RoundToInt(rata * 100f) + "). Coba lagi bulan depan!"); return; }
            stat.TambahUang(L.hadiah[juara]); s.cv += 3 - juara; Latih("juaraLomba");
            Umumkan("🥇 JUARA " + (juara + 1) + " lomba! Hadiah " + AturanHarian.Rupiah(L.hadiah[juara]) + ". Keren!");
        }

        // ===================== Kebun cabai & toko tani =====================

        public float CabaiTumbuh => s.cabai;
        public string CekBibit() => s.cabai >= 0f ? "🌱 Pot cabai masih terisi. Panen dulu ya." : stat.Uang - F.cabai.hargaBibit < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup..." : null;
        public void BeliBibit()
        {
            string a = CekBibit(); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-F.cabai.hargaBibit);
            s.cabai = 0.02f; s.cabaiSiram = s.hari;
            Umumkan("🌱 Bibit cabai ditanam di pot kamar! Jangan lupa disiram tiap hari. −" + AturanHarian.Rupiah(F.cabai.hargaBibit));
            Kabari();
        }

        // ===================== Karier setelah lulus & seminar =====================

        public bool SudahBekerja => !string.IsNullOrEmpty(s.karier);
        public string KarierNama { get { foreach (var k in F.karier) if (k.id == s.karier) return k.nama; return null; } }
        DataKarier Karier(string id) { foreach (var k in F.karier) if (k.id == id) return k; return null; }

        /// <summary>Gaji bulanan: dasar + IPK + CV, dikali pengali bidang, dibulatkan Rp50.000.</summary>
        public int HitungGaji(string id)
        {
            var k = Karier(id);
            float dasar = F.gajiDasar + F.gajiPerIpk * (stat.Ipk - 2.5f) + F.gajiPerCv * s.cv;
            return Mathf.RoundToInt(Mathf.Max(2500000f, dasar) * (k != null ? k.pengali : 1f) / 50000f) * 50000;
        }
        public string CekLamar(string id) => !s.lulus ? "🎓 Lulus dulu baru bisa melamar kerja!" : SudahBekerja ? "Kamu sudah bekerja." : Karier(id) == null ? "Tidak ada." : null;
        public void Lamar(string id)
        {
            string a = CekLamar(id); if (a != null) { Umumkan(a); return; }
            var k = Karier(id);
            s.karier = k.id; Latih("karier");
            Umumkan("💼 Diterima di " + k.ikon + " " + k.nama + "! Gaji " + AturanHarian.Rupiah(HitungGaji(k.id)) + " tiap tanggal 1. Kiriman ortu berhenti, kamu sudah mandiri! 🎉");
            Kabari();
        }
        void GajiKarier()
        {
            var k = Karier(s.karier); if (k == null) return;
            int g = HitungGaji(k.id);
            stat.TambahUang(g);
            if (k.stresBulanan != 0f) Ubah(0, 0, k.stresBulanan);
            Umumkan("💼 Gaji " + k.nama + " masuk " + AturanHarian.Rupiah(g) + "!");
        }
        int Minggu => (s.hari - 1) / 7;
        public string CekSeminar() => s.seminarMinggu == Minggu + 1 ? "🎤 Seminar berikutnya minggu depan." : stat.Uang - F.seminar.biaya < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup..." : null;
        public void IkutSeminar()
        {
            string a = CekSeminar(); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-F.seminar.biaya); Ubah(0, 0, F.seminar.stres);
            s.cv += F.seminar.cv; s.seminarMinggu = Minggu + 1; Latih("seminar");
            Umumkan("🎤 Ikut seminar karier: dapat sertifikat & snack! CV +" + F.seminar.cv + "  −" + AturanHarian.Rupiah(F.seminar.biaya));
            Kabari();
        }

        // ===================== SIM & razia =====================

        public bool PunyaSim => s.punyaSim;
        public string CekSim() => s.punyaSim ? "🪪 Kamu sudah punya SIM C." : stat.Uang - F.lalin.hargaSim < data.Bal.batas.uangMin ? "💸 Biaya SIM " + AturanHarian.Rupiah(F.lalin.hargaSim) + "." : null;
        public void BuatSim()
        {
            string a = CekSim(); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-F.lalin.hargaSim); s.punyaSim = true; Latih("buatSim");
            Umumkan("🪪 SIM C jadi! Foto di SIM-nya kayak buronan, tapi sah. −" + AturanHarian.Rupiah(F.lalin.hargaSim));
            Kabari();
        }
        /// <summary>Diisi GameInti: apakah pemain sedang naik motor.</summary>
        public Func<bool> NaikMotor = () => false;

        /// <summary>Razia di jalan (pengganti tilang lampu merah sampai lampu lalin di Unity bergerak).</summary>
        void CekRazia()
        {
            if (!NaikMotor() || jam.Fase == Fase.Begadang || DiKamar() || acak() >= F.peluangRazia) return;
            s.razia++;
            if (s.punyaSim) { Umumkan("👮 Razia! \"Surat-suratnya, Mas?\" SIM & STNK lengkap, silakan lanjut. 👍"); return; }
            Ubah(-F.lalin.dendaTanpaSim, 0, F.lalin.stresTilang);
            Umumkan("👮 Razia! Nggak punya SIM... kena tilang −" + AturanHarian.Rupiah(F.lalin.dendaTanpaSim) + " 😵+" + F.lalin.stresTilang + ". Bikin SIM di Pos Polisi ya.");
        }

        // ===================== Bengkel =====================

        public int LevelMotor => Mathf.Max(1, s.motorLevel);
        public string WarnaMotor => s.warnaMotor;
        DataMotorUp Up(int lv) { foreach (var u in F.motorUpgrade) if (u.level == lv) return u; return null; }
        public float PengaliMotor => Up(LevelMotor)?.kecepatan ?? 1f;
        public float PengaliHemat => Up(LevelMotor)?.hemat ?? 1f;
        int HargaUpgrade(DataMotorUp u)
        {
            float pengali = s.traits.Contains("tanganMontir") ? .75f : 1f;
            if (TingkatConfidant("raka_ojol") >= 2) pengali *= .7f;
            return Mathf.RoundToInt(u.harga * pengali);
        }
        public string CekUpgradeMotor(DataMotorUp u) =>
            s.tahapPindahan > 0 && s.hari < 8 && u.level > 2 ? "Modifikasi berat dibuka mulai minggu kedua." :
            u.level <= LevelMotor ? "✅ Sudah terpasang." : u.level > LevelMotor + 1 ? "🔧 Upgrade level " + (u.level - 1) + " dulu." :
            stat.Uang - HargaUpgrade(u) < 0 ? "💸 Uangnya nggak cukup (upgrade tidak boleh ngutang)." : null;
        public void UpgradeMotor(int lv)
        {
            var u = Up(lv); if (u == null) return;
            string a = CekUpgradeMotor(u); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-HargaUpgrade(u)); s.motorLevel = u.level;
            Layanan.Audio?.Mainkan("upgrade");
            Umumkan("🔧 " + u.nama + " terpasang! Motor lebih kencang & irit. −" + AturanHarian.Rupiah(HargaUpgrade(u)));
            Kabari();
        }
        public string CekCatMotor(string w) => w == s.warnaMotor ? "🎨 Warnanya sama." : stat.Uang - F.hargaCatMotor < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup..." : null;
        public void CatMotor(string w)
        {
            if (!F.warnaMotor.Contains(w)) return;
            string a = CekCatMotor(w); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-F.hargaCatMotor); s.warnaMotor = w;
            Umumkan("🎨 Motor dicat ulang, kinclong kayak baru! −" + AturanHarian.Rupiah(F.hargaCatMotor));
            Kabari();
        }

        // ===================== Salon =====================

        public string Rambut => s.rambut;
        public string WarnaRambut => s.warnaRambut;
        public string CekGaya(DataGaya g) => g.id == s.rambut ? "💇 Rambutmu sudah gaya ini." : stat.Uang - g.harga < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup..." : null;
        public void PotongRambut(string id)
        {
            var g = F.Gaya(id); if (g == null) return;
            string a = CekGaya(g); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-g.harga); s.rambut = g.id; Latih("salon");
            Umumkan("💇 Gaya baru: " + g.nama + "! Makin kece 😎" + (g.harga > 0 ? "  −" + AturanHarian.Rupiah(g.harga) : ""));
            Kabari();
        }
        public string CekCat(string warna) => warna == s.warnaRambut ? "🎨 Warnanya sama." : stat.Uang - F.hargaCatRambut < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup..." : null;
        public void CatRambut(string warna)
        {
            if (!F.warnaRambut.Contains(warna)) return;
            string a = CekCat(warna); if (a != null) { Umumkan(a); return; }
            stat.TambahUang(-F.hargaCatRambut); s.warnaRambut = warna;
            Umumkan("🎨 Rambut dicat! −" + AturanHarian.Rupiah(F.hargaCatRambut));
            Kabari();
        }
    }
}
