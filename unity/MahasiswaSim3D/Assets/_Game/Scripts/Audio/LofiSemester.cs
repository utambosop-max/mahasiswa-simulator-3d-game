using MS.Kontrak;
using UnityEngine;

namespace MS.Audio
{
    internal sealed class LofiSemester : MonoBehaviour
    {
        const int Sampel = 22050;
        const float Durasi = 8f;
        static readonly float[] Bas = { 130.813f, 110f, 146.832f, 97.999f };
        readonly AudioSource[] lapis = new AudioSource[3];
        readonly AudioClip[] klip = new AudioClip[3];

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Pasang()
        {
            var audio = new GameObject("Lo-fi Semester");
            DontDestroyOnLoad(audio);
            audio.AddComponent<LofiSemester>();
        }

        void Awake()
        {
            for (int i = 0; i < lapis.Length; i++)
            {
                var sumber = gameObject.AddComponent<AudioSource>();
                sumber.loop = true;
                sumber.playOnAwake = false;
                sumber.volume = 0f;
                sumber.spatialBlend = 0f;
                sumber.clip = klip[i] = BuatLapis(i);
                lapis[i] = sumber;
            }

            double mulai = AudioSettings.dspTime + .18;
            foreach (var sumber in lapis) sumber.PlayScheduled(mulai);
        }

        static AudioClip BuatLapis(int jenis)
        {
            var data = new float[(int)(Sampel * Durasi)];
            for (int i = 0; i < data.Length; i++)
            {
                float t = i / (float)Sampel;
                float n = Bas[Mathf.Min(Bas.Length - 1, (int)(t / 2f))];
                float ketuk = t % .5f;
                float transisi = Mathf.Clamp01((t % 2f) / .03f) * Mathf.Clamp01((2f - t % 2f) / .07f);
                data[i] = jenis switch
                {
                    0 => .19f * transisi * (Nada(n, t) + .54f * Nada(n * 1.5f, t) + .41f * Nada(n * 1.26f, t)),
                    1 => .28f * Mathf.Exp(-ketuk * 17f) * Nada(65f + 26f * Mathf.Exp(-ketuk * 22f), ketuk),
                    _ => .14f * transisi * (.9f * Nada(n * .50f, t) + .37f * Nada(n * .751f, t)) *
                        (.65f + .35f * Mathf.Sin(t * Mathf.PI))
                };
            }
            var clip = AudioClip.Create("Semester " + jenis, data.Length, 1, Sampel, false);
            clip.SetData(data,0);
            return clip;
        }

        static float Nada(float frekuensi, float waktu) =>
            Mathf.Sin(2f * Mathf.PI * frekuensi * waktu);

        void Update()
        {
            var jam = Layanan.Jam;
            var stat = Layanan.Stat;
            bool tegang = jam?.TanggalTua == true || stat?.Stres >= 75;
            bool cepat = jam?.Sibuk == true || Layanan.Kendaraan?.NaikMotor == true;
            Ubah(lapis[0], tegang ? .055f : .15f);
            Ubah(lapis[1], cepat ? .19f : .018f);
            Ubah(lapis[2], tegang ? .15f : 0f);
        }

        static void Ubah(AudioSource sumber, float volume) =>
            sumber.volume = Mathf.MoveTowards(sumber.volume, volume, Time.unscaledDeltaTime * .09f);

        void OnDestroy()
        {
            foreach (var clip in klip)
                if (clip != null) Destroy(clip);
        }
    }
}
