// Tes EditMode akademik (SKS, ujian, skripsi), bayar kos, aksi umum.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesAkademik
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; AturanHarian aturan;
        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            data.Akademik = DataAkademik.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            aturan = new AturanHarian(data, s, stat, jam);
        }
        [TearDown] public void Bersihkan() => aturan.Lepas();

        [Test]
        public void DataAkademikTerbaca()
        {
            Assert.AreEqual(2, data.Akademik.ujian.Count);
            Assert.AreEqual(144, data.Akademik.sksLulus);
            Assert.Greater(data.Akademik.predikat.Count, 0);
        }

        [Test]
        public void KuliahMenambahSks()
        {
            s.hari = 1; s.menit = 150;
            aksi.Lakukan(new PerintahAksi("kuliah"));
            Assert.AreEqual(1, s.sks);
        }

        [Test]
        public void UjianDenganPersiapanPenuhNaikkanIpkDan4Sks()
        {
            s.bulan = 2; s.tanggal = 15; s.hari = 1; s.menit = 150; s.ipk = 3f;
            for (int i = 0; i < 6; i++) s.belajarLog.Add(s.hari);
            aksi.Lakukan(new PerintahAksi("kuliah"));
            Assert.AreEqual(4, s.sks);
            Assert.Greater(s.ipk, 3.05f);
            Assert.AreEqual(1, s.ujianSelesai.Count);
        }

        [Test]
        public void BayarKosManual()
        {
            s.kosLunas = false; int uang = s.uang;
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("bayarKos"), out _));
            aksi.Lakukan(new PerintahAksi("bayarKos"));
            Assert.IsTrue(s.kosLunas);
            Assert.AreEqual(uang - data.Bal.bulanan.biayaKos, s.uang);
            Assert.IsFalse(aksi.BolehDilakukan(new PerintahAksi("bayarKos"), out _));
        }

        [Test]
        public void SkripsiButuhSksDanNgobrolSekaliSehari()
        {
            s.menit = 400; // siang
            Assert.IsFalse(aksi.BolehDilakukan(new PerintahAksi("nulisSkripsi"), out _));
            s.sks = 120;
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("nulisSkripsi"), out _));
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("ngobrolBuKos"), out _));
            aksi.Lakukan(new PerintahAksi("ngobrolBuKos"));
            Assert.IsFalse(aksi.BolehDilakukan(new PerintahAksi("ngobrolBuKos"), out _));
        }
    }
}
