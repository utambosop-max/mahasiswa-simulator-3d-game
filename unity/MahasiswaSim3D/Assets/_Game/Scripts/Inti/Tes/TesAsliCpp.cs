// Tes: hasil plugin C++ (MsNative.dll) harus SAMA dengan cadangan C#. Bila DLL tidak ada, tes perbandingan dilewati.
using NUnit.Framework;

namespace MS.Inti.Tes
{
    public class TesAsliCpp
    {
        [TearDown] public void Bersihkan() => AsliCpp.MatikanCpp = false;

        [Test]
        public void CadanganCsSelaluJalan()
        {
            AsliCpp.MatikanCpp = true;
            Assert.IsFalse(AsliCpp.Ada);
            Assert.AreEqual(AsliCpp.CuacaAcakCs(7), AsliCpp.CuacaAcak(7));
            Assert.AreEqual(1f, AsliCpp.EfisiensiStres(35, 35, 0.6f, 0.4f), 1e-6f);
        }

        [Test]
        public void CppSamaDenganCs()
        {
            if (!AsliCpp.Ada) Assert.Ignore("MsNative.dll belum dibangun (jalankan unity/native/msnative/bangun.bat).");
            for (int hari = -50; hari < 2000; hari++)
                Assert.AreEqual(AsliCpp.CuacaAcakCs(hari), AsliCpp.CuacaAcak(hari), "cuaca hari " + hari);
            for (float st = 0; st <= 100; st += 0.5f)
                Assert.AreEqual(AsliCpp.EfisiensiStresCs(st, 35, 0.6f, 0.4f), AsliCpp.EfisiensiStres(st, 35, 0.6f, 0.4f), 1e-5f, "stres " + st);
            for (float n = 0.02f; n < 1f; n += 0.013f)
                Assert.AreEqual(AsliCpp.CabaiTumbuhCs(n, 0.9f), AsliCpp.CabaiTumbuh(n, 0.9f), 0.0011f, "cabai " + n);
        }
    }
}
