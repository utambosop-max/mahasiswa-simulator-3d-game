// Tes EditMode event acak memakai events.json asli.
using System.IO;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesEventAcak
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; EventAcak ev;
        float nilaiAcak;

        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            nilaiAcak = 0f; // 0 = setiap undian lolos
            ev = new EventAcak(data, s, stat, jam, Baca("events.json"), () => nilaiAcak) { DiKamar = () => true };
        }

        [TearDown] public void Bersihkan() => ev.Lepas();

        [Test]
        public void DataTerbacaDanMaksPerHari()
        {
            Assert.Greater(ev.JumlahData, 20);
            for (int i = 0; i < data.Bal.@event.maksPerHari; i++)
            {
                var e = ev.PilihEvent();
                Assert.IsNotNull(e);
                ev.Tampilkan(e); ev.Pilih(0);
            }
            Assert.IsNull(ev.PilihEvent(), "lewat batas harian tidak boleh ada event");
        }

        [Test]
        public void BayarKosMelunasiDanMemotongUang()
        {
            s.tanggal = 2; s.kosLunas = false;
            DataEvent tagih = null;
            nilaiAcak = 0f;
            for (int i = 0; i < 50 && tagih == null; i++) { var e = ev.PilihEvent(); if (e != null && e.id == "ibu_kos_tagih") tagih = e; }
            Assert.IsNotNull(tagih);
            int uang = s.uang;
            ev.Tampilkan(tagih);
            Assert.IsNotNull(ev.Aktif);
            ev.Pilih(0);
            Assert.IsTrue(s.kosLunas);
            Assert.AreEqual(uang - data.Bal.bulanan.biayaKos, s.uang);
            Assert.IsNull(ev.Aktif);
        }

        [Test]
        public void PilihanMahalTerkunciSaatBokek()
        {
            s.tanggal = 2; s.kosLunas = false; s.uang = 0;
            var e = new DataEvent { id = "uji", pilihan = { new PilihanEvent { label = "bayar", bayarKos = true }, new PilihanEvent { label = "gratis" } } };
            ev.Tampilkan(e);
            Assert.IsFalse(ev.BolehPilih(0, out var alasan));
            Assert.IsNotNull(alasan);
            Assert.IsTrue(ev.BolehPilih(1, out _));
        }
    }
}
