// Kondisi sehari-hari: cuaca, sakit, kebersihan kamar, baju kotor, profil (jurusan/asal), toko barang, motor & bensin.
using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;

namespace MS.Inti
{
    public class Kehidupan : IKondisi, IProfil, IToko, IKendaraan
    {
        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly Func<float> acak;
        readonly Efek efek = new Efek();
        readonly List<InfoPilihan> daftarJurusan = new List<InfoPilihan>(), daftarAsal = new List<InfoPilihan>();
        readonly List<InfoPilihan> bakat = new List<InfoPilihan>(), kelemahan = new List<InfoPilihan>();
        readonly List<InfoBarang> daftarBarang = new List<InfoBarang>();

        public event Action<string> Pesan;
        /// <summary>Diisi GameInti: kos mewah ada cleaning service (kamar lebih lambat kotor).</summary>
        public Func<float> pengaliKotor = () => 1f;
        /// <summary>Diisi GameInti dari bengkel: pengali kecepatan & hemat bensin motor.</summary>
        public Func<float> pengaliMotor = () => 1f, pengaliHemat = () => 1f;
        public event Action Berubah;
        DataFitur F => data.Fitur;
        DataKehidupan K => data.Fitur.kehidupan;

        public Kehidupan(DataGame d, DataSimpan simpan, StatPemain st, JamGame j, Func<float> acak = null)
        {
            data = d; s = simpan; stat = st; jam = j;
            this.acak = acak ?? (() => UnityEngine.Random.value);
            jam.HariDimulai += SaatHariDimulai;
            jam.FaseSelesai += SaatFaseSelesai;
            foreach (var x in F.jurusan) daftarJurusan.Add(new InfoPilihan { Id = x.id, Nama = x.nama, Ikon = x.ikon, Deskripsi = x.deskripsi });
            foreach (var x in F.latar)
                daftarAsal.Add(new InfoPilihan { Id = x.id, Nama = x.nama, Ikon = x.ikon,
                    Deskripsi = "Saldo awal " + AturanHarian.Rupiah(x.saldoAwal) + ". " + x.deskripsi });
            foreach (var x in F.traits)
                (x.positif ? bakat : kelemahan).Add(new InfoPilihan { Id = x.id, Nama = x.nama, Deskripsi = x.deskripsi });
        }

        public void Lepas() { jam.HariDimulai -= SaatHariDimulai; jam.FaseSelesai -= SaatFaseSelesai; }

        // ================= IKondisi =================
        DataCuaca CuacaKini => F.CuacaHari(s.hari, s.pengaliHujan);
        public string CuacaId => CuacaKini?.id;
        public string CuacaNama => CuacaKini?.nama;
        public string CuacaIkon => CuacaKini?.ikon;
        public bool Sakit => s.sakit > 0;
        public float Kebersihan => s.kebersihan;
        public bool KamarKotor => s.kebersihan < K.kebersihanKotor;
        public int BajuKotor => s.bajuKotor;
        public bool PunyaPayung => s.payung;
        public int KopiSachet => s.kopiSachet;

        void SaatHariDimulai()
        {
            bool tadiBersih = s.kebersihan >= K.kebersihanKotor;
            s.kebersihan = Mathf.Max(0f, Mathf.Round(s.kebersihan - K.kebersihanTurunPerHari * pengaliKotor()));
            s.bajuKotor++;
            if (KamarKotor && tadiBersih) Pesan?.Invoke("🪳 Kamarmu mulai berantakan... ada kecoa lewat! Bersih-bersih dulu yuk.");
            if (s.bajuKotor >= K.bajuKotorBatas)
            {
                Terapkan(0, 0, K.stresBajuKotor);
                Pesan?.Invoke("😷 Baju bersih habis, terpaksa pakai yang bau... 😵+" + K.stresBajuKotor + ". Ke laundry yuk!");
            }
            if (s.sakit > 0)
            {
                s.sakit--;
                if (s.sakit == 0) Pesan?.Invoke("💪 Badan sudah enakan, kamu sembuh!");
            }
            else if (stat.Lemas && s.vitaminHari != s.hari && acak() < K.peluangSakitLemas)
            {
                s.sakit = K.sakitHari;
                Pesan?.Invoke("🤧 Badan lemas terus... kamu masuk angin! Istirahat atau ke klinik ya.");
            }
            if (CuacaId is "hujan" or "badai") Pesan?.Invoke("🌧️ Hari ini hujan. " + (s.payung ? "Untung punya payung!" : "Jangan lupa beli payung di toko."));
            Berubah?.Invoke();
        }

