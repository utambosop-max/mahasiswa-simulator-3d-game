using System;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace MS.Inti
{
    /// <summary>Save/Load JSON di Application.persistentDataPath. Gagal → data baru (default).</summary>
    public static class SimpanMuat
    {
        const string NamaFile = "simpan.json";
        static readonly object Kunci = new object();
        static string Jalur => Path.Combine(Application.persistentDataPath, NamaFile);

        public static DataSimpan Muat(DataBalance b)
        {
            lock (Kunci)
            {
                string jalur = Jalur;
                foreach (string calon in new[] { jalur, jalur + ".baru", jalur + ".tmp", jalur + ".bak" })
                {
                    var data = Baca(calon, b);
                    if (data == null) continue;
                    if (calon != jalur) Debug.LogWarning("[Inti] Save dipulihkan dari " + Path.GetFileName(calon));
                    return data;
                }
#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
                // Perubahan judul mengubah folder LocalLow di Windows.
                const string kunci = "MigrasiJudul040";
                if (!PlayerPrefs.HasKey(kunci) && !File.Exists(jalur))
                {
                    string lama = Path.Combine(Application.persistentDataPath, "..", "Mahasiswa Simulator 3D", NamaFile);
                    foreach (string akhiran in new[] { "", ".baru", ".tmp", ".bak" })
                    {
                        var data = Baca(lama + akhiran, b);
                        if (data == null) continue;
                        if (Tulis(data))
                        {
                            PlayerPrefs.SetInt(kunci, 1);
                            PlayerPrefs.Save();
                        }
                        return data;
                    }
                }
#endif
                return DataSimpan.Baru(b);
            }
        }

        static DataSimpan Baca(string jalur, DataBalance b)
        {
            try
            {
                if (!File.Exists(jalur)) return null;
                var d = JsonConvert.DeserializeObject<DataSimpan>(File.ReadAllText(jalur));
                if (d == null) return null;
                if (d.versi > DataSimpan.VersiSekarang)
                    Debug.LogWarning("[Inti] Save dari versi lebih baru, dibaca sebisanya.");
                Migrasi(d);
                d.versi = DataSimpan.VersiSekarang;
                if (d.hari < 1) d.hari = 1;
                if (d.tanggal < 1 || d.tanggal > b.bulanan.hariPerBulan) d.tanggal = 1;
                if (d.menit < 0f || d.menit >= 1440f) d.menit = 60f;
                if (d.perabot == null) d.perabot = new System.Collections.Generic.Dictionary<string, int>();
                return d;
            }
            catch (Exception e)
            {
                Debug.LogWarning("[Inti] Save tidak dapat dibaca (" + Path.GetFileName(jalur) + "): " + e.Message);
                return null;
            }
        }

        /// <summary>Isi field baru untuk save lama. Field yang tidak ada di JSON lama sudah memakai nilai default kelas.</summary>
        public static void Migrasi(DataSimpan d)
        {
            if (d.versi < 9 && d.jurusan == "kedokteran") d.jurusan = "sosial";
            d.traits ??= new System.Collections.Generic.List<string>();
            d.reputasiCircle ??= new System.Collections.Generic.Dictionary<string, int>();
            if (d.versi < 8)
            {
                d.cerita = d.cerita ?? new CeritaSimpan();
                if (d.motorLevel < 1) d.motorLevel = 1;
            }
            if (d.versi < 7)
            {
                // Field baru versi 7: pastikan koleksi tidak null (save lama tidak punya)
                d.relasi = d.relasi ?? new System.Collections.Generic.Dictionary<string, int>();
                d.deposito = d.deposito ?? new System.Collections.Generic.List<SimpanDeposito>();
                d.beasiswaTolak = d.beasiswaTolak ?? new System.Collections.Generic.Dictionary<string, int>();
                d.latihan = d.latihan ?? new System.Collections.Generic.Dictionary<string, int>();
                d.lombaSkor = d.lombaSkor ?? new System.Collections.Generic.List<float>();
                d.kos = d.kos ?? "melati"; d.rambut = d.rambut ?? "pendek"; d.warnaRambut = d.warnaRambut ?? "#2a1d15";
                if (d.versi < 7 && d.cabai == 0f && d.cabaiSiram == 0) d.cabai = -1f;
            }
            if (d.versi < 6) { d.profilDibuat = true; d.jurusan = d.jurusan ?? "teknik"; d.asal = d.asal ?? "jawa"; }
            if (d.versi < 2)
            {
                d.hadirPagi = d.hadirSiang = false;
                d.kosLunas = true; // anggap kos bulan ini sudah dibayar (sama dengan game baru)
            }
        }

        public static bool Simpan(DataSimpan d)
        {
            lock (Kunci) return Tulis(d);
        }

        static bool Tulis(DataSimpan d)
        {
            try
            {
                string jalur = Jalur;
                string baru = jalur + ".baru";
                string cadangan = jalur + ".bak";
                // Pertahankan hasil tulis sebelumnya bila proses berhenti sebelum promosi.
                if (!File.Exists(jalur) && File.Exists(baru)) File.Move(baru, jalur);
                using (var file = new FileStream(baru, FileMode.Create, FileAccess.Write))
                {
                    byte[] isi = System.Text.Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(d, Formatting.Indented));
                    file.Write(isi, 0, isi.Length);
                    file.Flush(true);
                }
                if (File.Exists(jalur))
                {
                    File.Delete(cadangan);
                    File.Move(jalur, cadangan);
                }
                File.Move(baru, jalur);
                File.Delete(jalur + ".tmp");
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError("[Inti] Gagal menyimpan: " + e.Message);
                return false;
            }
        }

        public static void Hapus()
        {
            lock (Kunci)
            {
#if UNITY_STANDALONE_WIN || UNITY_EDITOR_WIN
                PlayerPrefs.SetInt("MigrasiJudul040", 1);
                PlayerPrefs.Save();
#endif
                foreach (string akhiran in new[] { ".baru", ".tmp", ".bak", "" })
                {
                    try { File.Delete(Jalur + akhiran); }
                    catch (Exception e) { Debug.LogError("[Inti] Gagal hapus save: " + e.Message); }
                }
            }
        }
    }
}
