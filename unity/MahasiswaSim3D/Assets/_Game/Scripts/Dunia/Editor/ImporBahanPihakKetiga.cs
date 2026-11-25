using System;
using UnityEditor;

namespace MS.Dunia.Editor
{
    public sealed class ImporBahanPihakKetiga : AssetPostprocessor
    {
        void OnPreprocessTexture()
        {
            if (!assetPath.StartsWith("Assets/_Game/Pihak3/", StringComparison.Ordinal)) return;
            bool normal = assetPath.EndsWith("/normal.jpg", StringComparison.OrdinalIgnoreCase);
            bool langit = assetPath.EndsWith(".hdr", StringComparison.OrdinalIgnoreCase);
            bool linear = normal || langit || assetPath.EndsWith("/arm.jpg", StringComparison.OrdinalIgnoreCase)
                || assetPath.EndsWith("/kasar.jpg", StringComparison.OrdinalIgnoreCase)
                || assetPath.EndsWith("/pbr.png", StringComparison.OrdinalIgnoreCase);
            var importer = (TextureImporter)assetImporter;
            importer.maxTextureSize = 1024;
            importer.mipmapEnabled = !langit;
            importer.sRGBTexture = !linear;
            if (langit) importer.textureShape = TextureImporterShape.TextureCube;
            if (normal) importer.textureType = TextureImporterType.NormalMap;
            if (assetPath.Contains("/Bahan/") && !langit) importer.wrapMode = UnityEngine.TextureWrapMode.Repeat;
            if (assetPath.Contains("/Mixamo/")) importer.maxTextureSize = 1024;
            var android = importer.GetPlatformTextureSettings("Android");
            android.overridden = true;
            android.maxTextureSize = 1024;
            android.format = langit ? TextureImporterFormat.ASTC_HDR_6x6 : TextureImporterFormat.ASTC_6x6;
            importer.SetPlatformTextureSettings(android);
        }
    }
}
