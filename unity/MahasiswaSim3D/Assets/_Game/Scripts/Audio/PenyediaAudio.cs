using System;
using System.Collections.Generic;
using MS.Kontrak;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace MS.Audio
{
    [DisallowMultipleComponent]
    public sealed class PenyediaAudio : MonoBehaviour, IPenyediaAudio
    {
        const int SampelPerDetik = 22050;
        readonly Dictionary<string, AudioClip> klip = new Dictionary<string, AudioClip>();
        readonly Dictionary<string, float> terakhir = new Dictionary<string, float>();
        readonly AudioSource[] saluran = new AudioSource[3];
        IPenerimaAksi aksi;
        int giliran;
        AudioSource mesin, hujan, ruang, sekitar;
        float bensinTerakhir, gas, bersinBerikut, sekitarBerikut;
        bool ayamBerikut = true;
        bool tadiNaik;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Mulai()
        {
            if (FindAnyObjectByType<PenyediaAudio>() == null)
                new GameObject("Audio Sintetis").AddComponent<PenyediaAudio>();
        }

        void Awake()
        {
            DontDestroyOnLoad(gameObject);
            for (int i = 0; i < saluran.Length; i++)
            {
                saluran[i] = gameObject.AddComponent<AudioSource>();
                saluran[i].playOnAwake = false;
                saluran[i].spatialBlend = 0f;
            }
            BuatKlip();
            mesin = BuatSaluranLoop("mesin", .10f);
            hujan = BuatSaluranLoop("hujan", .075f);
            ruang = BuatSaluranLoop("kipas", .043f);
            sekitar = gameObject.AddComponent<AudioSource>();
            sekitar.playOnAwake = false;
            Layanan.Audio = this;
        }

        void Update()
        {
            PerbaruiAmbience();
            if (ReferenceEquals(aksi, Layanan.Aksi)) return;
            if (aksi != null) aksi.AksiMulai -= SaatAksi;
            aksi = Layanan.Aksi;
            if (aksi != null) aksi.AksiMulai += SaatAksi;
        }

        AudioSource BuatSaluranLoop(string id, float volume)
        {
            var sumber = gameObject.AddComponent<AudioSource>();
            sumber.playOnAwake = false;
            sumber.loop = true;
            sumber.volume = volume;
            sumber.clip = klip[id];
            return sumber;
        }

        void PerbaruiAmbience()
        {
            var motor = Layanan.Kendaraan;
            bool naik = motor?.NaikMotor == true && !motor.Mogok;
            float bensin = motor?.Bensin ?? 0;
            float target = naik && tadiNaik && bensin < bensinTerakhir ? 1 : 0;
            gas = Mathf.MoveTowards(gas, target, Time.unscaledDeltaTime * 3);
            mesin.pitch = Mathf.Lerp(.75f, 1.55f, gas);
            if (naik && !mesin.isPlaying) mesin.Play();
            if (!naik && mesin.isPlaying) mesin.Stop();
            tadiNaik = naik;
            bensinTerakhir = bensin;

            string scene = SceneManager.GetActiveScene().name;
            bool gerimis = Layanan.Kondisi?.CuacaId == "hujan" && scene == "Kampung";
            if (gerimis && !hujan.isPlaying) hujan.Play();
            if (!gerimis && hujan.isPlaying) hujan.Stop();
            if (gerimis)
            {
                bool ringan = Layanan.Jam?.Fase == Fase.Pagi || Layanan.Jam?.Fase == Fase.Sore;
                hujan.volume = Mathf.MoveTowards(hujan.volume, ringan ? .044f : .086f, Time.unscaledDeltaTime * .08f);
            }
            PutarLingkungan(scene, gerimis);
            if (Layanan.Kondisi?.Sakit != true) bersinBerikut = 0;
            else if (Time.unscaledTime >= bersinBerikut)
            {
                Mainkan("bersin");
                bersinBerikut = Time.unscaledTime + 24;
            }
        }

        void PutarLingkungan(string scene, bool hujanTurun)
        {
            var fase = Layanan.Jam?.Fase;
            bool kampung = scene == "Kampung";
            bool malam = fase == Fase.Malam || fase == Fase.Begadang;
            var klipRuang = scene == "KamarKos" ? klip["kipas"] :
                kampung && malam && !hujanTurun ? klip["jangkrik"] : null;
            if (ruang.clip != klipRuang)
            {
                ruang.Stop();
                ruang.clip = klipRuang;
                if (klipRuang != null) ruang.Play();
            }
            else if (klipRuang != null && !ruang.isPlaying) ruang.Play();

            if (!kampung)
            {
                if (sekitar.isPlaying) sekitar.Stop();
                sekitarBerikut = 0;
                ayamBerikut = true;
                return;
            }
            float sekarang = Time.unscaledTime;
            if (sekitarBerikut == 0) sekitarBerikut = sekarang + 1.2f;
            if (sekarang < sekitarBerikut) return;
            bool ayam = fase == Fase.Pagi && ayamBerikut && !hujanTurun;
            ayamBerikut = !ayamBerikut;
            sekitar.clip = klip[ayam ? "ayamPagi" : "motorJauh"];
            sekitar.volume = ayam ? .093f : hujanTurun ? .035f : .073f;
            sekitar.pitch = UnityEngine.Random.Range(.91f, 1.08f);
            sekitar.Play();
            sekitarBerikut = sekarang + UnityEngine.Random.Range(12f, 21f);
        }

        void OnDestroy()
        {
            if (aksi != null) aksi.AksiMulai -= SaatAksi;
            if (ReferenceEquals(Layanan.Audio, this)) Layanan.Audio = null;
            foreach (var clip in klip.Values) Destroy(clip);
        }

        public void Mainkan(string idSuara)
        {
            string id = PilihSuara(idSuara);
            if (!klip.TryGetValue(id, out var clip)) return;
            if (terakhir.TryGetValue(id, out float waktu) && Time.unscaledTime - waktu < .05f) return;
            terakhir[id] = Time.unscaledTime;
            var sumber = saluran[giliran++ % saluran.Length];
            sumber.Stop();
            bool langkah = id.StartsWith("langkah", StringComparison.Ordinal);
            sumber.pitch = id == "klik" || langkah ? UnityEngine.Random.Range(.88f, 1.12f) : 1f;
            sumber.clip = clip;
            sumber.volume = id == "klakson" ? .13f : langkah ? .12f : id == "klik" ? .16f : .22f;
            sumber.Play();
        }

        void SaatAksi(string id) => Mainkan(id);

        static string PilihSuara(string id)
        {
            if (string.IsNullOrEmpty(id)) return "aksi";
            if (id is "langkahRumput" or "langkahAspal" or "langkahPaving" or "langkahKayu" or "langkahKeramik") return id;
            if (id is "klakson" or "minum") return id;
            if (id == "bersin") return id;
            if (id is "razia" or "bengkel" or "bukuSakti") return id;
            if (id is "jadian" or "kencan" or "nabung" or "hantu" or "lomba") return id;
            if (id == "ujian" || id == "lulus" || id == "bayar" || id == "ngobrol" || id == "gitar" || id == "kucing") return id;
            if (id == "klik" || id == "salah" || id == "langkah" || id == "notif" || id == "koin" || id == "upgrade") return id;
            if (id == "masukKos" || id == "keluarKos" || id.StartsWith("masuk") || id.StartsWith("keluar")) return "pintu";
            if (id.Contains("tidur") || id == "rebahan") return "tidur";
            if (id.Contains("kerja") || id.Contains("nugas") || id.Contains("belajar") || id == "kuliah") return "ketik";
            if (id.Contains("masak") || id.Contains("makan")) return "wajan";
            if (id.Contains("beli") || id.Contains("belanja") || id.Contains("bayar")) return "koin";
            return "aksi";
        }

        static readonly float[] nada523_659_1047 = { 523, 659, 1047 };

        static readonly float[] nada587_880_784 = { 587, 880, 784 };

        static readonly float[] nada1047_1568 = { 1047, 1568 };

        static readonly float[] nada659_784_1047 = { 659, 784, 1047 };

        void BuatKlip()
        {
            Buat("klik", .10f, (t, d) => Nada(t, 659, 880, d) * Bungkus(t, d));
            Buat("klakson", .28f, (t, _) =>
            {
                float lokal = t % .14f;
                float dasar = t < .14f ? 415f : 391f;
                var nada = Nada(lokal, dasar, dasar - 8, .11f) + .34f * Nada(lokal, dasar * 3, dasar * 2.95f, .11f);
                return .60f * nada * Mathf.Clamp01(lokal * 150) * Bungkus(lokal, .10f);
            });
            Buat("minum", .34f, (t, d) => .44f * Nada(t, 310f, 730f, d) * Bungkus(t, d)
                * (.5f + .5f * Mathf.Sin(t * 71f)));
            Buat("razia", .32f, (t, _) =>
            {
                float lokal = t % .16f;
                return Nada(lokal, 1730, 2020, .16f) * Bungkus(lokal, .13f) * .5f;
            });
            Buat("bengkel", .26f, (t, _) =>
            {
                float lokal = t % .13f;
                float denting = .45f * Nada(lokal, 990, 990, .13f) + .28f * Nada(lokal, 1745, 1745, .13f);
                return denting * Mathf.Exp(-lokal * 42f) * Mathf.Clamp01(lokal * 400f);
            });
            var acakKertas = new System.Random(417);
            float redamKertas = 0;
            Buat("bukuSakti", .34f, (t, d) =>
            {
                float acak = (float)(acakKertas.NextDouble() * 2 - 1);
                redamKertas = .34f * acak + .66f * redamKertas;
                return (acak - redamKertas) * Bungkus(t, d) * (.25f + .2f * Mathf.Sin(t * 69f));
            });
            Buat("jadian", .48f, (t, d) => Rangkaian(t, d, nada523_659_1047));
            Buat("kencan", .54f, (t, d) => Rangkaian(t, d, nada587_880_784));
            Buat("nabung", .24f, (t, d) => Rangkaian(t, d, nada1047_1568));
            Buat("lomba", .57f, (t, d) => Rangkaian(t, d, nada659_784_1047));
            Buat("hantu", .48f, (t, _) =>
            {
                float lokal = t % .24f;
                return Nada(lokal, 145, 82, .16f) * Bungkus(lokal, .16f) * .55f;
            });
            Buat("mesin", 1f, (t, _) => .42f * Mathf.Sin(2 * Mathf.PI * 48 * t) + .18f * Mathf.Sin(2 * Mathf.PI * 96 * t));
            Buat("kipas", 1f, (t, _) => .33f * Nada(t, 60, 60, 1) + .14f * Nada(t, 120, 120, 1)
                + .059f * Nada(t, 248, 248, 1) * (.65f + .35f * Nada(t, 12, 12, 1)));
            Buat("jangkrik", 5.2f, (t, _) =>
            {
                float frasa = t % 1.3f;
                float pulsa = frasa % .064f;
                return frasa > .33f ? 0 : .36f * Nada(pulsa, 3570, 3790, .064f) * Bungkus(pulsa, .064f);
            });
            Buat("ayamPagi", 1.16f, (t, _) =>
            {
                float lokal = t < .28f ? t % .14f : t - .28f;
                float dasar = t < .14f ? 680 : t < .28f ? 835 : 1050;
                float panjang = t < .28f ? .14f : .88f;
                return (.44f * Nada(lokal, dasar, dasar * .82f, panjang) +
                    .16f * Nada(lokal, dasar * 2, dasar * 1.64f, panjang)) *
                    Bungkus(lokal, panjang) * (.75f + .25f * Mathf.Sin(90f * t));
            });
            Buat("motorJauh", 2.4f, (t, d) =>
            {
                float lewat = Mathf.Sin(Mathf.PI * t / d);
                return (.46f * Nada(t, 102, 65, d) + .20f * Nada(t, 204, 130, d)) * lewat * lewat;
            });
            var acakHujan = new System.Random(314);
            float redam = 0;
            Buat("hujan", 4f, (_, _) => redam = .72f * redam + .28f * (float)(acakHujan.NextDouble() * 2 - 1));
            var acakBersin = new System.Random(271);
            Buat("bersin", .36f, (t, d) => (float)(acakBersin.NextDouble() * 2 - 1) * Bungkus(t, d) * Mathf.Clamp01(t * 8));
            Buat("ujian", .30f, (t, d) => Nada(t, 784, 523, d) * Bungkus(t, d) * .65f);
            Buat("lulus", .64f, (t, _) =>
            {
                int langkah = Mathf.Min(3, Mathf.FloorToInt(t / .16f));
                float lokal = t - langkah * .16f;
                float hz = langkah switch { 0 => 523f, 1 => 659f, 2 => 784f, _ => 1047f };
                return Nada(lokal, hz, hz, .16f) * Bungkus(lokal, .16f) * .7f;
            });
            Buat("bayar", .24f, (t, d) => Nada(t, t < .12f ? 1319 : 1568, 1568, d) * Bungkus(t, d) * .65f);
            Buat("ngobrol", .25f, (t, d) => Nada(t, 659, 784, d) * Bungkus(t, d) * .55f);
            Buat("gitar", .45f, (t, d) => (Mathf.Sin(2 * Mathf.PI * 262 * t) + Mathf.Sin(2 * Mathf.PI * 330 * t) + Mathf.Sin(2 * Mathf.PI * 392 * t)) * Bungkus(t, d) * .22f);
            Buat("kucing", .4f, (t, d) => Nada(t, 520, t < .2f ? 820 : 430, d) * Bungkus(t, d) * .6f);
            Buat("upgrade", .48f, (t, _) =>
            {
                int langkah = Mathf.Min(3, Mathf.FloorToInt(t / .12f));
                float lokal = t - langkah * .12f;
                float hz = langkah switch { 0 => 523f, 1 => 659f, 2 => 784f, _ => 1047f };
                return Nada(lokal, hz, hz, .12f) * Bungkus(lokal, .12f) * .7f;
            });
            Buat("notif", .33f, (t, _) =>
            {
                int nada = Mathf.Min(2, Mathf.FloorToInt(t / .11f));
                float lokal = t - nada * .11f;
                float hz = nada == 0 ? 880f : nada == 1 ? 1175f : 1568f;
                return Nada(lokal, hz, hz, .11f) * Bungkus(lokal, .11f) * .65f;
            });
            Buat("salah", .18f, (t, d) => Bergerigi(t, 300 - 150 * t / d) * Bungkus(t, d));
            Buat("langkah", .08f, (t, d) => Mathf.Sin(2 * Mathf.PI * (115 - 45 * t / d) * t) * Bungkus(t, d));
            BuatLangkah("langkahRumput", 82f, .76f, .10f);
            BuatLangkah("langkahAspal", 133f, .46f, .085f);
            BuatLangkah("langkahPaving", 193f, .46f, .067f);
            BuatLangkah("langkahKayu", 172f, .21f, .12f);
            BuatLangkah("langkahKeramik", 390f, .18f, .073f);
            Buat("aksi", .23f, (t, d) => Nada(t, 523, 784, d) * Bungkus(t, d));
            Buat("pintu", .34f, (t, _) => t < .20f
                ? .29f * Bergerigi(t, 170 - 220 * t) * Bungkus(t, .20f)
                : .62f * Nada(t - .20f, 109, 63, .14f) * Bungkus(t - .20f, .14f));
            Buat("tidur", .55f, (t, d) => Nada(t, t < d / 2 ? 784 : 587, 523, d) * Bungkus(t, d) * .65f);
            Buat("ketik", .27f, (t, d) => Mathf.Sin(2 * Mathf.PI * 880 * t) * Bungkus(t % .09f, .09f) * .35f);
            Buat("wajan", .32f, (t, d) => (Mathf.Sin(2 * Mathf.PI * 1175 * t) + Mathf.Sin(2 * Mathf.PI * 1568 * t)) * .24f * Bungkus(t, d));
            Buat("koin", .27f, (t, d) => Nada(t, t < d / 2 ? 1319 : 1568, 1568, d) * Bungkus(t, d) * .7f);
        }

        void BuatLangkah(string id, float frekuensi, float bunyi, float durasi)
        {
            var acak = new System.Random((int)frekuensi);
            float rendah = 0;
            Buat(id, durasi, (t, d) =>
            {
                float gangguan = (float)(acak.NextDouble() * 2 - 1);
                rendah = .69f * rendah + .31f * gangguan;
                return (.57f * Nada(t, frekuensi, frekuensi * .62f, d) + bunyi * (gangguan - rendah)) * Bungkus(t, d);
            });
        }

        void Buat(string id, float durasi, Func<float, float, float> sampel)
        {
            int jumlah = Mathf.CeilToInt(SampelPerDetik * durasi);
            var isi = new float[jumlah];
            for (int i = 0; i < jumlah; i++) isi[i] = Mathf.Clamp(sampel((float)i / SampelPerDetik, durasi), -1f, 1f);
            var clip = AudioClip.Create("sfx_" + id, jumlah, 1, SampelPerDetik, false);
            clip.SetData(isi, 0);
            klip.Add(id, clip);
        }

        static float Rangkaian(float t, float durasi, float[] nada)
        {
            float panjang = durasi / nada.Length;
            int indeks = Mathf.Min(nada.Length - 1, (int)(t / panjang));
            float lokal = t - indeks * panjang;
            return Nada(lokal, nada[indeks], nada[indeks], panjang) * Bungkus(lokal, panjang) * .58f;
        }

        static float Bungkus(float t, float durasi) => Mathf.Clamp01(t / .012f) * Mathf.Clamp01((durasi - t) / (durasi * .65f));
        static float Nada(float t, float awal, float akhir, float durasi) => Mathf.Sin(2 * Mathf.PI * Mathf.Lerp(awal, akhir, t / durasi) * t);
        static float Bergerigi(float t, float hz) => 2f * (t * hz - Mathf.Floor(t * hz)) - 1f;
    }
}
