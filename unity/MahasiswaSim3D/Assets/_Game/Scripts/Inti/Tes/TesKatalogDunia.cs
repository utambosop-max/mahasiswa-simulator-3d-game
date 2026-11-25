using System.IO;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace MS.Inti.Tes
{
    public sealed class TesKatalogDunia
    {
        const string Folder = "Assets/_Game/Pihak3/PolyHaven/Katalog/";

        [Test]
        public void KatalogMemenuhiKapasitasProduksi()
        {
            Assert.GreaterOrEqual(Directory.GetFiles(Folder + "Model", "*.fbx", SearchOption.AllDirectories).Length, 60);
            Assert.GreaterOrEqual(Directory.GetFiles(Folder + "Tekstur", "pbr.png", SearchOption.AllDirectories).Length, 30);
        }

        [TestCase("plastic_monobloc_chair_01")]
        [TestCase("wooden_stool_01")]
        [TestCase("island_tree_01")]
        public void PropMemilikiLodYangDipakai(string id)
        {
            var akar = AssetDatabase.LoadAssetAtPath<GameObject>(Folder + $"Model/{id}/{id}.fbx");
            Assert.NotNull(akar, id);
            var grup = akar.GetComponent<LODGroup>();
            Assert.NotNull(grup, id);
            var lod = grup.GetLODs();
            Assert.AreEqual(2, lod.Length);
            Assert.That(lod[0].renderers.Length, Is.GreaterThan(0));
            Assert.That(lod[1].renderers.Length, Is.GreaterThan(0));
            Assert.AreEqual("Universal Render Pipeline/Lit", lod[0].renderers[0].sharedMaterial.shader.name);
            Assert.NotNull(lod[0].renderers[0].sharedMaterial.mainTexture, id + " warna");
        }

        [TestCase("kos")]
        [TestCase("warteg")]
        [TestCase("kampus")]
        [TestCase("rumah12")]
        public void FasadMemilikiBadanKacaDanAtlas(string id)
        {
            string jalur = "Fasad/" + id + "/";
            var model = Resources.Load<GameObject>(jalur + id);
            Assert.NotNull(model, id);
            Assert.That(model.GetComponentsInChildren<MeshRenderer>().Length, Is.EqualTo(2));
            foreach (var kanal in new[] { "warna", "normal", "pbr" })
            {
                var gambar = Resources.Load<Texture2D>(jalur + kanal);
                Assert.NotNull(gambar, id + " " + kanal);
                Assert.AreEqual(1024, gambar.width);
                Assert.Greater(gambar.mipmapCount, 1);
            }
        }

        [TestCase("motor_bebek", 2)]
        [TestCase("angkot", 4)]
        [TestCase("gerobak", 2)]
        public void KendaraanMemilikiRodaTerpisah(string id, int jumlah)
        {
            var model = Resources.Load<GameObject>($"Kendaraan/{id}/{id}");
            Assert.NotNull(model, id);
            int roda = 0;
            foreach (var bagian in model.GetComponentsInChildren<MeshFilter>())
                if (bagian.name.StartsWith("Roda_"))
                {
                    Assert.Greater(bagian.sharedMesh.vertexCount, 72);
                    roda++;
                }
            Assert.AreEqual(jumlah, roda);
        }

        [Test]
        public void KatalogPerabotMemilikiReferensiModelOffline()
        {
            var katalog = Resources.Load<ScriptableObject>("KatalogPropDunia");
            Assert.NotNull(katalog);
            var serialized = new SerializedObject(katalog);
            var prop = serialized.FindProperty("prop");
            Assert.GreaterOrEqual(prop.arraySize, 30);
            for (int i = 0; i < prop.arraySize; i++)
                Assert.NotNull(prop.GetArrayElementAtIndex(i).objectReferenceValue, "Prop " + i);
        }
    }
}
