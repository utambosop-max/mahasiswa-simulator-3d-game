using System;
using MS.Kontrak;
using TMPro;
using UnityEngine;

namespace MS.UI
{
    public sealed class PenandaWarga : MonoBehaviour
    {
        [SerializeField] string idWarga;
        [SerializeField] string namaWarga;
        [SerializeField] float tinggi = 1.85f;
        TextMeshPro label;
        Camera kamera;
        IInfoHidup hidup;
        Func<string, bool> sudahNgobrolHariIni;
        float cekBerikut;

        public void Pasang(string id, string nama, Func<string, bool> cekNgobrolHariIni)
        {
            idWarga = id;
            namaWarga = nama;
            sudahNgobrolHariIni = cekNgobrolHariIni;
            cekBerikut = 0;
        }

        void Awake()
        {
            var objek = new GameObject("Penanda warga");
            objek.transform.SetParent(transform, false);
            objek.transform.localPosition = Vector3.up * tinggi;
            label = objek.AddComponent<TextMeshPro>();
            label.fontSize = 2;
            label.alignment = TextAlignmentOptions.Center;
            label.color = new Color32(250, 198, 139, 255);
            label.font = TMP_Settings.defaultFontAsset;
            label.text = "";
        }

        void LateUpdate()
        {
            if (Time.unscaledTime >= cekBerikut)
            {
                cekBerikut = Time.unscaledTime + .35f;
                hidup = Layanan.Hidup;
                bool pasangan = hidup != null && !string.IsNullOrEmpty(namaWarga) && hidup.PacarNama == namaWarga;
                bool bisaNgobrol = sudahNgobrolHariIni != null && !sudahNgobrolHariIni(idWarga);
                string ikon = pasangan ? "♥" : bisaNgobrol ? "…" : "";
                if (ikon.Length > 0 && (label.font == null || !label.font.HasCharacters(ikon))) ikon = pasangan ? "<3" : "...";
                if (label.text != ikon) label.text = ikon;
                if (kamera == null) kamera = Camera.main;
            }
            if (kamera != null) label.transform.rotation = kamera.transform.rotation;
        }
    }
}
