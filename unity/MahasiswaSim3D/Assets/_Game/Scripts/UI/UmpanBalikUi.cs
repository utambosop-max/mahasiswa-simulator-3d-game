using MS.Kontrak;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class UmpanBalikUi : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler, IPointerClickHandler
    {
        Vector3 skala;
        bool sedangDitekan;

        bool DapatDitekan => TryGetComponent<Button>(out var tombol) && tombol.IsInteractable();

        public void OnPointerDown(PointerEventData data)
        {
            if (data.button != PointerEventData.InputButton.Left || !DapatDitekan || sedangDitekan) return;
            sedangDitekan = true;
            skala = transform.localScale;
            transform.localScale = skala * 1.045f;
        }

        public void OnPointerUp(PointerEventData data) => Pulih();
        public void OnPointerExit(PointerEventData data) => Pulih();
        void OnDisable() => Pulih();

        public void OnPointerClick(PointerEventData data)
        {
            if (data.button == PointerEventData.InputButton.Left && DapatDitekan)
                Layanan.Audio?.Mainkan("klik");
        }

        void Pulih()
        {
            if (!sedangDitekan) return;
            transform.localScale = skala;
            sedangDitekan = false;
        }
    }

    internal sealed class TransisiPanelUi : MonoBehaviour
    {
        CanvasGroup grup;
        float umur;

        void OnEnable()
        {
            grup ??= gameObject.AddComponent<CanvasGroup>();
            umur = 0;
            grup.alpha = .45f;
        }

        void Update()
        {
            if (umur >= .14f) return;
            umur += Time.unscaledDeltaTime;
            grup.alpha = Mathf.Lerp(.45f, 1, umur / .14f);
        }
    }
}
