// Tes EditMode: cerita Buku Sakti (prolog, tujuan, dialog lewat panel event, celengan), karier, SIM, bengkel.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesCerita
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; Kehidupan hidup; Sosial sos; EventAcak ev; Cerita cer;
        float nilai;
        string scene = "KamarKos";
        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            data.Akademik = DataAkademik.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            data.Fitur = DataFitur.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            data.Fitur3 = DataFitur3.Muat(Baca("fitur2.json"), Baca("fitur3.json"), Baca("fitur4.json"));
            data.Cerita = DataCerita.Muat(Baca("cerita.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            nilai = 0.99f;
            hidup = new Kehidupan(data, s, stat, jam, () => nilai);
            sos = new Sosial(data, s, stat, jam, () => nilai) { DiKamar = () => scene == "KamarKos" };
            aksi.Hidup = hidup; aksi.Sosial = sos;
            ev = new EventAcak(data, s, stat, jam, Baca("events.json"), () => nilai) { DiKamar = () => true };
            cer = new Cerita(data, s, stat) { Scene = () => scene, Fase = () => jam.Fase.ToString().ToLowerInvariant() };
            sos.Cerita = cer; ev.AdaCerita = () => cer.AdaDialog;
        }
        [TearDown] public void Bersihkan() { hidup.Lepas(); sos.Lepas(); ev.Lepas(); }

        [Test]
        public void DataCeritaTerbaca()
        {
            Assert.AreEqual(9, data.Cerita.bab.Count);
            Assert.AreEqual("prolog", data.Cerita.bab[0].id);
            Assert.GreaterOrEqual(data.Cerita.dialog.Count, 30);
            Assert.AreEqual(4, data.Cerita.ending.Count);
        }

        [Test]
        public void PrologMulaiSetelahProfilLaluSelesai()
        {
            cer.Periksa();
            Assert.IsNull(cer.BabJudul, "belum buat karakter");
            s.profilDibuat = true;
            cer.Periksa();
            Assert.AreEqual("Berangkat", cer.BabJudul);
            Assert.AreEqual(3, cer.Tujuan.Count);
            Assert.IsTrue(cer.AdaDialog, "WA Ibu masuk antrean");
            cer.TampilkanBerikut(ev);
            Assert.IsNotNull(ev.Aktif);
            StringAssert.StartsWith("cerita:", ev.Aktif.Id);
            ev.Pilih(0);
            Assert.IsNull(ev.Aktif);
            Assert.IsFalse(cer.AdaDialog);
            // Kerjakan tujuan prolog: belajar, masak mi, tidur
            sos.Setelah("belajar", null); sos.Setelah("masakMi", null); sos.Setelah("tidur", null);
            cer.Periksa();
            Assert.IsTrue(s.cerita.bab["prolog"].s == "selesai");
            Assert.IsTrue(cer.AdaDialog, "dialog Ayah 'Ok.'");
        }

        [Test]
        public void TenggatLewatJadiRencanaB()
        {
            s.profilDibuat = true;
            cer.Periksa();
            s.hari = 10;
            cer.Periksa();
            Assert.AreEqual("rencanaB", s.cerita.bab["prolog"].s);
        }

        [Test]
        public void EventAcakMengalahDenganCerita()
        {
            s.profilDibuat = true;
            cer.Periksa();
            Assert.IsTrue(cer.AdaDialog);
            nilai = 0f; // semua event lolos undian
            jam.Maju(400f); // ganti fase beberapa kali
            Assert.IsNull(ev.Aktif, "event acak ditunda selama ada dialog cerita");
        }

        [Test]
        public void CelenganIbuSetorKirim()
        {
            s.cerita.nabung = new MisiNabungSimpan { target = 100000, mulai = 1, batas = 60 };
            int u = s.uang;
            cer.SetorNabung(); cer.SetorNabung();
            Assert.AreEqual(100000, s.cerita.nabung.terkumpul);
            Assert.AreEqual(u - 100000, s.uang);
            Assert.IsNotNull(cer.CekSetor(), "penuh");
            cer.KirimNabung();
            Assert.AreEqual("terkirim", s.cerita.nabung.status);
            Assert.IsTrue(s.cerita.flag.ContainsKey("bantuWarung"));
        }

        [Test]
        public void KarierSetelahLulusGantiKiriman()
        {
            Assert.IsNotNull(sos.CekLamar("bumn"), "belum lulus");
            s.lulus = true; s.ipk = 3.5f; s.cv = 2;
            sos.Lamar("bumn");
            Assert.IsTrue(sos.SudahBekerja);
            // 3,5 jt + 1,5 jt × 1,0 + 150 rb × 2 = 5,3 jt
            Assert.AreEqual(5300000, sos.HitungGaji("bumn"));
            s.tanggal = 30; s.hari = 30; int u = s.uang;
            jam.LompatKeBesok(60);
            Assert.AreEqual(u + 5300000, s.uang);
        }

        [Test]
        public void SimRaziaDanBengkel()
        {
            s.uang = 2000000;
            sos.NaikMotor = () => true; scene = "Kampung"; nilai = 0f;
            int u = s.uang;
            jam.Maju(400f); // ganti fase → razia (peluang 0 < 0.15)
            Assert.Less(s.uang, u, "tanpa SIM kena tilang");
            sos.BuatSim();
            Assert.IsTrue(s.punyaSim);
            u = s.uang;
            jam.Maju(300f);
            Assert.AreEqual(u, s.uang, "punya SIM aman");
            Assert.IsNotNull(sos.CekUpgradeMotor(data.Fitur3.motorUpgrade[1]), "lv3 harus lewat lv2");
            sos.UpgradeMotor(2);
            Assert.AreEqual(2, s.motorLevel);
            Assert.AreEqual(1.15f, sos.PengaliMotor, 0.001f);
            sos.BukaMenu("bengkel", null);
            Assert.IsTrue(((IMenuLayanan)sos).Daftar.Count >= 4);
        }
    }
}
