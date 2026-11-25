// Mewarnai dinding kamar kos sesuai pilihan pemain (GameInti.Kos.WarnaDinding, string hex "#rrggbb").
// Dicek saat Start lalu tiap 1 detik; warna hanya dipasang ulang bila teksnya berubah.
using MS.Inti;
using UnityEngine;

namespace MS.Dunia
{
    public class WarnaDindingKos : MonoBehaviour
    {
        public Renderer[] dinding;

        const float Selang = 1f;
        float timer;
        string hexTerakhir;
        MaterialPropertyBlock blok;

        void Start()
        {
            blok = new MaterialPropertyBlock();
            Periksa();
        }

        void Update()
        {
            timer += Time.deltaTime;
            if (timer < Selang) return;
            timer = 0f;
            Periksa();
        }

        void Periksa()
        {
            string hex = GameInti.Instans?.Kos?.WarnaDinding;
            if (string.IsNullOrEmpty(hex) || hex == hexTerakhir) return;
            hexTerakhir = hex;
            if (!ColorUtility.TryParseHtmlString(hex, out var warna)) return;
            blok.SetColor("_BaseColor", warna);
            if (dinding == null) return;
            for (int i = 0; i < dinding.Length; i++)
                if (dinding[i] != null) dinding[i].SetPropertyBlock(blok);
        }
    }
}
