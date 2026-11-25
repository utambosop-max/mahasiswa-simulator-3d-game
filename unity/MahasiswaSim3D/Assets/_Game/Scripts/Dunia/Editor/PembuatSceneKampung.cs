// Membuat scene Kampung Mahasiswa dari Assets/_Game/Data/dunia.json (menu: Mahasiswa Sim > Buat Scene Kampung).
// dunia.json dihasilkan oleh scripts/unity/ekspor-dunia.mts dari game web (koordinat sudah versi Unity: z dibalik).
// Model FBX di Assets/_Game/Models dipakai bila namanya cocok; kalau belum ada, dipakai bentuk pastel sederhana.
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
    public static class PembuatSceneKampung
    {
        const string PathScene = "Assets/_Game/Scenes/Kampung.unity";
        const string FolderBahan = "Assets/_Game/Scenes/Kampung_Bahan";
        const string FolderModel = "Assets/_Game/Models/";
        const string FolderData = "Assets/_Game/Data/";

        // Palet pastel (src/three/palette.ts)
        static readonly Color Rumput = new Color32(168, 214, 140, 255);
        static readonly Color Aspal = new Color32(110, 112, 122, 255);
        static readonly Color Trotoar = new Color32(222, 210, 190, 255);
        static readonly Color Air = new Color32(120, 190, 230, 255);
        static readonly Color Kayu = new Color32(214, 168, 120, 255);
        static readonly Color Paving = new Color32(205, 190, 170, 255);
        static readonly Color Mint = new Color32(168, 230, 207, 255);
        static readonly Color Lumpur = new Color32(170, 140, 100, 255);
        static readonly Color Padi = new Color32(150, 200, 90, 255);
        static readonly Color Daun = new Color32(110, 180, 110, 255);
        static readonly Color Batang = new Color32(150, 105, 70, 255);
        static readonly Color Besi = new Color32(150, 155, 165, 255);
        static readonly Color Kuning = new Color32(255, 230, 150, 255);
        static readonly Color Oranye = new Color32(255, 179, 128, 255);
        static readonly Color Kulit = new Color32(255, 214, 180, 255);
        static readonly Color Langit = new Color32(190, 225, 245, 255);
        static readonly Color Putih = new Color32(250, 248, 240, 255);
        static readonly Color Bata = new Color32(233, 96, 90, 255);
        static readonly Color HijauLapangan = new Color32(120, 190, 110, 255);

        /// <summary>Nama FBX (tanpa ".fbx") yang dicari selama pembuatan; dicetak di Console.</summary>
        static readonly HashSet<string> FbxDicari = new HashSet<string>();

        [MenuItem("Mahasiswa Sim/Buat Scene Kampung")]
        public static void Buat()
        {
            var d = PembacaDunia.Baca(AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "dunia.json"));
            if (d == null) { Debug.LogError("[MS] dunia.json tidak ada. Jalankan: node scripts/unity/ekspor-dunia.mts"); return; }
            FbxDicari.Clear();

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            if (!AssetDatabase.IsValidFolder(FolderBahan)) AssetDatabase.CreateFolder("Assets/_Game/Scenes", "Kampung_Bahan");

            // --- Cahaya hangat + ambient terang ---
            var matahari = new GameObject("Matahari").AddComponent<Light>();
            matahari.type = LightType.Directional;
            matahari.color = new Color32(255, 244, 229, 255);
            matahari.intensity = 1.2f;
            matahari.shadows = LightShadows.Soft;
            matahari.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color32(200, 195, 185, 255);

            // Semua benda diam di bawah "Dunia", lalu ditandai statis (static batching hemat draw call di HP)
            var dunia = new GameObject("Dunia").transform;
            BuatTanahDanJalan(d, dunia);
            BuatSungai(d, dunia);
            BuatArea(d, dunia);
            BuatBangunan(d, dunia);
            BuatProp(d, dunia);
            TandaiStatis(dunia.gameObject);

            BuatIntiPemainKamera(d);
            BuatWarga(); // bergerak -> tidak di bawah "Dunia" (statis)

            EditorSceneManager.SaveScene(scene, PathScene);
            // Tambahkan ke Build Settings tanpa menghapus scene lain (KamarKos tetap pertama)
            var daftar = new List<EditorBuildSettingsScene>(EditorBuildSettings.scenes);
            if (!daftar.Exists(s => s.path == PathScene)) daftar.Add(new EditorBuildSettingsScene(PathScene, true));
            EditorBuildSettings.scenes = daftar.ToArray();
            AssetDatabase.SaveAssets();
            Debug.Log("[MS] Scene Kampung dibuat: " + PathScene + "\nFBX dicari: " + string.Join(", ", FbxDicari));
        }

        // ---------- Tanah, jalan, trotoar, gang ----------
        static void BuatTanahDanJalan(DataDunia d, Transform induk)
        {
            var info = d.dunia;
            float W = info.halfW * 2, D = info.halfD * 2, pita = info.jalan + info.trotoar;
            var akar = Grup("Tanah & Jalan", induk);
            Kotak("Tanah", akar, new Vector3(0, -0.05f, 0), new Vector3(W, 0.1f, D), Rumput);
            foreach (var z in info.jalanH)
            {
                Datar("Trotoar H", akar, new Vector3(0, 0, z), new Vector2(W, pita * 2), Trotoar, 0.04f);
                Datar("Jalan H", akar, new Vector3(0, 0.01f, z), new Vector2(W, info.jalan * 2), Aspal, 0.04f);
            }
            foreach (var x in info.jalanV)
            {
                // Sedikit lebih tinggi dari jalan horizontal agar tidak berkedip (z-fighting) di perempatan
                Datar("Trotoar V", akar, new Vector3(x, 0.005f, 0), new Vector2(pita * 2, D), Trotoar, 0.04f);
                Datar("Jalan V", akar, new Vector3(x, 0.015f, 0), new Vector2(info.jalan * 2, D), Aspal, 0.04f);
            }
            var g = d.gang;
            Datar("Gang", akar, new Vector3(g.x, 0, (g.z0 + g.z1) / 2), new Vector2(g.lebar, g.z1 - g.z0), Paving, 0.04f);
            var js = d.jalurSungai;
            Datar("Jalur Tepi Sungai", akar, new Vector3((js.x0 + js.x1) / 2, 0, js.z), new Vector2(js.x1 - js.x0, js.lebar), Paving, 0.04f);
        }

        // ---------- Sungai + jembatan di setiap jalan vertikal ----------
        static void BuatSungai(DataDunia d, Transform induk)
        {
            var s = d.sungai;
            var akar = Grup("Sungai", induk);
            float W = d.dunia.halfW * 2;
            Datar("Air Sungai", akar, new Vector3(0, 0.02f, s.z), new Vector2(W, s.setengah * 2), Air, 0.04f);
            float lebar = s.jembatanSetengah * 2, panjang = s.setengah * 2 + 1.5f;
            foreach (var x in d.dunia.jalanV)
            {
                if (Model("prop_jembatan", akar, new Vector3(x, 0, s.z), Quaternion.identity) != null) continue;
                var jem = Grup("Jembatan", akar); jem.localPosition = new Vector3(x, 0, s.z);
                Datar("Lantai", jem, new Vector3(0, 0.08f, 0), new Vector2(lebar, panjang), Kayu, 0.15f);
                Kotak("Pagar Kiri", jem, new Vector3(-lebar / 2, 0.55f, 0), new Vector3(0.2f, 0.8f, panjang), Oranye);
                Kotak("Pagar Kanan", jem, new Vector3(lebar / 2, 0.55f, 0), new Vector3(0.2f, 0.8f, panjang), Oranye);
            }
            // Dinding tak terlihat di atas air, terputus di setiap jembatan (pemain tidak bisa nyemplung)
            var xs = new List<float> { -d.dunia.halfW };
            foreach (var x in d.dunia.jalanV) { xs.Add(x - s.jembatanSetengah); xs.Add(x + s.jembatanSetengah); }
            xs.Add(d.dunia.halfW);
            for (int i = 0; i + 1 < xs.Count; i += 2)
            {
                var seg = Grup("Dinding Air", akar);
                seg.localPosition = new Vector3((xs[i] + xs[i + 1]) / 2, 1.5f, s.z);
                seg.gameObject.AddComponent<BoxCollider>().size = new Vector3(xs[i + 1] - xs[i], 3f, s.setengah * 2);
            }
        }

        // ---------- Area: taman, lapangan, sawah, kebun, pasar kaget, warung tepi kali ----------
        static void BuatArea(DataDunia d, Transform induk)
        {
            var akar = Grup("Area", induk);
            var t = d.taman;
            Datar("Taman", akar, new Vector3((t.minX + t.maxX) / 2, 0, (t.minZ + t.maxZ) / 2), new Vector2(t.maxX - t.minX, t.maxZ - t.minZ), Mint, 0.05f);
            var kolam = Silinder("Kolam", akar, new Vector3(t.kolam.x, 0.06f, t.kolam.z), new Vector3(t.kolam.r * 2, 0.04f, t.kolam.r * 2), Air);
            Titik("Titik Kolam", akar, kolam.transform.position, "kasihMakanIkan", "🐟 Kasih Makan Ikan", 2.6f);
            var bPos = new Vector3(t.bangku.x, 0, t.bangku.z);
            if (Model("prop_bangku", akar, bPos, Quaternion.identity) == null)
                Kotak("Bangku Taman", akar, bPos + Vector3.up * 0.25f, new Vector3(1.6f, 0.5f, 0.5f), Kayu);
            Titik("Titik Bangku", akar, bPos, "santaiTaman", "🌳 Santai di Taman");

            Lapangan("Lapangan Futsal", akar, d.lapangan, "mainFutsal", "⚽ Main Futsal");
            Lapangan("Lapangan Kampung", akar, d.lapanganKampung, "mainBolaKampung", "⚽ Main Bola");

            foreach (var k in d.sawahBlok) DatarKotak("Sawah", akar, k, Lumpur, 0.03f);
            foreach (var k in d.petakSawah) DatarKotak("Petak Padi", akar, k, Padi, 0.08f);
            foreach (var k in d.kebun) DatarKotak("Kebun", akar, k, Lumpur, 0.03f);
            foreach (var k in d.bedengan) DatarKotak("Bedengan", akar, k, Daun, 0.12f);
            DatarKotak("Kebun Pisang", akar, d.kebunPisang, Lumpur, 0.03f);

            foreach (var l in d.lapak)
            {
                var obj = Model("prop_lapak", akar, new Vector3(l.x, 0, l.z), Quaternion.Euler(0, l.rotY, 0))
                          ?? Gubuk("Lapak", akar, l.x, l.z, l.rotY, l.w, l.d, 2.2f, Putih, PembacaDunia.Warna(l.atap, Oranye));
                Titik("Titik Lapak", obj.transform, new Vector3(0, 0, l.d / 2 + 0.8f), "jajanPasarKaget", "🛍️ Jajan Pasar Kaget", 1.6f, null, null, true);
            }
            foreach (var s in d.saung)
                if (Model("prop_saung", akar, new Vector3(s.x, 0, s.z), Quaternion.identity) == null)
                    Gubuk("Saung", akar, s.x, s.z, 0, 2.6f, 2.6f, 2.4f, Kayu, Kuning);
            foreach (var w in d.warung)
            {
                var obj = Model("prop_warung", akar, new Vector3(w.x, 0, w.z), Quaternion.Euler(0, w.rotY, 0))
                          ?? Gubuk("Warung " + w.teks, akar, w.x, w.z, w.rotY, w.w, w.d, 2.5f, PembacaDunia.Warna(w.warna, Putih), PembacaDunia.Warna(w.atap, Oranye));
                Titik("Titik Warung", obj.transform, new Vector3(0, 0, w.d / 2 + 0.8f), "ngopiTepiKali", "☕ " + w.teks, 1.6f, null, null, true);
            }
        }

        static void Lapangan(string nama, Transform induk, Persegi p, string aksi, string label)
        {
            Datar(nama, induk, new Vector3(p.x, 0, p.z), new Vector2(p.w, p.d), HijauLapangan, 0.06f);
            Datar(nama + " Garis", induk, new Vector3(p.x, 0.01f, p.z), new Vector2(0.15f, p.d), Putih, 0.06f);
            Titik("Titik " + nama, induk, new Vector3(p.x, 0, p.z), aksi, label, 3f);
        }

        // ---------- Bangunan + titik interaksi di pintu ----------
        static void BuatBangunan(DataDunia d, Transform induk)
        {
            var akar = Grup("Bangunan", induk);
            foreach (var b in d.bangunan)
            {
                var rot = Quaternion.Euler(0, b.rotY, 0);
                var pos = new Vector3(b.x, 0, b.z);
                // Urutan cari: gedung_<id> (khusus), lalu gedung_<jenis> (umum), lalu placeholder
                var obj = Model("gedung_" + b.id, akar, pos, rot) ?? Model("gedung_" + b.jenis, akar, pos, rot)
                          ?? GedungPlaceholder(b, akar, pos, rot);
                obj.name = b.nama + " (" + b.id + ")";
                if (b.aksi == null || b.aksi.Length == 0) continue; // rumah warga: hiasan saja
                // Dua aksi pertama dari data web jadi tombol (aksi lain menyusul lewat menu gedung)
                if (b.id != "kos")
                {
                    // Gedung ber-interior: pintu → masuk scene Gedung_<id>; tombol kedua = aksi cepat pertama
                    Titik("Pintu " + b.id, akar, new Vector3(b.pintu.x, 0, b.pintu.z), "masukGedung", "🚪 Masuk " + b.nama, 1.9f,
                          b.aksi[0], b.aksi[0], false, b.id);
                    var pintuG = new Vector3(b.pintu.x, 0, b.pintu.z);
                    var arahG = pintuG - pos; arahG.y = 0; arahG.Normalize();
                    var spG = new GameObject("Spawn keluar_" + b.id);
                    spG.transform.SetParent(akar, false);
                    spG.transform.SetPositionAndRotation(pintuG + arahG * 1.2f, Quaternion.LookRotation(arahG));
                    spG.AddComponent<MS.Pemain.TitikSpawn>().id = "keluar_" + b.id;
                    continue;
                }
                Titik("Pintu " + b.id, akar, new Vector3(b.pintu.x, 0, b.pintu.z), b.aksi[0], b.nama, 1.9f,
                      b.aksi.Length > 1 ? b.aksi[1] : null, b.aksi.Length > 1 ? b.aksi[1] : null, false, b.id);
                if (b.id == "kos")
                {
                    // Tempat muncul setelah keluar kamar: sedikit di depan pintu, menghadap menjauhi gedung
                    var pintu = new Vector3(b.pintu.x, 0, b.pintu.z);
                    var arah = pintu - pos; arah.y = 0; arah.Normalize();
                    var sp = new GameObject("Spawn pintuKos");
                    sp.transform.SetParent(akar, false);
                    sp.transform.SetPositionAndRotation(pintu + arah * 1.2f, Quaternion.LookRotation(arah));
                    sp.AddComponent<MS.Pemain.TitikSpawn>().id = "pintuKos";
                    BuatPapanInfoKos(akar, pintu);
                }
            }
            var petak = Grup("Kos Petak", induk);
            foreach (var p in d.kosPetak)
            {
                var rot = Quaternion.Euler(0, p.rotY, 0);
                if (Model("gedung_petak", petak, new Vector3(p.x, 0, p.z), rot) != null) continue;
                bool samping = p.hadap == "+x" || p.hadap == "-x"; // muka depan selalu sumbu X lokal
                Gubuk("Petak", petak, p.x, p.z, p.rotY, samping ? p.d : p.w, samping ? p.w : p.d, 3f,
                      PembacaDunia.Warna(p.warna, Putih), PembacaDunia.Warna(p.atap, Oranye), true);
            }
        }

        // Papan "Info Kos" di depan dinding kos, 3.8 m di kiri pintu (sisi kanan ada parkir motor):
        // jarak 3.8 > radius pintu 1.9 + radius papan 1.6 -> tombol tidak rebutan dengan "masukKos".
        static void BuatPapanInfoKos(Transform induk, Vector3 pintu)
        {
            var papan = Grup("Papan Info Kos", induk);
            papan.position = pintu + new Vector3(-3.8f, 0, 0.5f); // dinding kos mulai z = 5.4 -> papan di z 5.1
            Kotak("Tiang", papan, new Vector3(0, 0.6f, 0), new Vector3(0.12f, 1.2f, 0.12f), Kayu);
            Kotak("Papan", papan, new Vector3(0, 1.35f, -0.05f), new Vector3(1.1f, 0.75f, 0.08f), Kayu);
            Hiasan("Kertas", papan, new Vector3(0, 1.35f, -0.1f), new Vector3(0.9f, 0.55f, 0.02f), Putih);
            // Titik di sisi jalan (-Z) agar didekati dari trotoar
            Titik("Titik Info Kos", papan, new Vector3(0, 0, -0.8f), "bukaInfoKos", "📋 Info Kos", 1.6f, null, null, true);
        }

        static GameObject GedungPlaceholder(DataBangunan b, Transform induk, Vector3 pos, Quaternion rot)
        {
            bool samping = b.hadap == "+x" || b.hadap == "-x";
            float lw = samping ? b.d : b.w, ld = samping ? b.w : b.d; // ukuran lokal (muka depan = +Z lokal)
            float hAtap = b.atapLimas ? 2f : 1.2f;
            float hBadan = Mathf.Max(2.5f, b.tinggi - hAtap);
            var akar = Grup(b.id, induk); akar.SetPositionAndRotation(pos, rot);
            Kotak("Badan", akar, new Vector3(0, hBadan / 2, 0), new Vector3(lw, hBadan, ld), PembacaDunia.Warna(b.warna, Putih));
            Kotak("Atap", akar, new Vector3(0, hBadan + hAtap / 2, 0), new Vector3(lw + 0.6f, hAtap, ld + 0.6f), PembacaDunia.Warna(b.atap, Oranye));
            Hiasan("Pintu", akar, new Vector3(0, 1.05f, ld / 2 + 0.03f), new Vector3(1.2f, 2.1f, 0.06f), Kayu);
            if (lw > 5) foreach (var sx in new[] { -lw / 3, lw / 3 })
                Hiasan("Jendela", akar, new Vector3(sx, 1.6f, ld / 2 + 0.03f), new Vector3(1.4f, 1f, 0.06f), Langit);
            if (b.depan > 0.3f)
            {
                var aksen = PembacaDunia.Warna(string.IsNullOrEmpty(b.aksen) ? b.atap : b.aksen, Oranye);
                Hiasan("Teras", akar, new Vector3(0, 2.6f, ld / 2 + b.depan / 2), new Vector3(lw * 0.8f, 0.15f, b.depan), aksen);
            }
            return akar.gameObject;
        }

        // Bangunan kecil: badan tertutup (petak) atau meja + tiang (lapak, warung, saung) + atap
        static GameObject Gubuk(string nama, Transform induk, float x, float z, float rotY, float w, float d, float h, Color badan, Color atap, bool tertutup = false)
        {
            var akar = Grup(nama, induk);
            akar.SetPositionAndRotation(new Vector3(x, 0, z), Quaternion.Euler(0, rotY, 0));
            if (tertutup) Kotak("Badan", akar, new Vector3(0, h / 2, 0), new Vector3(w, h, d), badan);
            else
            {
                Kotak("Meja", akar, new Vector3(0, 0.45f, d / 4), new Vector3(w * 0.9f, 0.9f, d / 2.2f), badan);
                foreach (var sx in new[] { -w / 2 + 0.1f, w / 2 - 0.1f })
                    Silinder("Tiang", akar, new Vector3(sx, h / 2, d / 2 - 0.1f), new Vector3(0.12f, h / 2, 0.12f), Kayu);
            }
            Hiasan("Atap", akar, new Vector3(0, h + 0.15f, 0), new Vector3(w + 0.4f, 0.3f, d + 0.4f), atap);
            return akar.gameObject;
        }

        // ---------- Prop: pohon, lampu, halte, gerobak, gapura, menara air, motor ----------
        static void BuatProp(DataDunia d, Transform induk)
        {
            var akar = Grup("Prop", induk);
            foreach (var p in d.pohon) Pohon("prop_pohon", akar, p, Daun, 2.2f);
            foreach (var p in d.pohonKelapa) Pohon("prop_pohon_kelapa", akar, p, new Color32(120, 190, 100, 255), 4f);
            foreach (var p in d.pohonPisang) Pohon("prop_pohon_pisang", akar, p, new Color32(140, 205, 110, 255), 1.6f);

            foreach (var l in d.lampu)
            {
                var pos = new Vector3(l.x, 0, l.z);
                if (Model("prop_lampu", akar, pos, Quaternion.identity) != null) continue;
                Silinder("Lampu Jalan", akar, pos + Vector3.up * 1.8f, new Vector3(0.15f, 1.8f, 0.15f), Besi);
                Bola("Kepala Lampu", akar, pos + Vector3.up * 3.7f, new Vector3(0.45f, 0.35f, 0.45f), Kuning);
            }
            foreach (var t in d.tiangLalin)
                if (Model("prop_lampu_lalin", akar, new Vector3(t.x, 0, t.z), Quaternion.Euler(0, t.rotY, 0)) == null)
                    Silinder("Tiang Lalin", akar, new Vector3(t.x, 1.4f, t.z), new Vector3(0.12f, 1.4f, 0.12f), Besi);

            foreach (var h in d.halte)
            {
                var obj = Model("prop_halte", akar, new Vector3(h.x, 0, h.z), Quaternion.Euler(0, h.rotY, 0))
                          ?? Gubuk(h.nama, akar, h.x, h.z, h.rotY, 3.2f, 1.4f, 2.4f, Langit, Mint);
                obj.name = h.nama;
                Titik("Titik " + h.nama, obj.transform, new Vector3(0, 0, 0.9f), "naikAngkot", "🚐 Naik Angkot", 1.6f, null, null, true, h.id);
            }
            var gr = d.gerobak;
            var gerobak = Model("prop_gerobak", akar, new Vector3(gr.x, 0, gr.z), Quaternion.Euler(0, gr.rotY, 0))
                          ?? Gubuk("Gerobak Nasgor", akar, gr.x, gr.z, gr.rotY, 1.8f, 1f, 1.9f, Oranye, Kuning);
            Titik("Titik Gerobak", gerobak.transform, new Vector3(0, 0, 1.2f), "gerobakNasgor", "🍳 Nasi Goreng", 1.6f, null, null, true);

            var pm = new Vector3(d.pertamini.x, 0, d.pertamini.z);
            if (Model("prop_pertamini", akar, pm, Quaternion.identity) == null)
                Kotak("Pertamini", akar, pm + Vector3.up * 0.8f, new Vector3(0.6f, 1.6f, 0.5f), Bata);
            Titik("Titik Pertamini", akar, pm, "isiBensin", "⛽ Isi Bensin", 1.8f, "bukaBengkel", "🔧 Bengkel");

            var bd = new Vector3(d.bendera.x, 0, d.bendera.z);
            if (Model("prop_bendera", akar, bd, Quaternion.identity) == null)
                Silinder("Tiang Bendera", akar, bd + Vector3.up * 3f, new Vector3(0.1f, 3f, 0.1f), Putih);

            foreach (var g in d.gapura)
            {
                var pos = new Vector3(g.x, 0, g.z);
                if (Model("prop_gapura", akar, pos, Quaternion.identity) != null) continue;
                var go = Grup("Gapura " + g.teks, akar); go.localPosition = pos;
                foreach (var sx in new[] { -d.gapuraTiang, d.gapuraTiang })
                    Kotak("Tiang", go, new Vector3(sx, 1.5f, 0), new Vector3(0.4f, 3f, 0.4f), Bata);
                Hiasan("Balok", go, new Vector3(0, 3.2f, 0), new Vector3(d.gapuraTiang * 2 + 0.6f, 0.5f, 0.3f), Putih);
            }
            var ma = d.menaraAir;
            var mPos = new Vector3(ma.x, 0, ma.z);
            if (Model("prop_menara_air", akar, mPos, Quaternion.identity) == null)
            {
                Silinder("Menara Air", akar, mPos + Vector3.up * (ma.tinggi / 2), new Vector3(0.5f, ma.tinggi / 2, 0.5f), Besi);
                Silinder("Tangki Air", akar, mPos + Vector3.up * (ma.tinggi + 0.8f), new Vector3(2.4f, 0.8f, 2.4f), Langit);
            }
            foreach (var m in d.motor)
            {
                var rot = Quaternion.Euler(0, m.rotY, 0);
                if (Model("prop_motor", akar, new Vector3(m.x, 0, m.z), rot) == null)
                    Kotak("Motor Parkir", akar, new Vector3(m.x, 0.45f, m.z), new Vector3(0.5f, 0.9f, 1.6f), Bata).transform.rotation = rot;
            }
        }

        static void Pohon(string model, Transform induk, TitikSkala p, Color daun, float tinggiBatang)
        {
            var pos = new Vector3(p.x, 0, p.z);
            var rot = Quaternion.Euler(0, Mathf.Abs(p.x * 37f + p.z * 11f) % 360f, 0); // variasi putar tetap
            var m = Model(model, induk, pos, rot);
            if (m == null && model != "prop_pohon") m = Model("prop_pohon", induk, pos, rot);
            if (m != null) { m.transform.localScale = Vector3.one * p.s; return; }
            float s = p.s;
            Silinder("Pohon", induk, pos + Vector3.up * (tinggiBatang / 2 * s), new Vector3(0.35f * s, tinggiBatang / 2 * s, 0.35f * s), Batang);
            Bola("Daun", induk, pos + Vector3.up * ((tinggiBatang + 0.9f) * s), Vector3.one * 2.4f * s, daun);
        }

        // ---------- Inti, pemain, kamera, HUD (pola KamarKos) ----------
        static void BuatIntiPemainKamera(DataDunia d)
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

            var posSpawn = new Vector3(d.spawn.x, 0, d.spawn.z);
            var rotSpawn = Quaternion.Euler(0, d.spawn.rotY, 0);
            var pemain = Model("kar_mahasiswa", null, posSpawn, rotSpawn);
            if (pemain == null)
            {
                pemain = new GameObject("Pemain");
                pemain.transform.SetPositionAndRotation(posSpawn, rotSpawn);
                // Chibi placeholder: badan kapsul kecil + kepala besar
                var badan = Primitif(PrimitiveType.Capsule, "Badan", pemain.transform, new Vector3(0, 0.45f, 0), new Vector3(0.5f, 0.45f, 0.5f), Oranye);
                var kepala = Primitif(PrimitiveType.Sphere, "Kepala", pemain.transform, new Vector3(0, 1.15f, 0), Vector3.one * 0.7f, Kulit);
                Object.DestroyImmediate(badan.GetComponent<Collider>());
                Object.DestroyImmediate(kepala.GetComponent<Collider>());
            }
            pemain.name = "Pemain";
            pemain.tag = "Player"; // dicari WargaJalan (FindWithTag)
            var cc = pemain.AddComponent<CharacterController>();
            cc.height = 1.5f; cc.radius = 0.3f; cc.center = new Vector3(0, 0.75f, 0);
            pemain.AddComponent<InputPemain>();
            pemain.AddComponent<GerakPemain>();
            pemain.AddComponent<InteraksiPemain>();

            // Motor milik pemain di parkiran kos (bukan statis, bisa dipindah saat parkir)
            var pk = d.parkirMotor;
            var motorSaya = Model("prop_motor", null, new Vector3(pk.x, 0, pk.z), Quaternion.Euler(0, pk.rotY, 0));
            if (motorSaya == null)
            {
                motorSaya = new GameObject("Motor (placeholder)");
                motorSaya.transform.SetPositionAndRotation(new Vector3(pk.x, 0, pk.z), Quaternion.Euler(0, pk.rotY, 0));
                Kotak("Badan Motor", motorSaya.transform, new Vector3(0, 0.45f, 0), new Vector3(0.45f, 0.6f, 1.5f), Oranye);
            }
            motorSaya.name = "Motor Saya";
            Titik("Titik Motor", motorSaya.transform, new Vector3(0, 0, 0), "naikMotor", "🛵 Naik Motor", 1.6f, "narikOjol", "📦 Narik Ojol", true);
            var motorNaik = Model("prop_motor", pemain.transform, pemain.transform.position, pemain.transform.rotation);
            if (motorNaik != null) { motorNaik.name = "Motor Naik"; motorNaik.SetActive(false); }
            var mp = pemain.AddComponent<MotorPemain>();
            mp.motorParkir = motorSaya; mp.motorNaik = motorNaik;

            var kam = new GameObject("Main Camera") { tag = "MainCamera" };
            var camera = kam.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = Langit;
            camera.fieldOfView = 40f;
            camera.farClipPlane = 300f;
            kam.AddComponent<AudioListener>();
            var iso = kam.AddComponent<KameraIsometric>();
            var soKam = new SerializedObject(iso);
            soKam.FindProperty("target").objectReferenceValue = pemain.transform;
            soKam.ApplyModifiedPropertiesWithoutUndo();
            // Kamera di selatan (-Z) menghadap utara (+Z) → peta tampil seperti peta web (utara di atas)
            kam.transform.position = posSpawn + new Vector3(0, 9, -9);
            kam.transform.LookAt(posSpawn + new Vector3(0, 0.8f, 0));

            var prefabHud = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/_Game/Prefabs/UI/HUD_Kamar.prefab");
            if (prefabHud != null) PrefabUtility.InstantiatePrefab(prefabHud);
            else new GameObject("HUD").AddComponent<HudKamar>();
        }

        // ---------- Warga bernama (fitur3.json warga <-> NPC_JALUR web, urutan SAMA) ----------
        [System.Serializable] public class DataWarga { public string id, nama, ikon; }
        [System.Serializable] public class DataFitur3 { public DataWarga[] warga; }

        struct JalurWarga
        {
            public float[] xz; public string baju; public float kecepatan;
            public JalurWarga(string baju, float kecepatan, params float[] xz) { this.xz = xz; this.baju = baju; this.kecepatan = kecepatan; }
        }

        // Salinan NPC_JALUR (src/game/duniaLayout.ts) dalam koordinat WEB [x, z, x, z, ...].
        // Diubah ke Unity seperti ekspor-dunia.mts: zUnity = -zWeb.
        static readonly JalurWarga[] NpcJalur =
        {
            new JalurWarga("#ff9aa2", 1.5f, 3.5f, -2.4f, 29f, -2.4f),
            new JalurWarga("#a0c4ff", 1.3f, -29f, -2.4f, -3.5f, -2.4f),
            new JalurWarga("#bdb2ff", 1.3f, -3.5f, 2.4f, -29f, 2.4f),
            new JalurWarga("#caffbf", 1.6f, 2.4f, 3.5f, 2.4f, 22.5f),
            new JalurWarga("#ffd6a5", 1.1f, 18.5f, 9f, 26.5f, 9f, 26.5f, 18f, 18.5f, 18f),
            new JalurWarga("#a0c4ff", 1.4f, 8f, -4.5f, 24f, -4.5f),
            new JalurWarga("#ff9aa2", 1.4f, -58f, -23.6f, -34.5f, -23.6f),
            new JalurWarga("#bdb2ff", 1.2f, 34.5f, 23.6f, 58f, 23.6f),
            new JalurWarga("#ffd6a5", 1.5f, -29.6f, -22.5f, -29.6f, -3.5f),
            new JalurWarga("#caffbf", 1.3f, 34.4f, 3.5f, 34.4f, 22.5f),
            new JalurWarga("#e9605a", 2.6f, 37.5f, 5.8f, 56.5f, 5.8f, 56.5f, 20.3f, 37.5f, 20.3f),
            new JalurWarga("#a0c4ff", 1.4f, -3.5f, -29.4f, -29f, -29.4f),
            new JalurWarga("#ff9aa2", 1.2f, 3.5f, -29.4f, 29f, -29.4f),
        };

        static void BuatWarga()
        {
            var teks = AssetDatabase.LoadAssetAtPath<TextAsset>(FolderData + "fitur3.json");
            var data = teks != null ? JsonUtility.FromJson<DataFitur3>(teks.text) : null;
            if (data == null || data.warga == null) { Debug.LogWarning("[MS] fitur3.json/warga tidak ada - warga tidak dibuat."); return; }
            var akar = Grup("Warga", null);
            int n = Mathf.Min(data.warga.Length, NpcJalur.Length);
            if (data.warga.Length != NpcJalur.Length)
                Debug.LogWarning($"[MS] Jumlah warga fitur3.json ({data.warga.Length}) beda dengan NPC_JALUR ({NpcJalur.Length}).");
            for (int i = 0; i < n; i++)
            {
                var w = data.warga[i];
                var j = NpcJalur[i];
                var jalur = new Vector3[j.xz.Length / 2];
                for (int k = 0; k < jalur.Length; k++) jalur[k] = new Vector3(j.xz[k * 2], 0, -j.xz[k * 2 + 1]);

                var root = Grup("Warga " + w.nama, akar);
                var arah = jalur[1] - jalur[0];
                root.SetPositionAndRotation(jalur[0], Quaternion.LookRotation(arah.sqrMagnitude > 0 ? arah : Vector3.forward));
                var baju = PembacaDunia.Warna(j.baju, Oranye);

                var wj = root.gameObject.AddComponent<WargaJalan>();
                wj.jalur = jalur;
                wj.kecepatan = j.kecepatan;

                var modelKhusus = Model("kar_warga_" + w.id, root, root.position, root.rotation);
                var model = modelKhusus != null ? modelKhusus : Model("kar_mahasiswa", root, root.position, root.rotation);
                if (model != null)
                {
                    // Collider kotak dari helper Model dibuang; diganti kapsul di root (warga bergerak)
                    foreach (var c in model.GetComponentsInChildren<Collider>()) Object.DestroyImmediate(c);
                    // Warna baju dikalikan ke tekstur palet: pastel dicampur 50% ke putih agar tekstur tetap terlihat.
                    // MaterialPropertyBlock tidak tersimpan di scene, jadi dipasang WargaJalan saat Start.
                    if (modelKhusus == null)
                    {
                        wj.rendererBaju = model.GetComponentsInChildren<Renderer>();
                        wj.warnaBaju = Color.Lerp(baju, Color.white, 0.5f);
                    }
                }
                else
                {
                    // Placeholder chibi: kapsul baju + kepala besar
                    var badan = Primitif(PrimitiveType.Capsule, "Badan", root, new Vector3(0, 0.45f, 0), new Vector3(0.5f, 0.45f, 0.5f), baju);
                    var kepala = Primitif(PrimitiveType.Sphere, "Kepala", root, new Vector3(0, 1.15f, 0), Vector3.one * 0.7f, Kulit);
                    Object.DestroyImmediate(badan.GetComponent<Collider>());
                    Object.DestroyImmediate(kepala.GetComponent<Collider>());
                }
                var kap = root.gameObject.AddComponent<CapsuleCollider>();
                kap.height = 1.5f; kap.radius = 0.3f; kap.center = new Vector3(0, 0.75f, 0);
                var rb = root.gameObject.AddComponent<Rigidbody>();
                rb.isKinematic = true; rb.useGravity = false; // collider bergerak tanpa simulasi fisika

                var t = Titik("Titik Ngobrol", root, Vector3.zero, "ngobrolWarga", "💬 " + w.nama, 1.6f, "menuWarga", "💗 Lainnya", true, w.id);
                t.targetTambahan = w.id;
            }
        }

        /// <summary>Foto seluruh peta dari atas ke PNG (cek visual lewat batchmode). Argumen: -fotoKe path.png</summary>
        public static void Foto()
        {
            string ke = "foto-kampung.png";
            var args = System.Environment.GetCommandLineArgs();
            for (int i = 0; i < args.Length - 1; i++) if (args[i] == "-fotoKe") ke = args[i + 1];
            EditorSceneManager.OpenScene(PathScene);
            var cam = Camera.main;
            // Kamera tinggi, sedikit miring dari selatan, agar seluruh peta 168 × 124 m terlihat
            cam.transform.position = new Vector3(0, 165f, -75f);
            cam.transform.LookAt(Vector3.zero);
            cam.farClipPlane = 500f;
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

        static Transform Grup(string nama, Transform induk)
        {
            var t = new GameObject(nama).transform;
            if (induk != null) t.SetParent(induk, false);
            return t;
        }

        static GameObject Model(string nama, Transform induk, Vector3 posisi, Quaternion rotasi)
        {
            FbxDicari.Add(nama);
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

        // Titik interaksi. lokal=false → `pos` posisi dunia (anak dari induk tanpa skala).
        static TitikInteraksi Titik(string nama, Transform induk, Vector3 pos, string id, string label, float radius = 1.6f,
                          string id2 = null, string label2 = null, bool lokal = false, string target = null)
        {
            var go = new GameObject(nama);
            go.transform.SetParent(induk, false);
            if (lokal) go.transform.localPosition = pos; else go.transform.position = pos;
            var t = go.AddComponent<TitikInteraksi>();
            t.idAksi = id; t.nama = label; t.radius = radius; t.idAksiTambahan = id2; t.namaTambahan = label2; t.target = target;
            return t;
        }

        // Tandai benda diam sebagai statis (static batching + occlusion culling)
        static void TandaiStatis(GameObject akar)
        {
            const StaticEditorFlags flag = StaticEditorFlags.BatchingStatic | StaticEditorFlags.OccluderStatic
                                         | StaticEditorFlags.OccludeeStatic | StaticEditorFlags.ContributeGI;
            foreach (var t in akar.GetComponentsInChildren<Transform>(true))
                GameObjectUtility.SetStaticEditorFlags(t.gameObject, flag);
        }

        // Lantai datar (jalan, sawah, dst.) tanpa collider; pos.y = dasar
        static void Datar(string nama, Transform induk, Vector3 pos, Vector2 ukuran, Color warna, float tebal)
        {
            var go = Kotak(nama, induk, pos + Vector3.up * (tebal / 2), new Vector3(ukuran.x, tebal, ukuran.y), warna);
            Object.DestroyImmediate(go.GetComponent<Collider>());
        }

        static void DatarKotak(string nama, Transform induk, Kotak2D k, Color warna, float tebal)
            => Datar(nama, induk, new Vector3((k.minX + k.maxX) / 2, 0, (k.minZ + k.maxZ) / 2), new Vector2(k.maxX - k.minX, k.maxZ - k.minZ), warna, tebal);

        // Kotak hiasan tanpa collider (pintu, jendela, atap tonjol)
        static void Hiasan(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Object.DestroyImmediate(Kotak(nama, induk, pos, skala, warna).GetComponent<Collider>());

        static GameObject Kotak(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Primitif(PrimitiveType.Cube, nama, induk, pos, skala, warna);

        static GameObject Silinder(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Primitif(PrimitiveType.Cylinder, nama, induk, pos, skala, warna);

        static void Bola(string nama, Transform induk, Vector3 pos, Vector3 skala, Color warna)
            => Object.DestroyImmediate(Primitif(PrimitiveType.Sphere, nama, induk, pos, skala, warna).GetComponent<Collider>());

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

        // Satu material per warna (dipakai bersama → static batching efektif), disimpan di folder scene sendiri
        static Material Bahan(Color warna)
        {
            string path = $"{FolderBahan}/Warna_{ColorUtility.ToHtmlStringRGB(warna)}.mat";
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat != null) return mat;
            mat = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            mat.SetColor("_BaseColor", warna);
            mat.SetFloat("_Smoothness", 0.1f); // kasar = kesan kartun
            AssetDatabase.CreateAsset(mat, path);
            return mat;
        }
    }
}
