using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class ToastAntrean
    {
        const float Lama = 3f;
        const int MaksTunggu = 24;
        readonly Queue<string> antrean = new();
        readonly TextMeshProUGUI[] label;
        readonly float[] hingga;
        readonly LayoutElement[] bentuk;
        float lebarMaks = 720;

        internal ToastAntrean(TextMeshProUGUI[] label)
        {
            this.label = label;
            hingga = new float[label.Length];
            bentuk = new LayoutElement[label.Length];
            for (int i = 0; i < label.Length; i++) bentuk[i] = label[i].transform.parent.GetComponent<LayoutElement>();
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
                AturKapsul(i);
                hingga[i] = sekarang + Lama;
                kotak.transform.SetAsLastSibling();
                kotak.SetActive(true);
            }
        }

        internal void Ukur(float lebar)
        {
            if (lebar <= 0) return;
            lebarMaks = lebar;
            for (int i = 0; i < label.Length; i++)
                if (label[i].transform.parent.gameObject.activeSelf) AturKapsul(i);
        }

        void AturKapsul(int i)
        {
            float teks = label[i].GetPreferredValues(label[i].text, float.PositiveInfinity, float.PositiveInfinity).x;
            bentuk[i].preferredWidth = Mathf.Min(lebarMaks, Mathf.Max(152, teks + 62));
            bentuk[i].minHeight = teks + 62 > lebarMaks ? 106 : 76;
        }

        public void Kosongkan()
        {
            antrean.Clear();
            foreach (var teks in label)
                teks.transform.parent.gameObject.SetActive(false);
        }
    }
}

