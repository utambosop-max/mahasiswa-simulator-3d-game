using TMPro;
using UnityEngine;

namespace MS.UI
{
    [RequireComponent(typeof(TextMeshProUGUI))]
    internal sealed class TitikElipsis : MonoBehaviour
    {
        TextMeshProUGUI teks;
        TextMeshProUGUI penanda;
        string sebelumnya;
        Rect ukuran;
        float skala;

        void Awake()
        {
            teks = GetComponent<TextMeshProUGUI>();
            var objek = new GameObject("Tanda teks terpotong", typeof(RectTransform));
            objek.transform.SetParent(transform, false);
            var rect = (RectTransform)objek.transform;
            rect.anchorMin = new Vector2(1, 0);
            rect.anchorMax = Vector2.one;
            rect.pivot = new Vector2(1, .5f);
            rect.sizeDelta = new Vector2(48, 0);
            penanda = objek.AddComponent<TextMeshProUGUI>();
            penanda.font = teks.font;
            penanda.fontStyle = teks.fontStyle;
            penanda.fontSize = teks.fontSize;
            penanda.color = teks.color;
            penanda.alignment = TextAlignmentOptions.Right;
            penanda.raycastTarget = false;
            penanda.text = "...";
            penanda.enabled = false;
            objek.SetActive(false);
        }

        void LateUpdate()
        {
            var rect = teks.rectTransform.rect;
            float ukuranFont = teks.fontSize;
            if (sebelumnya == teks.text && ukuran == rect && skala == ukuranFont) return;
            sebelumnya = teks.text;
            ukuran = rect;
            skala = ukuranFont;
            teks.ForceMeshUpdate();
            penanda.fontSize = teks.fontSize;
            penanda.color = teks.color;
            penanda.enabled = teks.isTextOverflowing;
            penanda.gameObject.SetActive(penanda.enabled);
        }
    }
}
