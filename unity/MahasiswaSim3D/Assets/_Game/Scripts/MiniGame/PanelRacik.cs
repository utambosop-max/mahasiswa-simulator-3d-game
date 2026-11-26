using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using MS.Kontrak;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.MiniGame
{
    public sealed class PanelRacik
    {
        sealed class Bahan { public string id, nama; }
        sealed class Menu { public string id, nama; public string[] resep; }
        sealed class Aturan
        {
            public string nama, bos, sapaan;
            public int jumlahPelanggan, gajiDasar, bayarPerPesanan, tipMaks;
            public float kesabaranAwal, kesabaranMin, kesabaranTurun, penaltiSalah;
            public Bahan[] bahan;
            public string[] pesanan;
        }

        enum Tahap { Tutup, Pembuka, Racik, Hasil, DataRusak }
        static readonly CultureInfo Indonesia = CultureInfo.GetCultureInfo("id-ID");
        static readonly Color Gelap = TemaAntarmuka.Tinta;
        readonly RectTransform akar, konten;
        readonly ScrollRect gulir;
        readonly TextMeshProUGUI judul, isi, umpanBalik, waktu;
        readonly Image sisaBar;
        readonly LayoutElement tinggiWaktu;
        readonly SajianRacik sajian;
        readonly RawImage layarSajian;
        readonly LayoutElement ukuranSajian;
        readonly List<(Button tombol, TextMeshProUGUI teks)> tombol = new();
        readonly HashSet<string> terisi = new();
        readonly Action saatBuka;
        IKerja kerja;
        Aturan aturan;
        Menu[] menu;
        Menu pesanan;
        Tahap tahap;
        int benar, gagal, tip;
        float sabar, sisa, jeda;
        float skala = 1;
        string pesan;
        bool menyelesaikan;

        public bool Terbuka => tahap != Tahap.Tutup;

        public PanelRacik(RectTransform induk, Action saatBuka)
        {
            this.saatBuka = saatBuka;
            akar = Kotak("Panel racik", induk, Vector2.zero, Vector2.one);
            akar.gameObject.AddComponent<Image>().color = TemaAntarmuka.Redup;
            var kartu = Kotak("Kartu racik", akar, new Vector2(.08f, .035f), new Vector2(.92f, .87f));
            var latar = kartu.gameObject.AddComponent<Image>(); latar.color = TemaAntarmuka.Kertas; latar.sprite = TemaAntarmuka.Bentuk(); latar.type = Image.Type.Sliced;
            var port = Kotak("Viewport", kartu, Vector2.zero, Vector2.one);
            port.offsetMin = new Vector2(24, 20);
            port.offsetMax = new Vector2(-24, -20);
            port.gameObject.AddComponent<RectMask2D>();
            port.gameObject.AddComponent<Image>().color = Color.clear;
            konten = Kotak("Isi racik", port, Vector2.up, Vector2.one);
            konten.pivot = new Vector2(.5f, 1f);
            var layout = konten.gameObject.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 12;
            layout.childControlHeight = layout.childControlWidth = true;
            layout.childForceExpandHeight = false;
            konten.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            gulir = kartu.gameObject.AddComponent<ScrollRect>();
            gulir.viewport = port;
            gulir.content = konten;
            gulir.horizontal = false;
            gulir.movementType = ScrollRect.MovementType.Clamped;
            judul = Teks("Judul racik", konten, 52, true);
            var ringkasan = Kotak("Ringkasan racik", konten, Vector2.zero, Vector2.one);
            var susun = ringkasan.gameObject.AddComponent<HorizontalLayoutGroup>();
            susun.childControlWidth = susun.childControlHeight = true;
            susun.childForceExpandWidth = susun.childForceExpandHeight = false;
            susun.spacing = 18;
            susun.childAlignment = TextAnchor.MiddleCenter;
            isi = Teks("Informasi racik", ringkasan, 40);
            isi.gameObject.AddComponent<LayoutElement>().flexibleWidth = 1f;
            var layar = Kotak("Tampilan sajian", ringkasan, Vector2.zero, Vector2.one);
            ukuranSajian = layar.gameObject.AddComponent<LayoutElement>();
            layarSajian = layar.gameObject.AddComponent<RawImage>();
            layarSajian.raycastTarget = false;
            layarSajian.gameObject.SetActive(false);
            sajian = akar.gameObject.AddComponent<SajianRacik>();
            sajian.Siapkan(layarSajian);
            umpanBalik = Teks("Umpan balik racik", konten, 36, true);
            umpanBalik.gameObject.AddComponent<LayoutElement>().preferredHeight = 88;
            var bar = Kotak("Kesabaran", konten, Vector2.zero, Vector2.one);
            tinggiWaktu = bar.gameObject.AddComponent<LayoutElement>();
            tinggiWaktu.minHeight = 48;
            bar.gameObject.AddComponent<Image>().color = TemaAntarmuka.Pasif;
            sisaBar = Kotak("Isi kesabaran", bar, Vector2.zero, Vector2.one).gameObject.AddComponent<Image>();
            sisaBar.raycastTarget = false;
            waktu = Teks("Detik kesabaran", bar, 34, true);
            Tutup();
        }

        public void Hubungkan(IKerja baru)
        {
            if (ReferenceEquals(kerja, baru)) return;
            if (kerja != null) kerja.Berubah -= Sinkron;
            kerja = baru;
            Tutup();
            if (kerja != null) kerja.Berubah += Sinkron;
            Sinkron();
        }

        void Sinkron()
        {
            if (menyelesaikan) return;
            if (kerja?.Aktif == null)
            {
                if (tahap != Tahap.Hasil) Tutup();
                return;
            }
            if (tahap is Tahap.Pembuka or Tahap.Racik or Tahap.DataRusak) return;
            try
            {
                string tempat = kerja.Aktif;
                aturan = JObject.Parse(kerja.DataKerjaJson)[tempat]?.ToObject<Aturan>();
                var daftar = JObject.Parse(kerja.DataMenuJson)[tempat]?.ToObject<Menu[]>();
                if (aturan?.bahan == null || aturan.pesanan == null || daftar == null ||
                    aturan.jumlahPelanggan < 1 || aturan.kesabaranMin <= 0) throw new JsonException("Data shift tidak lengkap");
                var ids = new HashSet<string>(aturan.bahan.Select(b => b.id));
                menu = aturan.pesanan.Select(id => daftar.FirstOrDefault(m => m.id == id)).ToArray();
                if (menu.Length == 0 || menu.Any(m => m?.resep == null || m.resep.Length == 0 ||
                    m.resep.Distinct().Count() != m.resep.Length || m.resep.Any(id => !ids.Contains(id))))
                    throw new JsonException("Resep shift tidak valid");
            }
            catch (Exception e) when (e is JsonException || e is ArgumentException)
            {
                Debug.LogWarning("Data mini-game racik: " + e.Message);
                Buka(Tahap.DataRusak, "Shift belum siap", "Data pesanan tidak lengkap.");
                TataTombol(1);
                IsiTombol(0, "Batal", kerja.Batal);
                return;
            }
            benar = gagal = tip = 0;
            pesanan = null;
            string lemas = kerja.Lemas ? "\nEnergi rendah. Gaji dasar shift ini tinggal separuh." : "";
            Buka(Tahap.Pembuka, aturan.nama,
                $"{aturan.bos}: {aturan.sapaan}\nKetuk bahan sesuai resep, urutan bebas. Bahan salah mengurangi kesabaran.\n" +
                $"{aturan.jumlahPelanggan} pelanggan. Gaji dasar {Rp(aturan.gajiDasar)}, bonus {Rp(aturan.bayarPerPesanan)} per pesanan, plus tip.{lemas}");
            TataTombol(2);
            IsiTombol(0, "Mulai shift", Mulai);
            IsiTombol(1, "Batal", kerja.Batal);
        }

        void Mulai()
        {
            if (tahap != Tahap.Pembuka) return;
            Buka(Tahap.Racik, aturan.nama, "");
            layarSajian.gameObject.SetActive(true);
            sajian.Mulai(kerja.Aktif == "warkop");
            TataTombol(aturan.bahan.Length + 1, true);
            for (int i = 0; i < aturan.bahan.Length; i++)
            {
                var b = aturan.bahan[i];
                IsiTombol(i, b.nama, () => Ketuk(b.id));
            }
            IsiTombol(aturan.bahan.Length, "Akhiri shift", Selesai);
            Datang();
        }

        void Datang()
        {
            if (benar + gagal >= aturan.jumlahPelanggan) { Selesai(); return; }
            int indeks = UnityEngine.Random.Range(0, menu.Length);
            if (ReferenceEquals(menu[indeks], pesanan) && menu.Length > 1) indeks = (indeks + 1) % menu.Length;
            pesanan = menu[indeks];
            sabar = sisa = Mathf.Max(aturan.kesabaranMin, aturan.kesabaranAwal - (benar + gagal) * aturan.kesabaranTurun);
            jeda = 0;
            pesan = "";
            terisi.Clear();
            sajian.Pelanggan();
            Layanan.Audio?.Mainkan("notif");
            PerbaruiPesanan();
            PerbaruiWaktu();
        }

        public void Tick(float delta)
        {
            if (tahap != Tahap.Racik) return;
            delta = Mathf.Min(.1f, delta);
            sajian.Tick(delta);
            if (jeda > 0)
            {
                jeda -= delta;
                if (jeda <= 0) Datang();
                return;
            }
            sisa -= delta;
            PerbaruiWaktu();
            if (sisa > 0) return;
            gagal++;
            Reaksi("Kelamaan. Pelanggan pergi.", "salah");
        }

        void PerbaruiWaktu()
        {
            float fraksi = Mathf.Clamp01(sisa / sabar);
            sisaBar.rectTransform.anchorMax = new Vector2(fraksi, 1);
            sisaBar.color = fraksi > .6f ? new Color32(124, 198, 164, 255) :
                fraksi > .3f ? new Color32(242, 179, 61, 255) : new Color32(233, 128, 114, 255);
            string detik = "Kesabaran: " + Mathf.CeilToInt(Mathf.Max(0, sisa)) + " dtk";
            if (waktu.text != detik) waktu.text = detik;
        }

        void Ketuk(string id)
        {
            if (tahap != Tahap.Racik || jeda > 0 || terisi.Contains(id)) return;
            if (!pesanan.resep.Contains(id))
            {
                sisa = Mathf.Max(.01f, sisa - aturan.penaltiSalah);
                pesan = "Bahan salah. Kesabaran berkurang.";
                Layanan.Audio?.Mainkan("salah");
                PerbaruiPesanan();
                PerbaruiWaktu();
                return;
            }
            terisi.Add(id);
            sajian.Tambah(id);
            pesan = "";
            if (terisi.Count == pesanan.resep.Length)
            {
                int tambahan = Mathf.FloorToInt(aturan.tipMaks * (sisa / sabar) / 100f + .5f) * 100;
                tip += tambahan;
                benar++;
                Reaksi("Pesanan lengkap. Tip " + Rp(tambahan), "koin");
            }
            else
            {
                Layanan.Audio?.Mainkan("klik");
                PerbaruiPesanan();
            }
        }

        void Reaksi(string teks, string suara)
        {
            jeda = .9f;
            sajian.Hidangkan();
            pesan = teks;
            Layanan.Audio?.Mainkan(suara);
            PerbaruiPesanan();
        }

        void PerbaruiPesanan()
        {
            string bahan = string.Join(" • ", pesanan.resep.Select(id =>
                (terisi.Contains(id) ? "+ " : "") + aturan.bahan.First(b => b.id == id).nama));
            int nomor = benar + gagal + (jeda > 0 ? 0 : 1);
            isi.text = $"Pelanggan {nomor}/{aturan.jumlahPelanggan}   |   Benar {benar}   |   Gagal {gagal}\n" +
                $"{pesanan.nama}\n{bahan}";
            umpanBalik.text = pesan;
            for (int i = 0; i < aturan.bahan.Length; i++)
                tombol[i].tombol.interactable = jeda <= 0 && !terisi.Contains(aturan.bahan[i].id);
        }

        void Selesai()
        {
            if (tahap != Tahap.Racik || kerja?.Aktif == null || menyelesaikan) return;
            if (benar + gagal == 0)
            {
                kerja.Batal();
                return;
            }
            menyelesaikan = true;
            RincianGaji gaji;
            try { gaji = kerja.Selesai(new HasilKerja(benar, gagal, tip)); }
            finally { menyelesaikan = false; }
            Buka(Tahap.Hasil, "Hasil shift",
                $"Benar {benar}  |  Gagal {gagal}\nGaji dasar {Rp(gaji.Dasar)}   •   Bonus {Rp(gaji.Bonus)}   •   Tip {Rp(gaji.Tips)}\n" +
                $"Total {Rp(gaji.Total)}\nEnergi {gaji.Energi:+0.#;-0.#;0}   •   Stres {gaji.Stres:+0.#;-0.#;0}");
            TataTombol(1);
            IsiTombol(0, "Kembali", Tutup);
        }

        void Buka(Tahap baru, string nama, string deskripsi)
        {
            bool awal = !Terbuka;
            tahap = baru;
            judul.text = nama;
            isi.text = deskripsi;
            if (baru != Tahap.Racik) sajian.Sembunyi();
            umpanBalik.gameObject.SetActive(baru == Tahap.Racik);
            tinggiWaktu.gameObject.SetActive(baru == Tahap.Racik);
            akar.gameObject.SetActive(true);
            if (awal) saatBuka();
            akar.SetAsLastSibling();
            konten.anchoredPosition = Vector2.zero;
        }

        void Tutup()
        {
            tahap = Tahap.Tutup;
            sajian.Sembunyi();
            akar.gameObject.SetActive(false);
        }

        void TataTombol(int jumlah, bool grid = false)
        {
            foreach (var item in tombol)
            {
                item.tombol.gameObject.SetActive(false);
                UnityEngine.Object.Destroy(item.tombol.gameObject);
            }
            tombol.Clear();
            var lama = konten.Find("Bahan");
            if (lama != null) { lama.gameObject.SetActive(false); UnityEngine.Object.Destroy(lama.gameObject); }
            Transform wadah = konten;
            if (grid)
            {
                var area = Kotak("Bahan", konten, Vector2.zero, Vector2.one);
                var layout = area.gameObject.AddComponent<GridLayoutGroup>();
                layout.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
                layout.constraintCount = 3;
                layout.spacing = new Vector2(12, 12);
                wadah = area;
            }
            for (int i = 0; i < jumlah; i++)
            {
                var kotak = Kotak("Tombol racik " + i, grid && i == jumlah - 1 ? konten : wadah, Vector2.zero, Vector2.one);
                var gambar = kotak.gameObject.AddComponent<Image>();
                gambar.color = TemaAntarmuka.Mentega; gambar.sprite = TemaAntarmuka.Bentuk(); gambar.type = Image.Type.Sliced;
                var button = kotak.gameObject.AddComponent<Button>();
                button.targetGraphic = gambar;
                kotak.gameObject.AddComponent<LayoutElement>();
                tombol.Add((button, Teks("Label", kotak, 36, true)));
            }
            Ukur(skala);
        }

        public void Ukur(float skalaKanvas)
        {
            skala = Mathf.Max(.01f, skalaKanvas);
            float tinggi = Mathf.Max(88, 56 / skala);
            foreach (var item in tombol) item.tombol.GetComponent<LayoutElement>().minHeight = tinggi;
            var grid = konten.Find("Bahan");
            if (layarSajian.gameObject.activeSelf)
            {
                float lebar = ((RectTransform)konten.parent).rect.width * .26f;
                ukuranSajian.preferredWidth = lebar;
                ukuranSajian.preferredHeight = lebar * .5f;
            }
            if (grid != null && grid.gameObject.activeSelf)
            {
                Canvas.ForceUpdateCanvases();
                float lebar = ((RectTransform)konten.parent).rect.width;
                grid.GetComponent<GridLayoutGroup>().cellSize = new Vector2(Mathf.Max(1, (lebar - 24) / 3), tinggi);
            }
        }

        void IsiTombol(int i, string teks, UnityEngine.Events.UnityAction aksi)
        {
            tombol[i].teks.text = teks;
            tombol[i].tombol.onClick.AddListener(aksi);
        }

        static string Rp(int n) => "Rp" + n.ToString("N0", Indonesia);
        static RectTransform Kotak(string nama, Transform induk, Vector2 min, Vector2 max)
        {
            var rt = (RectTransform)new GameObject(nama, typeof(RectTransform)).transform;
            rt.SetParent(induk, false);
            rt.anchorMin = min; rt.anchorMax = max;
            rt.offsetMin = rt.offsetMax = Vector2.zero;
            return rt;
        }

        static TextMeshProUGUI Teks(string nama, Transform induk, float ukuran, bool tebal = false)
        {
            var teks = Kotak(nama, induk, Vector2.zero, Vector2.one).gameObject.AddComponent<TextMeshProUGUI>();
            teks.font = TMP_Settings.defaultFontAsset;
            teks.fontSize = ukuran;
            teks.color = Gelap;
            teks.fontStyle = tebal ? FontStyles.Bold : FontStyles.Normal;
            teks.richText = false;
            teks.alignment = TextAlignmentOptions.Center;
            teks.raycastTarget = false;
            return teks;
        }
    }
}
