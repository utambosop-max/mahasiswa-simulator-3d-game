using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace MS.Inti.Tes
{
    public sealed class TesProfilRender
    {
        [Test]
        public void HematMenjagaAnggaranBayanganDanResolusi()
        {
            var aset = AssetDatabase.LoadMainAssetAtPath("Assets/Settings/Mobile_RPAsset.asset");
            Assert.NotNull(aset);
            var profil = new SerializedObject(aset);
            Assert.That(profil.FindProperty("m_RenderScale").floatValue, Is.EqualTo(.8f).Within(.001f));
            Assert.AreEqual(1024, profil.FindProperty("m_MainLightShadowmapResolution").intValue);
            Assert.IsFalse(profil.FindProperty("m_SoftShadowsSupported").boolValue);
        }

        [TestCase("Mobile_Renderer", false)]
        [TestCase("PC_Renderer", true)]
        public void OklusiLayarDiaktifkanHanyaPadaTinggi(string nama, bool aktif)
        {
            var isi = AssetDatabase.LoadAllAssetsAtPath($"Assets/Settings/{nama}.asset");
            bool ssao = false;
            foreach (var fitur in isi)
            {
                if (fitur == null || fitur.GetType().Name != "ScreenSpaceAmbientOcclusion") continue;
                var data = new SerializedObject(fitur);
                ssao = data.FindProperty("m_Active").boolValue;
                if (ssao)
                {
                    Assert.IsTrue(data.FindProperty("m_Settings.AfterOpaque").boolValue);
                    Assert.AreEqual(0, data.FindProperty("m_Settings.Source").enumValueIndex);
                }
            }
            Assert.AreEqual(aktif, ssao);
        }
    }
}
