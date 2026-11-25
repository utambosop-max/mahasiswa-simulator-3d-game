// Akademik: SKS, UTS/UAS, semester & rapor, beasiswa prestasi, skripsi, tagihan bulanan.
// Port sim.ts (ujianAktif, persiapanUjian, semester, M8 sks/skripsi/tagihan). Angka dari fitur.json & fitur2.json.
using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace MS.Inti
{
    public class DataUjian { public string id, nama; public int bulanSemester, tanggalMulai, tanggalSelesai; }
    public class DataPredikat { public string nama, ikon; public float min; }

    public class DataAkademik
    {
        public List<DataUjian> ujian = new List<DataUjian>();
        public List<DataPredikat> predikat = new List<DataPredikat>();
        public float ujianIpkMin = -0.03f, ujianIpkMaks = 0.06f, ujianStres = 8, absenUjianIpk = -0.05f, beasiswaIpk = 3.5f, lesIpkMin = 3.2f;
        public int ujianBelajarPenuh = 6, beasiswaUang = 300000, cumLaudeHadiah = 500000;
        // fitur2.json
        public int sksPerKuliah = 1, sksPerUjian = 4, sksLulus = 144, skripsiMinSks = 110;
        public int progresNulis = 6, progresBimbingan = 10, hadiahWisuda = 1000000;
        public int tanggalTagihan = 10, listrik = 60000, wifi = 50000;

        /// <summary>Baca bagian yang dipakai saja; kunci yang hilang → nilai bawaan di atas.</summary>
        public static DataAkademik Muat(string fitur, string fitur2)
        {
            var d = new DataAkademik();
            try
            {
                if (!string.IsNullOrEmpty(fitur))
                {
                    var a = JObject.Parse(fitur)["akademik"];
                    if (a != null)
                    {
                        d.ujian = a["ujian"]?.ToObject<List<DataUjian>>() ?? d.ujian;
                        d.predikat = a["predikat"]?.ToObject<List<DataPredikat>>() ?? d.predikat;
                        d.ujianIpkMin = a.Value<float?>("ujianIpkMin") ?? d.ujianIpkMin;
                        d.ujianIpkMaks = a.Value<float?>("ujianIpkMaks") ?? d.ujianIpkMaks;
                        d.ujianStres = a.Value<float?>("ujianStres") ?? d.ujianStres;
                        d.absenUjianIpk = a.Value<float?>("absenUjianIpk") ?? d.absenUjianIpk;
                        d.beasiswaIpk = a.Value<float?>("beasiswaIpk") ?? d.beasiswaIpk;
                        d.lesIpkMin = a.Value<float?>("lesIpkMin") ?? d.lesIpkMin;
                        d.ujianBelajarPenuh = a.Value<int?>("ujianBelajarPenuh") ?? d.ujianBelajarPenuh;
                        d.beasiswaUang = a.Value<int?>("beasiswaUang") ?? d.beasiswaUang;
                        d.cumLaudeHadiah = a.Value<int?>("cumLaudeHadiah") ?? d.cumLaudeHadiah;
                    }
                }
                if (!string.IsNullOrEmpty(fitur2))
                {
                    var f = JObject.Parse(fitur2);
                    var sks = f["sks"];
                    if (sks != null)
                    {
                        d.sksPerKuliah = sks.Value<int?>("perKuliah") ?? d.sksPerKuliah;
                        d.sksPerUjian = sks.Value<int?>("perUjian") ?? d.sksPerUjian;
                        d.sksLulus = sks.Value<int?>("lulus") ?? d.sksLulus;
                        d.skripsiMinSks = sks.Value<int?>("skripsiMinSks") ?? d.skripsiMinSks;
                    }
                    d.progresNulis = f["skripsi"]?["nulis"]?.Value<int?>("progres") ?? d.progresNulis;
                    d.progresBimbingan = f["skripsi"]?["bimbingan"]?.Value<int?>("progres") ?? d.progresBimbingan;
                    d.hadiahWisuda = f["wisuda"]?.Value<int?>("hadiahOrtu") ?? d.hadiahWisuda;
                    var t = f["tagihan"];
                    if (t != null)
                    {
                        d.tanggalTagihan = t.Value<int?>("tanggal") ?? d.tanggalTagihan;
                        d.listrik = t.Value<int?>("listrik") ?? d.listrik;
                        d.wifi = t.Value<int?>("wifi") ?? d.wifi;
                    }
                }
            }
            catch (Exception e) { Debug.LogWarning("[Inti] fitur.json/fitur2.json gagal dibaca: " + e.Message); }
            return d;
        }

        /// <summary>Bulan ke-1..4 dalam semester.</summary>
        public static int BulanSemester(int bulan) => (bulan - 1) % 4 + 1;

        /// <summary>Ujian yang berlangsung hari ini dan belum diikuti (null = tidak ada).</summary>
        public DataUjian UjianAktif(DataSimpan s)
        {
            foreach (var u in ujian)
                if (u.bulanSemester == BulanSemester(s.bulan) && s.tanggal >= u.tanggalMulai && s.tanggal <= u.tanggalSelesai
                    && !s.ujianSelesai.Contains(Kunci(u, s)))
                    return u;
            return null;
        }

        public static string Kunci(DataUjian u, DataSimpan s) => u.id + "-" + s.semester;

        /// <summary>Persiapan 0–1 = hari belajar/kuliah dalam 7 hari terakhir dibagi ujianBelajarPenuh.</summary>
        public float Persiapan(DataSimpan s)
        {
            int n = 0;
            foreach (int h in s.belajarLog) if (h > s.hari - 7) n++;
            return Mathf.Min(1f, n / (float)Mathf.Max(1, ujianBelajarPenuh));
        }

        public DataPredikat Predikat(float ipk)
        {
            foreach (var p in predikat) if (ipk >= p.min) return p;
            return predikat.Count > 0 ? predikat[predikat.Count - 1] : new DataPredikat { nama = "-", ikon = "📄" };
        }
    }
}
