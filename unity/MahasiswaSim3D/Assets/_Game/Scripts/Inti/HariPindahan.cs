using MS.Kontrak;
using UnityEngine.SceneManagement;

namespace MS.Inti
{
    internal sealed class HariPindahan
    {
        readonly DataSimpan save;
        readonly EventAcak dialog;
        bool sedangDitampilkan;

        internal HariPindahan(DataSimpan save, EventAcak dialog)
        {
            this.save = save;
            this.dialog = dialog;
        }

        internal bool Aktif => save.tahapPindahan >= 1 && save.tahapPindahan <= 5;

        internal void Mulai()
        {
            if (save.tahapPindahan == 1 && SceneManager.GetActiveScene().name == "KamarKos")
                PindahScene.Ke("Kampung", "pintuKos");
        }

        internal void Periksa()
        {
            if (!Aktif || sedangDitampilkan || Layanan.InputDitahan || Layanan.Jam.Sibuk) return;
            int tahap = save.tahapPindahan;
            string scene = SceneManager.GetActiveScene().name;
            if (tahap == 1 && scene == "KamarKos") return;
            if (tahap == 2 && scene != "KamarKos") return;
            if (save.petunjukPindahan == tahap && (tahap != 5 || !save.tidurPindahan)) return;
            bool evaluasi = tahap == 5 && save.tidurPindahan;
            var (judul, teks) = tahap switch
            {
                1 => ("Bu Ratna · Selamat datang", "Kamar 04 buat kamu. Bawa barangmu masuk dan ingat gerbang dikunci jam sebelas malam. Tolong jangan pakai alat listrik berdaya besar."),
                2 => ("Kamar 04 · Menata meja", "Taruh laptop di meja. Meteran di koridor berbunyi saat listrik hampir habis."),
                3 => ("Bima · Makan siang", "Aku anak kamar sebelah. Yuk ke Warteg Bahari. Tanya Mbak Yanti dan pesan lauk yang kamu sanggupi."),
                4 => ("Sari · Grup Angkatan", "Ambil atribut OSPEK di kampus. Nanti periksa jadwal dan siapkan pilihan kelas untuk KRS War."),
                _ => evaluasi
                    ? ("Ringkasan hari pindahan", $"Saldo {AturanHarian.Rupiah(save.uang)} · Energi {save.energi:0}% · Target besok: cek jadwal dan siapkan sarapan.")
                    : ("Tidur pertama", "Kembali ke kamar dan beristirahat di kasur. Kegiatan hari pertama akan diringkas setelah tidur.")
            };
            var data = new DataEvent { id = "pindahan_" + tahap, judul = judul, teks = teks };
            data.pilihan.Add(new PilihanEvent { label = evaluasi ? "Mulai semester" : "Siap" });
            sedangDitampilkan = true;
            dialog.TampilkanLuar(data, _ =>
            {
                sedangDitampilkan = false;
                save.petunjukPindahan = tahap;
                if (evaluasi) save.tahapPindahan = 6;
                SimpanMuat.Simpan(save);
            });
        }

        internal void Aksi(string id)
        {
            if (!Aktif) return;
            var scene = SceneManager.GetActiveScene().name;
            bool lanjut = save.tahapPindahan switch
            {
                1 => id == "masukKos",
                2 => id is "belajar" or "nugas" && scene == "KamarKos",
                4 => id == "kuliah" && scene == "Gedung_kampus",
                _ => false
            };
            if (lanjut) SimpanTahapSelanjutnya();
            else if (save.tahapPindahan == 5 && id == "tidur" && scene == "KamarKos")
                save.tidurPindahan = true;
        }

        internal void Makan()
        {
            if (save.tahapPindahan == 3 && SceneManager.GetActiveScene().name == "Gedung_warteg")
                SimpanTahapSelanjutnya();
        }

        void SimpanTahapSelanjutnya()
        {
            save.tahapPindahan++;
            SimpanMuat.Simpan(save);
        }
    }
}
