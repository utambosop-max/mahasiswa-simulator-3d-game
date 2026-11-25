using System;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace MS.Dunia.Editor
{
    public sealed class ImporKarakterLokal : AssetPostprocessor
    {
        const string Folder = "Assets/_Game/Pihak3/Mixamo/Resources/Karakter";

        void OnPreprocessModel()
        {
            if (!assetPath.StartsWith(Folder + "/", StringComparison.Ordinal)) return;
            var impor = (ModelImporter)assetImporter;
            impor.animationType = ModelImporterAnimationType.Human;
            impor.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            impor.importAnimation = System.IO.Path.GetFileName(assetPath).StartsWith("anim_", StringComparison.Ordinal);
            impor.importCameras = impor.importLights = false;
            impor.meshCompression = ModelImporterMeshCompression.Medium;
            impor.animationCompression = ModelImporterAnimationCompression.Optimal;
        }

        [MenuItem("Mahasiswa/Impor karakter lokal")]
        public static void Impor()
        {
            if (!AssetDatabase.IsValidFolder(Folder)) return;
            foreach (var guid in AssetDatabase.FindAssets("t:Model", new[] { Folder }))
            {
                var path = AssetDatabase.GUIDToAssetPath(guid);
                if (!path.EndsWith(".fbx", StringComparison.OrdinalIgnoreCase)) continue;
                AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate | ImportAssetOptions.ForceSynchronousImport);
                var objek = AssetDatabase.LoadAllAssetsAtPath(path);
                var avatar = objek.OfType<Avatar>().FirstOrDefault();
                var klip = objek.OfType<AnimationClip>().Count(k => !k.name.StartsWith("__preview__", StringComparison.Ordinal));
                Debug.Log($"Karakter lokal {System.IO.Path.GetFileName(path)} · humanoid={avatar != null && avatar.isValid && avatar.isHuman} · klip={klip}");
            }
        }
    }
}
