using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace MS.Dunia.Editor
{
    public sealed class ImporKatalogPolyHaven : AssetPostprocessor
    {
        const string Folder = "Assets/_Game/Pihak3/PolyHaven/Katalog/Model/";
        bool AsetKatalog => assetPath.StartsWith(Folder, StringComparison.Ordinal);

        void OnPreprocessModel()
        {
            if (!AsetKatalog) return;
            var impor = (ModelImporter)assetImporter;
            impor.importAnimation = false;
            impor.importCameras = false;
            impor.importLights = false;
            impor.materialImportMode = ModelImporterMaterialImportMode.ImportStandard;
            impor.meshCompression = ModelImporterMeshCompression.Medium;
        }

        void OnPostprocessMaterial(Material bahan)
        {
            if (!AsetKatalog) return;
            var warnaSumber = bahan.color;
            var folder = assetPath.Substring(0, assetPath.LastIndexOf('/') + 1);
            var gambar = folder + bahan.name + ".png";
            bool potong = File.Exists(gambar);
            if (!potong) gambar = folder + bahan.name + ".jpg";
            var warna = bahan.mainTexture;
            if (File.Exists(gambar))
            {
                context.DependsOnArtifact(gambar);
                warna = AssetDatabase.LoadAssetAtPath<Texture2D>(gambar) ?? warna;
            }

            bahan.shader = Shader.Find("Universal Render Pipeline/Lit");
            bahan.enableInstancing = true;
            bahan.color = warna != null ? Color.white : warnaSumber;
            bahan.mainTexture = warna;
            bahan.SetFloat("_Smoothness", .27f);
            if (!potong) return;
            bahan.SetFloat("_AlphaClip", 1f);
            bahan.SetFloat("_Cutoff", .37f);
            bahan.SetFloat("_Cull", 0f);
            bahan.SetOverrideTag("RenderType", "TransparentCutout");
            bahan.EnableKeyword("_ALPHATEST_ON");
            bahan.renderQueue = (int)UnityEngine.Rendering.RenderQueue.AlphaTest;
        }

        void OnPostprocessModel(GameObject akar)
        {
            if (!AsetKatalog) return;
            var renderer = akar.GetComponentsInChildren<MeshRenderer>(true);
            var dekat = renderer.Where(item => item.name.EndsWith("_LOD0", StringComparison.Ordinal)).ToArray();
            var jauh = renderer.Where(item => item.name.EndsWith("_LOD1", StringComparison.Ordinal)).ToArray();
            if (dekat.Length == 0 || jauh.Length == 0) return;
            var grup = akar.GetComponent<LODGroup>();
            if (grup == null) grup = akar.AddComponent<LODGroup>();
            grup.SetLODs(new[] { new LOD(.13f, dekat), new LOD(.018f, jauh) });
            grup.RecalculateBounds();
        }
    }
}
