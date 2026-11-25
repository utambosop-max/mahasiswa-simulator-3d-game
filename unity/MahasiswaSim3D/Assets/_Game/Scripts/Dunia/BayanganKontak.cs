using UnityEngine;

namespace MS.Dunia
{
    internal sealed class BayanganKontak : MonoBehaviour
    {
        static Material bahan;
        static Texture2D tekstur;
        static int pengguna;
        bool dipasang;

        public void Pasang()
        {
            if (bahan == null)
            {
                var shader = Shader.Find("Sprites/Default");
                if (shader == null) return;
                const int sisi = 32;
                tekstur = new Texture2D(sisi, sisi, TextureFormat.RGBA32, false, true)
                    { name = "Masker bayangan kaki", wrapMode = TextureWrapMode.Clamp };
                var piksel = new Color32[sisi * sisi];
                for (int y = 0; y < sisi; y++)
                    for (int x = 0; x < sisi; x++)
                    {
                        float radius = new Vector2((x + .5f) / sisi * 2 - 1, (y + .5f) / sisi * 2 - 1).magnitude;
                        float alpha = Mathf.SmoothStep(.30f, 0, Mathf.Clamp01(radius));
                        piksel[y * sisi + x] = new Color32(15, 13, 9, (byte)Mathf.RoundToInt(alpha * 255));
                    }
                tekstur.SetPixels32(piksel);
                tekstur.Apply(false, true);
                bahan = new Material(shader) { mainTexture = tekstur };
            }

            var tapak = GameObject.CreatePrimitive(PrimitiveType.Quad);
            tapak.name = "Bayangan kontak";
            tapak.transform.SetParent(transform, false);
            tapak.transform.SetLocalPositionAndRotation(Vector3.up * .019f, Quaternion.Euler(90, 0, 0));
            tapak.transform.localScale = new Vector3(.79f, .92f, 1f);
            var collider = tapak.GetComponent<Collider>();
            collider.enabled = false;
            Destroy(collider);
            var renderer = tapak.GetComponent<MeshRenderer>();
            renderer.sharedMaterial = bahan;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            renderer.receiveShadows = false;
            dipasang = true;
            pengguna++;
        }

        void OnDestroy()
        {
            if (!dipasang || --pengguna > 0) return;
            Destroy(bahan);
            Destroy(tekstur);
        }
    }
}
