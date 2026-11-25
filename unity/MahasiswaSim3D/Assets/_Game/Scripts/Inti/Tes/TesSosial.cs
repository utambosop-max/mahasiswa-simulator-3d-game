// Tes EditMode paket sosial & ekonomi: warga/pacaran, kos, bank, beasiswa, UKM, lomba, cabai, salon, menu umum.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesSosial
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; Kehidupan hidup; Sosial sos;
        float nilai;
        bool diKamar;
        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            data.Akademik = DataAkademik.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            data.Fitur = DataFitur.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            data.Fitur3 = DataFitur3.Muat(Baca("fitur2.json"), Baca("fitur3.json"), Baca("fitur4.json"));
            s = DataSimpan.Baru(data.Bal);
            s.profilDibuat = true; s.jurusan = "teknik"; s.asal = "jawa";
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            nilai = 0.0f;
            diKamar = false;
            hidup = new Kehidupan(data, s, stat, jam, () => nilai);
            sos = new Sosial(data, s, stat, jam, () => nilai) { DiKamar = () => diKamar };
            aksi.Hidup = hidup; aksi.Sosial = sos;
        }
        [TearDown] public void Bersihkan() { hidup.Lepas(); sos.Lepas(); }

        [Test]
        public void DataTerbaca()
        {
            Assert.AreEqual(6, data.Fitur3.kos.Count);
            Assert.AreEqual(13, data.Fitur3.warga.Count);
            Assert.AreEqual(4, data.Fitur3.beasiswa.Count);
            Assert.AreEqual(4, data.Fitur3.skill.Count);
            Assert.AreEqual(500000, sos.HargaKos);
            Assert.AreEqual(1080, data.Fitur3.Kos("melati").jamMalam);
            Assert.IsNull(data.Fitur3.Kos("bebas").jamMalam);
        }

        [Test]
        public void NgobrolSekaliSehariLaluPacaran()
        {
            var p = new PerintahAksi("ngobrolWarga", "rina");
            Assert.IsTrue(aksi.BolehDilakukan(p, out _));
            aksi.Lakukan(p);
            Assert.AreEqual(8, sos.Relasi("w_rina"));
            Assert.IsFalse(aksi.BolehDilakukan(p, out _), "ngobrol 1x/hari");
            Assert.IsFalse(sos.DaftarAksiWarga("rina").Contains("tembak"));
            s.relasi["w_rina"] = 60;
            Assert.IsTrue(sos.DaftarAksiWarga("rina").Contains("tembak"));
            nilai = 0.1f; // < peluang lv2 0.55 → diterima
            sos.JalankanSosial("tembak", "rina");
            Assert.IsTrue(sos.PunyaPacar);
            Assert.AreEqual("Rina", sos.PacarNama);
            Assert.IsNotNull(sos.CekSosial("tembak", "dimas"), "sudah punya pacar");
            int uang = s.uang;
            sos.JalankanSosial("kencan", "rina");
            Assert.AreEqual(uang - 50000, s.uang);
            Assert.IsTrue(jam.Sibuk, "kencan makan waktu");
        }

        [Test]
        public void RinduLamaTidakKetemuBisaPutus()
        {
            s.pacarId = "dimas"; s.pacarTemu = 1; s.relasi["w_dimas"] = 35; s.hari = 10;
            jam.LompatKeBesok(60); // memicu HariDimulai
            Assert.IsFalse(sos.PunyaPacar, "relasi < 30 setelah rindu → putus");
        }

        [Test]
        public void PindahKosDanHargaPatungan()
        {
            s.uang = 2000000;
            Assert.IsNotNull(sos.CekPindahKos("melati"), "sudah di sini");
            sos.PindahKos("kenanga");
            Assert.AreEqual("kenanga", s.kos);
            Assert.AreEqual(2000000 - 250000 - 100000, s.uang);
            Assert.IsNotNull(sos.CekPindahKos("skyline"), "jeda 7 hari");
            s.tinggalBareng = true;
            Assert.AreEqual(125000, sos.HargaKos);
            s.kosLunas = false;
            int u = s.uang;
            aksi.Lakukan(new PerintahAksi("bayarKos"));
            Assert.AreEqual(u - 125000, s.uang);
        }

        [Test]
        public void JamMalamDendaSekaliSemalam()
        {
            sos.PindahKos("hemat"); // jam malam 22.00 (menit 1020), denda 20 rb
            s.menit = 1030; int u = s.uang; float st = s.stres;
            sos.Periksa();
            Assert.AreEqual(u - 20000, s.uang);
            Assert.Greater(s.stres, st);
            sos.Periksa();
            Assert.AreEqual(u - 20000, s.uang, "maks 1x per malam");
            s.jamMalamHari = 0; diKamar = true; sos.Periksa();
            Assert.AreEqual(u - 20000, s.uang, "di kamar tidak kena");
        }

        [Test]
        public void BankSetorTarikDeposito()
        {
            int u = s.uang;
            sos.Setor(100000);
            Assert.AreEqual(100000, s.tabungan);
            sos.Tarik(40000);
            Assert.AreEqual(60000, s.tabungan);
            Assert.AreEqual(u - 60000, s.uang);
            Assert.IsNotNull(sos.CekDeposito(50000), "minimal 100 rb");
            sos.Deposito(100000);
            Assert.AreEqual(1, s.deposito.Count);
            s.hari = 31;
            jam.LompatKeBesok(60);
            Assert.AreEqual(0, s.deposito.Count);
            Assert.AreEqual(60000 + 100400, s.tabungan, "bunga 0,4%");
        }

        [Test]
        public void BeasiswaDaftarCairDanDicabut()
        {
            s.ipk = 3.5f; s.sks = 25;
            var b = data.Fitur3.Beasiswa("cendekia");
            Assert.IsNull(sos.CekBeasiswa(b));
            sos.DaftarBeasiswa("cendekia");
            Assert.AreEqual("cendekia", s.beasiswa);
            Assert.IsNotNull(sos.CekBeasiswa(data.Fitur3.Beasiswa("kip")), "maks 1");
            s.hari = 30; s.tanggal = 30;
            int u = s.uang;
            jam.LompatKeBesok(60); // tanggal 1
            Assert.AreEqual(1, s.tanggal);
            Assert.AreEqual(u + 1000000, s.uang);
            s.ipk = 3.0f; s.tanggal = 30;
            jam.LompatKeBesok(60);
            Assert.IsNull(s.beasiswa, "IPK turun → dicabut");
        }

        [Test]
        public void UkmRapatDanSkill()
        {
            Assert.IsNotNull(sos.CekSyarat("rapatUKM"));
            sos.GabungUkm("musik");
            Assert.IsNull(sos.CekSyarat("rapatUKM"));
            for (int i = 0; i < 5; i++) sos.Setelah("mainGitar", null);
            Assert.AreEqual(1, sos.LevelSkill("musik"));
            var e = new Efek { stres = -14 };
            sos.UbahEfek("mainGitar", null, e);
            Assert.AreEqual(-16f, e.stres, 0.01f);
        }

        [Test]
        public void LombaDaftarKerjakanUmumkan()
        {
            s.tanggal = 4;
            Assert.IsNotNull(sos.CekDaftarLomba(), "belum buka");
            s.tanggal = 6;
            sos.DaftarLomba();
            Assert.IsTrue(sos.LombaBisaDikerjakan);
            s.ipk = 4f; s.stres = 35; nilai = 0.999f;
            for (int i = 0; i < 3; i++) sos.Setelah("kerjakanLomba", null);
            Assert.AreEqual(3, s.lombaSkor.Count);
            Assert.IsFalse(sos.LombaBisaDikerjakan);
            s.tanggal = 24; nilai = 0f; int u = s.uang;
            jam.LompatKeBesok(60);
            Assert.IsTrue(s.lombaSelesai);
            Assert.AreEqual(u + 300000, s.uang, "karya bagus + IPK 4 + acak 0 → juara 1");
        }

        [Test]
        public void CabaiTumbuhLaluPanen()
        {
            sos.BeliBibit();
            Assert.AreEqual(0.02f, s.cabai, 0.001f);
            for (int i = 0; i < 12; i++) { s.cabaiSiram = s.hari; jam.LompatKeBesok(60); }
            Assert.GreaterOrEqual(s.cabai, 0.95f);
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("panenCabai"), out _));
            aksi.Lakukan(new PerintahAksi("panenCabai"));
            Assert.AreEqual(4, s.cabaiStok);
            Assert.Less(s.cabai, 0f);
        }

        [Test]
        public void MenuUmumBankDanSalon()
        {
            IMenuLayanan m = sos;
            aksi.Lakukan(new PerintahAksi("bukaBank"));
            Assert.IsTrue(m.Terbuka);
            Assert.IsTrue(Layanan.InputDitahan || Layanan.Menu == null);
            m.Pilih("setor_50000");
            Assert.AreEqual(50000, s.tabungan);
            m.Tutup();
            Assert.IsFalse(m.Terbuka);
            sos.BukaMenu("salon", null);
            m.Pilih("gaya_jabrik");
            Assert.AreEqual("jabrik", s.rambut);
            sos.BukaMenu("warga", "rina");
            Assert.IsTrue(m.Daftar.Count >= 2);
            sos.BukaMenu("karier", null);
            m.Pilih("subBeasiswa");
            Assert.AreEqual("Beasiswa", m.Judul);
        }

        [Test]
        public void DiskonMenuDariRelasi()
        {
            var warteg = data.Menu["warteg"][0];
            int biasa = aksi.HargaMenu("warteg", warteg);
            s.relasi["mbakSri"] = 60; // level 2 → −Rp2.000
            Assert.Less(aksi.HargaMenu("warteg", warteg), biasa);
        }
    }
}
