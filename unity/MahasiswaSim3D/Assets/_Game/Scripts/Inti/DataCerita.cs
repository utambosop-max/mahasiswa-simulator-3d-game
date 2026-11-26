// Data cerita utama "Buku Sakti Ibu" (Data/cerita.json) + bentuk yang disimpan di save.
// Semua teks & angka ada di JSON; kode hanya mesin pemicu (port src/game/cerita.ts).
using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using UnityEngine;

namespace MS.Inti
{
    public class RelasiJumlah { public int nilai, jumlah; }

    /// <summary>Syarat pemicu (semua field opsional; null = tidak dicek).</summary>
    public class SyaratCerita
    {
        public bool? pembukaSelesai, lulus, punyaPacar, bulanBaru;
        public bool punyaBeasiswa;
        public int? hariMin, hariMaks, tanggalMin, tanggalMaks, bulanMin, uangMin, uangMaks, sksMin, skripsiMin, tabunganMin, celenganMin, raporMin, followerMaks;
        public int? asetMin, relasiPacarMin, akhirIpkRendahMin, krisisKesehatanMin;
        public float? ipkMin, ipkMaks, stresMin;
        public List<string> fase, lokasi, gedung, kos, flag, tanpaFlag, flagSalahSatu;
        public Dictionary<string, int> flagUmur, relasiMin, statMin, circleMin;
        public RelasiJumlah wargaRelasiMin, wargaRelasiMaks;
        public List<SyaratCerita> atau;
    }

    public class TujuanBab { public string id, teks; public Dictionary<string, int> stat; public int? jumlah; public SyaratCerita syarat; }
    public class AdeganBab { public string id, dialog; public Dictionary<string, int> progres; public SyaratCerita pemicu; }
    public class HadiahCerita { public Efek efek; public Dictionary<string, int> relasi; }
    public class RencanaB { public string teks, flag, dialog; }

    public class BabCerita
    {
        public string id, judul, ikon, halaman, dialogAwal, dialogSelesai, flagSelesai;
        public int urutan, batasHari;
        public SyaratCerita pemicu = new SyaratCerita();
        public List<TujuanBab> tujuan = new List<TujuanBab>();
        public List<AdeganBab> adegan = new List<AdeganBab>();
        public HadiahCerita hadiah;
        public bool ending;
        public RencanaB rencanaB;
    }

    public class KeJika { public SyaratCerita syarat; public string ke; }
    public class PilihanCerita
    {
        public string teks, hasil, aksi, kunci, ke;
        public Efek efek;
        public Dictionary<string, int> relasi;
        public List<string> setFlag;
        public SyaratCerita syarat;
        public List<KeJika> keJika;
    }
    public class DialogCerita { public string id, ikon, judul, teks; public List<PilihanCerita> pilihan = new List<PilihanCerita>(); }
    public class EndingCerita { public string id, judul, ikon, teks; public bool gdd; public SyaratCerita syarat = new SyaratCerita(); }
    public class EpilogCerita { public SyaratCerita syarat = new SyaratCerita(); public string teks; }
    public class SampinganCerita { public string id, dialog; public SyaratCerita pemicu = new SyaratCerita(); }
    public class NabungCerita { public int target = 300000, durasiHari = 60, setor = 50000; public Efek hadiah = new Efek(); }

    public class DataCerita
    {
        public NabungCerita nabung = new NabungCerita();
        public List<BabCerita> bab = new List<BabCerita>();
        public List<SampinganCerita> sampingan = new List<SampinganCerita>();
        public List<DialogCerita> dialog = new List<DialogCerita>();
        public List<EndingCerita> ending = new List<EndingCerita>();
        public List<EpilogCerita> epilog = new List<EpilogCerita>();
        public string halamanTerakhir = "Sekarang kamu yang nulis.";

        [JsonIgnore] public readonly Dictionary<string, DialogCerita> PetaDialog = new Dictionary<string, DialogCerita>();

        public static DataCerita Muat(string json)
        {
            DataCerita d = null;
            if (!string.IsNullOrEmpty(json))
            {
                try { d = JsonConvert.DeserializeObject<DataCerita>(json); }
                catch (Exception e) { Debug.LogWarning("[Inti] cerita.json gagal dibaca: " + e.Message); }
            }
            d = d ?? new DataCerita();
            d.bab.Sort((a, b) => a.urutan.CompareTo(b.urutan));
            foreach (var x in d.dialog) if (x != null && x.id != null) d.PetaDialog[x.id] = x;
            return d;
        }
    }

    // ===== Bagian save =====
    public class ProgresBabSimpan
    {
        public string s = "aktif";   // aktif / selesai / rencanaB / lewat
        public int mulai, akhir;
        public Dictionary<string, int> dasar = new Dictionary<string, int>();
        public List<string> tujuan = new List<string>();
    }
    public class MisiNabungSimpan { public int target, terkumpul, mulai, batas; public string status = "aktif"; }
    public class CeritaSimpan
    {
        public Dictionary<string, ProgresBabSimpan> bab = new Dictionary<string, ProgresBabSimpan>();
        public Dictionary<string, int> flag = new Dictionary<string, int>();
        public List<string> adegan = new List<string>();
        public List<string> antrean = new List<string>();
        public MisiNabungSimpan nabung;
        public string ending;
    }
}
