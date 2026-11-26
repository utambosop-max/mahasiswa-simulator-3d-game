// Data fitur kehidupan dari fitur.json & fitur2.json: jurusan, asal, kehidupan, cuaca, barang, ojol, bensin.
using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace MS.Inti
{
    public class DataJurusan { public string id, nama, ikon, deskripsi; public Dictionary<string, float> pengali = new Dictionary<string, float>(); }
    public class DataAsal { public string id, nama, ikon; public string deskripsi; public int saldoAwal; public int kiriman = 1500000, ongkosPulang = 50000; }
    public class DataTrait { public string id, nama, deskripsi; public bool positif; }
    public class DataCuaca { public string id, nama, ikon; public float peluang; }
    public class DataBarang { public string id, nama, ikon, deskripsi; public int harga, isi; public bool permanen; public Efek efek = new Efek(); }

    public class DataKehidupan
    {
        public float kebersihanTurunPerHari = 12, kebersihanKotor = 35, stresKamarKotorPerFase = 1, stresBajuKotor = 3, stresKehujanan = 5;
        public int bajuKotorBatas = 5, sakitHari = 2;
        public float peluangSakitLemas = 0.25f, peluangSakitHujan = 0.3f, sakitPengaliIpk = 0.7f, sakitPengaliTidur = 0.7f;
    }

    public class DataOjol { public int jumlahOrder = 3, bayarDasar = 6000, bayarPerMeter = 150, tip5Bintang = 3000; }
    public class DataBensin { public float pakaiPerMeter = 0.12f, hargaPerPersen = 150, kecepatanMogok = 0.35f, awal = 80; }

    public class DataFitur
    {
        public List<DataJurusan> jurusan = new List<DataJurusan>();
        public List<DataAsal> latar = new List<DataAsal>();
        public List<DataTrait> traits = new List<DataTrait>();
        public List<DataAsal> asal = new List<DataAsal>();
        public List<DataCuaca> cuaca = new List<DataCuaca>();
        public List<DataBarang> barang = new List<DataBarang>();
        public DataKehidupan kehidupan = new DataKehidupan();
        public DataOjol ojol = new DataOjol();
        public DataBensin bensin = new DataBensin();

        public static DataFitur Muat(string fitur, string fitur2)
        {
            var d = new DataFitur();
            try
            {
                if (!string.IsNullOrEmpty(fitur))
                {
                    var f = JObject.Parse(fitur);
                    d.jurusan = f["jurusan"]?.ToObject<List<DataJurusan>>() ?? d.jurusan;
                    d.latar = f["latar"]?.ToObject<List<DataAsal>>() ?? d.latar;
                    d.traits = f["traits"]?.ToObject<List<DataTrait>>() ?? d.traits;
                    d.asal = f["asal"]?.ToObject<List<DataAsal>>() ?? d.asal;
                    d.cuaca = f["cuaca"]?.ToObject<List<DataCuaca>>() ?? d.cuaca;
                    d.barang = f["barang"]?.ToObject<List<DataBarang>>() ?? d.barang;
                    d.kehidupan = f["kehidupan"]?.ToObject<DataKehidupan>() ?? d.kehidupan;
                    d.ojol = f["ojol"]?.ToObject<DataOjol>() ?? d.ojol;
                }
                if (!string.IsNullOrEmpty(fitur2))
                    d.bensin = JObject.Parse(fitur2)["bensin"]?.ToObject<DataBensin>() ?? d.bensin;
            }
            catch (Exception e) { Debug.LogWarning("[Inti] data fitur gagal dibaca: " + e.Message); }
            return d;
        }

        public DataJurusan Jurusan(string id) { foreach (var j in jurusan) if (j.id == id) return j; return null; }
        public DataAsal Asal(string id) { foreach (var a in latar) if (a.id == id) return a; foreach (var a in asal) if (a.id == id) return a; return null; }
        public DataBarang Barang(string id) { foreach (var b in barang) if (b.id == id) return b; return null; }

        /// <summary>Pengali jurusan (bawaan bila jurusan/kunci tidak ada).</summary>
        public float Pengali(string idJurusan, string kunci, float bawaan = 1f)
        {
            var j = Jurusan(idJurusan);
            return j != null && j.pengali != null && j.pengali.TryGetValue(kunci, out var v) ? v : bawaan;
        }

        /// <summary>Cuaca "tetap" dari nomor hari (hash), sama dengan cuacaHari() di web. 2 hari pertama cerah.</summary>
        public DataCuaca CuacaHari(int hari, float pengaliHujan = 1f)
        {
            if (cuaca.Count == 0) return null;
            if (hari <= 2) return cuaca[0];
            double total = 0;
            foreach (var c in cuaca) total += c.peluang * (c.id is "hujan" or "badai" ? pengaliHujan : 1f);
            double r = AsliCpp.CuacaAcak(hari) * total, acc = 0;
            foreach (var c in cuaca)
            {
                acc += c.peluang * (c.id is "hujan" or "badai" ? pengaliHujan : 1f);
                if (r < acc) return c;
            }
            return cuaca[0];
        }
    }
}
