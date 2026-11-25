// Data interior gedung (hasil ekspor scripts/unity/ekspor-dunia.mts dari src/game/gedungLayout.ts).
// Ruang 10 × 7 m berpusat di (0,0); koordinat SUDAH versi Unity (zUnity = -zWeb), rotY dalam derajat.
using System;
using UnityEngine;

namespace MS.Dunia
{
    [Serializable] public class InfoRuang { public float halfW, halfD, tinggi; }

    /// <summary>Satu perabot. w/d = ukuran tabrakan (0 = hiasan tanpa tabrakan).</summary>
    [Serializable] public class DataPerabot { public string jenis, warna; public float x, z, w, d, rotY; }

    [Serializable]
    public class DataInterior
    {
        public string id, nama, jenis, warna, aksen, namaPenjaga, bajuPenjaga, rambutPenjaga;
        public string[] aksi;          // aksi di konter (tanpa "masukGedung")
        public DataPerabot[] perabot;
        public bool adaKonter;
        public TitikXZ konter, penjaga, pintu;
        public TitikRot spawn;
    }

    [Serializable] public class DataGedungSemua { public InfoRuang ruang; public DataInterior[] gedung; }

    public static class PembacaGedung
    {
        public static DataGedungSemua Baca(TextAsset aset)
        {
            if (aset == null || string.IsNullOrEmpty(aset.text)) return null;
            try { return JsonUtility.FromJson<DataGedungSemua>(aset.text); }
            catch (Exception e) { Debug.LogError("[MS] gedung.json rusak: " + e.Message); return null; }
        }
    }
}
