using System;
using MS.Kontrak;

namespace MS.Inti
{
    /// <summary>
    /// Aturan yang jalan sendiri seiring waktu (port sim.ts majuSatuFase/hariBaru/cekPulangKampung):
    /// bolos kuliah, stres pasif kipas, kiriman ortu, tagih kos + denda, tanggal tua, pulang kampung.
    /// </summary>
    public class AturanHarian
    {
        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly Efek efek = new Efek(); // dipakai ulang

        /// <summary>Pesan aturan (toast). GameInti meneruskannya ke PenerimaAksi.PesanTerakhir.</summary>
        public event Action<string> Pesan;
        /// <summary>Diisi GameInti: kiriman & ongkos pulang mengikuti asal daerah.</summary>
        public Kehidupan Hidup;
        /// <summary>Diisi GameInti: harga kos sesuai kos pilihan & perk Bu Kos.</summary>
        public Sosial Sosial;
        int BiayaKos => Sosial != null ? Sosial.HargaKos : data.Bal.bulanan.biayaKos;
        int BatasBayar => data.Bal.bulanan.batasBayarKos + (Sosial != null ? Sosial.TambahanBatasBayarKos : 0); // Bu Kos akrab -> boleh telat
        int Kiriman => Sosial != null && Sosial.SudahBekerja ? 0 : Hidup != null ? Hidup.Kiriman : data.Bal.bulanan.kirimanOrtu;
        int Ongkos => Hidup != null ? Hidup.OngkosPulang : data.Bal.pulangKampung.ongkos;

        public AturanHarian(DataGame d, DataSimpan simpan, StatPemain st, JamGame j)
        {
            data = d; s = simpan; stat = st; jam = j;
            jam.FaseSelesai += SaatFaseSelesai;
            jam.HariDimulai += SaatHariDimulai;
        }

        public void Lepas()
        {
            jam.FaseSelesai -= SaatFaseSelesai;
            jam.HariDimulai -= SaatHariDimulai;
        }

        /// <summary>Senin–Jumat (hari 1 = Senin). Tanggal merah belum diport.</summary>
        public static bool HariKerja(int hari) => (hari - 1) % 7 < 5;
        public static int HariMinggu(int hari) => (hari - 1) % 7;

        void SaatFaseSelesai(Fase lama)
        {
            if (jam.Absen) return; // pulang kampung: tidak bolos, tanpa stres pasif
            efek.Kosongkan();
            // Sesi kuliah lewat tanpa hadir di hari kerja = bolos
            bool sesi = lama == Fase.Pagi || lama == Fase.Siang;
            bool hadir = lama == Fase.Pagi ? s.hadirPagi : s.hadirSiang;
            bool bolos = sesi && HariKerja(s.hari) && !hadir && s.liburHari != s.hari;
            if (bolos) efek.ipk = data.Bal.bolos.ipk;
            // Stres pasif: kipas Lv1 = gerah (+1/fase), Lv3 AC = −1
            efek.stres = data.EfekPerabot("kipas", s.LevelPerabot("kipas"), "stresPerFase", 0f);
            if (efek.ipk != 0f || efek.stres != 0f) stat.Terapkan(efek);
            if (bolos) Pesan?.Invoke("😬 Kamu bolos kuliah " + (lama == Fase.Pagi ? "pagi" : "siang") + "! 🎓 " + data.Bal.bolos.ipk.ToString("0.00"));
        }

