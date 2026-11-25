// Khusus build uji (Development Build): tampilkan error/exception terakhir di layar HP (teks merah di atas),
// agar pemilik proyek cukup kirim screenshot tanpa kabel/adb. Tidak aktif di build rilis.
using System.Collections.Generic;
using UnityEngine;

namespace MS.Inti
{
    public class LayarError : MonoBehaviour
    {
        static readonly List<string> baris = new List<string>(8);
        static int jumlah;
        GUIStyle gaya;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Pasang()
        {
            if (!Debug.isDebugBuild || Application.isEditor) return;
            var go = new GameObject("Layar Error (uji)");
            DontDestroyOnLoad(go);
            go.AddComponent<LayarError>();
            Application.logMessageReceived += Terima;
            Debug.Log("[Uji] Layar error aktif. Layar " + Screen.width + "x" + Screen.height);
        }

        static void Terima(string pesan, string jejak, LogType jenis)
        {
            if (jenis != LogType.Error && jenis != LogType.Exception && jenis != LogType.Assert) return;
            jumlah++;
            string baris1 = jejak != null && jejak.Length > 0 ? jejak.Split('\n')[0] : "";
            baris.Add("#" + jumlah + " " + pesan + (baris1.Length > 0 ? "  @ " + baris1 : ""));
            if (baris.Count > 6) baris.RemoveAt(0);
        }

        void OnGUI()
        {
            if (baris.Count == 0) return;
            if (gaya == null) gaya = new GUIStyle(GUI.skin.label) { fontSize = Mathf.Max(14, Screen.height / 40), wordWrap = true, normal = { textColor = Color.red } };
            GUI.color = new Color(0, 0, 0, 0.75f);
            GUI.DrawTexture(new Rect(0, 0, Screen.width, Screen.height * 0.35f), Texture2D.whiteTexture);
            GUI.color = Color.white;
            GUI.Label(new Rect(10, 10, Screen.width - 20, Screen.height * 0.35f - 20), string.Join("\n", baris), gaya);
        }
    }
}
