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
        static readonly float[] tinggiBadan = { 1.69f, 1.60f, 1.70f, 1.64f, 1.66f, 1.61f };

        bool pemain;
        int pilihan;
        int keadaan = -1;
        int pose;
        int warnaTerakhir = -1;
        float tahan;
        Vector3 posisiLalu;
        Vector3 posisiBerdiri;
        Transform pinggul;
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
            if (tampilan != null && (pemain || GetComponent<WargaJalan>() == null))
                gameObject.AddComponent<BayanganKontak>().Pasang();
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
            var bounds = renderer.Length > 0 ? renderer[0].bounds : new Bounds(tampilan.transform.position, Vector3.zero);
            foreach (var item in renderer)
            {
                bounds.Encapsulate(item.bounds);
                var material = item.sharedMaterials;
                for (int i = 0; i < material.Length; i++)
                    if (material[i] != null) material[i] = BahanUntuk(material[i], pilihan);
                item.sharedMaterials = material;
            }
            if (bounds.size.y > .02f)
            {
                float skala = tinggiBadan[pilihan] / bounds.size.y;
                tampilan.transform.localScale *= skala;
                float jarakKaki = (bounds.min.y - transform.position.y) * skala;
                posisiBerdiri = new Vector3(0, -jarakKaki, 0);
                tampilan.transform.localPosition = posisiBerdiri;
            }
            pinggul = animator.GetBoneTransform(HumanBodyBones.Hips);
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
            bool kulit = nama.Contains("head") || nama.Contains("hands") || nama.Contains("skin") || nama.Contains("bodymat");
            bool rambut = nama.Contains("hair");
            if (hasil.mainTexture != null) hasil.color = kulit
                ? new Color(.91f, .87f, .83f) : new Color(.88f, .88f, .87f);
            if (potong) hasil.SetFloat("_Cutoff", .27f);
            hasil.SetFloat("_Smoothness", kulit ? .38f : rambut ? .31f : .18f);
            if (!kulit && !rambut) hasil.SetFloat("_SpecularHighlights", 0f);
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
            if (pemain) CocokkanPosisiMotor(tujuan == 3 && Layanan.Kendaraan?.NaikMotor == true);
        }

        void CocokkanPosisiMotor(bool naik)
        {
            var target = posisiBerdiri;
            if (naik && pinggul != null)
            {
                var posisiJok = new Vector3(0, .77f, -.23f);
                var posisiSekarang = transform.InverseTransformPoint(pinggul.position);
                var koreksi = tampilan.transform.localPosition + posisiJok - posisiSekarang;
                target = new Vector3(Mathf.Clamp(koreksi.x, -.15f, .15f),
                    Mathf.Clamp(koreksi.y, -.48f, .65f), Mathf.Clamp(koreksi.z, -.5f, .5f));
            }
            tampilan.transform.localPosition = Vector3.Lerp(tampilan.transform.localPosition, target,
                1f - Mathf.Exp(-15f * Time.deltaTime));
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
