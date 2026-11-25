// Kos: 6 pilihan kos (fitur3.json → kos), harga, pindah, jam malam, stres pasif, sarapan, hantu.
using MS.Kontrak;
using UnityEngine;

namespace MS.Inti
{
    public partial class Sosial
    {
        public DataKos KosSekarang => F.Kos(s.kos);
        public string KosId => KosSekarang?.id ?? s.kos;
        public string KosNama => KosSekarang?.nama;
        public string KosIkon => KosSekarang?.ikon;
        /// <summary>Warna dinding kamar sesuai kos (dibaca WarnaDindingKos di scene kamar).</summary>
        public string WarnaDinding => KosSekarang?.dinding;
        public EfekKos EfekKos => KosSekarang?.efek ?? new EfekKos();

        /// <summary>Sewa sebulan (patungan ½ bila tinggal bareng pacar).</summary>
        public int HargaKos
        {
            get
            {
                var k = KosSekarang;
                int h = k != null ? k.harga : data.Bal.bulanan.biayaKos;
                return Mathf.RoundToInt(h * (s.tinggalBareng ? SOS.pengaliKosTinggalBareng : 1f));
            }
        }

        public string CekPindahKos(string id)
        {
            var k = F.Kos(id);
            if (k == null || k.id != id) return "Kos tidak ditemukan.";
            if (k.id == s.kos) return "🏠 Kamu sudah tinggal di sini.";
            int sisa = s.kosPindahHari + F.jedaPindahHari - s.hari;
            if (s.kosPindahHari > 0 && sisa > 0) return "📦 Baru pindah! Tunggu " + sisa + " hari lagi.";
            int biaya = k.harga + F.biayaPindahKos;
            return stat.Uang - biaya < data.Bal.batas.uangMin ? "💸 Butuh " + AturanHarian.Rupiah(biaya) + " (sewa bulan ini + angkut barang)." : null;
        }

        /// <summary>Pindah kos: bayar sewa kos baru bulan ini + biaya angkut. Perabot ikut dibawa.</summary>
        public void PindahKos(string id)
        {
            string alasan = CekPindahKos(id);
            if (alasan != null) { Umumkan(alasan); return; }
            var k = F.Kos(id);
            int biaya = k.harga + F.biayaPindahKos;
            stat.TambahUang(-biaya);
            s.kos = k.id; s.kosPindahHari = s.hari; s.kosLunas = true; s.jamMalamHari = 0;
            Latih("pindahKos");
            Umumkan("📦 Pindah ke " + k.ikon + " " + k.nama + "! Sewa + angkut barang −" + AturanHarian.Rupiah(biaya) + ". Pemilik: " + k.pemilik + ". "
                    + (k.jamMalam.HasValue ? "Jam malam " + TeksJam(k.jamMalam.Value) + "." : "Bebas pulang jam berapa pun."));
            if (s.tinggalBareng && !k.tinggalBareng)
            {
                s.tinggalBareng = false;
                Umumkan("💔 Kos ini tidak membolehkan tinggal bareng. " + (PacarNama ?? "Pacarmu") + " balik ke kosnya sendiri.");
            }
            if (k.berhantu) Umumkan("👻 Tetangga berbisik: \"Kamu yang nempatin kamar ujung? Semoga betah ya...\"");
            Kabari();
        }

        string TeksJam(int menit)
        {
            int t = (data.Bal.jam.mulaiHariJam * 60 + menit) % 1440;
            return (t / 60).ToString("00") + "." + (t % 60).ToString("00");
        }

        /// <summary>Gerbang dikunci saat jam malam & pemain masih di luar kamar. Maks 1× per malam.</summary>
        void CekJamMalam()
        {
            var k = KosSekarang;
            if (k == null || !k.jamMalam.HasValue || k.telat == null) return;
            if (jam.Menit < k.jamMalam.Value || s.jamMalamHari == s.hari || jam.SedangTidur || DiKamar()) return;
            s.jamMalamHari = s.hari;
            var t = k.telat;
            Ubah(t.uang, 0, t.stres);
            TambahRelasi("buKos", t.relasi);
            Latih("telatJamMalam");
            Umumkan(k.sifat == "baik"
                ? "🔒 Jam " + TeksJam(k.jamMalam.Value) + ", gerbang " + k.nama + " dikunci! " + k.pemilik + " bukain sambil ngomel: \"Lain kali jangan telat ya!\" 😵+" + t.stres
                : "🔒 Jam " + TeksJam(k.jamMalam.Value) + " lewat! " + k.pemilik + " marah besar: \"Peraturan ya peraturan!\" Denda " + AturanHarian.Rupiah(-t.uang) + " 😵+" + t.stres);
        }

        /// <summary>Stres pasif dari kos tiap fase (berisik / angker di malam hari saat di kamar).</summary>
        float StresPasifKos(Fase lama)
        {
            var e = EfekKos;
            bool malam = lama == Fase.Malam || lama == Fase.Begadang;
            return e.stresPasif + (malam && DiKamar() ? e.stresMalam : 0f);
        }

        void PagiKos()
        {
            var k = KosSekarang;
            if (k != null && k.efek.sarapan > 0f)
            {
                Ubah(0, k.efek.sarapan, 0);
                Umumkan("🍳 Sarapan dari " + k.pemilik + " sudah siap! ⚡+" + k.efek.sarapan);
            }
        }

        /// <summary>Hantu Wisma Kenanga: muncul malam/begadang di kamar (acak "tetap" dari hari & fase).</summary>
        public bool HantuMuncul(Fase f)
        {
            var k = KosSekarang;
            if (k == null || !k.berhantu || (f != Fase.Malam && f != Fase.Begadang)) return false;
            float n = ((s.hari * 7919 + (f == Fase.Malam ? 13 : 29)) % 100) / 100f;
            return n < F.hantu.peluangMuncul;
        }

        void CekHantu(Fase baru)
        {
            if (!HantuMuncul(baru) || !DiKamar()) return;
            s.hantuLihat++;
            if (s.hantuLihat > F.hantu.beraniSetelah)
            {
                Umumkan("👻 Ketukan jam 12 malam lagi... kamu sudah terbiasa. \"Malam, Mbak Penghuni.\"");
                return;
            }
            Ubah(0, 0, F.hantu.stresLihat);
            Umumkan("👻 Tok... tok... tok... Ada bayangan putih lewat di ujung lorong! 😵+" + F.hantu.stresLihat);
        }

        /// <summary>Pengali turunnya kebersihan per hari (kos mewah ada cleaning service).</summary>
        public float PengaliKotor => EfekKos.kebersihanTurun;
    }
}
