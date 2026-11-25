// Upgrade perabot kamar (port sim.ts cekUpgrade/beliUpgrade). Harga & efek dari Data/upgrades.json.
using System;
using System.Collections.Generic;
using MS.Kontrak;

namespace MS.Inti
{
    public class UpgradeKamar : IUpgradeKamar
    {
        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly PenerimaAksi aksi;
        readonly List<InfoPerabot> daftar = new List<InfoPerabot>();

        public bool Terbuka { get; private set; }
        public IReadOnlyList<InfoPerabot> Daftar { get { Segarkan(); return daftar; } }
        public event Action Berubah;

        public UpgradeKamar(DataGame d, DataSimpan simpan, StatPemain st, PenerimaAksi pa)
        { data = d; s = simpan; stat = st; aksi = pa; }

        public int Level(string id) => s.LevelPerabot(id);

        static LevelUpgrade Cari(DataUpgrade u, int level)
        {
            foreach (var l in u.levels) if (l.level == level) return l;
            return null;
        }

        DataUpgrade Def(string id)
        {
            foreach (var u in data.Upgrade) if (u.id == id) return u;
            return null;
        }

        /// <summary>Isi ulang daftar (objek InfoPerabot dipakai ulang).</summary>
        void Segarkan()
        {
            while (daftar.Count < data.Upgrade.Count) daftar.Add(new InfoPerabot());
            if (daftar.Count > data.Upgrade.Count) daftar.RemoveRange(data.Upgrade.Count, daftar.Count - data.Upgrade.Count);
            for (int i = 0; i < data.Upgrade.Count; i++)
            {
                var u = data.Upgrade[i]; var info = daftar[i];
                int lv = s.LevelPerabot(u.id);
                var kini = Cari(u, lv); var lanjut = Cari(u, lv + 1);
                int maks = 0; foreach (var l in u.levels) maks = Math.Max(maks, l.level);
                info.Id = u.id; info.Nama = u.nama; info.Ikon = u.ikon;
                info.Level = lv; info.LevelMaks = maks;
                info.LabelSekarang = kini?.label; info.DeskripsiSekarang = kini?.deskripsi;
                info.LabelBerikut = lanjut?.label; info.DeskripsiBerikut = lanjut?.deskripsi;
                info.HargaBerikut = lanjut != null ? lanjut.harga : -1;
            }
        }

        public void Buka() { Terbuka = true; Berubah?.Invoke(); }
        public void Tutup() { if (!Terbuka) return; Terbuka = false; Berubah?.Invoke(); }

        public bool BolehBeli(string id, out string alasan)
        {
            alasan = null;
            var u = Def(id);
            if (u == null) { alasan = "Perabot tidak dikenal."; return false; }
            var lanjut = Cari(u, s.LevelPerabot(id) + 1);
            if (lanjut == null) { alasan = "✨ Sudah level maksimal!"; return false; }
            int batas = data.Bal.upgrade.bolehUtang ? data.Bal.batas.uangMin : 0; // upgrade tidak boleh berutang
            if (stat.Uang - lanjut.harga < batas) { alasan = "💸 Uangnya belum cukup. Kerja sambilan dulu yuk!"; return false; }
            return true;
        }

        public void Beli(string id)
        {
            if (!BolehBeli(id, out var alasan)) { aksi.Umumkan(alasan); return; }
            var u = Def(id);
            var lanjut = Cari(u, s.LevelPerabot(id) + 1);
            if (s.perabot == null) s.perabot = new Dictionary<string, int>();
            s.perabot[id] = lanjut.level;
            stat.TambahUang(-lanjut.harga);
            Layanan.Audio?.Mainkan("upgrade");
            Berubah?.Invoke();
            aksi.Umumkan("✨ " + u.ikon + " " + lanjut.label + " terpasang!  💰 −" + AturanHarian.Rupiah(lanjut.harga) + "\n👉 " + lanjut.deskripsi);
        }
    }
}
