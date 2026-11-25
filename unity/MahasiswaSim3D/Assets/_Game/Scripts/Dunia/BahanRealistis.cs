using System.Collections.Generic;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class BahanRealistis : MonoBehaviour
    {
        readonly Dictionary<(string, Color, Vector2), Material> bahan = new();

        public Material Ambil(string id, Color warna, Vector2 ubin)
        {
            var kunci = (id, warna, ubin);
            if (bahan.TryGetValue(kunci, out var hasil)) return hasil;
            hasil = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            hasil.name = id ?? "Aksen";
            hasil.color = warna;
            hasil.enableInstancing = true;
            hasil.SetFloat("_Smoothness", id == "Tiles074" ? .47f : .23f);
            if (id != null)
            {
                hasil.mainTexture = Resources.Load<Texture2D>("Bahan/" + id + "/warna");
                hasil.mainTextureScale = ubin;
                var normal = Resources.Load<Texture2D>("Bahan/" + id + "/normal");
                if (normal != null)
                {
                    hasil.SetTexture("_BumpMap", normal);
                    hasil.SetFloat("_BumpScale", .6f);
                    hasil.EnableKeyword("_NORMALMAP");
                }
                var arm = Resources.Load<Texture2D>("Bahan/" + id + "/arm");
                if (arm != null)
                {
                    hasil.SetTexture("_OcclusionMap", arm);
                    hasil.SetFloat("_OcclusionStrength", .25f);
                    hasil.SetTextureOffset("_OcclusionMap", Vector2.zero);
                    hasil.EnableKeyword("_OCCLUSIONMAP");
                }
            }
            bahan.Add(kunci, hasil);
            return hasil;
        }

        public void Permukaan(Transform objek, string id, Color warna, Vector2 ubin)
        {
            var renderer = objek != null ? objek.GetComponent<Renderer>() : null;
            if (renderer != null) renderer.sharedMaterial = Ambil(id, warna, ubin);
        }

        public GameObject Detail(Transform induk, string nama, Vector3 posisi, Vector3 ukuran, Material mat,
            PrimitiveType bentuk = PrimitiveType.Cube)
        {
            var detail = GameObject.CreatePrimitive(bentuk);
            detail.name = nama;
            detail.transform.SetParent(induk, false);
            detail.transform.localPosition = posisi;
            detail.transform.localScale = ukuran;
            var collider = detail.GetComponent<Collider>();
            collider.enabled = false;
            Destroy(collider);
            var renderer = detail.GetComponent<Renderer>();
            renderer.sharedMaterial = mat;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return detail;
        }

        void OnDestroy()
        {
            foreach (var mat in bahan.Values) Destroy(mat);
        }
    }
}
