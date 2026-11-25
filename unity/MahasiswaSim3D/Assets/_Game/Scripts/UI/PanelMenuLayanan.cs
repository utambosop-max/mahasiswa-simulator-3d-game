using System.Globalization;
using MS.Kontrak;
using UnityEngine;

namespace MS.UI
{
    internal sealed class PanelMenuLayanan
    {
        static readonly CultureInfo Indonesia = CultureInfo.GetCultureInfo("id-ID");
        readonly DaftarModal panel;
        readonly System.Action saatBuka;
        IMenuLayanan menu;
        internal bool Terbuka => panel.Terbuka;

        internal PanelMenuLayanan(HudKamar hud, RectTransform induk, System.Action saatBuka)
        {
            this.saatBuka = saatBuka;
            panel = new DaftarModal(hud, induk, "Panel menu layanan", Tutup);
        }

        internal void Hubungkan(IMenuLayanan berikut)
        {
            if (ReferenceEquals(menu, berikut)) return;
            if (menu != null) menu.Berubah -= Segarkan;
            menu = berikut;
            if (menu != null) menu.Berubah += Segarkan;
            Segarkan();
        }

        internal void Tutup() => menu?.Tutup();
        internal void Ukur(float skala) => panel.Ukur(skala);

        void Segarkan()
        {
            if (menu?.Terbuka != true)
            {
                panel.Tampil(false);
                return;
            }
            if (!Terbuka) saatBuka();
            panel.Tampil(true, $"{DaftarModal.Ikon(menu.Ikon, "")} {menu.Judul}".Trim(),
                HudKamar.BersihkanEmoji(menu.Info ?? ""));
            foreach (var opsi in menu.Daftar)
            {
                string id = opsi.Id;
                string nama = $"{DaftarModal.Ikon(opsi.Ikon, "")} {opsi.Nama}".Trim();
                if (opsi.Aktif) nama += " [✓]";
                string detail = HudKamar.BersihkanEmoji(opsi.Keterangan ?? "");
                if (opsi.Harga > 0) detail += $"\nRp{opsi.Harga.ToString("N0", Indonesia)}";
                if (!opsi.Boleh && !opsi.Judul) detail += "\n" + HudKamar.BersihkanEmoji(opsi.Alasan ?? "Belum tersedia.");
                Color? swatch = null;
                if (id != null && id.StartsWith("cat_", System.StringComparison.Ordinal) &&
                    (ColorUtility.TryParseHtmlString(opsi.Keterangan, out var warna) ||
                     ColorUtility.TryParseHtmlString(id.Substring(4), out warna)))
                    swatch = warna;
                if (opsi.Judul) panel.Tambah(nama, detail, false, null);
                else panel.Tambah(nama, detail.Trim(), opsi.Boleh, () =>
                {
                    if (Terbuka && opsi.Boleh) menu.Pilih(id);
                }, swatch);
            }
        }
    }
}
