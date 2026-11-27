using System;
using System.Collections.Generic;
using UnityEngine;

namespace MS.Inti
{
    public sealed class Moodlet
    {
        [Serializable] public sealed class Definisi
        {
            public string id, ikon, judul;
            public int durasi;
            public float stres, fokus;
        }

        [Serializable] sealed class Setelan { public Definisi[] daftar; }

        readonly DataSimpan simpan;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly Definisi[] daftar;
        float Kini => (jam.Hari - 1) * 1440f + jam.Menit;
        int hariTanggal = -1;

        public Moodlet(DataSimpan simpan, StatPemain stat, JamGame jam)
        {
            this.simpan = simpan;
            this.stat = stat;
            this.jam = jam;
            simpan.moodletHingga ??= new Dictionary<string, float>();
            var json = Resources.Load<TextAsset>("moodlet");
            daftar = json != null ? JsonUtility.FromJson<Setelan>(json.text).daftar : Array.Empty<Definisi>();
        }

        public IEnumerable<(Definisi data, int menit)> Aktif()
        {
            foreach (var item in daftar)
                if (simpan.moodletHingga.TryGetValue(item.id, out float hingga) && hingga > Kini)
                    yield return (item, Mathf.CeilToInt(hingga - Kini));
        }

        public void Aksi(string id)
        {
            if (id == "bersihKamar") Tambah("bersih");
            if (id.StartsWith("makan", StringComparison.OrdinalIgnoreCase) || id is "masakMi" or "gerobakNasgor")
                Tambah("kenyang");
        }

        public void Pesan(string isi)
        {
            if (!string.IsNullOrEmpty(isi) && (isi.Contains("diomelin", StringComparison.OrdinalIgnoreCase) ||
                isi.Contains("dosen negur", StringComparison.OrdinalIgnoreCase)))
                Tambah("dosen");
        }

        public void Segarkan()
        {
            if (jam.TanggalTua && hariTanggal != jam.Hari && stat.Uang < 150000)
            {
                hariTanggal = jam.Hari;
                Tambah("tanggal");
            }
            float bonus = 0;
            foreach (var (data, _) in Aktif()) bonus += data.fokus;
            stat.BonusFokusMoodlet = bonus;
        }

        void Tambah(string id)
        {
            var efek = Array.Find(daftar, item => item.id == id);
            if (efek == null) return;
            if (simpan.moodletHingga.TryGetValue(id, out var hingga) && hingga > Kini) return;
            simpan.moodletHingga[id] = Kini + efek.durasi;
            stat.Atur(stat.Energi, stat.Stres + efek.stres);
        }
    }
}
