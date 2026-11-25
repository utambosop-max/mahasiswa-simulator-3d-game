using NUnit.Framework;
using UnityEngine;

namespace MS.Inti.Tes
{
    public sealed class TesBahanDunia
    {
        [TestCase("Tiles110")]
        [TestCase("Tiles074")]
        [TestCase("asphalt_01")]
        [TestCase("concrete_floor_02")]
        [TestCase("wood_table_001")]
        [TestCase("brick_wall_02")]
        [TestCase("plastered_wall_02")]
        public void BahanTersediaOffline(string nama)
        {
            var path = "Bahan/" + nama + "/";
            foreach (var jenis in new[] { "warna", "normal", "pbr" })
            {
                var tex = Resources.Load<Texture2D>(path + jenis);
                Assert.IsNotNull(tex, path + jenis);
                Assert.LessOrEqual(Mathf.Max(tex.width, tex.height), 1024, path + jenis);
                Assert.Greater(tex.mipmapCount, 1, path + jenis);
            }
        }

        [Test]
        public void LangitDimuatSebagaiCubemap()
        {
            Assert.IsNotNull(Resources.Load<Cubemap>("Bahan/kloppenheim_06_puresky"));
        }
    }
}
