using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.Animations;
using UnityEngine.Playables;
using UnityEngine.SceneManagement;

namespace MS.Dunia
{
    internal sealed class KarakterRealistis : MonoBehaviour
    {
        static readonly string[] NamaKlip =
        {
            "Idle", "Walking", "Running", "Sitting_Idle", "Sleeping_Idle", "Drinking", "Talking", "Waving"
        };
        static AnimationClip[] klip;
        static readonly GameObject[] model = new GameObject[6];
        static readonly Dictionary<(Material, int), Material> bahan = new();
        static readonly Color[] warnaBaju = { Color.white, new(.64f, .80f, .98f), new(.63f, .81f, .64f), new(.93f, .65f, .52f) };

        bool pemain;
        int pilihan;
        int keadaan = -1;
        int pose;
        int warnaTerakhir = -1;
        float tahan;
        Vector3 posisiLalu;
        IPenerimaAksi layanan;
        Renderer[] bawaan;
        GameObject tampilan;
        PlayableGraph graf;
        AnimationPlayableOutput hasil;
        AnimationClipPlayable gerak;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void AturUlang()
        {
            klip = null;
            Array.Clear(model, 0, model.Length);
            bahan.Clear();
            SceneManager.sceneLoaded -= Siapkan;
            SceneManager.sceneLoaded += Siapkan;
        }

        static void Siapkan(Scene scene, LoadSceneMode mode)
        {
            if (scene.name != "Kampung" && scene.name != "KamarKos" && !scene.name.StartsWith("Gedung_", StringComparison.Ordinal)) return;
            if (klip == null)
            {
                klip = new AnimationClip[NamaKlip.Length];
                for (int i = 0; i < klip.Length; i++)
                    foreach (var calon in Resources.LoadAll<AnimationClip>("Karakter/anim_" + NamaKlip[i]))
                        if (calon.length > 0 && !calon.name.StartsWith("__preview__", StringComparison.Ordinal))
                        {
                            klip[i] = calon;
                            break;
                        }
                for (int i = 0; i < model.Length; i++)
                    model[i] = Resources.Load<GameObject>("Karakter/kar_" + (i + 1));
            }
            if (klip[0] == null || klip[1] == null) return;

            var utama = GameObject.Find("Pemain");
            if (utama != null) utama.AddComponent<KarakterRealistis>().pemain = true;
            int nomor = 0;
            foreach (var warga in FindObjectsByType<WargaJalan>(FindObjectsSortMode.InstanceID))
            {
                if (warga.gameObject.scene != scene || nomor >= 19) continue;
                warga.gameObject.AddComponent<KarakterRealistis>().pilihan = (++nomor % model.Length);
            }
            if (nomor == 0)
                foreach (var akar in scene.GetRootGameObjects())
                    if (akar.name.StartsWith("Ruang ", StringComparison.Ordinal))
                        foreach (Transform anak in akar.transform)
                            if (anak.name.StartsWith("Penjaga ", StringComparison.Ordinal) ||
                                anak.name.StartsWith("kar_penjaga_", StringComparison.Ordinal))
                                anak.gameObject.AddComponent<KarakterRealistis>().pilihan = Math.Abs(anak.name.GetHashCode() % model.Length);
        }

        void Start()
        {
            posisiLalu = transform.position;
            bawaan = GetComponentsInChildren<Renderer>(true);
            pilihan = pemain ? Mathf.Clamp(PlayerPrefs.GetInt("KarakterRealistis", 1), 0, 5) : pilihan;
            PasangModel();
        }

        void PasangModel()
        {
            var sumber = model[pilihan];
            var avatar = sumber != null ? sumber.GetComponent<Animator>()?.avatar : null;
            if (avatar == null || !avatar.isValid || !avatar.isHuman) return;
            if (graf.IsValid()) graf.Destroy();
            if (tampilan != null) Destroy(tampilan);
            keadaan = -1;
            tampilan = Instantiate(sumber, transform);
            tampilan.name = "Model humanoid";
            tampilan.transform.SetLocalPositionAndRotation(Vector3.zero, Quaternion.identity);
            var animator = tampilan.GetComponent<Animator>();
            animator.applyRootMotion = false;
            animator.cullingMode = AnimatorCullingMode.CullCompletely;
            var renderer = tampilan.GetComponentsInChildren<SkinnedMeshRenderer>();
            var bounds = new Bounds(tampilan.transform.position, Vector3.zero);
            foreach (var item in renderer)
            {
                bounds.Encapsulate(item.bounds);
                var material = item.sharedMaterials;
                for (int i = 0; i < material.Length; i++)
                    if (material[i] != null) material[i] = BahanUntuk(material[i], pilihan);
                item.sharedMaterials = material;
            }
            if (bounds.size.y > .02f)
                tampilan.transform.localScale *= 1.63f / bounds.size.y;
            var lod = tampilan.AddComponent<LODGroup>();
            lod.SetLODs(new[] { new LOD(.045f, renderer) });
            lod.RecalculateBounds();
            foreach (var item in bawaan)
                if (item != null && !BagianMotor(item.transform)) item.enabled = false;

            graf = PlayableGraph.Create("Gerak humanoid");
            hasil = AnimationPlayableOutput.Create(graf, "Karakter", animator);
            graf.Play();
            warnaTerakhir = -1;
        }

