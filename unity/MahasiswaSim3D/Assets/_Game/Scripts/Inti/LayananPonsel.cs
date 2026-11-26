using System;
using System.Globalization;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Inti
{
    internal sealed class LayananPonsel
    {
        const int PokokDana = 100000;
        readonly DataSimpan save;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly EventAcak eventAcak;

        internal LayananPonsel(DataSimpan save, StatPemain stat, JamGame jam, EventAcak eventAcak)
        {
            this.save = save;
            this.stat = stat;
            this.jam = jam;
            this.eventAcak = eventAcak;
        }

        int Utang => save.danaHari == 0 ? 0
            : (int)Math.Min(int.MaxValue, Math.Ceiling(PokokDana * Math.Pow(1.08, Math.Max(0, save.hari - save.danaHari))));

        internal bool Tangani(string id) => id is "pinjamDana" or "lunasiDana" or "krsWar" or "titipAbsen";

        internal string Cek(string id) => id switch
        {
            "pinjamDana" when save.semester < 2 => "DanaKilat tersedia mulai semester 2.",
            "pinjamDana" when Utang > 0 => "Lunasi tagihan sebelumnya terlebih dahulu.",
            "lunasiDana" when Utang == 0 => "Belum ada tagihan.",
            "lunasiDana" when stat.Uang < Utang => "Tagihan " + AturanHarian.Rupiah(Utang) + ". Saldo kurang.",
            "krsWar" when save.semesterKrs == save.semester => "Jadwal semester ini sudah terdaftar.",
            "titipAbsen" when save.hari < 8 => "Titip Absen tersedia mulai minggu 2.",
            "titipAbsen" when save.hariTitip == save.hari => "Sudah mencoba titip absen hari ini.",
            "titipAbsen" when jam.Fase != Fase.Pagi && jam.Fase != Fase.Siang => "Titip Absen hanya saat sesi kuliah.",
            _ => null
        };

        internal string Jalankan(PerintahAksi perintah)
        {
            int.TryParse(perintah.Target, NumberStyles.None, CultureInfo.InvariantCulture, out int skor);
            skor = Mathf.Clamp(skor, 0, 100);
            switch (perintah.Id)
            {
                case "pinjamDana":
                    save.danaHari = save.hari;
                    stat.TambahUang(PokokDana);
                    return "DanaKilat mencairkan Rp100.000 dengan bunga 8% per hari.";
                case "lunasiDana":
                    int biaya = Utang;
                    save.danaHari = 0;
                    stat.TambahUang(-biaya);
                    return "Tagihan DanaKilat lunas " + AturanHarian.Rupiah(biaya) + ".";
                case "krsWar":
                    save.semesterKrs = save.semester;
                    save.jadwalKrs = skor >= 65 ? "Siang" : "Pagi";
                    return "KRS terdaftar. Jadwal pilihan: " + save.jadwalKrs + ".";
                case "titipAbsen":
                    save.hariTitip = save.hari;
                    if (skor < 60)
                    {
                        stat.Terapkan(new Efek { stres = 8 });
                        return "Titip absen gagal. Dosen memeriksa daftar hadir.";
                    }
                    if (jam.Fase == Fase.Pagi) save.hadirPagi = true;
                    else save.hadirSiang = true;
                    return "Teman mengonfirmasi titip absen untuk sesi ini.";
                default:
                    return "";
            }
        }

        internal void Periksa()
        {
            if (Layanan.InputDitahan || jam.Sibuk || save.hariPenagih == save.hari ||
                SceneManager.GetActiveScene().name != "Kampung" || Utang <= 2 * PokokDana) return;
            save.hariPenagih = save.hari;
            var situasi = new DataEvent
            {
                id = "penagihDanaKilat",
                judul = "Penagih DanaKilat",
                teks = $"Penagih menunggu di gerbang kos. Tagihan kini {AturanHarian.Rupiah(Utang)}."
            };
            situasi.pilihan.Add(new PilihanEvent { label = "Cek saldo dan bayar lewat aplikasi", efek = new Efek { stres = 5 } });
            eventAcak.TampilkanLuar(situasi, _ => SimpanMuat.Simpan(save));
        }
    }
}
