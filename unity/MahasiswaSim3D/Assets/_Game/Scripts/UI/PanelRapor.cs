using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class PanelRapor
    {
        readonly RectTransform akar;
        readonly TextMeshProUGUI isi;
        readonly System.Action saatBuka;
        internal bool Terbuka => akar.gameObject.activeSelf;

        internal PanelRapor(HudKamar hud, RectTransform induk, System.Action saatBuka)
        {
            this.saatBuka = saatBuka;
            akar = HudKamar.BuatKotak("Panel rapor", induk);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            akar.gameObject.AddComponent<Image>().color = new Color(0, 0, 0, .5f);
            var kartu = HudKamar.BuatKotak("Kartu rapor", akar);
            HudKamar.Rentangkan(kartu, new Vector2(.12f, .10f), new Vector2(.88f, .84f));
            hud.Gambar(kartu, new Color32(255, 250, 242, 255), true);
            var judul = HudKamar.Teks(kartu, "Rapor dan status", 54, 32, FontStyles.Bold);
            HudKamar.Rentangkan(judul.rectTransform, new Vector2(.05f, .78f), new Vector2(.95f, .98f));
            isi = HudKamar.Teks(kartu, "", 44, 26, FontStyles.Normal);
            isi.textWrappingMode = TextWrappingModes.Normal;
            isi.overflowMode = TextOverflowModes.Overflow;
            HudKamar.Rentangkan(isi.rectTransform, new Vector2(.06f, .23f), new Vector2(.94f, .77f));
            var rt = HudKamar.BuatKotak("Tutup rapor", kartu);
            HudKamar.Rentangkan(rt, new Vector2(.3f, .025f), new Vector2(.7f, .21f));
            var gambar = hud.Gambar(rt, new Color32(255, 216, 172, 255), true);
            var tombol = rt.gameObject.AddComponent<Button>();
            tombol.targetGraphic = gambar;
            tombol.onClick.AddListener(Tutup);
            var label = HudKamar.Teks(rt, "Tutup", 42, 28, FontStyles.Bold);
            HudKamar.Rentangkan(label.rectTransform, Vector2.zero, Vector2.one);
            akar.gameObject.SetActive(false);
        }

        internal void Buka()
        {
            if (Layanan.InputDitahan) return;
            Layanan.UiModal = true;
            saatBuka();
            akar.gameObject.SetActive(true);
            akar.SetAsLastSibling();
            Perbarui();
        }

        internal void Perbarui()
        {
            if (!Terbuka) return;
            var a = Layanan.Akademik;
            var s = Layanan.Stat;
            isi.text = a == null || s == null ? "Status akademik belum tersedia." :
                $"IPK {s.Ipk:0.00} · {a.Predikat}\nSemester {a.Semester} · {a.Sks}/{a.SksLulus} SKS\n" +
                $"Skripsi {a.Skripsi}%{(a.Lulus ? " · Lulus" : "")}\nUang Rp{s.Uang:N0}";
            var hidup = Layanan.Hidup;
            if (hidup == null) return;
            string target = hidup.TargetTabungan > 0 ? $" / Rp{hidup.TargetTabungan:N0}" : "";
            isi.text += $"\n{hidup.KosNama} · Pacar {hidup.PacarNama ?? "—"}" +
                $"\nTabungan Rp{hidup.Tabungan:N0}{target}" +
                $"\nBeasiswa {hidup.BeasiswaNama ?? "—"} · UKM {hidup.UkmNama ?? "—"}" +
                $"\nPemrograman {hidup.LevelSkill("pemrograman")} · Memasak {hidup.LevelSkill("memasak")}" +
                $"\nMusik {hidup.LevelSkill("musik")} · Olahraga {hidup.LevelSkill("olahraga")}";
        }

        internal void Tutup()
        {
            if (!Terbuka) return;
            akar.gameObject.SetActive(false);
            Layanan.UiModal = false;
        }
    }
}
