// Membuat scene interior per gedung dari Assets/_Game/Data/gedung.json (menu: Mahasiswa Sim > Buat Scene Gedung).
// Hasil: Assets/_Game/Scenes/Gedung_<id>.unity. Perabot memakai FBX Models/int_<jenis>.fbx bila ada, kalau tidak kotak pastel.
using System.Collections.Generic;
using MS.Inti;
using MS.Pemain;
using MS.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace MS.Dunia.Editor
{
    public static class PembuatSceneGedung
    {
        const string FolderScene = "Assets/_Game/Scenes";
        const string FolderBahan = "Assets/_Game/Scenes/Gedung_Bahan";
        const string FolderModel = "Assets/_Game/Models/";
        const string FolderData = "Assets/_Game/Data/";

        static readonly Color Lantai = new Color32(232, 214, 186, 255);
        static readonly Color DindingCadangan = new Color32(255, 240, 214, 255);
        static readonly Color Kayu = new Color32(214, 168, 120, 255);
        static readonly Color Oranye = new Color32(255, 179, 128, 255);
        static readonly Color Kulit = new Color32(255, 214, 180, 255);
        static readonly Color Krem = new Color32(255, 248, 231, 255);
        // Warna pastel bergiliran untuk perabot placeholder
        static readonly Color[] Pastel =
        {
            new Color32(168, 230, 207, 255), new Color32(255, 230, 150, 255), new Color32(190, 225, 245, 255),
            new Color32(255, 190, 170, 255), new Color32(214, 168, 120, 255),
        };

        static readonly HashSet<string> FbxDicari = new HashSet<string>();

        public static string PathScene(string id) => $"{FolderScene}/Gedung_{id}.unity";

        [MenuItem("Mahasiswa Sim/Buat Scene Gedung")]
        public static void BuatSemua()
        {
            var data = PembacaGedung.Baca(AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "gedung.json"));
            if (data == null || data.gedung == null) { Debug.LogError("[MS] gedung.json tidak ada. Jalankan: node scripts/unity/ekspor-dunia.mts"); return; }
            FbxDicari.Clear();
            if (!AssetDatabase.IsValidFolder(FolderBahan)) AssetDatabase.CreateFolder(FolderScene, "Gedung_Bahan");

            var daftar = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            foreach (var g in data.gedung)
            {
                BuatSatu(data.ruang, g);
                // Tambahkan ke Build Settings tanpa menghapus scene lain
                if (!daftar.Exists(s => s.path == PathScene(g.id))) daftar.Add(new EditorBuildSettingsScene(PathScene(g.id), true));
            }
            EditorBuildSettings.scenes = daftar.ToArray();
            AssetDatabase.SaveAssets();
            Debug.Log($"[MS] {data.gedung.Length} scene gedung dibuat.\nFBX dicari: " + string.Join(", ", FbxDicari));
        }

        static void BuatSatu(InfoRuang r, DataInterior g)
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            var matahari = new GameObject("Matahari").AddComponent<Light>();
            matahari.type = LightType.Directional;
            matahari.color = new Color32(255, 244, 229, 255);
            matahari.intensity = 1.2f;
            matahari.shadows = LightShadows.Soft;
            matahari.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color32(200, 190, 180, 255);

            // --- Ruangan (2·halfW × 2·halfD); dinding depan (-Z) rendah agar kamera bisa melihat ke dalam ---
            float W = r.halfW * 2, D = r.halfD * 2, T = Mathf.Min(r.tinggi, 2.5f);
            var dinding = PembacaDunia.Warna(g.warna, DindingCadangan);
            var ruang = new GameObject("Ruang " + g.id).transform;
            Kotak("Lantai", ruang, new Vector3(0, -0.05f, 0), new Vector3(W, 0.1f, D), Lantai);
            Kotak("Dinding Belakang", ruang, new Vector3(0, T / 2, r.halfD + 0.1f), new Vector3(W + 0.4f, T, 0.2f), dinding);
            Kotak("Dinding Kiri", ruang, new Vector3(-r.halfW - 0.1f, T / 2, 0), new Vector3(0.2f, T, D), dinding);
            Kotak("Dinding Kanan", ruang, new Vector3(r.halfW + 0.1f, T / 2, 0), new Vector3(0.2f, T, D), dinding);
            Kotak("Dinding Depan", ruang, new Vector3(0, 0.25f, -r.halfD - 0.1f), new Vector3(W + 0.4f, 0.5f, 0.2f), dinding);

            // --- Perabot ---
            var grup = new GameObject("Perabot").transform;
            grup.SetParent(ruang, false);
            int i = 0;
            foreach (var p in g.perabot)
            {
                var pos = new Vector3(p.x, 0, p.z);
                var rot = Quaternion.Euler(0, p.rotY, 0);
                bool tabrak = p.w > 0 && p.d > 0;
                var obj = Model("int_" + p.jenis, grup, pos, rot, tabrak);
                if (obj == null)
                {
                    float tinggi = TinggiPerabot(p.jenis);
                    var ukuran = tabrak ? new Vector3(p.w, tinggi, p.d) : new Vector3(0.6f, tinggi, 0.3f);
                    obj = Kotak(p.jenis + " (placeholder)", grup, pos + Vector3.up * (tinggi / 2), ukuran,
                                PembacaDunia.Warna(p.warna, Pastel[i % Pastel.Length]));
                    obj.transform.localRotation = rot;
                    if (!tabrak) Object.DestroyImmediate(obj.GetComponent<Collider>());
                }
                i++;
            }

            // --- Penjaga (chibi placeholder di balik konter, hanya hiasan) ---
            if (!string.IsNullOrEmpty(g.namaPenjaga))
            {
                var posPj = new Vector3(g.penjaga.x, 0, g.penjaga.z);
                var pj = Model("kar_penjaga_" + g.id, ruang, posPj, Quaternion.Euler(0, 180, 0), false);
                if (pj == null)
                {
                    pj = new GameObject("Penjaga " + g.namaPenjaga);
                    pj.transform.SetParent(ruang, false);
                    pj.transform.localPosition = posPj;
                    Object.DestroyImmediate(Primitif(PrimitiveType.Capsule, "Badan", pj.transform, new Vector3(0, 0.45f, 0), new Vector3(0.5f, 0.45f, 0.5f), PembacaDunia.Warna(g.bajuPenjaga, Oranye)).GetComponent<Collider>());
                    Object.DestroyImmediate(Primitif(PrimitiveType.Sphere, "Kepala", pj.transform, new Vector3(0, 1.15f, 0), Vector3.one * 0.7f, Kulit).GetComponent<Collider>());
                }
            }

            // --- Titik aksi di depan konter: dua aksi per titik; titik berikutnya bergeser kanan/kiri 2,2 m ---
            if (g.adaKonter && g.aksi != null)
            {
                for (int k = 0, n = 0; k < g.aksi.Length; k += 2, n++)
                {
                    float geser = (n % 2 == 1 ? 1 : -1) * ((n + 1) / 2) * 2.2f;
                    var pos = new Vector3(Mathf.Clamp(g.konter.x + geser, -r.halfW + 0.8f, r.halfW - 0.8f), 0, g.konter.z);
                    string id2 = k + 1 < g.aksi.Length ? g.aksi[k + 1] : null;
                    Titik("Titik Aksi " + g.aksi[k], ruang, pos, g.aksi[k], g.aksi[k], 1.2f, id2, id2, null);
                }
            }

            // --- Pintu keluar (dinding kiri) + tempat muncul saat masuk ---
            var pintu = new Vector3(g.pintu.x, 0, g.pintu.z);
            Object.DestroyImmediate(Kotak("Pintu", ruang, pintu + new Vector3(0.02f, 1.0f, 0), new Vector3(0.06f, 2.0f, 1.1f), Kayu).GetComponent<Collider>());
            Titik("Titik Pintu Keluar", ruang, pintu + new Vector3(0.7f, 0, 0), "keluarGedung", "🚪 Keluar", 1.3f, null, null, g.id);
            var spawn = new GameObject("Spawn masuk");
            spawn.transform.SetParent(ruang, false);
            spawn.transform.SetPositionAndRotation(new Vector3(g.spawn.x, 0, g.spawn.z), Quaternion.Euler(0, g.spawn.rotY, 0));
            spawn.AddComponent<TitikSpawn>().id = "masuk";

            TandaiStatis(grup.gameObject);
            BuatIntiPemainKamera(new Vector3(g.spawn.x, 0, g.spawn.z), Quaternion.Euler(0, g.spawn.rotY, 0));
            EditorSceneManager.SaveScene(scene, PathScene(g.id));
        }

        // Tinggi kasar placeholder per jenis perabot
        static float TinggiPerabot(string jenis)
        {
            switch (jenis)
            {
                case "rak": case "rakBuku": case "kulkas": case "galonRak": case "rakKertas": case "brankas": case "cermin": return 1.8f;
                case "papanTulis": case "tv": return 1.4f;
                case "matras": return 0.15f;
                case "bangku": case "kursiTunggu": case "sofa": case "kursiCukur": return 0.5f;
                default: return 0.9f;
            }
        }

        static void BuatIntiPemainKamera(Vector3 posSpawn, Quaternion rotSpawn)
        {
            var inti = new GameObject("GameInti").AddComponent<GameInti>();
            var so = new SerializedObject(inti);
            so.FindProperty("aksiJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "aksi.json");
            so.FindProperty("balanceJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "balance.json");
            so.FindProperty("menuJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "menu.json");
            so.FindProperty("upgradesJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "upgrades.json");
            so.FindProperty("eventsJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "events.json");
            so.FindProperty("kerjaJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "kerja.json");
            so.FindProperty("fiturJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "fitur.json");
            so.FindProperty("fitur2Json").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "fitur2.json");
            so.FindProperty("fitur3Json").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "fitur3.json");
            so.FindProperty("fitur4Json").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "fitur4.json");
            so.FindProperty("ceritaJson").objectReferenceValue = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "cerita.json");
            so.ApplyModifiedPropertiesWithoutUndo();

            var pemain = Model("kar_mahasiswa", null, posSpawn, rotSpawn, false);
            if (pemain == null)
            {
                pemain = new GameObject("Pemain");
                pemain.transform.SetPositionAndRotation(posSpawn, rotSpawn);
                Object.DestroyImmediate(Primitif(PrimitiveType.Capsule, "Badan", pemain.transform, new Vector3(0, 0.45f, 0), new Vector3(0.5f, 0.45f, 0.5f), Oranye).GetComponent<Collider>());
                Object.DestroyImmediate(Primitif(PrimitiveType.Sphere, "Kepala", pemain.transform, new Vector3(0, 1.15f, 0), Vector3.one * 0.7f, Kulit).GetComponent<Collider>());
            }
            pemain.name = "Pemain";
            var cc = pemain.AddComponent<CharacterController>();
            cc.height = 1.5f; cc.radius = 0.3f; cc.center = new Vector3(0, 0.75f, 0);
            pemain.AddComponent<InputPemain>();
            pemain.AddComponent<GerakPemain>();
            pemain.AddComponent<InteraksiPemain>();

            var kam = new GameObject("Main Camera") { tag = "MainCamera" };
            var camera = kam.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = Krem;
            camera.fieldOfView = 40f;
            kam.AddComponent<AudioListener>();
            var iso = kam.AddComponent<KameraIsometric>();
            var soKam = new SerializedObject(iso);
            soKam.FindProperty("target").objectReferenceValue = pemain.transform;
            soKam.ApplyModifiedPropertiesWithoutUndo();
            kam.transform.position = posSpawn + new Vector3(0, 9, -9);
            kam.transform.LookAt(posSpawn + new Vector3(0, 0.8f, 0));

            var prefabHud = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/_Game/Prefabs/UI/HUD_Kamar.prefab");
            if (prefabHud != null) PrefabUtility.InstantiatePrefab(prefabHud);
            else new GameObject("HUD").AddComponent<HudKamar>();
        }

        /// <summary>Foto satu gedung ke PNG (batchmode). Argumen: -gedung id -fotoKe path.png</summary>
        public static void Foto()
        {
            string id = "warteg", ke = "foto-gedung.png";
            var args = System.Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == "-gedung") id = args[i + 1];
                if (args[i] == "-fotoKe") ke = args[i + 1];
            }
            EditorSceneManager.OpenScene(PathScene(id));
            var cam = Camera.main;
            // Pandang seluruh ruangan dari depan-atas
            cam.transform.position = new Vector3(0, 10f, -10f);
            cam.transform.LookAt(new Vector3(0, 0, 0.3f));
            var rt = new RenderTexture(1920, 1080, 24);
            cam.targetTexture = rt; cam.Render();
            RenderTexture.active = rt;
            var tex = new Texture2D(1920, 1080, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, 1920, 1080), 0, 0); tex.Apply();
            System.IO.File.WriteAllBytes(ke, tex.EncodeToPNG());
            cam.targetTexture = null; RenderTexture.active = null;
            Debug.Log("[MS] Foto disimpan: " + ke);
        }

        // ---------- Pembantu ----------

        static GameObject Model(string nama, Transform induk, Vector3 posisi, Quaternion rotasi, bool beriCollider)
        {
            FbxDicari.Add(nama);
            var aset = AssetDatabase.LoadAssetAtPath<GameObject>(FolderModel + nama + ".fbx");
            if (aset == null) return null;
            var obj = (GameObject)PrefabUtility.InstantiatePrefab(aset);
            if (induk != null) obj.transform.SetParent(induk, false);
            obj.transform.localPosition = posisi;
            obj.transform.localRotation = rotasi;
            // Perabot butuh collider agar tidak ditembus pemain
            if (beriCollider && obj.GetComponentInChildren<Collider>() == null)
            {
                var r = obj.GetComponentsInChildren<Renderer>();
                if (r.Length > 0)
                {
                    var b = r[0].bounds;
                    for (int i = 1; i < r.Length; i++) b.Encapsulate(r[i].bounds);
                    var box = obj.AddComponent<BoxCollider>();
                    box.center = obj.transform.InverseTransformPoint(b.center);
                    box.size = b.size;
                }
            }
            return obj;
        }

        static void Titik(string nama, Transform induk, Vector3 pos, string id, string label, float radius,
                          string id2, string label2, string target)
        {
            var go = new GameObject(nama);
            go.transform.SetParent(induk, false);
            go.transform.localPosition = pos;
            var t = go.AddComponent<TitikInteraksi>();
            t.idAksi = id; t.nama = label; t.radius = radius; t.idAksiTambahan = id2; t.namaTambahan = label2; t.target = target;
        }

        // Benda diam → statis (static batching hemat draw call di HP)
        static void TandaiStatis(GameObject akar)
        {
            const StaticEditorFlags flag = StaticEditorFlags.BatchingStatic | StaticEditorFlags.OccluderStatic
                                         | StaticEditorFlags.OccludeeStatic | StaticEditorFlags.ContributeGI;
            foreach (var t in akar.GetComponentsInChildren<Transform>(true))
                GameObjectUtility.SetStaticEditorFlags(t.gameObject, flag);
        }

        static GameObject Kotak(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Primitif(PrimitiveType.Cube, nama, induk, pos, skala, warna);

        static GameObject Primitif(PrimitiveType jenis, string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
        {
            var go = GameObject.CreatePrimitive(jenis);
            go.name = nama;
            go.transform.SetParent(induk, false);
            go.transform.localPosition = pos;
            go.transform.localScale = skala;
            go.GetComponent<Renderer>().sharedMaterial = Bahan(warna);
            return go;
        }

        // Satu material per warna (dipakai bersama), disimpan di folder Gedung_Bahan
        static Material Bahan(Color warna)
        {
            string path = $"{FolderBahan}/Warna_{ColorUtility.ToHtmlStringRGB(warna)}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat != null) return mat;
            mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.SetColor("_BaseColor", warna);
            mat.SetFloat("_Smoothness", 0.1f);
            AssetDatabase.CreateAsset(mat, path);
            return mat;
        }
    }
}
