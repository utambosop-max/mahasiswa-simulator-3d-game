using UnityEngine;

namespace MS.Inti
{
    internal sealed class KebutuhanHarian
    {
        readonly DataSimpan s;
        readonly BalVital b;
        readonly StatPemain stat;
        int sampel;
        int Menit => (s.hari - 1) * 1440 + (int)s.menit;

        internal KebutuhanHarian(DataSimpan save, BalVital balance, StatPemain stat)
        {
            s = save;
            b = balance;
            this.stat = stat;
            sampel = Menit;
        }

        internal System.Action MeteranRendah;
        int JamAbsolut => Menit / 60;

        internal bool AksiKos(string id) => id is "isiToken" or "isiGalon" or "cuciManual" or "angkatJemuran"
            or "kerjaDarurat" or "gadaiLaptop" or "tebusLaptop" or "bantuanDarurat";

        internal string Cek(string id) => id switch
        {
            "isiToken" when stat.Uang < 10000 => "Butuh Rp10.000 untuk membeli token.",
            "isiGalon" when stat.Uang < 5000 => "Butuh Rp5.000 untuk mengisi galon.",
            "cuciManual" when s.bajuKotor == 0 || s.jumlahJemuran > 0 => "Selesaikan jemuran atau tunggu pakaian kotor.",
            "angkatJemuran" when s.jumlahJemuran == 0 || JamAbsolut < s.jemuranKeringJam => "Jemuran belum siap.",
            "minum" when s.galonGelas <= 0 => "Galon kosong. Isi ulang atau beli minuman.",
            "nugas" when s.laptopDigadai => "Tebus laptop sebelum mengerjakan tugas di kamar.",
            "nugas" or "masakMi" when s.tahapPindahan > 0 && s.dayaListrik <= 0 => "Listrik habis. Isi ulang token.",
            "kerjaDarurat" when s.hariBantuan == s.hari || stat.Energi < 12 => "Kerja serabutan sekali sehari dan perlu 12 energi.",
            "gadaiLaptop" when s.laptopDigadai || stat.Uang > 20000 => "Gadai tersedia saat saldo ≤ Rp20.000 dan laptop belum digadai.",
            "tebusLaptop" when !s.laptopDigadai || stat.Uang < 90000 => "Tidak ada laptop yang dapat ditebus atau saldo kurang.",
            "bantuanDarurat" when s.hariBantuan == s.hari || stat.Uang > 15000 => "Bantuan darurat sekali sehari saat saldo ≤ Rp15.000.",
            _ => null
        };

        internal string Jalankan(string id)
        {
            switch (id)
            {
                case "isiToken":
                    stat.TambahUang(-10000); s.dayaListrik += 8f;
                    return "Token masuk. Tambah daya 8 kWh.";
                case "isiGalon":
                    stat.TambahUang(-5000); s.galonGelas = 20;
                    return "Galon terisi 20 gelas.";
                case "cuciManual":
                    s.jumlahJemuran = s.bajuKotor; s.jemuranKeringJam = JamAbsolut + 4;
                    s.bajuKotor = 0; stat.Terapkan(new Efek { energi = -4 });
                    return "Pakaian dijemur. Angkat setelah 4 jam.";
                case "angkatJemuran":
                    s.jumlahJemuran = 0;
                    return "Jemuran kering diangkat.";
                case "kerjaDarurat":
                    s.hariBantuan = s.hari;
                    stat.Terapkan(new Efek { uang = 18000, energi = -12 });
                    return "Kerja serabutan selesai. Rp18.000 masuk.";
                case "gadaiLaptop":
                    s.laptopDigadai = true; stat.TambahUang(80000);
                    return "Laptop digadai. Rp80.000 masuk.";
                case "tebusLaptop":
                    s.laptopDigadai = false; stat.TambahUang(-90000);
                    return "Laptop ditebus.";
                case "bantuanDarurat":
                    s.hariBantuan = s.hari;
                    stat.Terapkan(new Efek { uang = 20000, stres = 3 });
                    return "Kontak darurat mengirim Rp20.000.";
                default: return "";
            }
        }

        internal void Periksa()
        {
            int lewat = Menit - sampel;
            if (lewat < 15) return;
            sampel = Menit;
            float jam = lewat / 60f;
            float hemat = s.traits.Contains("hemat") ? .85f : 1f;
            float puasaSebelum = Mathf.Max(0, s.jamPuasa - 6);
            s.jamPuasa += jam;
            float puasaSesudah = Mathf.Max(0, s.jamPuasa - 6);
            s.kenyang -= b.kenyangPerJam * jam * hemat;
            s.hidrasi -= b.hidrasiPerJam * jam * hemat;
            s.maag += b.maagPuasa * (Mathf.Pow(puasaSesudah, 1.5f) - Mathf.Pow(puasaSebelum, 1.5f));
            s.masukAngin -= jam * 1.5f;
            float dayaLama = s.dayaListrik;
            s.dayaListrik = Mathf.Max(0, dayaLama - .12f * jam);
            if (dayaLama > 1 && s.dayaListrik <= 1) MeteranRendah?.Invoke();
            if (s.kenyang <= 0 || s.hidrasi <= 0)
                stat.Terapkan(new Efek { energi = -jam * 3f, stres = jam });
            else stat.PerbaruiVital();
        }

        internal void Makan(DataMenu menu, Efek efek)
        {
            if (menu.kategori == "Minuman") s.hidrasi += b.pulihHidrasi;
            else
            {
                float makro = menu.karbo + 1.6f * menu.protein + .9f * menu.serat;
                if (string.IsNullOrEmpty(menu.kategori)) s.kenyang += Mathf.Max(4f, efek.energi);
                else
                {
                    efek.energi = b.serap * makro * (1f - .35f * s.masukAngin / 100f);
                    s.kenyang += makro;
                }
                if (s.kenyang >= 25) s.jamPuasa = 0;
            }
            float maag = menu.maag;
            if (maag > 0 && s.traits.Contains("lambungBaja") && menu.kategori == "Kuah & sambal") maag *= .5f;
            s.maag += maag;
        }

        internal void CatatAksi(string id, DataAksi data, Efek efek)
        {
            if (id == "minum")
            {
                s.galonGelas = Mathf.Max(0, s.galonGelas - 1);
                s.hidrasi += b.pulihHidrasi;
            }
            if (id == "seduhKopi") s.maag += b.maagKopi;
            if (data?.menuId == "mi_instan")
            {
                s.kenyang += 32;
                s.jamPuasa = 0;
                float lambung = s.traits.Contains("lambungBaja") ? .5f : 1f;
                s.maag += b.maagMi * s.streakMi * s.streakMi * lambung;
            }
            if (id == "periksa" || id == "obat")
            {
                s.maag -= 36;
                s.masukAngin -= 65;
            }
            if (data == null || data.jenis == "menu") return;
            s.kejenuhan += id == s.aksiTerakhirVital ? 5 : -3;
            s.aksiTerakhirVital = id;
            if (efek.stres < 0) efek.stres *= 1f - .45f * s.kejenuhan / 100f;
        }
    }
}
