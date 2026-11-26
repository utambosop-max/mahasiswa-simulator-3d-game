// Kelas data dari Assets/_Game/Data/*.json (hanya bagian yang dipakai fase 1).
// File JSON TIDAK dipindah: GameInti menerima TextAsset lewat field Inspector.
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace MS.Inti
{
    public class Efek
    {
        public float uang, ipk, energi, stres;
        public void Isi(Efek e) { uang = e.uang; ipk = e.ipk; energi = e.energi; stres = e.stres; }
        public void Kosongkan() { uang = ipk = energi = stres = 0; }
    }

    public class DataAksi
    {
        public string kerja, npc, toko, butuhBarang, tujuan;
        public string label, ikon, jenis, menuId, pesan, alasanTutup, transisi, tempat;
        public List<int> hari;   // hari dalam minggu (0 = Senin) bila aksi hanya ada di hari tertentu
        public List<string> fase = new List<string>();
        public bool pakaiMeja, hariKerja;
        public Efek efek = new Efek();
        public int majuFase;
        public float? durasiJam;
    }

    public class DataMenu
    {
        public string id, nama, ikon, kategori;
        public int harga;
        public float karbo, protein, serat, maag;
        public bool kasbon;
        public Efek efek = new Efek();
    }

    public class LevelUpgrade
    {
        public int level, harga;
        public string label, deskripsi;
        public Dictionary<string, float> efek = new Dictionary<string, float>();
    }

    public class DataUpgrade
    {
        public string id, nama, ikon;
        public List<LevelUpgrade> levels = new List<LevelUpgrade>();
    }

    public class BalVital
    {
        public float kenyangPerJam = 7f, hidrasiPerJam = 6f, maagPuasa = .4f, maagMi = 2f, maagKopi = 3f;
        public float serap = .6f, pulihHidrasi = 28f, maagAkut = 75f;
        public int batasKasbon = 12000, awalWaspada = 8, awalTanggalTua = 21;
    }

    public class BalStatAwal { public int uang = 1000000, tanggal = 1; public float ipk = 3, energi = 80, stres = 20; }
    public class BalBatas { public int uangMin = -100000; }
    public class BalBulanan { public int hariPerBulan = 30, kirimanOrtu = 1500000, biayaKos = 500000, batasBayarKos = 5, dendaKos = 25000, tanggalTuaMulai = 21; }
    public class BalHargaMakan { public float pengali = 1.2f; }
    public class BalBolos { public float ipk = -0.01f; }
    public class BalPulang { public float stres = 50, energi = 80; public int ongkos = 50000; }
    public class BalIpkAtas { public float mulai = 3.3f, minimal = 0.05f; }
    public class BalAmbang { public float energiLemas = 20, stresTinggi = 70; }
    public class BalPengali { public float ipkSaatLemas = 0.5f, ipkSaatStres = 0.7f, kecepatanSaatLemas = 0.6f; }
    public class BalTidurSiang { public float stres = -3; }
    public class BalMi { public int batasBeruntun = 3; public float pengaliEnergi = 0.5f, stresTambahan = 5; }
    public class BalUpgrade { public bool bolehUtang = false; }
    public class BalKerja { public int maksShiftPerHari = 1; }
    public class BalEvent { public int maksPerHari = 3, jedaHariSama = 7; }
    public class BalKuis { public int rajinDalamHari = 2; public Efek lulus = new Efek(), gagal = new Efek(); }
    public class BalKenyang { public int porsiPerFase = 3; }
    public class BalJam
    {
        public float menitPerDetik = 1, lajuSibuk = 15, lajuTidur = 40;
        public int mulaiHariJam = 5, bangunPagi = 60, bangunKesiangan = 300, tidurLarutMulai = 1200, tidurSiangMenit = 120, pulangKampungBangun = 120;
        // Jendela kuliah per sesi: [buka, tutup) dalam menit sejak 05.00
        public Dictionary<string, int[]> kuliah = new Dictionary<string, int[]>
        { { "pagi", new[] { 120, 300 } }, { "siang", new[] { 420, 600 } } };
        public Dictionary<string, int> batasFase = new Dictionary<string, int>
        { { "pagi", 360 }, { "siang", 600 }, { "sore", 780 }, { "malam", 1080 }, { "begadang", 1440 } };
    }

    public class DataBalance
    {
        public BalVital vital = new BalVital();
        public BalStatAwal statAwal = new BalStatAwal();
        public BalBatas batas = new BalBatas();
        public BalBulanan bulanan = new BalBulanan();
        public BalIpkAtas ipkAtas = new BalIpkAtas();
        public BalAmbang ambang = new BalAmbang();
        public BalPengali pengali = new BalPengali();
        public BalTidurSiang tidurSiang = new BalTidurSiang();
        public BalMi miInstan = new BalMi();
        public BalKenyang kenyang = new BalKenyang();
        public BalJam jam = new BalJam();
        public BalHargaMakan hargaMakan = new BalHargaMakan();
        public BalBolos bolos = new BalBolos();
        public BalEvent @event = new BalEvent();
        public BalKerja kerja = new BalKerja();
        public BalUpgrade upgrade = new BalUpgrade();
        public BalKuis kuis = new BalKuis();
        public BalPulang pulangKampung = new BalPulang();
    }

    /// <summary>Semua data yang sudah dibaca. Gagal baca → nilai default (game tetap jalan).</summary>
    public class DataGame
    {
        public DataBalance Bal = new DataBalance();
        public Dictionary<string, DataAksi> Aksi = new Dictionary<string, DataAksi>();
        public Dictionary<string, List<DataMenu>> Menu = new Dictionary<string, List<DataMenu>>();
        public List<DataUpgrade> Upgrade = new List<DataUpgrade>();
        public DataAkademik Akademik = new DataAkademik();
        public DataFitur Fitur = new DataFitur();
        public DataFitur3 Fitur3 = new DataFitur3();
        public DataCerita Cerita = new DataCerita();
        /// <summary>menu.json catatan.kenaikanHargaTanggalTua (khusus warteg).</summary>
        public int NaikTanggalTua = 2000;

        // Konstanta pemulihan tidur dari fitur4.json (file itu belum dimuat di fase 1).
        public const float TauPulihMenit = 180f, SkalaTidur = 1.08f;

        public static DataGame Muat(TextAsset aksi, TextAsset balance, TextAsset menu, TextAsset upgrades)
        {
            if (aksi == null || balance == null || menu == null || upgrades == null)
                Debug.LogWarning("[Inti] Ada TextAsset yang belum di-assign, pakai default.");
            return MuatTeks(aksi?.text, balance?.text, menu?.text, upgrades?.text);
        }

        /// <summary>Versi teks (dipakai tes EditMode). null = pakai default.</summary>
        public static DataGame MuatTeks(string aksi, string balance, string menu, string upgrades)
        {
            var d = new DataGame();
            if (balance != null) d.Bal = Baca(balance, d.Bal);
            // aksi.json & menu.json punya entri catatan (string/objek) di samping data -> baca per-properti
            BacaPerKunci(aksi, "aksi", d.Aksi, JTokenType.Object);
            BacaPerKunci(menu, "menu", d.Menu, JTokenType.Array);
            if (menu != null)
            {
                try { var n = JObject.Parse(menu)["catatan"]?["kenaikanHargaTanggalTua"]; if (n != null) d.NaikTanggalTua = n.Value<int>(); }
                catch (System.Exception e) { Debug.LogWarning("[Inti] catatan menu: " + e.Message); }
            }
            if (upgrades != null) d.Upgrade = Baca(upgrades, d.Upgrade);
            return d;
        }

        public static T Baca<T>(string json, T bawaan) where T : class
        {
            try { return JsonConvert.DeserializeObject<T>(json) ?? bawaan; }
            catch (System.Exception e) { Debug.LogError("[Inti] Gagal baca JSON " + typeof(T).Name + ": " + e.Message); return bawaan; }
        }

        /// <summary>Ambil hanya properti bertipe `jenis` (lewati "_catatan"/"catatan").</summary>
        static void BacaPerKunci<T>(string teks, string nama, Dictionary<string, T> hasil, JTokenType jenis)
        {
            if (teks == null) return;
            try
            {
                var akar = JObject.Parse(teks);
                foreach (var p in akar.Properties())
                {
                    if (p.Value.Type != jenis || p.Name.StartsWith("_") || p.Name == "catatan") continue;
                    try { hasil[p.Name] = p.Value.ToObject<T>(); }
                    catch (System.Exception e) { Debug.LogWarning("[Inti] Lewati '" + p.Name + "' di " + nama + ": " + e.Message); }
                }
            }
            catch (System.Exception e) { Debug.LogError("[Inti] Gagal baca " + nama + ": " + e.Message); }
        }

        public DataMenu CariMenu(string id)
        {
            foreach (var daftar in Menu.Values)
                foreach (var m in daftar)
                    if (m.id == id) return m;
            return null;
        }

        /// <summary>Efek perabot pada level tertentu (mis. kasur → energiTidurMalam).</summary>
        public float EfekPerabot(string idPerabot, int level, string kunci, float bawaan = 0)
        {
            foreach (var u in Upgrade)
            {
                if (u.id != idPerabot) continue;
                foreach (var l in u.levels)
                    if (l.level == level && l.efek.TryGetValue(kunci, out var v)) return v;
            }
            return bawaan;
        }
    }
}
