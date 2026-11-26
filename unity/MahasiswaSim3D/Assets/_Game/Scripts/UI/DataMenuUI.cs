using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;
using UnityEngine;

namespace MS.UI
{
    /// <summary>Satu baris menu untuk ditampilkan (hanya data tampilan, bukan logika beli).</summary>
    internal sealed class ItemMenuUI
    {
        public string Id, Nama, Ikon, Kategori;
        public int HargaDasar;
        public float Energi, Stres, Karbo, Protein, Serat, Maag;
    }

    /// <summary>
    /// Membaca aksi.json + menu.json + balance.json untuk panel menu makan.
    /// Pemetaan aksi -> tempat SAMA dengan PenerimaAksi (daftar AksiMenu + kolom "tempat" di aksi.json).
    /// </summary>
    internal sealed class DataMenuUI
    {
        // Salinan dari PenerimaAksi.AksiMenu (MS.UI tidak boleh merujuk MS.Inti).
        private static readonly string[] AksiMenu = { "makanWarteg", "ngopi", "belanja", "makanPasar", "makanKafe", "gerobakNasgor" };
        private static readonly List<ItemMenuUI> Kosong = new List<ItemMenuUI>();

        private readonly Dictionary<string, string> tempatAksi = new Dictionary<string, string>();
        private readonly Dictionary<string, List<ItemMenuUI>> menu = new Dictionary<string, List<ItemMenuUI>>();
        private float pengali = 1.2f;
        private int naikTanggalTua = 2000;

        public static DataMenuUI Muat(TextAsset aksi, TextAsset menuJson, TextAsset balance)
        {
            var d = new DataMenuUI();
            try
            {
                if (aksi != null)
                {
                    var akar = JObject.Parse(aksi.text);
                    foreach (var id in AksiMenu)
                        if (akar[id] is JObject a && a.Value<string>("jenis") == "menu")
                            d.tempatAksi[id] = a.Value<string>("tempat");
                }
                if (menuJson != null)
                {
                    var akar = JObject.Parse(menuJson.text);
                    var n = akar["catatan"]?["kenaikanHargaTanggalTua"];
                    if (n != null) d.naikTanggalTua = n.Value<int>();
                    foreach (var p in akar.Properties())
                    {
                        if (!(p.Value is JArray daftar)) continue; // "catatan" dll. dilewati
                        var isi = new List<ItemMenuUI>();
                        foreach (var t in daftar)
                        {
                            if (!(t is JObject m)) continue;
                            var efek = m["efek"] as JObject;
                            isi.Add(new ItemMenuUI
                            {
                                Id = m.Value<string>("id"),
                                Nama = m.Value<string>("nama"),
                                Ikon = m.Value<string>("ikon"),
                                HargaDasar = m.Value<int?>("harga") ?? 0,
                                Energi = efek?.Value<float?>("energi") ?? 0f,
                                Kategori = m.Value<string>("kategori"),
                                Karbo = m.Value<float?>("karbo") ?? 0f,
                                Protein = m.Value<float?>("protein") ?? 0f,
                                Serat = m.Value<float?>("serat") ?? 0f,
                                Maag = m.Value<float?>("maag") ?? 0f,
                                Stres = efek?.Value<float?>("stres") ?? 0f,
                            });
                        }
                        d.menu[p.Name] = isi;
                    }
                }
                if (balance != null)
                {
                    var p = JObject.Parse(balance.text)["hargaMakan"]?["pengali"];
                    if (p != null) d.pengali = p.Value<float>();
                }
            }
            catch (Exception e) { Debug.LogWarning("[UI] Gagal membaca data menu: " + e.Message); }
            return d;
        }

        /// <summary>True bila aksi ini aksi beli menu (tombolnya membuka panel).</summary>
        public bool AksiBeliMenu(string idAksi) => idAksi != null && tempatAksi.ContainsKey(idAksi);

        public List<ItemMenuUI> Daftar(string idAksi, out string tempat)
        {
            tempat = null;
            if (idAksi == null || !tempatAksi.TryGetValue(idAksi, out tempat) || tempat == null) return Kosong;
            return menu.TryGetValue(tempat, out var d) && d != null ? d : Kosong;
        }

        /// <summary>
        /// DUPLIKAT rumus PenerimaAksi.HargaMenu (hanya untuk tampilan). Pindahkan ke Kontrak bila sudah tersedia.
        /// Warteg +naik saat tanggal tua; x hargaMakan.pengali; bulat Rp500; minimal Rp1.000.
        /// </summary>
        public int Harga(string tempat, ItemMenuUI m, bool tanggalTua)
        {
            int naik = tempat == "warteg" && tanggalTua ? naikTanggalTua : 0;
            float h = (m.HargaDasar + naik) * pengali;
            return Math.Max(1000, (int)Math.Round(h / 500f) * 500);
        }
    }
}
