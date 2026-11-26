// Hidup sosial & ekonomi lanjutan (port m11.ts, fitur.ts, m12.ts). Kelas ini dibagi ke beberapa file (partial):
//   Sosial.cs        → inti: aturan waktu, relasi NPC/warga, pacaran
//   SosialKos.cs     → kos (harga, pindah, jam malam, hantu, sarapan)
//   SosialEkonomi.cs → bank, beasiswa, UKM, skill, lomba, kebun cabai, salon
//   SosialMenu.cs    → panel menu umum (IMenuLayanan) untuk semua layanan tempat
using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Inti
{
    public partial class Sosial : IInfoHidup
    {
        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly Func<float> acak;
        readonly Efek efek = new Efek();

        public event Action<string> Pesan;
        public event Action Berubah;
        /// <summary>Pengali jurusan (diisi GameInti dari Kehidupan).</summary>
        public Func<string, float, float> PengaliJurusan = (k, b) => b;
        /// <summary>Pemain sedang di kamar kos? (bisa diganti di tes)</summary>
        public Func<bool> DiKamar = () => SceneManager.GetActiveScene().name == "KamarKos";

        DataFitur3 F => data.Fitur3;
        DataSosial SOS => data.Fitur3.sosial;

        public Sosial(DataGame d, DataSimpan simpan, StatPemain st, JamGame j, Func<float> acak = null)
        {
            data = d; s = simpan; stat = st; jam = j;
            this.acak = acak ?? (() => UnityEngine.Random.value);
            jam.HariDimulai += SaatHariDimulai;
            jam.FaseSelesai += SaatFaseSelesai;
            jam.FaseBerganti += SaatFaseBerganti;
        }

        public void Lepas() { jam.HariDimulai -= SaatHariDimulai; jam.FaseSelesai -= SaatFaseSelesai; jam.FaseBerganti -= SaatFaseBerganti; }

        void Umumkan(string p) => Pesan?.Invoke(p);
        void Ubah(float uang, float energi, float stres)
        {
            efek.Kosongkan(); efek.uang = uang; efek.energi = energi; efek.stres = stres;
            stat.Terapkan(efek);
        }
        void Kabari() => Berubah?.Invoke();

        // ===================== Aturan waktu =====================

        void SaatHariDimulai()
        {
            PagiKos();
            CekPacarHarian();
            PagiEkonomi();
            PerkNpcPagi();
            Kabari();
        }

        void SaatFaseSelesai(Fase lama)
        {
            if (jam.Absen) return;
            float st = StresPasifKos(lama);
            if (st != 0f) Ubah(0, 0, st);
        }

        void SaatFaseBerganti(Fase baru) { if (!jam.Absen) { CekHantu(baru); CekRazia(); } }

        /// <summary>Dipanggil GameInti tiap frame (murah): cek gerbang kos dikunci.</summary>
        public void Periksa() => CekJamMalam();

        // ===================== Relasi =====================

        public int Relasi(string id) => s.Ambil(s.relasi, id);
        public int LevelRelasi(string id) => F.LevelRelasi(Relasi(id));
        void TambahRelasi(string id, int n)
        {
            if (n > 0 && id != "oyen") n = Mathf.RoundToInt(n * PengaliJurusan("relasi", 1f));
            if (string.IsNullOrEmpty(id)) return;
            s.relasi[id] = Mathf.Clamp(Relasi(id) + n, 0, 100);
        }

        /// <summary>Tambah relasi NPC tetap (Bu Kos, Mbak Sri, ...) + umumkan naik level beserta perk barunya.</summary>
        void TambahRelasiNpc(string id, int n)
        {
            int lama = LevelRelasi(id);
            TambahRelasi(id, n);
            int baru = LevelRelasi(id);
            var npc = F.Npc(id);
            if (baru > lama && npc != null)
                Umumkan("🤝 Akrab dengan " + npc.nama + " naik ke level " + baru + "!"
                        + (npc.perk != null && baru - 1 < npc.perk.Count ? " Bonus: " + npc.perk[baru - 1] : ""));
        }

        // ===================== Warga & pacaran =====================

        public bool PunyaPacar => !string.IsNullOrEmpty(s.pacarId);
        public string PacarNama => PunyaPacar ? (F.Warga(s.pacarId)?.nama ?? s.pacarId) : null;
        public bool TinggalBareng => s.tinggalBareng;
        bool PacarDengan(string id) => PunyaPacar && s.pacarId == id;
        bool SudahHari(string kunci) => s.Ambil(s.batasAksi, kunci) == s.hari && s.batasAksi.ContainsKey(kunci);
        void TandaiHari(string kunci) => s.batasAksi[kunci] = s.hari;

        /// <summary>Daftar aksi sosial yang tampil di menu warga (menyesuaikan hubungan).</summary>
        public List<string> DaftarAksiWarga(string id)
        {
            var a = new List<string>();
            var w = F.Warga(id);
            if (w == null) return a;
            a.Add("ngobrolWarga"); a.Add("kasihHadiah");
            if (PacarDengan(id))
            {
                a.Add("kencan");
                if (!s.tinggalBareng) a.Add("ajakTinggal");
                a.Add("putus");
            }
            else if (w.pacar && !PunyaPacar && Relasi("w_" + id) >= SOS.tembakMinRelasi * 0.6f) a.Add("tembak");
            return a;
        }

        public string CekSosial(string aksi, string id)
        {
            var w = F.Warga(id);
            if (w == null) return "Orangnya sudah pergi.";
            int rel = Relasi("w_" + id);
            switch (aksi)
            {
                case "ngobrolWarga": return SudahHari("w_" + id) ? "💬 Sudah ngobrol dengan " + w.nama + " hari ini." : null;
                case "kasihHadiah":
                    if (SudahHari("h_" + id)) return "🎁 Sudah kasih hadiah hari ini. Jangan berlebihan!";
                    return stat.Uang - SOS.hadiahHarga < data.Bal.batas.uangMin ? "💸 Uangnya nggak cukup buat beli hadiah." : null;
                case "tembak":
                    if (PunyaPacar) return "💍 Kamu sudah punya pacar! Setia dong.";
                    if (!w.pacar) return w.nama + " lebih cocok jadi teman baik.";
                    return rel < SOS.tembakMinRelasi ? "💗 Belum cukup dekat (" + rel + "/" + SOS.tembakMinRelasi + "). Sering ngobrol & kasih hadiah dulu!" : null;
                case "kencan":
                    if (!PacarDengan(id)) return "Kencan cuma sama pacar ya.";
                    if (SudahHari("k_" + id)) return "💑 Sudah kencan hari ini. Besok lagi!";
                    if (stat.Uang + SOS.kencan.uang < data.Bal.batas.uangMin) return "💸 Uang kencan nggak cukup...";
                    return stat.Energi + SOS.kencan.energi < 0 ? "😮‍💨 Terlalu capek buat kencan." : null;
                case "ajakTinggal":
                    if (!PacarDengan(id)) return "Hanya dengan pacar.";
                    if (s.tinggalBareng) return "Kalian sudah tinggal bareng.";
                    if (!KosSekarang.tinggalBareng) return "🚫 " + KosSekarang.nama + " tidak membolehkan tinggal bareng. Pindah ke kos bebas dulu (📋 Info Kos).";
                    return rel < SOS.tinggalMinRelasi ? "💞 Hubungan belum cukup kuat (" + rel + "/" + SOS.tinggalMinRelasi + "). Sering kencan dulu!" : null;
                case "putus": return PacarDengan(id) ? null : "Bukan pacarmu.";
            }
            return "Tidak bisa.";
        }

        static readonly string[] JenisHadiah = { "buku", "kopi", "buah", "musik", "game" };
        static readonly string[] NamaHadiah = { "📚 buku", "☕ kopi", "🍎 buah", "🎵 voucher musik", "🎮 voucher game" };
        static readonly string[] TempatKencan = { "makan bakso", "nonton di bioskop mini", "jalan-jalan ke taman", "ngopi di kafe", "naik komidi putar" };

        int Acak(int n) => Mathf.Clamp((int)(acak() * n), 0, n - 1);

        /// <summary>Jalankan aksi sosial ke warga (sudah lolos CekSosial). Kencan memakan waktu 2 jam.</summary>
        public void JalankanSosial(string aksi, string id)
        {
            string alasan = CekSosial(aksi, id);
            if (alasan != null) { Umumkan(alasan); return; }
            var w = F.Warga(id);
            string k = "w_" + id;
            int lvLama = LevelRelasi(k);
            switch (aksi)
            {
                case "ngobrolWarga":
                    TambahRelasi(k, SOS.ngobrolRelasi); Ubah(0, 0, SOS.ngobrolStres);
                    TandaiHari(k);
                    if (PacarDengan(id)) s.pacarTemu = s.hari;
                    Umumkan(w.ikon + " " + w.nama + ": " + (w.dialog.Count > 0 ? w.dialog[Acak(w.dialog.Count)] : "\"Halo!\""));
                    Latih("ngobrolWarga");
                    break;
                case "kasihHadiah":
                {
                    int i = Acak(JenisHadiah.Length);
                    bool cocok = JenisHadiah[i] == w.suka;
                    Ubah(-SOS.hadiahHarga, 0, 0);
                    TambahRelasi(k, cocok ? SOS.hadiahSukaRelasi : SOS.hadiahRelasi);
                    TandaiHari("h_" + id);
                    Umumkan("🎁 Kamu kasih " + NamaHadiah[i] + " ke " + w.nama + ". " + (cocok ? "\"Wah, ini kesukaanku! Makasih banget!\" 😍" : "\"Makasih ya!\" 😊")
                            + "  −" + AturanHarian.Rupiah(SOS.hadiahHarga));
                    break;
                }
                case "tembak":
                {
                    float peluang = LevelRelasi(k) >= 3 ? 1f : SOS.tembakPeluangLv2;
                    if (acak() < peluang)
                    {
                        s.pacarId = id; s.pacarSejak = s.pacarTemu = s.hari;
                        Ubah(0, 0, SOS.jadian.stres);
                        Latih("jadian");
                        Umumkan("💘 " + w.nama + ": \"Aku juga suka kamu...\" 🥰 Kalian resmi pacaran!");
                    }
                    else
                    {
                        Ubah(0, 0, SOS.tembakGagal.stres);
                        TambahRelasi(k, SOS.tembakGagal.relasi);
                        Umumkan("💔 " + w.nama + ": \"Maaf... kita temenan aja dulu ya.\" 😵+" + SOS.tembakGagal.stres);
                    }
                    break;
                }
                case "kencan":
                {
                    var e = SOS.kencan;
                    Ubah(e.uang, e.energi, e.stres);
                    TambahRelasi(k, e.relasi);
                    TandaiHari("k_" + id); s.pacarTemu = s.hari;
                    Latih("kencan");
                    Umumkan("💑 Kencan sama " + w.nama + ": " + TempatKencan[Acak(TempatKencan.Length)] + "! −" + AturanHarian.Rupiah(-e.uang) + "  😵 " + e.stres);
                    if (SOS.kencanMenit > 0) jam.MulaiSibuk(SOS.kencanMenit, false);
                    break;
                }
                case "ajakTinggal":
                    s.tinggalBareng = true;
                    Umumkan("🏠 " + w.nama + " pindah ke kosmu! Sewa jadi patungan (" + AturanHarian.Rupiah(HargaKos) + "/bulan) & tidur lebih nyenyak berdua.");
                    break;
                case "putus":
                    s.pacarId = null; s.tinggalBareng = false;
                    Ubah(0, 0, SOS.putus.stres);
                    TambahRelasi(k, -40);
                    Umumkan("💔 Kamu putus dengan " + w.nama + ". Sakit, tapi hidup terus berjalan... 😵+" + SOS.putus.stres);
                    break;
            }
            int lv = LevelRelasi(k);
            if (lv > lvLama)
                Umumkan("🤝 Pertemanan dengan " + w.nama + " naik ke level " + lv + "!" + (lv >= 2 && w.pacar && !PunyaPacar ? " 💗 Sepertinya dia mulai suka kamu..." : ""));
            Kabari();
        }

        /// <summary>Tiap pagi: chat dari pacar, atau rindu kalau lama tidak ketemu (bisa diputus).</summary>
        void CekPacarHarian()
        {
            if (!PunyaPacar) return;
            string nama = PacarNama;
            Ubah(0, 0, SOS.chatPagiStres);
            Umumkan("💌 Chat dari " + nama + ": \"Selamat pagi! Semangat hari ini ya 😘\"");
            if (s.tinggalBareng) { s.pacarTemu = s.hari; return; }
            if (s.hari - s.pacarTemu > SOS.rinduHari)
            {
                string k = "w_" + s.pacarId;
                TambahRelasi(k, SOS.rinduRelasi);
                Umumkan("🥺 " + nama + ": \"Kok kita jarang ketemu sih?\" (ngobrol/kencan biar tidak renggang)");
                if (Relasi(k) < SOS.putusBatas)
                {
                    s.pacarId = null; s.tinggalBareng = false;
                    Ubah(0, 0, SOS.putus.stres);
                    Umumkan("💔 " + nama + " minta putus karena merasa diabaikan... 😵+" + SOS.putus.stres);
                }
            }
        }

        // ===================== Perk relasi NPC tetap (fitur2.npc) =====================

        int Lv(string npc) => LevelRelasi(npc);

        /// <summary>Potongan harga menu karena akrab dengan penjual.</summary>
        public int DiskonMenu(string tempat, string idMenu)
        {
            if (tempat == "warteg") return Lv("mbakSri") >= 2 ? 2000 : Lv("mbakSri") >= 1 ? 1000 : 0;
            if (tempat == "warkop" && idMenu != null && idMenu.StartsWith("kopi")) return Lv("bangUdin") >= 1 ? 1000 : 0;
            return 0;
        }

        /// <summary>Bonus gaji shift dari bos yang akrab (level 3).</summary>
        public int BonusGaji(string idKerja)
        {
            if (idKerja == "warteg" && Lv("mbakSri") >= 3) return 5000;
            if (idKerja == "warkop" && Lv("bangUdin") >= 3) return 5000;
            return 0;
        }

        public int TambahanBatasBayarKos => Lv("buKos") >= 1 ? 3 : 0;
        public bool BebasDendaKos => Lv("buKos") >= 2;
        public float PengaliBimbingan => Lv("pakDosen") >= 2 ? 1.5f : 1f;

        void PerkNpcPagi()
        {
            if (Lv("buKos") >= 3 && acak() < 0.2f) { Ubah(0, 15, 0); Umumkan("🍲 Bu Kos ngasih semangkuk sayur sop: \"Dimakan ya, Dek!\" ⚡+15"); }
            if (Lv("oyen") >= 3 && acak() < 0.2f) { Ubah(5000, 0, 0); Umumkan("🐱 Oyen bawa 'hadiah'... ada uang Rp5.000 jatuh di depan kos!"); }
        }
    }
}
