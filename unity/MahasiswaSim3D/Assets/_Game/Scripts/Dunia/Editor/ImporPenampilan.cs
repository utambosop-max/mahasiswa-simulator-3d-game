using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering.HighDefinition;

namespace MS.Dunia.Editor
{
    sealed class ImporPenampilan : AssetPostprocessor
    {
        public static void SiapkanMaterial()
        {
            const string jalur = "Assets/_Game/Materials/Resources/Hdrp/";
            var asal = AssetDatabase.LoadAssetAtPath<Material>(jalur + "Lit.mat");
            var kulit = new Material(asal);
            kulit.SetFloat("_MaterialID", 0f);
            kulit.SetFloat("_SubsurfaceMask", .8f);
            var kulitProfil = AssetDatabase.LoadAssetAtPath<DiffusionProfileSettings>(
                "Packages/com.unity.render-pipelines.high-definition/Runtime/RenderPipelineResources/SkinDiffusionProfile.asset");
            AssetDatabase.CreateAsset(kulit, jalur + "Kulit.mat");
            HDMaterial.SetDiffusionProfile(kulit, kulitProfil);
            HDMaterial.ValidateMaterial(kulit);
            EditorUtility.SetDirty(kulit);
            var rambut = new Material(asal);
            rambut.SetFloat("_AlphaCutoffEnable", 1f);
            rambut.SetFloat("_AlphaCutoff", .28f);
            rambut.SetFloat("_DoubleSidedEnable", 1f);
            HDMaterial.ValidateMaterial(rambut);
            AssetDatabase.CreateAsset(rambut, jalur + "KartuRambut.mat");
            AssetDatabase.SaveAssets();
        }

        void OnPreprocessModel()
        {
            if (!assetPath.StartsWith("Assets/_Game/Models/Resources/Penampilan/")) return;
            var model = (ModelImporter)assetImporter;
            model.animationType = ModelImporterAnimationType.Human;
            model.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
            model.importAnimation = false;
            model.importCameras = false;
            model.importLights = false;
            model.importBlendShapes = true;
        }
    }
}
