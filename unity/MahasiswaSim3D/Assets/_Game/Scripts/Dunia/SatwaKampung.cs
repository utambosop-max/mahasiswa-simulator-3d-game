using UnityEngine;

namespace MS.Dunia
{
    internal static class SatwaKampung
    {
        public static void Pasang(Transform prop, BahanRealistis bahan)
        {
            var pintu = GameObject.Find("Spawn pintuKos");
            if (pintu == null) return;
            var arah = pintu.transform.right;
            arah.y = 0;
            arah.Normalize();
            var depan = pintu.transform.forward;
            var asal = pintu.transform.position;
            asal.y = .018f;

            var ayam = Resources.Load<GameObject>("Satwa/ayam");
            if (ayam != null)
            {
                var visual = Object.Instantiate(ayam, prop);
                visual.name = "Ayam kampung";
                var material = bahan.Ambil(null, new Color(.99f, 1f, 1f), Vector2.one);
                material.mainTexture = Resources.Load<Texture2D>("Satwa/warna");
                foreach (var bagian in visual.GetComponentsInChildren<MeshRenderer>())
                    bagian.sharedMaterial = material;
                visual.AddComponent<PatroliKampung>().Pasang(Rute(asal, arah, depan, -2.55f), .54f, true);
            }

            var oyen = KatalogPropDunia.Muat()?.Ambil("kar_oyen");
            if (oyen == null) return;
            var kucing = Object.Instantiate(oyen, prop);
            kucing.name = "Oyen berkeliaran";
            kucing.AddComponent<PatroliKampung>().Pasang(Rute(asal, arah, depan, 2.35f), .69f, true);
        }

        static Vector3[] Rute(Vector3 asal, Vector3 arah, Vector3 depan, float sisi)
        {
            var tepi = asal + arah * sisi + depan * .50f;
            return new[]
            {
                tepi, tepi - depan * 1.35f, tepi - depan * 1.5f + arah * .95f, tepi + arah * 1.0f
            };
        }
    }
}
