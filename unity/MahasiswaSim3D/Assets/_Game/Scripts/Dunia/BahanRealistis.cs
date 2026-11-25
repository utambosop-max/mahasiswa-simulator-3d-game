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
                var pbr = Resources.Load<Texture2D>("Bahan/" + id + "/pbr");
                if (pbr != null)
                {
                    hasil.SetTexture("_OcclusionMap", pbr);
                    hasil.SetTexture("_MetallicGlossMap", pbr);
                    hasil.SetFloat("_OcclusionStrength", .4f);
                    hasil.SetFloat("_Smoothness", .75f);
                    hasil.EnableKeyword("_OCCLUSIONMAP");
                    hasil.EnableKeyword("_METALLICSPECGLOSSMAP");
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

        public void Tanaman(Transform induk, Vector3 posisi, float tinggi)
        {
            const string folder = "Tanaman/potted_plant_01/";
            var model = Resources.Load<GameObject>(folder + "model");
            if (model == null) return;
            var pot = Ambil("Pot tanaman", Color.white, Vector2.one);
            pot.mainTexture = Resources.Load<Texture2D>(folder + "pot");
            var daun = Ambil("Daun tanaman", Color.white, Vector2.one);
            daun.mainTexture = Resources.Load<Texture2D>(folder + "daun");
            daun.EnableKeyword("_ALPHATEST_ON");
            daun.SetFloat("_AlphaClip", 1);
            daun.SetFloat("_Cutoff", .42f);
            daun.SetFloat("_Cull", 0);
            daun.renderQueue = (int)UnityEngine.Rendering.RenderQueue.AlphaTest;
            var akar = new GameObject("Tanaman pot");
            akar.transform.SetParent(induk, false);
            akar.transform.localPosition = posisi;
            var objek = Instantiate(model, akar.transform);
            var renderers = objek.GetComponentsInChildren<Renderer>();
            var bounds = new Bounds(objek.transform.position, Vector3.zero);
            foreach (var item in renderers)
            {
                bounds.Encapsulate(item.bounds);
                item.sharedMaterial = item.name.Contains("leaves") ? daun : pot;
                item.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            }
            if (bounds.size.y > .001f)
            {
                objek.transform.position -= new Vector3(bounds.center.x - akar.transform.position.x,
                    bounds.min.y - akar.transform.position.y, bounds.center.z - akar.transform.position.z);
                akar.transform.localScale = Vector3.one * (tinggi / bounds.size.y);
            }
            var lod = akar.AddComponent<LODGroup>();
            lod.SetLODs(new[] { new LOD(.035f, renderers) });
            lod.RecalculateBounds();
        }

        void OnDestroy()
        {
            foreach (var mat in bahan.Values) Destroy(mat);
        }
    }
}
