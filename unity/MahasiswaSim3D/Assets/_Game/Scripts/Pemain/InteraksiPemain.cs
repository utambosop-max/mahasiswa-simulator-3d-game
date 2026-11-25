using System;
using MS.Kontrak;
using UnityEngine;

namespace MS.Pemain
{
    /// <summary>Mencari TitikInteraksi terdekat dalam radius, lalu mengumumkannya lewat Layanan.Konteks agar HUD bisa menampilkan tombol aksi.</summary>
    public class InteraksiPemain : MonoBehaviour, IKonteksInteraksi
    {
        public TitikInteraksi Terdekat { get; private set; }
        public bool AksiTersedia => Terdekat != null;
        public string AlasanTerakhir { get; private set; } // alasan penolakan untuk toast UI

        public event Action<TitikInteraksi> TerdekatBerubah;

        // --- IKonteksInteraksi (dibaca HUD) ---
        public PerintahAksi? Utama { get; private set; }
        public string NamaUtama { get; private set; }
        public PerintahAksi? Tambahan { get; private set; }
        public string NamaTambahan { get; private set; }
        public event Action Berubah;
        public event Action MintaUtama;
        bool tadiNaik;

        void OnEnable() { Layanan.Konteks = this; }
        void OnDisable() { if (ReferenceEquals(Layanan.Konteks, this)) Layanan.Konteks = null; }

        void Update()
        {
            Vector3 p = transform.position;
            TitikInteraksi best = null;
            float bestD = float.MaxValue;
            var daftar = TitikInteraksi.Semua;
            for (int i = 0; i < daftar.Count; i++)
            {
                var t = daftar[i];
                Vector3 d = t.transform.position - p; d.y = 0f; // jarak datar saja
                float d2 = d.sqrMagnitude;
                if (d2 <= t.radius * t.radius && d2 < bestD) { bestD = d2; best = t; }
            }
            var hidup = MS.Inti.GameInti.Instans != null ? MS.Inti.GameInti.Instans.Hidup : null;
            bool naik = hidup != null && hidup.NaikMotor;
            if (best != Terdekat || naik != tadiNaik)
            {
                Terdekat = best; tadiNaik = naik;
                IsiKonteks(best);
                if (best == null && naik)
                {
                    Utama = new PerintahAksi("turunMotor"); NamaUtama = "🅿️ Turun";
                    Tambahan = new PerintahAksi("narikOjol"); NamaTambahan = "📦 Narik Ojol";
                }
                TerdekatBerubah?.Invoke(best); Berubah?.Invoke();
            }
            // Tombol dicek SETELAH konteks diperbarui agar memakai titik yang benar di frame ini (temuan QA)
            var kb = UnityEngine.InputSystem.Keyboard.current; // E / Spasi = aksi utama (PC)
            if (kb != null && (kb.eKey.wasPressedThisFrame || kb.spaceKey.wasPressedThisFrame) && !Layanan.InputDitahan)
            {
                if (MintaUtama != null) MintaUtama(); // HUD yang memutuskan (buka menu / jalankan)
                else Lakukan();
            }
        }

        // Hanya dipanggil saat titik terdekat berganti, jadi aman membuat string/struct di sini.
        void IsiKonteks(TitikInteraksi t)
        {
            if (t == null) { Utama = null; NamaUtama = null; Tambahan = null; NamaTambahan = null; return; }
            string target = string.IsNullOrEmpty(t.target) ? null : t.target;
            Utama = new PerintahAksi(t.idAksi, target);
            NamaUtama = string.IsNullOrEmpty(t.nama) ? t.idAksi : t.nama;
            bool adaTambahan = !string.IsNullOrEmpty(t.idAksiTambahan);
            Tambahan = adaTambahan ? new PerintahAksi(t.idAksiTambahan, string.IsNullOrEmpty(t.targetTambahan) ? null : t.targetTambahan) : (PerintahAksi?)null;
            NamaTambahan = adaTambahan ? (string.IsNullOrEmpty(t.namaTambahan) ? t.idAksiTambahan : t.namaTambahan) : null;
        }

        /// <summary>Jalankan aksi utama titik terdekat (tombol keyboard E / Spasi). False + AlasanTerakhir bila ditolak.</summary>
        public bool Lakukan()
        {
            if (!Utama.HasValue) { AlasanTerakhir = "Nggak ada yang bisa dilakukan di sini."; return false; }
            var aksi = Layanan.Aksi;
            if (aksi == null) { AlasanTerakhir = "Sistem aksi belum siap."; return false; }
            if (!aksi.BolehDilakukan(Utama.Value, out string alasan)) { AlasanTerakhir = alasan; return false; }
            AlasanTerakhir = null;
            aksi.Lakukan(Utama.Value);
            return true;
        }
    }
}
