using System;
using MS.Kontrak;
using UnityEngine;

namespace MS.Inti
{
    /// <summary>Stat pemain dengan clamp dari balance.json. UI hanya membaca lewat IStatPemain.</summary>
    public class StatPemain : IStatPemain, IVitalPemain
    {
        readonly DataSimpan s;
        readonly DataBalance b;
        public event Action Berubah;

        public StatPemain(DataSimpan simpan, DataBalance bal) { s = simpan; b = bal; Rapikan(); }

        public int Uang => s.uang;
        public float Ipk => s.ipk;
        public float Energi => s.energi;
        public float Stres => s.stres;

        public float Kenyang => s.kenyang;
        public float Maag => s.maag;
        public float Hidrasi => s.hidrasi;
        public float Kebersihan => s.kebersihan;
        public float MasukAngin => s.masukAngin;
        public float Kejenuhan => s.kejenuhan;
        public float Fokus => Mathf.Clamp(Energi - .65f * (100f - Kenyang) - .85f * Maag - .4f * Stres,
            0f, Maag >= b.vital.maagAkut ? 25f : 100f);

        public bool Lemas => s.energi < b.ambang.energiLemas;
        public bool StresTinggi => s.stres >= b.ambang.stresTinggi;

        /// <summary>Tambahkan efek (boleh negatif) lalu clamp.</summary>
        public void Terapkan(Efek e)
        {
            s.uang += Mathf.RoundToInt(e.uang);
            s.ipk += e.ipk;
            s.energi += e.energi;
            s.stres += e.stres;
            Rapikan();
            Berubah?.Invoke();
        }

        public void TambahUang(int n) { s.uang += n; Rapikan(); Berubah?.Invoke(); }

        /// <summary>Set langsung energi & stres (pulang kampung).</summary>
        public void Atur(float energi, float stres) { s.energi = energi; s.stres = stres; Rapikan(); Berubah?.Invoke(); }

        internal void PerbaruiVital() { Rapikan(); Berubah?.Invoke(); }

        void Rapikan()
        {
            s.uang = Math.Max(b.batas.uangMin, s.uang);
            s.ipk = Mathf.Round(Mathf.Clamp(s.ipk, 0f, 4f) * 1000f) / 1000f;
            s.energi = Mathf.Clamp(s.energi, 0f, 100f);
            s.stres = Mathf.Clamp(s.stres, 0f, 100f);
            s.kenyang = Mathf.Clamp(s.kenyang, 0f, 100f);
            s.hidrasi = Mathf.Clamp(s.hidrasi, 0f, 100f);
            s.maag = Mathf.Clamp(s.maag, 0f, 100f);
            s.masukAngin = Mathf.Clamp(s.masukAngin, 0f, 100f);
            s.kejenuhan = Mathf.Clamp(s.kejenuhan, 0f, 100f);
        }
    }
}