        void SaatFaseSelesai(Fase f)
        {
            if (jam.Absen) return;
            if (KamarKotor) Terapkan(0, 0, K.stresKamarKotorPerFase);
        }

        void Terapkan(float uang, float energi, float stres)
        {
            efek.Kosongkan(); efek.uang = uang; efek.energi = energi; efek.stres = stres;
            stat.Terapkan(efek);
        }

        /// <summary>Keluar kos saat hujan tanpa payung → basah & bisa masuk angin.</summary>
        public void SaatKeluarKos()
        {
            if (CuacaId is not ("hujan" or "badai")) return;
            if (s.payung) { Pesan?.Invoke("☂️ Untung bawa payung!"); return; }
            Terapkan(0, 0, K.stresKehujanan);
            s.masukAngin = Mathf.Clamp(s.masukAngin + (s.traits.Contains("rentanMasukAngin") ? 40 : 15), 0, 100);
            string cuaca = jam.Fase == Fase.Pagi || jam.Fase == Fase.Sore ? "Gerimis" : "Hujan deras";
            Pesan?.Invoke("🌧️ " + cuaca + " dan kamu tidak bawa payung. 😵+" + K.stresKehujanan);
            if (s.sakit == 0 && s.vitaminHari != s.hari && acak() < K.peluangSakitHujan)
            {
                s.sakit = K.sakitHari;
                Pesan?.Invoke("🤧 Hatchiii! Kamu masuk angin...");
            }
            Berubah?.Invoke();
        }

        /// <summary>Catatan setelah aksi tertentu (dipanggil PenerimaAksi).</summary>
        public void SetelahAksi(string id)
        {
            if (id == "bersihKamar") s.kebersihan = 100;
            else if (id == "laundry") s.bajuKotor = 0;
            else if (id == "periksa" && s.sakit > 0) { s.sakit = 0; Pesan?.Invoke("💊 Dokter: \"Cuma masuk angin. Minum obat, istirahat ya.\" Kamu sembuh!"); }
            else return;
            Berubah?.Invoke();
        }

        // ================= IProfil =================
        public bool PerluDibuat => !s.profilDibuat;
        public string Nama => s.nama;
        public string JurusanId => s.jurusan;
        public string AsalId => s.asal;
        public IReadOnlyList<InfoPilihan> DaftarJurusan => daftarJurusan;
        public IReadOnlyList<InfoPilihan> DaftarAsal => daftarAsal;

        public IReadOnlyList<InfoPilihan> Bakat => bakat;
        public IReadOnlyList<InfoPilihan> Kelemahan => kelemahan;

        internal event Action ProfilDidaftarkan;

        public bool Daftarkan(string nama, string jurusan, string latar, IReadOnlyCollection<string> pilihanBakat,
            IReadOnlyCollection<string> pilihanKelemahan, OpsiKesulitan kesulitan = null)
        {
            var asal = F.Asal(latar);
            if (s.profilDibuat || F.Jurusan(jurusan) == null || asal == null || !F.latar.Contains(asal) ||
                !Sah(pilihanBakat, bakat) || !Sah(pilihanKelemahan, kelemahan)) return false;
            s.traits = new List<string>(pilihanBakat);
            s.traits.AddRange(pilihanKelemahan);
            AturKesulitan(kesulitan);
            s.tahapPindahan = 1;
            s.energiAwalPindahan = stat.Energi;
            stat.TambahUang(asal.saldoAwal - stat.Uang);
            Buat(nama, jurusan, latar);
            ProfilDidaftarkan?.Invoke();
            return true;
        }