        bool BagianMotor(Transform bagian)
        {
            for (; bagian != null && bagian != transform; bagian = bagian.parent)
                if (bagian.name == "Motor Naik") return true;
            return false;
        }

        static Material BahanUntuk(Material asal, int nomor)
        {
            if (bahan.TryGetValue((asal, nomor), out var hasil)) return hasil;
            var nama = asal.name.ToLowerInvariant();
            bool potong = nama.Contains("eyelash") || nama.Contains("brows") || nama.Contains("_eyes") ||
                nama.Contains("_mouth") || (nama.Contains("hair") && nomor != 1);
            var acuan = potong ? Resources.Load<Material>("Tanaman/potted_plant_01/MaterialDaun") : null;
            hasil = acuan != null ? new Material(acuan) : new Material(Shader.Find("Universal Render Pipeline/Lit"));
            hasil.name = asal.name;
            if (asal.HasProperty("_Color")) hasil.color = asal.GetColor("_Color");
            else if (asal.HasProperty("_BaseColor")) hasil.color = asal.GetColor("_BaseColor");
            var tekstur = Resources.Load<Texture2D>($"Karakter/Pakaian/kar_{nomor + 1}/{nama}");
            hasil.mainTexture = tekstur != null ? tekstur : asal.mainTexture;
            if (tekstur != null) hasil.color = Color.white;
            if (potong) hasil.SetFloat("_Cutoff", .27f);
            hasil.SetFloat("_Smoothness", .24f);
            bahan.Add((asal, nomor), hasil);
            return hasil;
        }

        void LateUpdate()
        {
            if (pemain)
            {
                var pilih = Mathf.Clamp(PlayerPrefs.GetInt("KarakterRealistis", 1), 0, 5);
                if (pilih != pilihan)
                {
                    pilihan = pilih;
                    PasangModel();
                }
                int warna = Mathf.Clamp(PlayerPrefs.GetInt("BajuRealistis", 0), 0, warnaBaju.Length - 1);
                if (warna != warnaTerakhir && tampilan != null)
                {
                    warnaTerakhir = warna;
                    TerapkanBaju(warnaBaju[warna]);
                }
                if (!ReferenceEquals(layanan, Layanan.Aksi))
                {
                    if (layanan != null) layanan.AksiMulai -= SaatAksi;
                    layanan = Layanan.Aksi;
                    if (layanan != null) layanan.AksiMulai += SaatAksi;
                }
            }
            if (!graf.IsValid() || !tampilan.activeInHierarchy) return;
            var delta = transform.position - posisiLalu;
            posisiLalu = transform.position;
            delta.y = 0;
            float laju = delta.magnitude / Mathf.Max(.001f, Time.deltaTime);
            int tujuan = pemain && Layanan.Kendaraan?.NaikMotor == true ? 3
                : Time.time < tahan || (pemain && pose != 0 && Layanan.Jam?.Sibuk == true) ? pose
                : laju > 4.2f ? 2 : laju > .2f ? 1 : 0;
            if (klip[tujuan] == null) tujuan = 0;
            if (tujuan != keadaan)
            {
                keadaan = tujuan;
                if (gerak.IsValid()) graf.DestroyPlayable(gerak);
                gerak = AnimationClipPlayable.Create(graf, klip[tujuan]);
                hasil.SetSourcePlayable(gerak);
            }
            if (gerak.GetTime() >= klip[tujuan].length)
                gerak.SetTime(gerak.GetTime() % klip[tujuan].length);
        }

        void TerapkanBaju(Color warna)
        {
            var blok = new MaterialPropertyBlock();
            foreach (var mesh in tampilan.GetComponentsInChildren<SkinnedMeshRenderer>())
            {
                var daftar = mesh.sharedMaterials;
                for (var i = 0; i < daftar.Length; i++)
                {
                    var nama = daftar[i]?.name.ToLowerInvariant();
                    if (nama == null || (!nama.Contains("shirt") && !nama.Contains("cloth") &&
                        !nama.Contains("jacket") && !nama.Contains("dress") && !nama.Contains("top") &&
                        !nama.Contains("upperbody"))) continue;
                    blok.SetColor("_BaseColor", daftar[i].color * warna);
                    mesh.SetPropertyBlock(blok, i);
                }
            }
        }

        void SaatAksi(string id)
        {
            pose = id switch
            {
                "tidur" or "tidurSiang" or "rebahan" => 4,
                "minum" or "seduhKopi" => 5,
                "belajar" or "nugas" or "kuliah" or "santaiTaman" => 3,
                "ngobrolWarga" or "ngobrolBuKos" => 6,
                "klakson" => 7,
                _ => id.StartsWith("makan", StringComparison.Ordinal) ? 5 : 0
            };
            tahan = Time.time + (pose == 0 ? 0f : 1.3f);
        }

        void OnDestroy()
        {
            if (layanan != null) layanan.AksiMulai -= SaatAksi;
            if (graf.IsValid()) graf.Destroy();
        }
    }
}
