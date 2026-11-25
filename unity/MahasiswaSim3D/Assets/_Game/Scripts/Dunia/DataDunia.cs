// Data tata letak Kampung Mahasiswa (hasil ekspor scripts/unity/ekspor-dunia.mts dari game web).
// Koordinat SUDAH versi Unity: zUnity = -zWeb (agar peta tidak terbalik cermin). rotY dalam derajat.
using System;
using UnityEngine;

namespace MS.Dunia
{
    [Serializable] public class TitikXZ { public float x, z; }
    [Serializable] public class TitikSkala { public float x, z, s; }
    [Serializable] public class TitikRot { public float x, z, rotY; }
    [Serializable] public class Kotak2D { public float minX, maxX, minZ, maxZ; }

    [Serializable] public class InfoDunia { public float halfW, halfD, jalan, trotoar; public float[] jalanH, jalanV; }

    [Serializable]
    public class DataBangunan
    {
        public string id, jenis, hadap, warna, atap, nama, papan, aksen;
        public float x, z, w, d, rotY, depan, tinggi;
        public int lantai;
        public bool atapLimas, kanopi;
        public string[] aksi;
        public TitikXZ pintu;
    }

    [Serializable] public class Kolam { public float x, z, r; }
    [Serializable] public class DataTaman { public float minX, maxX, minZ, maxZ; public Kolam kolam; public TitikXZ bangku; }
    [Serializable] public class Persegi { public float x, z, w, d; }
    [Serializable] public class DataHalte { public string id, nama, hadap; public float x, z, rotY; }
    [Serializable] public class DataHadap { public string hadap; public float x, z, rotY; }
    [Serializable] public class DataPetak { public float x, z, w, d, rotY; public string hadap, warna, atap; }
    [Serializable] public class DataSungai { public float z, setengah, jembatanSetengah; }
    [Serializable] public class DataJalurSungai { public float z, lebar, x0, x1; }
    [Serializable] public class DataGang { public float x, lebar, z0, z1; }
    [Serializable] public class DataGapura { public float x, z; public string teks; }
    [Serializable] public class DataMenara { public float x, z, tinggi; }
    [Serializable] public class DataPasar { public float z, lorong, x0, x1; }
    [Serializable] public class DataLapak { public float x, z, rotY, w, d; public string hadap, atap; }
    [Serializable] public class DataWarung { public float x, z, rotY, w, d; public string hadap, teks, warna, atap; }
    [Serializable] public class DataLalin { public float x, z, rotY; public string sumbu; }

    [Serializable]
    public class DataDunia
    {
        public InfoDunia dunia;
        public DataBangunan[] bangunan;
        public DataTaman taman;
        public Persegi lapangan, lapanganKampung;
        public DataHalte[] halte;
        public DataHadap gerobak;
        public DataPetak[] kosPetak;
        public DataSungai sungai;
        public DataJalurSungai jalurSungai;
        public DataGang gang;
        public DataGapura[] gapura;
        public float gapuraTiang;
        public DataMenara menaraAir;
        public Kotak2D[] sawahBlok, petakSawah, kebun, bedengan;
        public Kotak2D kebunPisang;
        public DataPasar pasarKaget;
        public DataLapak[] lapak;
        public TitikXZ[] saung;
        public DataWarung[] warung;
        public TitikRot spawn, parkirMotor;
        public TitikRot[] motor;
        public TitikXZ pertamini, bendera, kursiWarkop;
        public DataLalin[] tiangLalin;
        public TitikXZ[] lampu;
        public TitikSkala[] pohon, pohonKelapa, pohonPisang;
        public Kotak2D[] colliders;
    }

    /// <summary>Pembaca dunia.json. Memakai JsonUtility bawaan (tanpa Newtonsoft) — format JSON sengaja berupa objek.</summary>
    public static class PembacaDunia
    {
        public static DataDunia Baca(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;
            try { return JsonUtility.FromJson<DataDunia>(json); }
            catch (Exception e) { Debug.LogError("[MS] dunia.json rusak: " + e.Message); return null; }
        }

        public static DataDunia Baca(TextAsset aset) => aset == null ? null : Baca(aset.text);

        /// <summary>Warna hex "#rrggbb" → Color (abu-abu bila gagal).</summary>
        public static Color Warna(string hex, Color cadangan)
            => !string.IsNullOrEmpty(hex) && ColorUtility.TryParseHtmlString(hex, out var c) ? c : cadangan;
    }
}
