using System;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace MS.Dunia.Editor
{
    public static class BakarPencahayaanInterior
    {
        const string Profil = "Assets/_Game/Materials/PencahayaanInterior.lighting";

        [MenuItem("Mahasiswa Sim/Bakar cahaya interior")]
        public static void Bakar()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var profil = AssetDatabase.LoadAssetAtPath<LightingSettings>(Profil);
            if (profil == null)
            {
                profil = new LightingSettings
                {
                    bakedGI = true,
                    realtimeGI = false,
                    mixedBakeMode = MixedLightingMode.IndirectOnly,
                    lightmapper = LightingSettings.Lightmapper.ProgressiveCPU,
                    lightmapResolution = 7f,
                    lightmapMaxSize = 256,
                    directSampleCount = 16,
                    indirectSampleCount = 32,
                    environmentSampleCount = 24,
                    maxBounces = 2
                };
                AssetDatabase.CreateAsset(profil, Profil);
            }

            bool kamarSaja = Array.IndexOf(Environment.GetCommandLineArgs(), "-kamarSaja") >= 0;
            var interior = EditorBuildSettings.scenes.Where(s => s.enabled &&
                (s.path.EndsWith("/KamarKos.unity", StringComparison.Ordinal) ||
                 (!kamarSaja && s.path.Contains("/Gedung_")))).ToArray();
            foreach (var sumber in interior)
            {
                var scene = EditorSceneManager.OpenScene(sumber.path);
                Lightmapping.lightingSettings = profil;
                var lampu = GameObject.Find("Matahari")?.GetComponent<Light>();
                if (lampu != null) lampu.lightmapBakeType = LightmapBakeType.Mixed;
                var ruang = scene.GetRootGameObjects().FirstOrDefault(o => o.name == "Kamar" || o.name.StartsWith("Ruang ", StringComparison.Ordinal));
                if (ruang == null) continue;
                foreach (Transform anak in ruang.transform)
                {
                    if (anak.name != "Lantai" && !anak.name.StartsWith("Dinding ", StringComparison.Ordinal)) continue;
                    var flags = GameObjectUtility.GetStaticEditorFlags(anak.gameObject);
                    GameObjectUtility.SetStaticEditorFlags(anak.gameObject, flags | StaticEditorFlags.ContributeGI);
                    if (anak.TryGetComponent<MeshRenderer>(out var permukaan))
                        permukaan.receiveGI = ReceiveGI.Lightmaps;
                }
                if (!Lightmapping.Bake() || LightmapSettings.lightmaps.Length == 0)
                    throw new InvalidOperationException("Lightmap belum terbentuk untuk " + scene.name);
                EditorSceneManager.SaveScene(scene);
                Debug.Log($"Lightmap {scene.name} · {LightmapSettings.lightmaps.Length} peta");
            }
            AssetDatabase.SaveAssets();
        }

        [MenuItem("Mahasiswa Sim/Bakar occlusion Kampung")]
        public static void BakarKampung()
        {
            if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            var scene = EditorSceneManager.OpenScene("Assets/_Game/Scenes/Kampung.unity");
            var bangunan = GameObject.Find("Bangunan");
            if (bangunan == null) throw new InvalidOperationException("Bangunan Kampung belum tersedia.");
            foreach (var mesh in bangunan.GetComponentsInChildren<MeshRenderer>())
            {
                var flags = GameObjectUtility.GetStaticEditorFlags(mesh.gameObject);
                GameObjectUtility.SetStaticEditorFlags(mesh.gameObject, flags | StaticEditorFlags.OccluderStatic |
                    StaticEditorFlags.OccludeeStatic | StaticEditorFlags.BatchingStatic);
                PrefabUtility.RecordPrefabInstancePropertyModifications(mesh.gameObject);
            }
            var area = GameObject.Find("Volume occlusion");
            if (area == null) area = new GameObject("Volume occlusion", typeof(OcclusionArea));
            area.transform.position = new Vector3(0, 8, 0);
            area.GetComponent<OcclusionArea>().size = new Vector3(142, 24, 106);
            EditorSceneManager.SaveScene(scene);
            if (!StaticOcclusionCulling.GenerateInBackground())
                throw new InvalidOperationException("Pembuatan data occlusion Kampung gagal dimulai.");
            EditorApplication.update += Selesai;

            void Selesai()
            {
                if (StaticOcclusionCulling.isRunning) return;
                EditorApplication.update -= Selesai;
                EditorSceneManager.MarkSceneDirty(scene);
                EditorSceneManager.SaveScene(scene);
                const string path = "Assets/_Game/Scenes/Kampung/OcclusionCullingData.asset";
                if (AssetDatabase.LoadMainAssetAtPath(path) == null)
                {
                    Debug.LogError("Data occlusion Kampung belum terbentuk.");
                    if (Application.isBatchMode) EditorApplication.Exit(1);
                    return;
                }
                Debug.Log("Occlusion Kampung · " + new System.IO.FileInfo(path).Length + " byte");
                if (Application.isBatchMode) EditorApplication.Exit(0);
            }
        }
    }
}
