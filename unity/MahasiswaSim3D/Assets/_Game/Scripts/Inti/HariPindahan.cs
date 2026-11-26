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

        internal static bool AksiKhusus(string id) => id is "ambilPindahan" or "tataLaptop";

        internal string Alasan(PerintahAksi aksi)
        {
            switch (aksi.Id)
            {
                case "masukKos" when save.tahapPindahan == 1 && save.barangPindahan != 7:
                    return "Angkat dua kardus dan galon di dekat gerbang dulu.";
                case "ambilPindahan":
                    if (save.tahapPindahan != 1 || !int.TryParse(aksi.Target, out var bit) || bit is not (1 or 2 or 4))
                        return "Barang ini tidak bisa diambil.";
                    return (save.barangPindahan & bit) != 0 ? "Barang sudah dibawa." : null;
                case "tataLaptop":
                    return save.tahapPindahan == 2 && !save.laptopPindahan ? null : "Laptop sudah ditata.";
                case "isiToken" when save.tahapPindahan == 2 && !save.laptopPindahan:
                    return "Tata laptop di meja sebelum memeriksa meteran.";
                default: return null;
            }
        }

        internal string Lakukan(PerintahAksi aksi)
        {
            if (aksi.Id == "ambilPindahan")
            {
                save.barangPindahan |= int.Parse(aksi.Target, System.Globalization.CultureInfo.InvariantCulture);
                return save.barangPindahan == 7 ? "Barang lengkap. Masuk ke kamar 04." : "Barang diangkat.";
            }
            save.laptopPindahan = true;
            save.dayaListrik = System.Math.Min(1f, save.dayaListrik);
            Layanan.Audio?.Mainkan("notif");
            return "Laptop ditata. Meteran berbunyi. Isi token di depan kamar atau lewat DompetKu.";
        }

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
                1 => ("Bu Ratna · Selamat datang", "Kamar 04 buat kamu. Angkat dua kardus dan galon di dekat gerbang. Gerbang dikunci jam sebelas malam, dan tolong jangan pakai alat berdaya besar."),
                2 => ("Kamar 04 · Menata meja", "Taruh laptop di meja. Setelah meteran berbunyi, isi token dari koridor atau dari DompetKu."),
                3 => ("Bima · Makan siang", "Aku anak kamar sebelah. Yuk ke Warteg Bahari. Tanya Mbak Yanti dan pesan lauk yang kamu sanggupi."),
                4 => ("Sari · Grup Angkatan", "Ambil atribut OSPEK di kampus. Nanti periksa jadwal dan siapkan pilihan kelas untuk KRS War."),
                _ => evaluasi
                    ? ("Ringkasan hari pindahan", $"Saldo {AturanHarian.Rupiah(save.uang)} · Energi {save.energi:0}% ({save.energi - save.energiAwalPindahan:+0;-0;0}) · Target besok: cek jadwal dan siapkan sarapan.")
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
            if (save.tahapPindahan == 4 && id == "kuliah" && scene == "Gedung_kampus")
            {
                save.ospekPindahan = true;
                SimpanMuat.Simpan(save);
            }
            bool lanjut = save.tahapPindahan switch
            {
                1 => id == "masukKos",
                2 => id == "isiToken" && save.laptopPindahan,
                4 => save.ospekPindahan && (id is "kuliah" or "krsWar") &&
                    (save.semesterKrs == save.semester || UnityEngine.Application.isMobilePlatform),
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
