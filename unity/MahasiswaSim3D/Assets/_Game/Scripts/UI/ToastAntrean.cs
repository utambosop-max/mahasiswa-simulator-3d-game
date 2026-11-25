using System.Collections.Generic;
using TMPro;
using UnityEngine;

namespace MS.UI
{
    internal sealed class ToastAntrean
    {
        const float Lama = 3f;
        const int MaksTunggu = 24;
        readonly Queue<string> antrean = new();
        readonly TextMeshProUGUI[] label;
        readonly float[] hingga;

        internal ToastAntrean(TextMeshProUGUI[] label)
        {
            this.label = label;
            hingga = new float[label.Length];
            Kosongkan();
        }

        public void Tambah(string pesan)
        {
            if (string.IsNullOrWhiteSpace(pesan)) return;
            pesan = HudKamar.BersihkanEmoji(pesan);
            if (string.IsNullOrWhiteSpace(pesan)) return;
            if (antrean.Count == MaksTunggu) antrean.Dequeue();
            antrean.Enqueue(pesan);
            Tick();
        }

        public void Tick()
        {
            float sekarang = Time.unscaledTime;
            for (int i = 0; i < label.Length; i++)
            {
                var kotak = label[i].transform.parent.gameObject;
                if (kotak.activeSelf && sekarang < hingga[i]) continue;
                if (antrean.Count == 0)
                {
                    if (kotak.activeSelf) kotak.SetActive(false);
                    continue;
                }
                label[i].text = antrean.Dequeue();
                hingga[i] = sekarang + Lama;
                kotak.transform.SetAsLastSibling();
                kotak.SetActive(true);
            }
        }

        public void Kosongkan()
        {
            antrean.Clear();
            foreach (var teks in label)
                teks.transform.parent.gameObject.SetActive(false);
        }
    }
}

