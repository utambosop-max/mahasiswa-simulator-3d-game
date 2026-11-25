// Data sosial & ekonomi dari fitur2.json, fitur3.json, fitur4.json: kos, warga, pacaran, beasiswa,
// skill, UKM, relasi NPC, rambut, bank/deposito, lomba, kebun cabai. Angka TIDAK ditulis di kode.
using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace MS.Inti
{
    public class EfekKos { public float stresPasif, stresMalam, pengaliBelajar = 1, mandiEnergi, energiTidur, sarapan, kebersihanTurun = 1; }
    public class TelatKos { public int uang; public float stres; public int relasi; }
    public class DataKos
    {
        public string id, nama, ikon, tipe, pemilik, sifat, toilet, dinding, deskripsi;
        public int harga;
        public int? jamMalam;           // menit sejak 05.00 (null = bebas)
        public bool bebas, tinggalBareng, berhantu;
        public EfekKos efek = new EfekKos();
        public TelatKos telat;
    }
    public class DataWarga { public string id, gaya, nama, ikon, peran, suka; public bool pacar; public List<string> dialog = new List<string>(); }
    public class EfekSosial { public int uang; public float energi, stres; public int relasi; }
    public class DataSosial
    {
        public int ngobrolRelasi = 8, hadiahHarga = 20000, hadiahRelasi = 15, hadiahSukaRelasi = 25, tembakMinRelasi = 60;
        public float ngobrolStres = -3, tembakPeluangLv2 = 0.55f, tidurBarengStres = -5, chatPagiStres = -3, pengaliKosTinggalBareng = 0.5f;
        public EfekSosial tembakGagal = new EfekSosial(), jadian = new EfekSosial(), kencan = new EfekSosial(), putus = new EfekSosial();
        public int kencanMenit = 120, tinggalMinRelasi = 100, rinduHari = 4, rinduRelasi = -10, putusBatas = 30;
    }
    public class SyaratBeasiswa { public float ipkMin; public int? hartaMaks, sksMin; public List<string> jurusan; public bool ukm; public Dictionary<string, int> skillMin; }
    public class DataBeasiswa { public string id, nama, ikon, deskripsi; public int uang; public float jagaIpk; public SyaratBeasiswa syarat = new SyaratBeasiswa(); }
    public class DataSkill { public string id, nama, ikon, bonus; public List<string> stat = new List<string>(); }
    public class DataUkm { public string id, nama, ikon, deskripsi; }
    public class DataNpc { public string id, nama, ikon; public List<string> perk = new List<string>(); }
    public class DataGaya { public string id, nama; public int harga; }
    public class DataDeposito { public int minimal = 100000, tenorHari = 30; public float bungaBulanan = 0.004f; }
    public class DataLomba
    {
        public int tanggalBuka = 5, tanggalTutup = 20, tanggalUmum = 25, biaya = 25000, sesi = 3;
        public List<int> hadiah = new List<int> { 300000, 150000, 75000 };
        public float kesulitan = 6;
    }
    public class DataCabai { public int hargaBibit = 10000, panen = 4; public float laju = 0.9f, lajuTanpaSiram = 0.25f; }
    public class DataHantu { public float peluangMuncul = 0.35f, stresLihat = 6; public int beraniSetelah = 5; }
    public class DataKarier { public string id, nama, ikon, ket; public float pengali = 1, stresBulanan; }
    public class DataSeminar { public int biaya = 20000, cv = 1; public float stres = -5; }
    public class DataMotorUp { public int level, harga; public string nama; public float kecepatan = 1, hemat = 1; }
    public class DataLalin { public int denda = 50000, dendaTanpaSim = 100000, hargaSim = 150000; public float stresTilang = 8; }
    public class DataYerkes { public float optimum = 35, turun = 0.6f, minimum = 0.4f; }

    public class DataFitur3
    {
        public int biayaPindahKos = 100000, jedaPindahHari = 7;
        public List<DataKos> kos = new List<DataKos>();
        public List<DataWarga> warga = new List<DataWarga>();
        public DataSosial sosial = new DataSosial();
        public List<DataBeasiswa> beasiswa = new List<DataBeasiswa>();
        public List<DataGaya> gayaRambut = new List<DataGaya>();
        public List<string> warnaRambut = new List<string>();
        public int hargaCatRambut = 30000;
        public DataHantu hantu = new DataHantu();
        // fitur2
        public List<DataSkill> skill = new List<DataSkill>();
        public List<int> skillLevel = new List<int> { 5, 15, 30, 60 };
        public List<DataUkm> ukm = new List<DataUkm>();
        public int ukmIuran = 20000, ukmHariRapat = 2, relasiNgobrol = 8, relasiMakanKucing = 15;
        public List<DataNpc> npc = new List<DataNpc>();
        public List<int> relasiLevel = new List<int> { 25, 60, 100 };
        public List<int> targetTabungan = new List<int>();
        // fitur4
        public DataDeposito deposito = new DataDeposito();
        public DataLomba lomba = new DataLomba();
        public DataCabai cabai = new DataCabai();
        public DataYerkes yerkes = new DataYerkes();
        public List<DataKarier> karier = new List<DataKarier>();
        public int gajiDasar = 3500000, gajiPerIpk = 1500000, gajiPerCv = 150000;
        public DataSeminar seminar = new DataSeminar();
        public List<DataMotorUp> motorUpgrade = new List<DataMotorUp>();
        public int hargaCatMotor = 30000;
        public List<string> warnaMotor = new List<string>();
        public DataLalin lalin = new DataLalin();
        public float peluangRazia = 0.15f; // peluang razia per fase saat naik motor (sederhana: tanpa lampu lalin)

        public static DataFitur3 Muat(string fitur2, string fitur3, string fitur4)
        {
            var d = new DataFitur3();
            try
            {
                if (!string.IsNullOrEmpty(fitur3))
                {
                    var f = JObject.Parse(fitur3);
                    var k = f["kos"];
                    if (k != null)
                    {
                        d.biayaPindahKos = k.Value<int?>("biayaPindah") ?? d.biayaPindahKos;
                        d.jedaPindahHari = k.Value<int?>("jedaPindahHari") ?? d.jedaPindahHari;
                        d.kos = k["daftar"]?.ToObject<List<DataKos>>() ?? d.kos;
                    }
                    d.warga = f["warga"]?.ToObject<List<DataWarga>>() ?? d.warga;
                    d.sosial = f["sosial"]?.ToObject<DataSosial>() ?? d.sosial;
                    d.beasiswa = f["beasiswa"]?.ToObject<List<DataBeasiswa>>() ?? d.beasiswa;
                    d.gayaRambut = f["gayaRambut"]?.ToObject<List<DataGaya>>() ?? d.gayaRambut;
                    d.warnaRambut = f["warnaRambut"]?.ToObject<List<string>>() ?? d.warnaRambut;
                    d.hargaCatRambut = f.Value<int?>("hargaCatRambut") ?? d.hargaCatRambut;
                    d.hantu = f["hantu"]?.ToObject<DataHantu>() ?? d.hantu;
                }
                if (!string.IsNullOrEmpty(fitur2))
                {
                    var f = JObject.Parse(fitur2);
                    d.skill = f["skill"]?.ToObject<List<DataSkill>>() ?? d.skill;
                    d.skillLevel = f["skillLevel"]?.ToObject<List<int>>() ?? d.skillLevel;
                    d.ukm = f["ukm"]?.ToObject<List<DataUkm>>() ?? d.ukm;
                    d.ukmIuran = f.Value<int?>("ukmIuran") ?? d.ukmIuran;
                    d.ukmHariRapat = f.Value<int?>("ukmHariRapat") ?? d.ukmHariRapat;
                    d.relasiNgobrol = f.Value<int?>("relasiNgobrol") ?? d.relasiNgobrol;
                    d.relasiMakanKucing = f.Value<int?>("relasiMakanKucing") ?? d.relasiMakanKucing;
                    d.npc = f["npc"]?.ToObject<List<DataNpc>>() ?? d.npc;
                    d.relasiLevel = f["relasiLevel"]?.ToObject<List<int>>() ?? d.relasiLevel;
                    d.targetTabungan = f["targetTabungan"]?.ToObject<List<int>>() ?? d.targetTabungan;
                    d.motorUpgrade = f["motorUpgrade"]?.ToObject<List<DataMotorUp>>() ?? d.motorUpgrade;
                    d.hargaCatMotor = f["catMotor"]?.Value<int?>("harga") ?? d.hargaCatMotor;
                    d.warnaMotor = f["catMotor"]?["warna"]?.ToObject<List<string>>() ?? d.warnaMotor;
                }
                if (!string.IsNullOrEmpty(fitur4))
                {
                    var f = JObject.Parse(fitur4);
                    d.deposito = f["ekonomi"]?["deposito"]?.ToObject<DataDeposito>() ?? d.deposito;
                    d.lomba = f["kampus"]?["lomba"]?.ToObject<DataLomba>() ?? d.lomba;
                    d.cabai = f["cabai"]?.ToObject<DataCabai>() ?? d.cabai;
                    d.yerkes = f["tubuh"]?["yerkes"]?.ToObject<DataYerkes>() ?? d.yerkes;
                    var kp = f["kampus"];
                    if (kp != null)
                    {
                        d.karier = kp["karier"]?.ToObject<List<DataKarier>>() ?? d.karier;
                        d.gajiDasar = kp.Value<int?>("gajiDasar") ?? d.gajiDasar;
                        d.gajiPerIpk = kp.Value<int?>("gajiPerIpk") ?? d.gajiPerIpk;
                        d.gajiPerCv = kp.Value<int?>("gajiPerCv") ?? d.gajiPerCv;
                        d.seminar = kp["seminar"]?.ToObject<DataSeminar>() ?? d.seminar;
                    }
                    d.lalin = f["lalin"]?.ToObject<DataLalin>() ?? d.lalin;
                }
            }
            catch (Exception e) { Debug.LogWarning("[Inti] data fitur3/4 gagal dibaca: " + e.Message); }
            return d;
        }

        public DataKos Kos(string id) { foreach (var k in kos) if (k.id == id) return k; return kos.Count > 0 ? kos[0] : null; }
        public DataWarga Warga(string id) { foreach (var w in warga) if (w.id == id) return w; return null; }
        public DataBeasiswa Beasiswa(string id) { foreach (var b in beasiswa) if (b.id == id) return b; return null; }
        public DataUkm Ukm(string id) { foreach (var u in ukm) if (u.id == id) return u; return null; }
        public DataNpc Npc(string id) { foreach (var n in npc) if (n.id == id) return n; return null; }
        public DataGaya Gaya(string id) { foreach (var g in gayaRambut) if (g.id == id) return g; return null; }

        /// <summary>Level relasi 0–3 dari ambang relasiLevel (25/60/100).</summary>
        public int LevelRelasi(int nilai) { int n = 0; foreach (int b in relasiLevel) if (nilai >= b) n++; return n; }
        /// <summary>Level skill 0–4 dari jumlah latihan (ambang skillLevel 5/15/30/60).</summary>
        public int LevelSkill(int latihan) { int n = 0; foreach (int b in skillLevel) if (latihan >= b) n++; return n; }

        /// <summary>Kurva Yerkes–Dodson: hasil terbaik di stres "optimum", turun bila terlalu santai/tegang.</summary>
        public float EfisiensiStres(float stres)
        {
            var y = yerkes;
            return AsliCpp.EfisiensiStres(stres, y.optimum, y.turun, y.minimum); // C++ bila ada
        }
    }
}
