// Tes EditMode upgrade kamar.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesUpgrade
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; UpgradeKamar up;
        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            up = new UpgradeKamar(data, s, stat, aksi);
            aksi.Upgrade = up;
        }

        [Test]
        public void BeliKasurNaikLevelDanBayar()
        {
            aksi.Lakukan(new PerintahAksi("bukaUpgrade"));
            Assert.IsTrue(up.Terbuka);
            Assert.AreEqual(7, up.Daftar.Count);
            int uang = s.uang;
            up.Beli("kasur");
            Assert.AreEqual(2, up.Level("kasur"));
            Assert.AreEqual(uang - 350000, s.uang);
        }

        [Test]
        public void TidakBolehBerutangDanMaksLevel()
        {
            s.uang = 100000;
            Assert.IsFalse(up.BolehBeli("kasur", out _));
            s.uang = 5000000;
            up.Beli("kasur"); up.Beli("kasur");
            Assert.AreEqual(3, up.Level("kasur"));
            Assert.IsFalse(up.BolehBeli("kasur", out var alasan));
            StringAssert.Contains("maksimal", alasan);
        }
    }
}
