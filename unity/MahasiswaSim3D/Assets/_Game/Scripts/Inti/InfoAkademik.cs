// Jembatan baca-saja data akademik ke UI (lewat Layanan.Akademik).
using MS.Kontrak;

namespace MS.Inti
{
    public class InfoAkademik : IInfoAkademik
    {
        readonly DataGame data; readonly DataSimpan s; readonly StatPemain stat;
        public InfoAkademik(DataGame d, DataSimpan simpan, StatPemain st) { data = d; s = simpan; stat = st; }
        public int Semester => s.semester;
        public int Sks => s.sks;
        public int SksLulus => data.Akademik.sksLulus;
        public int Skripsi => s.skripsi;
        public bool Lulus => s.lulus;
        public bool KosLunas => s.kosLunas;
        public string UjianHariIni => data.Akademik.UjianAktif(s)?.nama;
        public string Predikat => data.Akademik.Predikat(stat.Ipk).nama;
    }
}
