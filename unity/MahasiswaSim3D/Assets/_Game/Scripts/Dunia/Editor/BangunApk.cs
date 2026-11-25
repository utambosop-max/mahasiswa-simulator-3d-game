// Build APK Android dari batchmode:
//   Unity.exe -batchmode -quit -projectPath ... -executeMethod MS.Dunia.Editor.BangunApk.Bangun -keluar D:/.../file.apk
// Pengaturan mengikuti aturan layar proyek: landscape (boleh diputar 180°), ARM64, IL2CPP.
// SDK/NDK/JDK memakai lokasi bawaan modul Android Unity (Editor/Data/PlaybackEngines/AndroidPlayer).
using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace MS.Dunia.Editor
{
    public static class BangunApk
    {
        const string VersiNama = "0.1.0";   // semver (skill release-pipeline)
        const int VersiKode = 100;           // MAJOR*10000 + MINOR*100 + PATCH → 0.1.0 = 100

        [MenuItem("Mahasiswa Sim/Bangun APK Android")]
        public static void Bangun()
        {
            bool uji = Array.IndexOf(Environment.GetCommandLineArgs(), "-uji") >= 0; // Development Build + layar error merah
            string keluar = Argumen("-keluar") ?? "D:/Mahasiswa_simulator/rilis/unity/MahasiswaSim3D-v" + VersiNama + (uji ? "-uji" : "-unity") + ".apk";
            Directory.CreateDirectory(Path.GetDirectoryName(keluar));

            // --- Identitas & versi ---
            PlayerSettings.companyName = "Studio Mahasiswa";
            PlayerSettings.productName = "Mahasiswa Simulator 3D";
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.studiomahasiswa.sim3d.unity"); // beda dari versi web agar bisa dipasang berdampingan
            PlayerSettings.bundleVersion = VersiNama;
            PlayerSettings.Android.bundleVersionCode = VersiKode;

            // --- Layar: landscape, boleh diputar 180° (sensorLandscape) ---
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.AutoRotation;
            PlayerSettings.allowedAutorotateToLandscapeLeft = true;
            PlayerSettings.allowedAutorotateToLandscapeRight = true;
            PlayerSettings.allowedAutorotateToPortrait = false;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;

            // --- Teknis: IL2CPP + ARM64 (HP modern), API minimal 25 ---
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel25;
            EditorUserBuildSettings.buildAppBundle = false; // .apk, bukan .aab
            // Jangan buang kode mesin yang "tidak terlihat dipakai": komponen yang dibuat lewat kode (CreatePrimitive → SphereCollider)
            // ikut terbuang dan membuat HUD crash di HP (uji 25 Nov 2026).
            PlayerSettings.stripEngineCode = false;
            PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.Minimal);

            var scene = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
            if (scene.Length == 0) throw new Exception("[MS] Tidak ada scene di Build Settings.");
            Debug.Log("[MS] Bangun APK " + VersiNama + " (" + scene.Length + " scene) → " + keluar);

            var hasil = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = scene,
                locationPathName = keluar,
                target = BuildTarget.Android,
                targetGroup = BuildTargetGroup.Android,
                options = uji ? BuildOptions.Development : BuildOptions.None,
            });
            var r = hasil.summary;
            Debug.Log("[MS] Hasil APK: " + r.result + " · " + (r.totalSize / 1048576f).ToString("0.0") + " MB · " + r.totalErrors + " error · " + r.totalTime);
            if (Application.isBatchMode && r.result != BuildResult.Succeeded) EditorApplication.Exit(1);
        }

        static string Argumen(string nama)
        {
            var a = Environment.GetCommandLineArgs();
            for (int i = 0; i < a.Length - 1; i++) if (a[i] == nama) return a[i + 1];
            return null;
        }
    }
}