        void SaatHariDimulai()
        {
            var b = data.Bal.bulanan;
            s.hadirPagi = s.hadirSiang = false;
            var ak = data.Akademik;
            if (s.tanggal == 1 && s.hari > 1)
            {
                s.bulan++;
                // Beasiswa prestasi tiap awal bulan
                if (stat.Ipk >= ak.beasiswaIpk)
                {
                    stat.TambahUang(ak.beasiswaUang);
                    Pesan?.Invoke("🏆 Beasiswa prestasi cair " + Rupiah(ak.beasiswaUang) + "! (IPK ≥ " + ak.beasiswaIpk.ToString("0.00") + ")");
                }
                // Semester baru tiap 4 bulan → rapor
                if (DataAkademik.BulanSemester(s.bulan) == 1)
                {
                    var pr = ak.Predikat(stat.Ipk);
                    Pesan?.Invoke(pr.ikon + " Semester " + s.semester + " selesai! IPK " + stat.Ipk.ToString("0.00") + " — " + pr.nama);
                    if (s.asal == "kipk" && !s.kipkDicabut && stat.Ipk < 3.25f)
                    {
                        s.kipkDicabut = true;
                        Pesan?.Invoke("KIP-K dicabut karena IPK semester di bawah 3,25.");
                    }
                    s.semester++;
                    s.ujianSelesai.Clear();
                    if (ak.predikat.Count > 0 && stat.Ipk >= ak.predikat[0].min)
                    {
                        stat.TambahUang(ak.cumLaudeHadiah);
                        Pesan?.Invoke("🎁 Ortu bangga! Hadiah " + Rupiah(ak.cumLaudeHadiah));
                    }
                }
            }
            // Ujian: pengumuman di hari pertama, nilai kosong bila tidak ikut sampai minggu ujian lewat
            foreach (var u in ak.ujian)
            {
                if (DataAkademik.BulanSemester(s.bulan) != u.bulanSemester) continue;
                string kunci = DataAkademik.Kunci(u, s);
                if (s.tanggal == u.tanggalSelesai + 1 && !s.ujianSelesai.Contains(kunci))
                {
                    s.ujianSelesai.Add(kunci);
                    efek.Kosongkan(); efek.ipk = ak.absenUjianIpk; stat.Terapkan(efek);
                    Pesan?.Invoke("😱 Kamu tidak ikut " + u.nama + "! Nilai kosong 🎓 " + ak.absenUjianIpk.ToString("0.00"));
                }
                if (s.tanggal == u.tanggalMulai)
                    Pesan?.Invoke("📝 Minggu " + u.nama + " dimulai (tgl " + u.tanggalMulai + "–" + u.tanggalSelesai + ")! Kuliah = ikut ujian. Sudah belajar belum?");
            }
            // Listrik profil baru dibayar lewat meter prabayar; WiFi tetap bulanan.
            if (s.tanggal == ak.tanggalTagihan)
            {
                int tagih = (s.tahapPindahan == 0 ? ak.listrik : 0) + ak.wifi;
                stat.TambahUang(-tagih);
                Pesan?.Invoke("Tagihan kos berkala −" + Rupiah(tagih));
            }
            if (s.tanggal == 1) s.kosLunas = s.asal == "lokal" && s.kosPindahHari == 0;
            int tanggalCair = s.asal == "rantau" ? 3 + (s.bulan % 4) : 1;
            if (s.asal == "lokal")
            {
                stat.TambahUang(35000);
                Pesan?.Invoke("Uang saku harian " + Rupiah(35000) + " masuk.");
            }
            else if (s.tanggal == tanggalCair && Kiriman > 0)
            {
                int lunasKasbon = Math.Min(Kiriman, s.kasbon);
                s.kasbon -= lunasKasbon;
                stat.TambahUang(Kiriman - lunasKasbon);
                if (lunasKasbon > 0) Pesan?.Invoke("Kasbon Warteg Bahari dilunasi " + Rupiah(lunasKasbon) + ".");
                string sumber = s.asal == "kipk" ? "Biaya hidup KIP-K" : "Kiriman orang tua";
                Pesan?.Invoke(sumber + " masuk " + Rupiah(Kiriman) + ". Bayar kos sebelum tanggal " + BatasBayar + ".");
            }
            // Lewat batas → dipotong otomatis + denda
            if (s.tanggal == BatasBayar + 1 && !s.kosLunas)
            {
                int total = BiayaKos + (Sosial != null && Sosial.BebasDendaKos ? 0 : b.dendaKos);
                s.kosLunas = true;
                stat.TambahUang(-total);
                Pesan?.Invoke("😠 Bu Kos menagih langsung: kos + denda −" + Rupiah(total));
            }
            if (s.tanggal == b.tanggalTuaMulai) Pesan?.Invoke("😱 Tanggal tua dimulai! Hemat-hemat ya...");
            else if (s.tanggal == data.Bal.vital.awalWaspada) Pesan?.Invoke("Minggu Waspada. Sisihkan uang makan untuk tanggal tua.");
        }

        /// <summary>Stres penuh dan tidak sedang sibuk → harus pulang kampung.</summary>
        public bool PerluPulang => stat.Stres >= 100f && !jam.Sibuk;

        /// <summary>Pulang kampung: bayar ongkos, lompat ke besok pagi, stres & energi dipulihkan, pindah ke kamar.</summary>
        public void PulangKampung(bool pindahScene = true)
        {
            var pk = data.Bal.pulangKampung;
            stat.TambahUang(-Ongkos);
            jam.LompatKeBesok(data.Bal.jam.pulangKampungBangun);
            stat.Atur(pk.energi, pk.stres);
            Pesan?.Invoke("🚌 Stres berat! Kamu pulang kampung sebentar (ongkos −" + Rupiah(Ongkos) + ")");
            if (pindahScene) PindahScene.Ke("KamarKos", "pintuKamar");
        }

        /// <summary>Format "Rp1.500.000".</summary>
        public static string Rupiah(int n) => (n < 0 ? "-Rp" : "Rp") + Math.Abs(n).ToString("#,0", System.Globalization.CultureInfo.InvariantCulture).Replace(',', '.');
    }
}
