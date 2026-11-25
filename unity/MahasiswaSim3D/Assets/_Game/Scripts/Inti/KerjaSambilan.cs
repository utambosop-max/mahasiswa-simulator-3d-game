// Kerja sambilan warteg/warkop (port sim.ts hitungGaji/selesaiKerja). Angka dari Data/kerja.json.
using System;
using System.Collections.Generic;
using MS.Kontrak;
using Newtonsoft.Json;
using UnityEngine;

namespace MS.Inti
{
    public class DataTempatKerja
    {
        public string nama, ikon, bos;
        public int gajiDasar, bayarPerPesanan, tipMaks, jumlahPelanggan;
        public float stresPerGagal, stresSempurna;
    }

    /// <summary>
    /// gaji = gajiDasar × (dilayani / jumlahPelanggan) × (0,5 bila lemas) + benar × bayarPerPesanan + tips.
    /// Belum diport: pengali jurusan, pengalaman kerja, bonus bos akrab.
    /// </summary>
    public class KerjaSambilan : IKerja
    {
        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly PenerimaAksi aksi;
        readonly Dictionary<string, DataTempatKerja> tempat = new Dictionary<string, DataTempatKerja>();
        readonly Efek efek = new Efek();
        float pengaliLemas = 0.5f;
        /// <summary>Pengali gaji jurusan (Ekonomi ×1,1), diisi GameInti.</summary>
        public Func<float> pengaliGaji = () => 1f;
        /// <summary>Bonus gaji (Rp) per tempat dari bos yang akrab.</summary>
        public Func<string, int> bonusGaji = t => 0;
        /// <summary>Dipanggil setelah shift selesai (id tempat) → statistik cerita "kerja_warkop".</summary>
        public Action<string> SetelahShift;

        public string Aktif { get; private set; }
        public string DataKerjaJson { get; }
        public string DataMenuJson { get; }
        public bool Lemas => stat.Lemas;
        public event Action Berubah;

        public KerjaSambilan(DataGame d, DataSimpan simpan, StatPemain st, PenerimaAksi pa, string kerjaJson, string menuJson)
        {
            data = d; s = simpan; stat = st; aksi = pa;
            DataKerjaJson = kerjaJson; DataMenuJson = menuJson;
            if (string.IsNullOrEmpty(kerjaJson)) { Debug.LogWarning("[Inti] kerja.json belum di-assign."); return; }
            try
            {
                var akar = Newtonsoft.Json.Linq.JObject.Parse(kerjaJson);
                foreach (var id in new[] { "warteg", "warkop" })
                    if (akar[id] != null) tempat[id] = akar[id].ToObject<DataTempatKerja>();
                if (akar["pengaliGajiSaatLemas"] != null) pengaliLemas = akar.Value<float>("pengaliGajiSaatLemas");
            }
            catch (Exception e) { Debug.LogWarning("[Inti] kerja.json gagal dibaca: " + e.Message); }
        }

        static string IdAksi(string t) => t == "warkop" ? "kerjaWarkop" : "kerjaWarteg";

        /// <summary>Dipanggil PenerimaAksi saat aksi kerja disetujui.</summary>
        public void Buka(string idTempat)
        {
            if (Aktif != null || idTempat == null || !tempat.ContainsKey(idTempat)) return;
            Aktif = idTempat;
            Berubah?.Invoke();
        }

        public RincianGaji Hitung(HasilKerja h)
        {
            if (Aktif == null || !tempat.TryGetValue(Aktif, out var k)) return default;
            int benar = Math.Max(0, h.Benar), gagal = Math.Max(0, h.Gagal);
            int dilayani = Math.Min(k.jumlahPelanggan, benar + gagal);
            bool lemas = stat.Lemas;
            float pj = pengaliGaji();
            float pengali = (lemas ? pengaliLemas : 1f) * pj;
            int dasar = Mathf.RoundToInt(k.gajiDasar * pengali * dilayani / Math.Max(1, k.jumlahPelanggan) / 500f) * 500;
            int bonus = Mathf.RoundToInt(Math.Min(benar, k.jumlahPelanggan) * k.bayarPerPesanan * pj / 100f) * 100;
            if (dilayani > 0) bonus += bonusGaji(Aktif);
            // Tip dibatasi: tidak boleh lebih dari tipMaks per pelanggan (anti-curang dari UI)
            int tips = Mathf.RoundToInt(Mathf.Clamp(h.Tips, 0f, k.tipMaks * Math.Min(benar, k.jumlahPelanggan)));
            data.Aksi.TryGetValue(IdAksi(Aktif), out var a);
            float energi = a != null ? a.efek.energi : 0f;
            float stres = (a != null ? a.efek.stres : 0f) + gagal * k.stresPerGagal;
            if (gagal == 0 && benar > 0) stres += k.stresSempurna; // shift sempurna → puas
            return new RincianGaji(dasar, bonus, tips, energi, stres, lemas);
        }

        public RincianGaji Selesai(HasilKerja h)
        {
            if (Aktif == null) return default;
            var r = Hitung(h);
            string id = IdAksi(Aktif);
            data.Aksi.TryGetValue(id, out var a);
            efek.Kosongkan();
            efek.uang = r.Total; efek.energi = r.Energi; efek.stres = r.Stres;
            stat.Terapkan(efek);
            s.kerjaHari = s.hari;
            s.jumlahShift++;
            if (h.Gagal == 0 && h.Benar > 0) s.shiftSempurna++;
            SetelahShift?.Invoke(Aktif);
            Aktif = null;
            Berubah?.Invoke();
            string pesan = (a != null ? a.ikon + " " + a.pesan : "💼 Shift selesai!") + " ✅" + h.Benar + " ❌" + h.Gagal + "  +" + AturanHarian.Rupiah(r.Total);
            if (r.Lemas) pesan += "\n😮‍💨 Kerja sambil lemas, gaji dasar dipotong setengah.";
            aksi.SelesaiShift(id, pesan, PenerimaAksi.LamaAksi(a));
            return r;
        }

        public void Batal()
        {
            if (Aktif == null) return;
            Aktif = null;
            Berubah?.Invoke();
        }
    }
}
