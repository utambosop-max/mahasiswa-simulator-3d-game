using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

namespace MS.Dunia
{
    public sealed class PenampilanMahasiswa : MonoBehaviour
    {
        const string Folder = "Penampilan/";
        static readonly string[] rambut = { "rambut_short01", "rambut_bob01", "rambut_long01" };
        static readonly Color[] kulit = { Color.white, new(.89f, .75f, .64f), new(.72f, .53f, .42f), new(.57f, .39f, .30f) };
        static readonly Color[] baju = { Color.white, new(.61f, .72f, .93f), new(.64f, .83f, .71f), new(.94f, .62f, .53f) };
        readonly List<Material> material = new();
        SkinnedMeshRenderer tubuh;
        int lebar = -1, sempit = -1, kedip = -1, bicara = -1, senyum = -1;
        float kedipLagi;
        bool siap;
        public static string Figur(int indeks) => indeks == 1 ? "mahasiswi" : "mahasiswa";
        public static GameObject Muat(string id) => Resources.Load<GameObject>(Folder + id);

        public void Atur(RupaMahasiswa rupa, string id)
        {
            bool hdrp = TampilanHdrp.Aktif;
            foreach (var renderer in GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var daftar = renderer.sharedMaterials;
                for (int i = 0; i < daftar.Length; i++)
                {
                    string nama = daftar[i] != null ? daftar[i].name.Split('.')[0] : "";
                    if (nama.Length == 0) continue;
                    bool rambutKepala = nama.StartsWith("rambut_", StringComparison.Ordinal);
                    bool kulitTubuh = nama.StartsWith("kulit_", StringComparison.Ordinal);
                    bool potong = rambutKepala || nama is "alis" or "bulu_mata";
                    if (rambutKepala && rupa != null)
                        renderer.enabled = nama == rambut[Mathf.Clamp(rupa.Rambut, 0, rambut.Length - 1)];
                    var tekstur = Resources.Load<Texture2D>(Folder + "Tekstur/" + nama);
                    var bahan = siap ? daftar[i] : hdrp ? new Material(Resources.Load<Material>(kulitTubuh ? "Hdrp/Kulit" : potong ? "Hdrp/KartuRambut" : "Hdrp/Lit"))
                        : new Material(Shader.Find("Universal Render Pipeline/Lit"));
                    if (!siap) material.Add(bahan);
                    bahan.name = nama;
                    bahan.mainTexture = tekstur;
                    if (hdrp) bahan.SetTexture("_BaseColorMap", tekstur);
                    Color warna = nama switch
                    {
                        "hijab_ratna" => new Color(.53f, .37f, .65f),
                        "hijab_alya" => new Color(.25f, .52f, .49f),
                        "hijab_yanti" => new Color(.72f, .43f, .30f),
                        _ => kulitTubuh ? kulit[Mathf.Clamp(rupa?.Kulit ?? WarnaWarga(id), 0, kulit.Length - 1)]
                        : nama.StartsWith("baju_", StringComparison.Ordinal) ? baju[Mathf.Clamp(rupa?.Baju ?? WarnaWarga(id), 0, baju.Length - 1)]
                        : Color.white
                    };
                    bahan.color = warna;
                    bahan.SetFloat("_Smoothness", nama == "mata" ? .83f : kulitTubuh ? .39f : rambutKepala ? .45f : .25f);
                    if (!hdrp && potong)
                    {
                        bahan.SetFloat("_AlphaClip", 1f);
                        bahan.SetFloat("_Cutoff", .28f);
                        bahan.SetFloat("_Cull", 0f);
                        bahan.EnableKeyword("_ALPHATEST_ON");
                        bahan.renderQueue = (int)RenderQueue.AlphaTest;
                    }
                    daftar[i] = bahan;
                }
                renderer.sharedMaterials = daftar;
                var mesh = renderer.sharedMesh;
                if (mesh == null || mesh.blendShapeCount == 0) continue;
                tubuh = renderer;
                lebar = CariBentuk(mesh, "WajahLebar");
                sempit = CariBentuk(mesh, "WajahSempit");
                kedip = CariBentuk(mesh, "Kedip");
                bicara = CariBentuk(mesh, "Bicara");
                senyum = CariBentuk(mesh, "Senyum");
            }
            Bentuk(lebar, Mathf.Max(0, rupa?.Wajah ?? 0) * 100);
            Bentuk(sempit, Mathf.Max(0, -(rupa?.Wajah ?? 0)) * 100);
            if (!siap)
            {
                kedipLagi = Time.unscaledTime + UnityEngine.Random.Range(2f, 4f);
                Bentuk(kedip, 0);
                Bentuk(bicara, 0);
                Bentuk(senyum, 0);
            }
            siap = true;
        }

        static int CariBentuk(Mesh mesh, string nama)
        {
            for (int i = 0; i < mesh.blendShapeCount; i++)
                if (mesh.GetBlendShapeName(i).EndsWith(nama, StringComparison.Ordinal)) return i;
            return -1;
        }

        static int WarnaWarga(string id) => id switch
        {
            "bima" or "yanti" or "dina" => 2,
            "ratna" or "reno" => 3,
            "alya" or "hendra" or "tari" => 1,
            _ => 0
        };

        public void Ekspresi(bool berbicara)
        {
            float selisih = Time.unscaledTime - kedipLagi;
            Bentuk(kedip, selisih >= 0f ? Mathf.Clamp01(1f - Mathf.Abs(selisih - .085f) / .085f) * 100f : 0f);
            if (selisih >= .17f) kedipLagi = Time.unscaledTime + UnityEngine.Random.Range(2.5f, 5f);
            Bentuk(bicara, berbicara ? (Mathf.Sin(Time.unscaledTime * 24f) + 1f) * 18f : 0f);
            Bentuk(senyum, berbicara ? 20f : 0f);
        }

        void Bentuk(int indeks, float berat)
        {
            if (indeks >= 0 && tubuh != null) tubuh.SetBlendShapeWeight(indeks, berat);
        }

        public static void PoseSantai(Animator animator, float ayun = 0)
        {
            var basis = animator.transform;
            Lengan(animator, HumanBodyBones.LeftUpperArm, HumanBodyBones.LeftLowerArm,
                basis.TransformDirection(new Vector3(-.16f, -1, ayun)));
            Lengan(animator, HumanBodyBones.RightUpperArm, HumanBodyBones.RightLowerArm,
                basis.TransformDirection(new Vector3(.16f, -1, -ayun)));
        }

        static void Lengan(Animator animator, HumanBodyBones atas, HumanBodyBones bawah, Vector3 arah)
        {
            var bahu = animator.GetBoneTransform(atas);
            var siku = animator.GetBoneTransform(bawah);
            if (bahu == null || siku == null) return;
            bahu.rotation = Quaternion.FromToRotation(siku.position - bahu.position, arah) * bahu.rotation;
        }

        void OnDestroy()
        {
            foreach (var bahan in material) Destroy(bahan);
        }
    }
}
