using System.Globalization;
using MS.Kontrak;
using UnityEngine;

namespace MS.UI
{
    internal sealed class PanelToko
    {
        static readonly CultureInfo Indonesia = CultureInfo.GetCultureInfo("id-ID");
        readonly DaftarModal panel;
        readonly System.Action saatBuka;
        IToko toko;
        internal bool Terbuka => panel.Terbuka;

        internal PanelToko(HudKamar hud, RectTransform induk, System.Action saatBuka)
        {
            this.saatBuka = saatBuka;
            panel = new DaftarModal(hud, induk, "Panel toko", Tutup);
        }

        internal void Hubungkan(IToko berikut)
        {
            if (ReferenceEquals(toko, berikut)) return;
            if (toko != null) toko.Berubah -= Segarkan;
            toko = berikut;
            if (toko != null) toko.Berubah += Segarkan;
            Segarkan();
        }

        internal void Tutup() => toko?.Tutup();
        internal void Ukur(float skala) => panel.Ukur(skala);

        void Segarkan()
        {
            bool tampil = toko?.Terbuka == true;
            if (tampil && !Terbuka) saatBuka();
            panel.Tampil(tampil, "Toko barang");
            if (!tampil) return;
            foreach (var barang in toko.Daftar)
            {
                string id = barang.Id;
                bool boleh = toko.BolehBeli(id, out var alasan);
                string detail = $"{HudKamar.BersihkanEmoji(barang.Deskripsi ?? "")}\nRp{barang.Harga.ToString("N0", Indonesia)} · Dimiliki {barang.Dimiliki}";
                if (!boleh) detail += "\n" + HudKamar.BersihkanEmoji(alasan ?? "Belum bisa dibeli.");
                panel.Tambah($"{DaftarModal.Ikon(barang.Ikon, "•")} {barang.Nama}", detail, boleh, () =>
                {
                    if (Terbuka && toko.BolehBeli(id, out _)) toko.Beli(id);
                });
            }
        }
    }
}
