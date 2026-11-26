using System;
using UnityEngine;

namespace MS.UI
{
    internal sealed class TantanganKosanOs
    {
        enum Mekanik { Urutan, Waktu, Kejar }

        sealed class Aturan
        {
            internal readonly string Judul, Petunjuk;
            internal readonly float Durasi;
            internal readonly Mekanik Cara;
            internal readonly string[] Pilihan;

            internal Aturan(string judul, string petunjuk, float durasi, Mekanik cara, params string[] pilihan)
            {
                Judul = judul;
                Petunjuk = petunjuk;
                Durasi = durasi;
                Cara = cara;
                Pilihan = pilihan;
            }
        }

        static readonly Aturan[] Daftar =
        {
            new("KRS War", "Klik slot yang diminta sebelum server mengganti antrian.", 25, Mekanik.Kejar, "07.00", "10.00", "13.00", "15.00"),
            new("Sidak kos", "Amankan alat listrik sesuai petunjuk.", 15, Mekanik.Urutan, "Cabut steker", "Tutup penanak nasi", "Simpan ke lemari"),
            new("Masak mi", "Masukkan bahan saat penanda mencapai zona hijau.", 15, Mekanik.Waktu, "Masukkan bumbu"),
            new("Kerokan", "Ikuti ritme pendek pada bagian tengah bilah.", 20, Mekanik.Waktu, "Gerakkan koin"),
            new("Titip Absen", "Ikuti rangkaian goresan sesuai urutan.", 10, Mekanik.Urutan, "Lengkung", "Garis turun", "Ekor"),
            new("Ngebut tugas", "Pilih potongan kode yang diminta sebelum notifikasi mengganggu.", 20, Mekanik.Kejar, "input", "loop", "return", "test"),
            new("Tambal ban", "Lepas baut, pasang tambal, lalu pompa.", 20, Mekanik.Urutan, "Lepas baut", "Pasang tambal", "Pompa 32 PSI"),
            new("Negosiasi", "Ajukan argumen saat simpati mencapai zona hijau.", 15, Mekanik.Waktu, "Sampaikan argumen"),
            new("Sidang skripsi", "Pilih kartu referensi sesuai pertanyaan pada tiap gelombang.", 90, Mekanik.Kejar, "Metode", "Temuan", "Rujukan", "Batas studi"),
        };

        readonly DaftarModal modal;
        Aturan aturan;
        Action<int> selesai;
        float mulai;
        int benar, salah, langkah;
        int tampilDetik = -1, tampilTarget = -1;
        bool tampilZona;

        internal TantanganKosanOs(DaftarModal modal) => this.modal = modal;
        internal bool Aktif => aturan != null;
        internal static string Nama(int nomor) => Daftar[nomor].Judul;

        internal void Mulai(int nomor, Action<int> saatSelesai, Action kembali)
        {
            aturan = Daftar[nomor];
            selesai = saatSelesai;
            mulai = Time.unscaledTime;
            benar = salah = langkah = 0;
            tampilDetik = tampilTarget = -1;
            modal.Tampil(true, aturan.Judul, aturan.Petunjuk);
            for (int i = 0; i < aturan.Pilihan.Length; i++)
            {
                int opsi = i;
                modal.Tambah(aturan.Pilihan[i], "", true, () => Pilih(opsi));
            }
            modal.Tambah("Akhiri", "", true, Akhiri);
            modal.Tambah("Batalkan", "", true, () => { Batal(); kembali(); });
        }

        internal void Batal()
        {
            aturan = null;
            selesai = null;
        }

        int Target(float waktu) => aturan.Cara == Mekanik.Kejar
            ? ((int)(waktu / 1.4f) + langkah) % aturan.Pilihan.Length
            : langkah % aturan.Pilihan.Length;

        bool Zona(float waktu)
        {
            float penanda = Mathf.PingPong(waktu * 1.45f, 1f);
            return penanda >= .39f && penanda <= .61f;
        }

        internal void Tick()
        {
            if (!Aktif) return;
            float waktu = Time.unscaledTime - mulai;
            if (waktu >= aturan.Durasi) { Akhiri(); return; }
            int detik = Mathf.CeilToInt(aturan.Durasi - waktu);
            int target = Target(waktu);
            bool zona = Zona(waktu);
            if (detik == tampilDetik && target == tampilTarget && zona == tampilZona) return;
            tampilDetik = detik;
            tampilTarget = target;
            tampilZona = zona;
            string arahan = aturan.Cara == Mekanik.Waktu ? (zona ? "Hijau · tekan sekarang" : "Tunggu zona hijau") : aturan.Pilihan[target];
            modal.AturRingkasan($"{aturan.Petunjuk}\n{detik} dtk · {arahan} · Benar {benar}, salah {salah}");
        }

        void Pilih(int opsi)
        {
            if (!Aktif) return;
            float waktu = Time.unscaledTime - mulai;
            bool cocok = aturan.Cara == Mekanik.Waktu ? Zona(waktu) : opsi == Target(waktu);
            if (cocok) { benar++; langkah++; }
            else salah++;
            if (benar >= 5 || (aturan.Cara == Mekanik.Urutan && benar >= aturan.Pilihan.Length))
                Akhiri();
            else
                tampilDetik = -1;
        }

        void Akhiri()
        {
            if (!Aktif) return;
            int target = aturan.Cara == Mekanik.Urutan ? aturan.Pilihan.Length : 5;
            int skor = Mathf.Clamp(benar * 100 / target - salah * 10, 0, 100);
            var lapor = selesai;
            Batal();
            lapor(skor);
        }
    }
}
