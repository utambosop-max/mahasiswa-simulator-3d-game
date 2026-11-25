// Alat bantu batchmode: menyiapkan aset lalu membangun ulang semua scene dalam satu kali jalan.
using UnityEditor;
using UnityEngine;

namespace MS.Dunia.Editor
{
    public static class AlatProyek
    {
        /// <summary>Isi field data JSON di prefab HUD (agar ikut masuk APK), lalu simpan prefab.</summary>
        [MenuItem("Mahasiswa Sim/Isi Data HUD")]
        public static void IsiDataHud()
        {
            const string path = "Assets/_Game/Prefabs/UI/HUD_Kamar.prefab";
            var akar = PrefabUtility.LoadPrefabContents(path);
            var hud = akar.GetComponentInChildren<MS.UI.HudKamar>(true);
            if (hud != null)
            {
                var so = new SerializedObject(hud);
                Isi(so, "menuJson", "Assets/_Game/Data/menu.json");
                Isi(so, "balanceJson", "Assets/_Game/Data/balance.json");
                so.ApplyModifiedPropertiesWithoutUndo();
                PrefabUtility.SaveAsPrefabAsset(akar, path);
                Debug.Log("[MS] Data HUD terisi di prefab.");
            }
            PrefabUtility.UnloadPrefabContents(akar);
        }

        static void Isi(SerializedObject so, string field, string aset)
        {
            var p = so.FindProperty(field);
            if (p != null) p.objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(aset);
            else Debug.LogWarning("[MS] Field HUD tidak ditemukan: " + field);
        }

        /// <summary>Satu perintah: data HUD → semua scene (kamar, kampung, gedung).</summary>
        public static void BangunSemua()
        {
            IsiDataHud();
            PembuatSceneKamar.Buat();
            PembuatSceneKampung.Buat();
            PembuatSceneGedung.BuatSemua();
            Debug.Log("[MS] Semua scene dibangun ulang.");
        }
    }
}
