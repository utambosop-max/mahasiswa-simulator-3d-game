// Tes EditMode aturan inti. Data dibaca dari Assets/_Game/Data (JSON asli), tanpa scene.
using System.IO;
using MS.Kontrak;
using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public class TesAturanInti
    {
        DataGame data; DataSimpan s; StatPemain stat; JamGame jam; PenerimaAksi aksi; AturanHarian aturan;

        static string Baca(string nama) => File.ReadAllText(Path.Combine(Application.dataPath, "_Game/Data", nama));

        [SetUp]
        public void Siapkan()
        {
            data = DataGame.MuatTeks(Baca("aksi.json"), Baca("balance.json"), Baca("menu.json"), Baca("upgrades.json"));
            s = DataSimpan.Baru(data.Bal);
            stat = new StatPemain(s, data.Bal);
            jam = new JamGame(s, data.Bal, stat);
            aksi = new PenerimaAksi(data, s, stat, jam);
            aturan = new AturanHarian(data, s, stat, jam);
        }

        [TearDown] public void Bersihkan() => aturan.Lepas();

        [Test]
        public void KuliahHanyaDiJendelaJam()
        {
            s.hari = 1; s.menit = 60; // Senin 06.00, kelas pagi 07.00–10.00
            Assert.IsFalse(aksi.BolehDilakukan(new PerintahAksi("kuliah"), out _));
            s.menit = 150; // 07.30
            Assert.IsTrue(aksi.BolehDilakukan(new PerintahAksi("kuliah"), out _));
            aksi.Lakukan(new PerintahAksi("kuliah"));
            Assert.IsTrue(s.hadirPagi);
        }

        [Test]
        public void BolosSesiPagiMengurangiIpk()
        {
            s.hari = 1; s.menit = 350; float ipk = stat.Ipk;
            jam.Maju(20f); // lewat batas Pagi (360) tanpa hadir
            Assert.AreEqual(ipk + data.Bal.bolos.ipk, stat.Ipk, 0.0001f);
        }

        [Test]
        public void HargaWartegNaikSaatTanggalTua()
        {
            var a = data.Aksi["makanWarteg"];
            var m = data.Menu["warteg"][0];
            s.tanggal = 1;
            int normal = aksi.HargaMenu("warteg", m);
            s.tanggal = data.Bal.bulanan.tanggalTuaMulai;
            int tua = aksi.HargaMenu("warteg", m);
            Assert.Greater(tua, normal);
            Assert.AreEqual(0, tua % 500);
            Assert.AreSame(m, aksi.PilihMenu(a, null, out _));
        }

        [Test]
        public void KosDitagihOtomatisSetelahBatas()
        {
            var b = data.Bal.bulanan;
            s.tanggal = b.batasBayarKos; s.kosLunas = false; s.menit = 1430f;
            int uang = stat.Uang;
            jam.Maju(20f); // ganti hari
            Assert.AreEqual(uang - b.biayaKos - b.dendaKos, stat.Uang);
            Assert.IsTrue(s.kosLunas);
        }

        [Test]
        public void PulangKampungSaatStresPenuh()
        {
            stat.Atur(40f, 100f); int hari = s.hari; int uang = stat.Uang;
            Assert.IsTrue(aturan.PerluPulang);
            aturan.PulangKampung(false);
            Assert.AreEqual(data.Bal.pulangKampung.stres, stat.Stres, 0.001f);
            Assert.AreEqual(data.Bal.pulangKampung.energi, stat.Energi, 0.001f);
            Assert.AreEqual(hari + 1, s.hari);
            Assert.AreEqual(data.Bal.jam.pulangKampungBangun, jam.Menit, 0.01f);
            Assert.AreEqual(uang - data.Bal.pulangKampung.ongkos, stat.Uang);
        }

        [Test]
        public void MigrasiSaveVersi1()
        {
            var lama = Newtonsoft.Json.JsonConvert.DeserializeObject<DataSimpan>("{\"versi\":1,\"uang\":5000,\"hari\":3}");
            SimpanMuat.Migrasi(lama);
            Assert.IsTrue(lama.kosLunas);
            Assert.IsFalse(lama.hadirPagi);
        }
    }
}
