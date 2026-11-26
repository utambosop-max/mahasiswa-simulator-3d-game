// Event acak (port sim.ts pilihEvent/efekPilihan/cekPilihan). Data dari Data/events.json.
using System;
using System.Collections.Generic;
using MS.Kontrak;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Inti
{
    public class SyaratEvent
    {
        public int? tanggalMin, tanggalMax, hariMin, semesterMin;
        public float? dayaMaks, bensinMaks;
        public string scene;
        public List<string> fase, kos;
        public bool hariKerja, kosBelumLunas, berhantu, kosBebas, punyaPacar, diKamar, hujan, jemuran, galonHabis, naikMotor;
    }

    public class PilihanEvent
    {
        public string label, hasil, terkunci;
        public Efek efek = new Efek();
        public Dictionary<string, float> vital;
        public bool bayarKos, liburKuliah, kuis;
        public int follower;
    }

    public class DataEvent
    {
        public string id, ikon, judul, teks;
        public SyaratEvent syarat = new SyaratEvent();
        public float peluang;
        public List<PilihanEvent> pilihan = new List<PilihanEvent>();
    }

    /// <summary>
    /// Dicek setiap fase baru: maks 1 per fase, maks `event.maksPerHari` per hari, event sama tidak
    /// terulang dalam `event.jedaHariSama` hari. Selama event tampil, GameInti menghentikan jam.
    /// </summary>
    public class EventAcak : IEventAcak
    {
        // Kos di Unity baru satu (Melati): tidak berhantu, tidak bebas, belum ada pacar.
        /// <summary>Diisi GameInti: kos, hantu, pacar, harga kos.</summary>
        public Sosial Sosial;
        string KosSekarang => Sosial != null ? Sosial.KosId : "melati";

        readonly DataGame data;
        readonly DataSimpan s;
        readonly StatPemain stat;
        readonly JamGame jam;
        readonly Func<float> acak;
        readonly List<DataEvent> semua;
        readonly List<DataEvent> calon = new List<DataEvent>();   // dipakai ulang
        readonly List<float> kunci = new List<float>();
        readonly Efek efek = new Efek();
        /// <summary>Pengali hadiah IPK dekat 4,0 (GameInti mengisi dari PenerimaAksi).</summary>
        public Func<float, float> pengaliIpk = _ => 1f;
        /// <summary>Ada dialog cerita menunggu? (event acak ditunda dulu)</summary>
        public Func<bool> AdaCerita;
        DataEvent aktif;
        EventTampil tampil;
        Action<int> setelahPilih; // panggilan balik untuk dialog dari luar (cerita)

        public event Action Berubah;
        public event Action<string> Pesan;          // hasil pilihan → toast
        public EventTampil Aktif => tampil;
        public int JumlahData => semua.Count;
        /// <summary>Untuk tes: paksa fungsi "apakah pemain di kamar".</summary>
        public Func<bool> DiKamar = () => SceneManager.GetActiveScene().name == "KamarKos";

        public EventAcak(DataGame d, DataSimpan simpan, StatPemain st, JamGame j, string json, Func<float> acak = null)
        {
            data = d; s = simpan; stat = st; jam = j;
            this.acak = acak ?? (() => UnityEngine.Random.value);
            semua = new List<DataEvent>();
            if (!string.IsNullOrEmpty(json))
            {
                try { semua = JsonConvert.DeserializeObject<List<DataEvent>>(json) ?? semua; }
                catch (Exception e) { Debug.LogWarning("[Inti] events.json gagal dibaca: " + e.Message); }
            }
            jam.FaseBerganti += SaatFaseBerganti;
        }

        public void Lepas() => jam.FaseBerganti -= SaatFaseBerganti;

        void SaatFaseBerganti(Fase f)
        {
            if (jam.Absen || aktif != null) return; // pulang kampung sudah cukup dramatis
            if (AdaCerita != null && AdaCerita()) return; // dialog cerita didahulukan
            var ev = PilihEvent();
            if (ev != null) Tampilkan(ev);
        }

        /// <summary>Undi satu event yang syaratnya terpenuhi (null = tidak ada).</summary>
        public DataEvent PilihEvent()
        {
            int jumlahHariIni = s.eventHari == s.hari ? s.eventJumlah : 0;
            if (jumlahHariIni >= data.Bal.@event.maksPerHari) return null;
            calon.Clear(); kunci.Clear();
            foreach (var ev in semua)
            {
                if (!Syarat(ev.syarat)) continue;
                if (s.eventTerakhir != null && s.eventTerakhir.TryGetValue(ev.id, out int h) && s.hari - h < data.Bal.@event.jedaHariSama) continue;
                calon.Add(ev); kunci.Add(acak());
            }
            // Urutan diacak agar event berpeluang besar tidak selalu menang (insertion sort, daftar kecil)
            for (int i = 1; i < calon.Count; i++)
                for (int k = i; k > 0 && kunci[k] < kunci[k - 1]; k--)
                {
                    (kunci[k], kunci[k - 1]) = (kunci[k - 1], kunci[k]);
                    (calon[k], calon[k - 1]) = (calon[k - 1], calon[k]);
                }
            foreach (var ev in calon)
            {
                float peluang = ev.id == "gdd_05" && s.kesulitan == "sandbox" ? ev.peluang * s.sidakSandbox : ev.peluang;
                if (acak() < peluang) return ev;
            }
            return null;
        }

        bool Syarat(SyaratEvent q)
        {
            if (q == null) return true;
            if (q.tanggalMin.HasValue && s.tanggal < q.tanggalMin.Value) return false;
            if (q.tanggalMax.HasValue && s.tanggal > q.tanggalMax.Value) return false;
            if (q.hariMin.HasValue && s.hari < q.hariMin.Value) return false;
            if (q.semesterMin.HasValue && s.semester < q.semesterMin.Value) return false;
            if (q.dayaMaks.HasValue && s.dayaListrik >= q.dayaMaks.Value) return false;
            if (q.bensinMaks.HasValue && s.bensin > q.bensinMaks.Value) return false;
            if (q.galonHabis && s.galonGelas > 0 || q.jemuran && s.jumlahJemuran == 0) return false;
            if (q.naikMotor && Layanan.Kendaraan?.NaikMotor != true) return false;
            if (q.hujan && data.Fitur.CuacaHari(s.hari, s.pengaliHujan)?.id is not ("hujan" or "badai")) return false;
            if (!string.IsNullOrEmpty(q.scene) && SceneManager.GetActiveScene().name != q.scene) return false;
            if (q.fase != null && q.fase.Count > 0 && !q.fase.Contains(PenerimaAksi.NamaFase[(int)jam.Fase])) return false;
            if (q.hariKerja && !AturanHarian.HariKerja(s.hari)) return false;
            if (q.kosBelumLunas && s.kosLunas) return false;
            if (q.kos != null && q.kos.Count > 0 && !q.kos.Contains(KosSekarang)) return false;
            var kos = Sosial?.KosSekarang;
            if (q.berhantu && (kos == null || !kos.berhantu)) return false;
            if (q.kosBebas && (kos == null || !kos.bebas)) return false;
            if (q.punyaPacar && (Sosial == null || !Sosial.PunyaPacar)) return false;
            if (q.diKamar && !DiKamar()) return false;
            return true;
        }

        /// <summary>Tampilkan event (juga dipakai tes) dan catat jumlah harian + jeda.</summary>
        public void Tampilkan(DataEvent ev)
        {
            s.eventJumlah = (s.eventHari == s.hari ? s.eventJumlah : 0) + 1;
            s.eventHari = s.hari;
            if (s.eventTerakhir == null) s.eventTerakhir = new Dictionary<string, int>();
            s.eventTerakhir[ev.id] = s.hari;
            aktif = ev;
            var label = new string[ev.pilihan.Count];
            for (int i = 0; i < label.Length; i++) label[i] = ev.pilihan[i].label;
            tampil = new EventTampil { Id = ev.id, Ikon = ev.ikon, Judul = ev.judul, Teks = ev.teks, Pilihan = label };
            Layanan.Audio?.Mainkan("notif");
            Berubah?.Invoke();
        }

        /// <summary>Tampilkan dialog dari sistem lain (cerita) memakai panel event yang sama. Tidak dihitung jatah harian.</summary>
        public void TampilkanLuar(DataEvent ev, Action<int> setelah)
        {
            if (aktif != null || ev == null || ev.pilihan.Count == 0) return;
            aktif = ev; setelahPilih = setelah;
            var label = new string[ev.pilihan.Count];
            for (int i = 0; i < label.Length; i++) label[i] = ev.pilihan[i].label;
            tampil = new EventTampil { Id = ev.id, Ikon = ev.ikon, Judul = ev.judul, Teks = ev.teks, Pilihan = label };
            Layanan.Audio?.Mainkan("notif");
            Berubah?.Invoke();
        }

        /// <summary>Efek akhir pilihan + teks hasil (kuis tergantung rajin belajar, kos sesuai biaya).</summary>
        string HitungEfek(PilihanEvent p, Efek keluar)
        {
            keluar.Isi(p.efek ?? new Efek());
            if (p.kuis)
            {
                bool rajin = s.hariBelajar > 0 && s.hari - s.hariBelajar <= data.Bal.kuis.rajinDalamHari;
                keluar.Isi(rajin ? data.Bal.kuis.lulus : data.Bal.kuis.gagal);
                return rajin ? "😎 Soalnya pernah dipelajari! Lancar jaya." : "😵 Blank total... nulis nama doang.";
            }
            if (p.bayarKos) keluar.uang = -(Sosial != null ? Sosial.HargaKos : data.Bal.bulanan.biayaKos);
            // Hadiah IPK dari event makin kecil mendekati 4,0 (sama dengan aksi belajar)
            if (keluar.ipk > 0f) keluar.ipk = Mathf.Round(keluar.ipk * pengaliIpk(s.ipk) * 1000f) / 1000f;
            return p.hasil;
        }

        public bool BolehPilih(int i, out string alasan)
        {
            alasan = null;
            if (aktif == null || i < 0 || i >= aktif.pilihan.Count) { alasan = "Tidak ada pilihan."; return false; }
            var p = aktif.pilihan[i];
            if (!string.IsNullOrEmpty(p.terkunci)) { alasan = p.terkunci; return false; }
            HitungEfek(p, efek);
            if (efek.uang < 0f && s.uang + efek.uang < data.Bal.batas.uangMin) { alasan = "💸 Uangnya nggak cukup..."; return false; }
            return true;
        }

        public void Pilih(int i)
        {
            if (!BolehPilih(i, out var alasan)) { if (alasan != null) Pesan?.Invoke(alasan); return; }
            var p = aktif.pilihan[i];
            string hasil = HitungEfek(p, efek);
            if (p.bayarKos) s.kosLunas = true;
            if (p.liburKuliah) s.liburHari = s.hari;
            if (p.follower != 0) s.follower = Math.Max(0, s.follower + p.follower);
            if (p.vital != null)
                foreach (var (jenis, nilai) in p.vital)
                    switch (jenis)
                    {
                        case "kenyang": s.kenyang += nilai; break;
                        case "maag": s.maag += nilai; break;
                        case "hidrasi": s.hidrasi += nilai; break;
                        case "kebersihan": s.kebersihan = Mathf.Clamp(s.kebersihan + nilai, 0, 100); break;
                        case "masukAngin": s.masukAngin += nilai; break;
                    }
            stat.Terapkan(efek);
            aktif = null; tampil = null;
            var cb = setelahPilih; setelahPilih = null;
            if (!string.IsNullOrEmpty(hasil)) Pesan?.Invoke(hasil);
            cb?.Invoke(i);
            Berubah?.Invoke();
        }
    }
}
