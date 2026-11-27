using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.Rendering;
using UnityEditor.Shaders;
using UnityEngine.Rendering;

namespace MS.Dunia.Editor
{
    static class BahanBuildPc
    {
        // These URP lighting keywords are unused by HDRP. Filter them before Unity
        // enumerates variants of source shaders referenced by the original materials.
        static readonly string[] KhususUrp =
        {
            "_MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN",
            "_ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS",
            "EVALUATE_SH_MIXED EVALUATE_SH_VERTEX",
            "_ADDITIONAL_LIGHT_SHADOWS",
            "_REFLECTION_PROBE_BLENDING",
            "_REFLECTION_PROBE_BOX_PROJECTION",
            "_REFLECTION_PROBE_ATLAS",
            "_SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH",
            "_SCREEN_SPACE_IRRADIANCE",
            "_LIGHT_COOKIES",
            "_CLUSTER_LIGHT_LOOP",
            "_CASTING_PUNCTUAL_LIGHT_SHADOW",
            "_RENDER_PASS_ENABLED"
        };

        internal static BuildReport Bangun(BuildPlayerOptions opsi)
        {
            if (GraphicsSettings.currentRenderPipeline?.GetType().Name != "HDRenderPipelineAsset")
                return BuildPipeline.BuildPlayer(opsi);

            var asal = EditorGraphicsSettings.GetShaderBuildSettings();
            var aturan = new List<ShaderBuildSettings.KeywordDeclarationOverride>(
                asal.GetKeywordDeclarationOverridesCopy());
            foreach (var kelompok in KhususUrp)
            {
                var kata = kelompok.Split(' ').Select(nama => new ShaderBuildSettings.KeywordOverrideInfo(nama, false));
                var saring = new ShaderBuildSettings.KeywordDeclarationOverride
                {
                    keywords = kata.Prepend(new ShaderBuildSettings.KeywordOverrideInfo("_", true)).ToArray(),
                    variantGenerationMode = ShaderBuildSettings.ShaderVariantGenerationMode.Default
                };
                if (!saring.IsValid(out string alasan)) throw new InvalidOperationException(alasan);
                aturan.Add(saring);
            }

            var windows = asal;
            windows.KeywordDeclarationOverrides = aturan.ToArray();
            try
            {
                EditorGraphicsSettings.SetShaderBuildSettings(windows);
                return BuildPipeline.BuildPlayer(opsi);
            }
            finally
            {
                EditorGraphicsSettings.SetShaderBuildSettings(asal);
            }
        }
    }
}