        void AturKesulitan(OpsiKesulitan opsi)
        {
            s.kesulitan = opsi?.Preset is "sultan" or "pejuang" or "sandbox" ? opsi.Preset : "normal";
            s.pengaliKebutuhan = s.kesulitan == "sultan" ? .5f : 1f;
            if (s.kesulitan != "sandbox") return;
            s.kirimanSandbox = Mathf.Clamp(opsi.Kiriman, 0, 5000000);
            s.sidakSandbox = Mathf.Clamp(opsi.Sidak, 0, 2);
            s.pengaliDosen = Mathf.Clamp(opsi.Dosen, .5f, 2f);
            s.pengaliHujan = Mathf.Clamp(opsi.Hujan, 0f, 2f);
            s.pengaliJam = Mathf.Clamp(opsi.Jam, .5f, 2f);
        }

        static bool Sah(IReadOnlyCollection<string> pilihan, List<InfoPilihan> katalog)
        {
            if (pilihan?.Count != 2 || new HashSet<string>(pilihan).Count != 2) return false;
            foreach (var id in pilihan)
                if (!katalog.Exists(item => item.Id == id)) return false;
            return true;
        }

        /// <summary>Kunci jurusan & asal (sekali seumur save, anti-eksploitasi).</summary>
        public void Buat(string nama, string jurusan, string asal)
        {
            if (s.profilDibuat) return;
            s.nama = string.IsNullOrWhiteSpace(nama) ? "Mahasiswa" : nama.Trim();
            if (s.nama.Length > 16) s.nama = s.nama.Substring(0, 16);
            s.jurusan = F.Jurusan(jurusan) != null ? jurusan : (F.jurusan.Count > 0 ? F.jurusan[0].id : null);
            s.asal = F.Asal(asal) != null ? asal : (F.asal.Count > 0 ? F.asal[0].id : null);
            s.profilDibuat = true;
            SimpanMuat.Simpan(s);
            var j = F.Jurusan(s.jurusan); var a = F.Asal(s.asal);
            Pesan?.Invoke("🎒 Selamat datang, " + s.nama + "! " + (j != null ? j.ikon + " " + j.nama : "") + (a != null ? " · dari " + a.nama : ""));
            Berubah?.Invoke();
        }

        public float PengaliJurusan(string kunci, float bawaan = 1f) => F.Pengali(s.jurusan, kunci, bawaan);
        public int Kiriman => s.kipkDicabut ? 0 : F.Asal(s.asal)?.kiriman ?? data.Bal.bulanan.kirimanOrtu;
        public int OngkosPulang => F.Asal(s.asal)?.ongkosPulang ?? data.Bal.pulangKampung.ongkos;

        // ================= IToko =================
        public bool Terbuka { get; private set; }
        public IReadOnlyList<InfoBarang> Daftar
        {
            get
            {
                while (daftarBarang.Count < F.barang.Count) daftarBarang.Add(new InfoBarang());
                for (int i = 0; i < F.barang.Count; i++)
                {
                    var b = F.barang[i]; var info = daftarBarang[i];
                    info.Id = b.id; info.Nama = b.nama; info.Ikon = b.ikon; info.Deskripsi = b.deskripsi; info.Harga = b.harga;
                    info.Dimiliki = b.id == "payung" ? (s.payung ? 1 : 0) : b.id == "kopiSachet" ? s.kopiSachet : 0;
                }
                return daftarBarang;
            }
        }
        public void BukaToko() { Terbuka = true; Berubah?.Invoke(); }
        public void Tutup() { if (!Terbuka) return; Terbuka = false; Berubah?.Invoke(); }

        public bool BolehBeli(string id, out string alasan)
        {
            alasan = null;
            var b = F.Barang(id);
            if (b == null) { alasan = "Barang tidak dikenal."; return false; }
            if (b.permanen && id == "payung" && s.payung) { alasan = "☂️ Kamu sudah punya payung."; return false; }
            if (id == "obat" && s.sakit == 0) { alasan = "💪 Kamu lagi sehat, simpan uangnya."; return false; }
            if (id == "vitamin" && s.vitaminHari == s.hari) { alasan = "💊 Vitamin cukup sekali sehari."; return false; }
            if (stat.Uang - b.harga < 0) { alasan = "💸 Uangnya nggak cukup..."; return false; }
            return true;
        }

