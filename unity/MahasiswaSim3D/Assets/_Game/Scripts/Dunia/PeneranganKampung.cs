using System.Collections.Generic;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class PeneranganKampung : MonoBehaviour
    {
        readonly List<Material> plang = new();
        Material lampuTanah;
        Mesh bidang;
        Texture2D mask;
        GameObject sorot;
        Material kacaTerang;

        public Material Kaca(Material dasar)
        {
            if (kacaTerang != null) return kacaTerang;
            var template = Resources.Load<Material>("Fasad/LitBercahaya");
            kacaTerang = template != null ? new Material(template) : new Material(dasar);
            kacaTerang.mainTexture = null;
            kacaTerang.color = dasar.color;
            kacaTerang.SetFloat("_Metallic", .23f);
            kacaTerang.SetFloat("_Smoothness", .86f);
            kacaTerang.EnableKeyword("_EMISSION");
            kacaTerang.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            return kacaTerang;
        }

        public void TambahPlang(Material bahan, Texture2D peta)
        {
            if (peta == null) return;
            bahan.SetTexture("_EmissionMap", peta);
            bahan.EnableKeyword("_EMISSION");
            bahan.globalIlluminationFlags = MaterialGlobalIlluminationFlags.None;
            plang.Add(bahan);
        }

        public void PasangSorot(Transform induk, List<Vector3> bohlam)
        {
            if (bohlam.Count == 0) return;
            var shader = Shader.Find("Sprites/Default");
            if (shader == null) return;
            const int sisi = 32;
            mask = new Texture2D(sisi, sisi, TextureFormat.RGBA32, false);
            mask.wrapMode = TextureWrapMode.Clamp;
            var piksel = new Color32[sisi * sisi];
            for (int y = 0; y < sisi; y++)
                for (int x = 0; x < sisi; x++)
                {
                    var p = new Vector2((x + .5f) / sisi * 2 - 1, (y + .5f) / sisi * 2 - 1);
                    float lembut = 1f - Mathf.Clamp01(p.magnitude);
                    piksel[y * sisi + x] = new Color32(250, 186, 86, (byte)(105 * lembut * lembut));
                }
            mask.SetPixels32(piksel);
            mask.Apply(false, true);
            lampuTanah = new Material(shader) { mainTexture = mask };
            var titik = new List<Vector3>(bohlam.Count * 4);
            var indices = new List<int>(bohlam.Count * 6);
            var uv = new List<Vector2>(bohlam.Count * 4);
            foreach (var sumber in bohlam)
            {
                var pusat = new Vector3(sumber.x,.045f,sumber.z);
                int mulai = titik.Count;
                titik.Add(pusat + new Vector3(-2.25f,0,-2.25f));
                titik.Add(pusat + new Vector3(-2.25f,0,2.25f));
                titik.Add(pusat + new Vector3(2.25f,0,2.25f));
                titik.Add(pusat + new Vector3(2.25f,0,-2.25f));
                uv.Add(Vector2.zero); uv.Add(Vector2.up); uv.Add(Vector2.one); uv.Add(Vector2.right);
                indices.Add(mulai); indices.Add(mulai+1); indices.Add(mulai+2);
                indices.Add(mulai); indices.Add(mulai+2); indices.Add(mulai+3);
            }
            bidang = new Mesh { name = "Cahaya lampu jalan" };
            bidang.SetVertices(titik);
            bidang.SetUVs(0,uv);
            bidang.SetTriangles(indices,0);
            bidang.RecalculateBounds();
            sorot = new GameObject("Sorot lampu jalan");
            sorot.transform.SetParent(induk,false);
            sorot.AddComponent<MeshFilter>().sharedMesh = bidang;
            var renderer = sorot.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = lampuTanah;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            sorot.SetActive(false);
        }

        public void Atur(bool malam)
        {
            if (kacaTerang != null)
            {
                kacaTerang.SetColor("_BaseColor", malam ? new Color(.66f,.43f,.20f) : new Color(.21f,.27f,.28f));
                kacaTerang.SetColor("_EmissionColor", malam ? new Color(1f,.61f,.27f)*1.35f : Color.black);
            }
            foreach (var bahan in plang)
                bahan.SetColor("_EmissionColor", malam ? Color.white * .92f : Color.black);
            if (sorot != null) sorot.SetActive(malam);
        }

        void OnDestroy()
        {
            if (bidang != null) Destroy(bidang);
            if (mask != null) Destroy(mask);
            if (lampuTanah != null) Destroy(lampuTanah);
            if (kacaTerang != null) Destroy(kacaTerang);
        }
    }
}
