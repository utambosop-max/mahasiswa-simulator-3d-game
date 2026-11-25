// Tes EditMode gaji kerja sambilan.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesKerja
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; KerjaSambilan kerja;
        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            kerja = new KerjaSambilan(data, s, stat, aksi, Baca("kerja.json"), Baca("menu.json"));
            aksi.Kerja = kerja;
            s.hari = 1; s.menit = 180; s.energi = 80; // Senin 08.00 (pagi)
        }

        [Test]
        public void ShiftSempurnaWartegDalamRentang()
        {
            aksi.Lakukan(new PerintahAksi("kerjaWarteg"));
            Assert.AreEqual("warteg", kerja.Aktif);
            int uang = s.uang;
            var r = kerja.Selesai(new HasilKerja(8, 0, 5000));
            Assert.AreEqual(28000 + 16000 + 5000, r.Total);
            Assert.AreEqual(uang + r.Total, s.uang);
            Assert.IsNull(kerja.Aktif);
            Assert.IsTrue(jam.Sibuk);
            Assert.Less(r.Stres, 6f, "shift sempurna mengurangi stres");
        }

        [Test]
        public void MaksSatuShiftDanTipDibatasi()
        {
            aksi.Lakukan(new PerintahAksi("kerjaWarteg"));
            var r = kerja.Selesai(new HasilKerja(2, 6, 999999));
            Assert.AreEqual(2000, r.Tips);
            s.menit = 400; jam.MulaiSibuk(0f, false);
            Assert.IsFalse(aksi.BolehDilakukan(new PerintahAksi("kerjaWarteg"), out _));
        }

        [Test]
        public void BatalTanpaEfek()
        {
            int uang = s.uang;
            aksi.Lakukan(new PerintahAksi("kerjaWarteg"));
            kerja.Batal();
            Assert.AreEqual(uang, s.uang);
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("kerjaWarteg"), out _));
        }
    }
}