        public void Beli(string id)
        {
            if (!BolehBeli(id, out var alasan)) { Pesan?.Invoke(alasan); return; }
            var b = F.Barang(id);
            stat.TambahUang(-b.harga);
            string catatan = "";
            switch (id)
            {
                case "payung": s.payung = true; break;
                case "vitamin": s.vitaminHari = s.hari; stat.Terapkan(b.efek); catatan = " (kebal masuk angin hari ini)"; break;
                case "obat": s.sakit = 0; stat.Terapkan(b.efek); catatan = " — langsung sembuh!"; break;
                case "kopiSachet": s.kopiSachet += Math.Max(1, b.isi); catatan = " (stok " + s.kopiSachet + ")"; break;
                default: if (b.efek != null) stat.Terapkan(b.efek); break;
            }
            Layanan.Audio?.Mainkan("bayar");
            Pesan?.Invoke(b.ikon + " " + b.nama + " −" + AturanHarian.Rupiah(b.harga) + catatan);
            Berubah?.Invoke();
        }

        /// <summary>Seduh kopi sachet di dapur kamar (dihitung 1 porsi "kenyang").</summary>
        public bool BolehSeduh(out string alasan)
        {
            alasan = null;
            if (s.kopiSachet <= 0) { alasan = "☕ Stok kopi sachet habis. Beli di toko."; return false; }
            if (s.porsiFase >= data.Bal.kenyang.porsiPerFase) { alasan = "🤰 Masih kenyang! Tunggu fase berikutnya."; return false; }
            return true;
        }

        public void Seduh()
        {
            var b = F.Barang("kopiSachet");
            s.kopiSachet--; s.porsiFase++;
            if (b != null) stat.Terapkan(b.efek);
            Pesan?.Invoke("☕ Kopi sachet diseduh. Sisa " + s.kopiSachet + ".");
            Berubah?.Invoke();
        }

        // ================= IKendaraan (motor & bensin) =================
        public bool NaikMotor { get; private set; }
        public float Bensin => s.bensin;
        public bool Mogok => s.bensin <= 0f;
        public float PengaliKecepatan => !NaikMotor ? 1f : Mogok ? data.Fitur.bensin.kecepatanMogok * 2.5f : 2.5f * pengaliMotor(); // jalan 3,2 → motor 8 m/s
        public void Naik() { if (NaikMotor) return; NaikMotor = true; Berubah?.Invoke(); }
        public void Turun() { if (!NaikMotor) return; NaikMotor = false; Berubah?.Invoke(); }

        /// <summary>Dipanggil gerak pemain tiap frame saat naik motor: kurangi bensin sesuai jarak.</summary>
        public void Tempuh(float meter)
        {
            if (!NaikMotor || meter <= 0f || Mogok) return;
            bool tadi = s.bensin > 10f;
            s.bensin = Mathf.Max(0f, s.bensin - meter * F.bensin.pakaiPerMeter * pengaliHemat());
            if (tadi && s.bensin <= 10f) Pesan?.Invoke("⛽ Bensin tinggal sedikit! Isi di Pertamini depan kos.");
            if (s.bensin <= 0f) Pesan?.Invoke("🛵💨 Motor mogok, bensin habis! Dorong pelan-pelan ke Pertamini...");
        }

        public int HargaIsiBensin => Mathf.RoundToInt((100f - s.bensin) * F.bensin.hargaPerPersen / 500f) * 500;
        public void IsiBensin() { s.bensin = 100f; Berubah?.Invoke(); }

        /// <summary>Ojol versi Unity (sederhana, tanpa mini-game): beberapa order dengan jarak acak.</summary>
        public int HitungOjol(out int order)
        {
            var o = F.ojol;
            order = o.jumlahOrder;
            int total = 0;
            for (int i = 0; i < o.jumlahOrder; i++)
            {
                float meter = Mathf.Lerp(25f, 70f, acak()); // jarak antar tempat di kampung (web: > 20 m)
                total += o.bayarDasar + Mathf.RoundToInt(meter * o.bayarPerMeter);
                if (acak() < 0.6f) total += o.tip5Bintang; // bintang 5 = tip
                s.bensin = Mathf.Max(0f, s.bensin - meter * 2f * F.bensin.pakaiPerMeter);
            }
            return Mathf.RoundToInt(total / 500f) * 500;
        }
    }
}
