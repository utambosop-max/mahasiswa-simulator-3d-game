// Membuat scene Kamar Kos secara otomatis (menu: Mahasiswa Sim > Buat Scene Kamar Kos).
// Bisa dijalankan ulang kapan saja: scene lama ditimpa. Model dari Assets/_Game/Models dipakai bila ada,
// kalau belum ada diganti bentuk sederhana (placeholder) berwarna pastel.
using MS.Inti;
using MS.Pemain;
using MS.UI;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace MS.Dunia.Editor
{
    public static class PembuatSceneKamar
    {
        const string PathScene = "Assets/_Game/Scenes/KamarKos.unity";
        const string FolderBahan = "Assets/_Game/Scenes/KamarKos_Bahan";
        const string FolderModel = "Assets/_Game/Models/";
        const string FolderData = "Assets/_Game/Data/";

        // Palet pastel (src/three/palette.ts)
        static readonly Color Krem = new Color32(255, 243, 224, 255);
        static readonly Color Kayu = new Color32(214, 168, 120, 255);
        static readonly Color Dinding = new Color32(255, 228, 196, 255);
        static readonly Color Mint = new Color32(168, 230, 207, 255);
        static readonly Color Langit = new Color32(174, 214, 241, 255);
        static readonly Color Oranye = new Color32(255, 179, 128, 255);
        static readonly Color Kulit = new Color32(255, 214, 180, 255);

        [MenuItem("Mahasiswa Sim/Buat Scene Kamar Kos")]
        public static void Buat()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            if (!AssetDatabase.IsValidFolder(FolderBahan)) AssetDatabase.CreateFolder("Assets/_Game/Scenes", "KamarKos_Bahan");

            // --- Cahaya: matahari hangat + ambient terang (gaya kartun) ---
            var matahari = new GameObject("Matahari").AddComponent<Light>();
            matahari.type = LightType.Directional;
            matahari.color = new Color32(255, 244, 229, 255);
            matahari.intensity = 1.2f;
            matahari.shadows = LightShadows.Soft;
            matahari.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color32(200, 190, 180, 255);

            // --- Ruangan 10 × 7 m (konvensi interior web) ---
            var ruang = new GameObject("Kamar").transform;
            Kotak("Lantai", ruang, new Vector3(0, -0.05f, 0), new Vector3(10, 0.1f, 7), Kayu);
            Kotak("Dinding Belakang", ruang, new Vector3(0, 1.25f, 3.6f), new Vector3(10.4f, 2.5f, 0.2f), Dinding);
            Kotak("Dinding Kiri", ruang, new Vector3(-5.1f, 1.25f, 0), new Vector3(0.2f, 2.5f, 7), Dinding);
            Kotak("Dinding Kanan", ruang, new Vector3(5.1f, 1.25f, 0), new Vector3(0.2f, 2.5f, 7), Dinding);
            // Dinding depan rendah agar kamera isometric tetap bisa melihat ke dalam
            Kotak("Dinding Depan", ruang, new Vector3(0, 0.25f, -3.6f), new Vector3(10.4f, 0.5f, 0.2f), Dinding);

            // --- Perabot + titik interaksi ---
            var kasur = Model("prop_kasur", ruang, new Vector3(-3.4f, 0, 2.2f), Quaternion.identity)
                        ?? Kotak("Kasur (placeholder)", ruang, new Vector3(-3.4f, 0.25f, 2.2f), new Vector3(2f, 0.5f, 1.2f), Langit);
            Bertingkat("kasur", ruang, kasur, "prop_kasur_lv2", "prop_kasur_lv3", new Vector3(-3.4f, 0, 2.2f));
            Titik("Titik Kasur", kasur.transform.parent, kasur.transform.localPosition, "tidur", "😴 Tidur", "rebahan", "🛌 Rebahan");

            var meja = Model("prop_meja", ruang, new Vector3(3.2f, 0, 2.8f), Quaternion.identity)
                       ?? Kotak("Meja (placeholder)", ruang, new Vector3(3.2f, 0.4f, 2.8f), new Vector3(1.6f, 0.8f, 0.8f), Oranye);
            Bertingkat("meja", ruang, meja, "prop_meja_lv2", "prop_meja_lv3", new Vector3(3.2f, 0, 2.8f));
            // Kipas: Lv1 kipas kecil di lantai, Lv2 kipas berdiri, Lv3 AC di dinding belakang (pivot di bawah unit AC)
            Bertingkat("kipas", ruang, Model("prop_kipas_lv1", ruang, new Vector3(1.6f, 0, 3.0f), Quaternion.identity),
                       "prop_kipas_lv2", "prop_kipas_lv3", new Vector3(1.6f, 0, 3.0f), new Vector3(1.6f, 2.2f, 3.3f));
            // Dekorasi: Lv1 belum ada apa-apa
            Bertingkat("dekorasi", ruang, null, "prop_dekorasi_lv2", "prop_dekorasi_lv3", new Vector3(-4.3f, 0, 0.6f));
            Titik("Titik Meja", meja.transform.parent, meja.transform.localPosition + new Vector3(0, 0, -0.9f), "belajar", "📚 Belajar", "nugas", "📝 Nugas");

            var dapur = Model("prop_kompor", ruang, new Vector3(4.2f, 0, -1.5f), Quaternion.identity)
                        ?? Kotak("Pojok Dapur (placeholder)", ruang, new Vector3(4.2f, 0.45f, -1.5f), new Vector3(1f, 0.9f, 1.2f), Mint);
            Titik("Titik Dapur", dapur.transform, new Vector3(-0.9f, 0, 0), "masakMi", "🍜 Masak Mi", "seduhKopi", "☕ Seduh Kopi");

            var ember = Model("prop_ember", ruang, new Vector3(-4.3f, 0, -2.4f), Quaternion.identity)
                        ?? Silinder("Ember (placeholder)", ruang, new Vector3(-4.3f, 0.25f, -2.4f), new Vector3(0.6f, 0.25f, 0.6f), Langit);
            Titik("Titik Ember", ember.transform, new Vector3(0.8f, 0, 0), "mandi", "🚿 Mandi");

            // --- Jendela kecil di dinding kanan + pot cabai di bawahnya (pojok kosong antara meja & dapur) ---
            var jendela = Kotak("Jendela", ruang, new Vector3(4.97f, 1.5f, 0.5f), new Vector3(0.06f, 0.9f, 1.2f), Langit);
            Object.DestroyImmediate(jendela.GetComponent<Collider>());
            var posPot = new Vector3(4.5f, 0, 0.5f);
            var pot = Model("prop_tanamanPot", ruang, posPot, Quaternion.identity);
            if (pot == null)
            {
                pot = new GameObject("Pot Cabai");
                pot.transform.SetParent(ruang, false);
                pot.transform.localPosition = posPot;
                Silinder("Pot", pot.transform, new Vector3(0, 0.2f, 0), new Vector3(0.4f, 0.2f, 0.4f), new Color32(233, 150, 110, 255));
                var daun = Primitif(PrimitiveType.Sphere, "Daun Cabai", pot.transform, new Vector3(0, 0.6f, 0), Vector3.one * 0.45f, Mint);
                Object.DestroyImmediate(daun.GetComponent<Collider>());
            }
            pot.name = "Pot Cabai";
            pot.transform.localScale = Vector3.one * 0.8f;
            // Titik di depan pot (anak ruang, bukan anak pot, agar tidak ikut skala 0.8); radius kecil agar tidak rebutan dengan meja/dapur
            var titikPot = Titik("Titik Pot Cabai", ruang, posPot + new Vector3(-0.7f, 0, 0), "siramCabai", "🌱 Siram Cabai", "panenCabai", "🌶️ Panen");
            titikPot.radius = 1.2f;

            // --- Pintu keluar (dinding depan) + tempat muncul saat pulang ---
            Kotak("Pintu", ruang, new Vector3(0, 0.26f, -3.45f), new Vector3(1.3f, 0.52f, 0.08f), Kayu);
            // Lemari = tempat upgrade perabot (placeholder pastel bila model int_lemari belum ada)
            var lemari = Model("prop_lemari", ruang, new Vector3(-1.2f, 0, 3.0f), Quaternion.identity)
                         ?? Kotak("Lemari (placeholder)", ruang, new Vector3(-1.2f, 0.9f, 3.0f), new Vector3(1.2f, 1.8f, 0.6f), Langit);
            Titik("Titik Lemari", lemari.transform, new Vector3(0, 0, -0.9f), "bukaUpgrade", "🛠️ Upgrade Kamar", "bukaBukuSakti", "📒 Buku Sakti");
            Titik("Titik Pintu", ruang, new Vector3(0, 0, -3.0f), "keluarKos", "🚪 Keluar Kos", "bayarKos", "💸 Bayar Kos");
            var spawn = new GameObject("Spawn pintuKamar");
            spawn.transform.SetParent(ruang, false);
            spawn.transform.localPosition = new Vector3(0, 0, -2.0f); // menghadap +Z = masuk ke kamar
            spawn.AddComponent<TitikSpawn>().id = "pintuKamar";

            // Warna dinding mengikuti pilihan pemain (GameInti.Kos.WarnaDinding)
            var warnaDinding = ruang.gameObject.AddComponent<MS.Dunia.WarnaDindingKos>();
            warnaDinding.dinding = new[]
            {
                ruang.Find("Dinding Belakang").GetComponent<Renderer>(),
                ruang.Find("Dinding Kiri").GetComponent<Renderer>(),
                ruang.Find("Dinding Kanan").GetComponent<Renderer>(),
                ruang.Find("Dinding Depan").GetComponent<Renderer>(),
            };

            // --- Logika inti + data JSON ---
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

            // --- Pemain ---
            var pemain = Model("kar_mahasiswa", null, new Vector3(0, 0, 0), Quaternion.identity);
            if (pemain == null)
            {
                pemain = new GameObject("Pemain");
                // Chibi placeholder: badan kapsul kecil + kepala besar
                var badan = Primitif(PrimitiveType.Capsule, "Badan", pemain.transform, new Vector3(0, 0.45f, 0), new Vector3(0.5f, 0.45f, 0.5f), Oranye);
                var kepala = Primitif(PrimitiveType.Sphere, "Kepala", pemain.transform, new Vector3(0, 1.15f, 0), Vector3.one * 0.7f, Kulit);
                Object.DestroyImmediate(badan.GetComponent<Collider>());
                Object.DestroyImmediate(kepala.GetComponent<Collider>());
            }
            pemain.name = "Pemain";
            var cc = pemain.AddComponent<CharacterController>();
            cc.height = 1.5f; cc.radius = 0.3f; cc.center = new Vector3(0, 0.75f, 0);
            pemain.AddComponent<InputPemain>();
            pemain.AddComponent<GerakPemain>();
            pemain.AddComponent<InteraksiPemain>();

            // --- Kamera isometric ---
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
            kam.transform.position = new Vector3(0, 9, -9);
            kam.transform.LookAt(new Vector3(0, 0.8f, 0));

            // --- HUD ---
            // Pakai prefab HUD bila ada (satu instance saja)
            var prefabHud = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/_Game/Prefabs/UI/HUD_Kamar.prefab");
            if (prefabHud != null) PrefabUtility.InstantiatePrefab(prefabHud);
            else new GameObject("HUD").AddComponent<HudKamar>();

            EditorSceneManager.SaveScene(scene, PathScene);
            // Jadikan scene pertama di Build Settings
            // KamarKos di urutan pertama, scene lain (Kampung, dst.) tetap dipertahankan
            var daftar = new System.Collections.Generic.List<EditorBuildSettingsScene> { new EditorBuildSettingsScene(PathScene, true) };
            foreach (var s in EditorBuildSettings.scenes) if (s.path != PathScene) daftar.Add(s);
            EditorBuildSettings.scenes = daftar.ToArray();
            AssetDatabase.SaveAssets();
            Debug.Log("[MS] Scene Kamar Kos dibuat: " + PathScene);
        }

        /// <summary>Foto kamera utama ke PNG (untuk cek visual lewat batchmode). Argumen: -fotoKe path.png</summary>
        public static void Foto()
        {
            string ke = "foto-kamar.png";
            var args = System.Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++) if (args[i] == "-fotoKe") ke = args[i + 1];
            EditorSceneManager.OpenScene(PathScene);
            var cam = Camera.main;
            var rt = new RenderTexture(1280, 720, 24);
            cam.targetTexture = rt; cam.Render();
            RenderTexture.active = rt;
            var tex = new Texture2D(1280, 720, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, 1280, 720), 0, 0); tex.Apply();
            System.IO.File.WriteAllBytes(ke, tex.EncodeToPNG());
            cam.targetTexture = null; RenderTexture.active = null;
            Debug.Log("[MS] Foto disimpan: " + ke);
        }

        // ---------- Pembantu ----------

        static GameObject Model(string nama, Transform induk, Vector3 posisi, Quaternion rotasi)
        {
            var aset = AssetDatabase.LoadAssetAtPath<GameObject>(FolderModel + nama + ".fbx");
            if (aset == null) return null;
            var obj = (GameObject)PrefabUtility.InstantiatePrefab(aset);
            if (induk != null) obj.transform.SetParent(induk, false);
            obj.transform.SetPositionAndRotation(posisi, rotasi);
            // Model butuh collider agar tidak ditembus pemain
            if (obj.GetComponentInChildren<Collider>() == null)
            {
                var b = HitungBatas(obj);
                var box = obj.AddComponent<BoxCollider>();
                box.center = obj.transform.InverseTransformPoint(b.center);
                box.size = b.size;
            }
            return obj;
        }

        static Bounds HitungBatas(GameObject obj)
        {
            var r = obj.GetComponentsInChildren<Renderer>();
            if (r.Length == 0) return new Bounds(obj.transform.position, Vector3.one);
            var b = r[0].bounds;
            for (int i = 1; i < r.Length; i++) b.Encapsulate(r[i].bounds);
            return b;
        }

        /// <summary>Kelompokkan model Lv1..Lv3 di bawah satu induk + ModelPerLevel (ganti model saat upgrade).</summary>
        static void Bertingkat(string id, Transform ruang, GameObject lv1, string lv2, string lv3, Vector3 pos, Vector3? posLv3 = null)
        {
            var induk = new GameObject("Perabot " + id).transform;
            induk.SetParent(ruang, false);
            var m = induk.gameObject.AddComponent<MS.Dunia.ModelPerLevel>();
            m.idPerabot = id;
            var b = Model(lv2, induk, pos, Quaternion.identity);
            var c = Model(lv3, induk, posLv3 ?? pos, Quaternion.identity);
            if (lv1 != null) lv1.transform.SetParent(induk, true);
            m.perLevel = new[] { lv1, b, c };
            // Lv2/Lv3 disembunyikan dulu; ModelPerLevel menyalakan yang sesuai saat Play
            if (b != null) b.SetActive(false);
            if (c != null) c.SetActive(false);
        }

        static TitikInteraksi Titik(string nama, Transform induk, Vector3 lokal, string id, string label, string id2 = null, string label2 = null)
        {
            var go = new GameObject(nama);
            go.transform.SetParent(induk, false);
            go.transform.localPosition = lokal;
            var t = go.AddComponent<TitikInteraksi>();
            t.idAksi = id; t.nama = label; t.idAksiTambahan = id2; t.namaTambahan = label2;
            return t;
        }

        static GameObject Kotak(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Primitif(PrimitiveType.Cube, nama, induk, pos, skala, warna);

        static GameObject Silinder(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Primitif(PrimitiveType.Cylinder, nama, induk, pos, skala, warna);

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

        // Satu material per warna, disimpan di folder scene (bukan folder Materials model)
        static Material Bahan(Color warna)
        {
            string path = $"{FolderBahan}/Warna_{ColorUtility.ToHtmlStringRGB(warna)}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat != null) return mat;
            var shader = Shader.Find("Universal Render Pipeline/Lit");
            mat = new Material(shader);
            mat.SetColor("_BaseColor", warna);
            mat.SetFloat("_Smoothness", 0.1f); // kasar = kesan kartun
            AssetDatabase.CreateAsset(mat, path);
            return mat;
        }
    }
}
