// Pengaman sentuhan: pastikan selalu ada EventSystem + InputSystemUIInputModule di setiap scene,
// walaupun kode HUD gagal di tengah jalan (temuan uji HP 25 Nov 2026: tanpa ini semua tombol mati).
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.SceneManagement;

namespace MS.Pemain
{
    public static class PastikanEventSystem
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Pasang()
        {
            Periksa();
            SceneManager.sceneLoaded += (_, __) => Periksa();
        }

        static void Periksa()
        {
            if (Object.FindAnyObjectByType<EventSystem>() != null) return;
            var go = new GameObject("Input UI (pengaman)", typeof(EventSystem), typeof(InputSystemUIInputModule));
            Object.DontDestroyOnLoad(go);
        }
    }
}
