using MS.Kontrak;
using UnityEngine;
using UnityEngine.EventSystems;

namespace MS.UI
{
    public sealed class JoystickMelayang : MonoBehaviour, IPointerDownHandler, IDragHandler,
        IPointerUpHandler, IInitializePotentialDragHandler, IEndDragHandler, ICancelHandler
    {
        private const float RadiusGerak = 104f;
        private const float SetengahBasis = 126f;

        private int? jariAktif;
        private RectTransform zona, basis, knob;
        private CanvasGroup tampilan;
        private Vector2 titikSentuh;
        private IInputGerak penerima;

        internal void Siapkan(RectTransform visual, RectTransform gagang, CanvasGroup grup)
        {
            zona = (RectTransform)transform;
            basis = visual;
            knob = gagang;
            tampilan = grup;
            ResetPosisi();
        }

        public void OnPointerDown(PointerEventData data)
        {
            if (zona == null || jariAktif.HasValue || data.button != PointerEventData.InputButton.Left)
                return;
            if (!AmbilPosisi(data, out titikSentuh))
                return;

            jariAktif = data.pointerId;
            var batas = zona.rect;
            basis.localPosition = new Vector2(Jepit(titikSentuh.x, batas.xMin, batas.xMax),
                Jepit(titikSentuh.y, batas.yMin, batas.yMax));
            knob.anchoredPosition = Vector2.zero;
            tampilan.alpha = 0.96f;
        }

        public void OnDrag(PointerEventData data)
        {
            if (data.pointerId != jariAktif || !AmbilPosisi(data, out var posisi))
                return;

            // Posisi basis visual dijepit, sedangkan input selalu berawal dari posisi jari.
            var geser = Vector2.ClampMagnitude(posisi - titikSentuh, RadiusGerak);
            knob.anchoredPosition = geser;
            if (!ReferenceEquals(penerima, Layanan.Gerak))
            {
                penerima?.SetJoystick(0, 0);
                penerima = Layanan.Gerak;
            }
            penerima?.SetJoystick(geser.x / RadiusGerak, geser.y / RadiusGerak);
        }

        public void OnInitializePotentialDrag(PointerEventData data) => data.useDragThreshold = false;
        public void OnPointerUp(PointerEventData data) => AkhiriPointer(data);
        public void OnEndDrag(PointerEventData data) => AkhiriPointer(data);
        public void OnCancel(BaseEventData _) => ResetPosisi();

        private void AkhiriPointer(PointerEventData data)
        {
            if (data.pointerId == jariAktif)
                ResetPosisi();
        }

        private bool AmbilPosisi(PointerEventData data, out Vector2 posisi) =>
            RectTransformUtility.ScreenPointToLocalPointInRectangle(zona, data.position, data.pressEventCamera, out posisi);

        private static float Jepit(float nilai, float min, float max)
        {
            var ruang = Mathf.Min(SetengahBasis, (max - min) / 2f);
            return Mathf.Clamp(nilai, min + ruang, max - ruang);
        }

        private void OnApplicationFocus(bool fokus)
        {
            if (!fokus) ResetPosisi();
        }

        private void OnApplicationPause(bool jeda)
        {
            if (jeda) ResetPosisi();
        }

        private void OnDisable() => ResetPosisi();

        internal void ResetPosisi()
        {
            penerima?.SetJoystick(0, 0);
            penerima = null;
            jariAktif = null;
            if (basis == null)
                return;
            var batas = zona.rect;
            basis.localPosition = new Vector2(Jepit(batas.xMin + 162f, batas.xMin, batas.xMax),
                Jepit(batas.yMin + 160f, batas.yMin, batas.yMax));
            knob.anchoredPosition = Vector2.zero;
            tampilan.alpha = 0.44f;
        }
    }
}
