using System.IO;
using UnityEditor;
using UnityEngine;

namespace MS.Materials.Editor
{
    public static class PerbaikiPaletModel
    {
        const string Models = "Assets/_Game/Models";
        const string Materials = "Assets/_Game/Materials/Model";

        [MenuItem("Mahasiswa Sim/Perbaiki Palet Model")]
        public static void Jalankan()
        {
            Directory.CreateDirectory(Materials);
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            if (shader == null) throw new System.Exception("Shader URP/Lit tidak ditemukan");
            int repaired = 0;
            foreach (string file in Directory.GetFiles(Models, "*.fbx"))
            {
                string name = Path.GetFileNameWithoutExtension(file);
                string palette = $"{Models}/palet_{name}.png";
                var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(palette);
                if (texture == null) continue;
                string materialPath = $"{Materials}/palet_{name}.mat";
                var material = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
                if (material == null)
                {
                    material = new Material(shader) { name = $"palet_{name}" };
                    AssetDatabase.CreateAsset(material, materialPath);
                }
                material.shader = shader;
                material.SetColor("_BaseColor", Color.white);
                material.SetTexture("_BaseMap", texture);
                material.SetFloat("_Smoothness", 0.1f);
                EditorUtility.SetDirty(material);

                var importer = AssetImporter.GetAtPath(file.Replace('\\', '/')) as ModelImporter;
                if (importer == null) throw new System.Exception("ModelImporter tidak ditemukan: " + file);
                importer.AddRemap(new AssetImporter.SourceAssetIdentifier(typeof(Material), $"palet_{name}"), material);
                importer.SaveAndReimport();
                repaired++;
            }
            AssetDatabase.SaveAssets();
            Debug.Log($"[MS] Palet model terpasang: {repaired} FBX");
            if (repaired < 28) throw new System.Exception($"Diharapkan paling sedikit 28 model palet, ditemukan {repaired}");
        }
    }
}
