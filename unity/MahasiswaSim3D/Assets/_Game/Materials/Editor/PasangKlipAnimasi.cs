using System;
using System.Linq;
using UnityEditor;
using UnityEngine;
public static class PasangKlipAnimasi
{
    [MenuItem("Mahasiswa Sim/Pasang Klip Mahasiswa")]
    public static void Jalankan()
    {
        var clips = AssetDatabase.LoadAllAssetsAtPath("Assets/_Game/Models/kar_mahasiswa.fbx").OfType<AnimationClip>().ToArray();
        var hud = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/_Game/Prefabs/UI/HUD_Kamar.prefab");
        var serialized = new SerializedObject(hud.GetComponent<MS.UI.HudKamar>());
        var field = serialized.FindProperty("animasiMahasiswa");
        var names = new[] { "Idle", "Jalan", "Duduk", "Tidur" };
        field.arraySize = names.Length;
        for (int i = 0; i < names.Length; i++)
        {
            var name = names[i];
            var clip = clips.Where(c => c.name.Split('|').Last() == name && c.length > 0)
                .OrderByDescending(c => c.name.StartsWith("RigMahasiswa|", StringComparison.Ordinal))
                .ThenByDescending(c => c.length)
                .FirstOrDefault();
            if (clip == null) throw new InvalidOperationException("Klip tidak ditemukan: " + name);
            field.GetArrayElementAtIndex(i).objectReferenceValue = clip;
        }
        serialized.ApplyModifiedPropertiesWithoutUndo();
        AssetDatabase.SaveAssets();
        Debug.Log("[MS] empat klip animasi terpasang");
    }
}
