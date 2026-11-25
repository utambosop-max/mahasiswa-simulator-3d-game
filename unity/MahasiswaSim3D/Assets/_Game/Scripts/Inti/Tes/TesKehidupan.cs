// Tes EditMode kehidupan: profil, toko, sakit, motor, ojol, cuaca.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesKehidupan
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; Kehidupan hidup;
        float nilai;
        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            data.Akademik = DataAkademik.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            data.Fitur = DataFitur.Muat(Baca("fitur.json"), Baca("fitur2.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            nilai = 0.99f;
            hidup = new Kehidupan(data, s, stat, jam, () => nilai);
            aksi.Hidup = hidup;
        }
        [TearDown] public void Bersihkan() => hidup.Lepas();

        [Test]
        public void ProfilDikunciDanPengaliJurusan()
        {
            Assert.IsTrue(hidup.PerluDibuat);
            Assert.AreEqual(4, hidup.DaftarJurusan.Count);
            hidup.Buat("Budi", "ekonomi", "sulawesi");
            Assert.IsFalse(hidup.PerluDibuat);
            Assert.AreEqual(1800000, hidup.Kiriman);
            Assert.AreEqual(1.1f, hidup.PengaliJurusan("gajiKerja"), 0.001f);
            hidup.Buat("Lain", "teknik", "jawa");
            Assert.AreEqual("ekonomi", s.jurusan, "jurusan tidak bisa diganti");
        }

        [Test]
        public void TokoPayungSekaliDanObatSaatSakit()
        {
            int uang = s.uang;
            hidup.Beli("payung");
            Assert.IsTrue(s.payung);
            Assert.AreEqual(uang - 25000, s.uang);
            Assert.IsFalse(hidup.BolehBeli("payung", out _));
            Assert.IsFalse(hidup.BolehBeli("obat", out _));
            s.sakit = 2;
            hidup.Beli("obat");
            Assert.AreEqual(0, s.sakit);
        }

        [Test]
        public void KopiSachetStokDanPorsi()
        {
            hidup.Beli("kopiSachet");
            Assert.AreEqual(5, s.kopiSachet);
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("seduhKopi"), out _));
            aksi.Lakukan(new PerintahAksi("seduhKopi"));
            Assert.AreEqual(4, s.kopiSachet);
        }

        [Test]
        public void MotorBensinDanOjol()
        {
            aksi.Lakukan(new PerintahAksi("naikMotor"));
            Assert.IsTrue(hidup.NaikMotor);
            Assert.Greater(hidup.PengaliKecepatan, 2f);
            float b = s.bensin;
            hidup.Tempuh(100f);
            Assert.Less(s.bensin, b);
            s.menit = 200; // pagi
            int uang = s.uang;
            aksi.Lakukan(new PerintahAksi("narikOjol"));
            Assert.Greater(s.uang - uang, 30000);
            Assert.Less(s.uang - uang, 70000);
            jam.MulaiSibuk(0f, false); // anggap ojol sudah selesai
            try { aksi.Lakukan(new PerintahAksi("masukKos")); } catch (System.InvalidOperationException) { } // pindah scene tidak bisa di EditMode
            Assert.IsFalse(hidup.NaikMotor, "masuk bangunan = motor diparkir");
        }

        [Test]
        public void CuacaTetapPerHari()
        {
            Assert.AreEqual("cerah", data.Fitur.CuacaHari(1).id);
            Assert.AreEqual(data.Fitur.CuacaHari(17).id, data.Fitur.CuacaHari(17).id);
            int hujan = 0;
            for (int h = 3; h < 203; h++) if (data.Fitur.CuacaHari(h).id == "hujan") hujan++;
            Assert.That(hujan, Is.InRange(20, 60), "± 20% hari hujan");
        }
    }
}
