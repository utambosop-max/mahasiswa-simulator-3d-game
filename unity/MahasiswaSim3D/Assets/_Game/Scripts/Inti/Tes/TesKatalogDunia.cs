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
    }
}
