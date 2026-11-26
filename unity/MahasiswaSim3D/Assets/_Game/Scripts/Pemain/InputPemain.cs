using UnityEngine;
using UnityEngine.InputSystem;

namespace MS.Pemain
{
    /// <summary>Menggabungkan input keyboard/gamepad + joystick virtual jadi satu vektor gerak (panjang 0..1).</summary>
    public class InputPemain : MonoBehaviour
    {
        // Dead zone sama dengan web (Joystick.tsx DEAD = 0.12), dipetakan ulang agar tidak "loncat"
        public const float DeadZone = 0.12f;

        static Vector2 _joystick;

        /// <summary>Dipanggil UI joystick (lewat adaptor Kontrak nanti). Nilai mentah -1..1.</summary>
        public static void SetJoystick(Vector2 v) { _joystick = Vector2.ClampMagnitude(v, 1f); }
        public static void SetJoystick(float x, float y) { SetJoystick(new Vector2(x, y)); }

        /// <summary>Vektor gerak akhir (x = kanan, y = maju), dibaca GerakPemain.</summary>
        public Vector2 Gerak { get; private set; }
        public bool Lari { get; private set; }

        void Update()
        {
            Vector2 v = Vector2.zero;
            var kb = Keyboard.current;
            if (kb != null)
            {
                if (kb.wKey.isPressed || kb.upArrowKey.isPressed) v.y += 1f;
                if (kb.sKey.isPressed || kb.downArrowKey.isPressed) v.y -= 1f;
                if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) v.x += 1f;
                if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) v.x -= 1f;
            }
            var gp = Gamepad.current;
            if (gp != null) v += PetakanDeadZone(gp.leftStick.ReadValue());
            v += PetakanDeadZone(_joystick);
            bool ditahan = MS.Kontrak.Layanan.InputDitahan || !Application.isFocused;
            Gerak = ditahan ? Vector2.zero : Vector2.ClampMagnitude(v, 1f);
            Lari = !ditahan && kb != null && (kb.leftShiftKey.isPressed || kb.rightShiftKey.isPressed);
        }

        /// <summary>[DeadZone..1] dipetakan ke [0..1] agar kecepatan naik mulus dari nol.</summary>
        public static Vector2 PetakanDeadZone(Vector2 v)
        {
            float m = v.magnitude;
            if (m < DeadZone) return Vector2.zero;
            float kuat = Mathf.Min(1f, (m - DeadZone) / (1f - DeadZone));
            return v / m * kuat;
        }

        void OnEnable() { if (MS.Kontrak.Layanan.Gerak == null) MS.Kontrak.Layanan.Gerak = new AdaptorInputGerak(); }
        void OnDisable() { _joystick = Vector2.zero; }
    }

    /// <summary>Menghubungkan joystick UI (lewat Kontrak) ke InputPemain. Didaftarkan di OnEnable.</summary>
    public sealed class AdaptorInputGerak : MS.Kontrak.IInputGerak
    {
        public void SetJoystick(float x, float y) { InputPemain.SetJoystick(x, y); }
    }
}
