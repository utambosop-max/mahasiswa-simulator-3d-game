using System.Collections.Generic;
using MS.Kontrak;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class PanelProfil
    {
        readonly RectTransform akar, konten;
        readonly TMP_InputField nama;
        TextMeshProUGUI validasi;
        readonly List<Button> jurusan = new(), asal = new();
        readonly Dictionary<string, Button> tombolTrait = new();
        readonly HashSet<string> bakat = new(), kelemahan = new();
        readonly OpsiKesulitan kesulitan = new();
        readonly System.Action saatBuka;
        IProfil profil;
        string idJurusan, idAsal;
        bool dibuat;
        readonly RupaMahasiswa rupa = new();
        readonly StudioPenampilan studio;
        internal bool Terbuka => akar.gameObject.activeSelf;
        internal void KeDepan()
        {
            if (Terbuka && akar.GetSiblingIndex() != akar.parent.childCount - 1) akar.SetAsLastSibling();
        }

        internal PanelProfil(HudKamar hud, RectTransform area, System.Action saatBuka)
        {
            this.saatBuka = saatBuka;
            akar = HudKamar.BuatKotak("Registrasi Mahasiswa Baru", area);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            akar.gameObject.AddComponent<Image>().color = TemaAntarmuka.Redup;
            var kartu = HudKamar.BuatKotak("Kartu karakter", akar);
            HudKamar.Rentangkan(kartu, new Vector2(.06f, .03f), new Vector2(.94f, .92f));
            hud.Gambar(kartu, TemaAntarmuka.Kertas, true);
            var port = HudKamar.BuatKotak("Viewport karakter", kartu);
            HudKamar.Rentangkan(port, Vector2.zero, new Vector2(.59f, 1));
            var pratinjau = HudKamar.BuatKotak("Pratinjau 3D", kartu);
            HudKamar.Rentangkan(pratinjau, new Vector2(.62f, .19f), new Vector2(.97f, .94f));
            pratinjau.gameObject.AddComponent<RawImage>().raycastTarget = false;
            studio = pratinjau.gameObject.AddComponent<StudioPenampilan>();
            port.offsetMin = new Vector2(24, 205); port.offsetMax = new Vector2(-24, -20);
            port.gameObject.AddComponent<RectMask2D>();
            port.gameObject.AddComponent<Image>().color = Color.clear;
            konten = HudKamar.BuatKotak("Isi karakter", port);
            HudKamar.Rentangkan(konten, Vector2.up, Vector2.one);
            konten.pivot = new Vector2(.5f, 1);
            var susun = konten.gameObject.AddComponent<VerticalLayoutGroup>();
            susun.spacing = 12; susun.childControlHeight = susun.childControlWidth = true; susun.childForceExpandHeight = false;
            konten.gameObject.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            var scroll = kartu.gameObject.AddComponent<ScrollRect>();
            scroll.viewport = port; scroll.content = konten; scroll.horizontal = false; scroll.movementType = ScrollRect.MovementType.Clamped;
            Label(konten, "Buat Karakter", 52);
            Label(konten, "Atur penampilan, lalu pilih jurusan dan latar.", 32);
            var kotak = HudKamar.BuatKotak("Nama mahasiswa", konten);
            kotak.gameObject.AddComponent<LayoutElement>().minHeight = 145;
            var latar = hud.Gambar(kotak, Color.white, true);
            nama = kotak.gameObject.AddComponent<TMP_InputField>();
            nama.targetGraphic = latar; nama.characterLimit = 16; nama.lineType = TMP_InputField.LineType.SingleLine;
            var view = HudKamar.BuatKotak("Area teks", kotak);
            HudKamar.Rentangkan(view, new Vector2(.04f, .1f), new Vector2(.96f, .9f));
            view.gameObject.AddComponent<RectMask2D>();
            nama.textViewport = view;
            var teks = Label(view, "", 42); HudKamar.Rentangkan(teks.rectTransform, Vector2.zero, Vector2.one);
            teks.alignment = TextAlignmentOptions.MidlineLeft;
            nama.textComponent = teks;
            var placeholder = Label(view, "Nama mahasiswa", 42); HudKamar.Rentangkan(placeholder.rectTransform, Vector2.zero, Vector2.one);
            placeholder.color = Color.gray; placeholder.alignment = TextAlignmentOptions.MidlineLeft;
            nama.placeholder = placeholder;
            var footer = HudKamar.BuatKotak("Mulai kuliah", kartu);
            HudKamar.Rentangkan(footer, Vector2.zero, Vector2.right);
            footer.offsetMin = new Vector2(24, 12);
            footer.offsetMax = new Vector2(-24, 192);
            var layoutFooter = footer.gameObject.AddComponent<VerticalLayoutGroup>();
            layoutFooter.childControlHeight = layoutFooter.childControlWidth = true;
            layoutFooter.childForceExpandHeight = false;
            validasi = Label(footer, "Pilih jurusan, latar, dan sifat bawaan.", 32);
            BuatTombol(footer, "Mulai hari pindahan", Mulai, 136);
            akar.gameObject.SetActive(false);
        }

        internal void Hubungkan(IProfil baru)
        {
            if (ReferenceEquals(profil, baru)) return;
            if (profil != null) profil.Berubah -= Segarkan;
            profil = baru;
            if (profil != null) profil.Berubah += Segarkan;
            Segarkan();
        }

        void Segarkan()
        {
            bool tampil = profil?.PerluDibuat == true;
            akar.gameObject.SetActive(tampil);
            if (!tampil) return;
            if (!dibuat) BangunPilihan();
            saatBuka();
            akar.SetAsLastSibling();
        }

        void BangunPilihan()
        {
            dibuat = true;
            BuatPemilih("Figur", new[] { "Mahasiswa", "Mahasiswi" }, n => rupa.Figur = n);
            BuatPemilih("Gaya rambut", new[] { "Pendek", "Bob", "Panjang" }, n => rupa.Rambut = n);
            BuatPemilih("Warna kulit", new[] { "Terang", "Hangat", "Sawo matang", "Gelap" }, n => rupa.Kulit = n);
            BuatPemilih("Warna pakaian", new[] { "Asli", "Biru", "Hijau", "Terakota" }, n => rupa.Baju = n);
            Geser(konten, "Bentuk wajah", -1, 1, 0, false, n => { rupa.Wajah = n; studio.Tampilkan(rupa); });
            Geser(konten, "Postur badan", -1, 1, 0, false, n => { rupa.Badan = n; studio.Tampilkan(rupa); });
            studio.Tampilkan(rupa);
            Label(konten, "Pilih jurusan", 44);
            foreach (var item in profil.DaftarJurusan)
            {
                var pilihan = item;
                var tombol = BuatTombol(konten, Ringkas(item), () => { idJurusan = pilihan.Id; Warnai(); });
                IkonHud.Pasang((RectTransform)tombol.transform, IkonHud.Jenis.Buku);
                jurusan.Add(tombol);
            }
            Label(konten, "Pilih latar belakang", 44);
            foreach (var item in profil.DaftarAsal)
            {
                var pilihan = item;
                var tombol = BuatTombol(konten, Ringkas(item), () => { idAsal = pilihan.Id; Warnai(); });
                IkonHud.Pasang((RectTransform)tombol.transform, IkonHud.Jenis.Rumah);
                asal.Add(tombol);
            }
            BuatDaftarTrait("Pilih 2 bakat", profil.Bakat, bakat);
            BuatDaftarTrait("Pilih 2 kelemahan", profil.Kelemahan, kelemahan);
            BuatKesulitan();
            Warnai();
        }

        void BuatKesulitan()
        {
            Label(konten, "Kesulitan", 44);
            var pilihan = new[] { "normal", "sultan", "pejuang", "sandbox" };
            var namaMode = new[] { "Anak Kos Normal", "Anak Sultan", "Pejuang Tanggal Tua", "Sandbox" };
            var tombol = new Button[pilihan.Length];
            var panelSandbox = HudKamar.BuatKotak("Pengatur sandbox", konten);
            panelSandbox.gameObject.SetActive(false);
            for (int i = 0; i < pilihan.Length; i++)
            {
                int opsi = i;
                tombol[i] = BuatTombol(konten, namaMode[i], () =>
                {
                    kesulitan.Preset = pilihan[opsi];
                    for (int k = 0; k < tombol.Length; k++)
                        tombol[k].targetGraphic.color = k == opsi ? TemaAntarmuka.Mint : TemaAntarmuka.Mentega;
                    panelSandbox.gameObject.SetActive(opsi == 3);
                });
            }
            tombol[0].targetGraphic.color = TemaAntarmuka.Mint;
            panelSandbox.SetAsLastSibling();
            var susun = panelSandbox.gameObject.AddComponent<VerticalLayoutGroup>();
            susun.spacing = 10;
            susun.childControlWidth = susun.childControlHeight = true;
            susun.childForceExpandWidth = true;
            susun.childForceExpandHeight = false;
            Geser(panelSandbox, "Kiriman bulanan (ribu Rp)", 0, 5000, 1500, true, n => kesulitan.Kiriman = (int)n * 1000);
            Geser(panelSandbox, "Frekuensi sidak", 0, 2, 1, true, n => kesulitan.Sidak = (int)n);
            Geser(panelSandbox, "Ketegasan dosen", .5f, 2, 1, false, n => kesulitan.Dosen = n);
            Geser(panelSandbox, "Peluang hujan", 0, 2, 1, false, n => kesulitan.Hujan = n);
            Geser(panelSandbox, "Kecepatan waktu", .5f, 2, 1, false, n => kesulitan.Jam = n);
        }

        static void Geser(Transform induk, string nama, float min, float maks, float baku, bool bulat, System.Action<float> ubah)
        {
            var label = Label(induk, "", 31);
            var kotak = HudKamar.BuatKotak(nama, induk);
            kotak.gameObject.AddComponent<LayoutElement>().minHeight = 64;
            var latar = kotak.gameObject.AddComponent<Image>();
            latar.color = TemaAntarmuka.Pasif;
            var pegangan = HudKamar.BuatKotak("Pegangan", kotak);
            pegangan.anchorMin = Vector2.zero;
            pegangan.anchorMax = Vector2.up;
            pegangan.sizeDelta = new Vector2(64, 0);
            var wajah = pegangan.gameObject.AddComponent<Image>();
            wajah.color = TemaAntarmuka.Jingga;
            var slider = kotak.gameObject.AddComponent<Slider>();
            slider.targetGraphic = wajah;
            slider.handleRect = pegangan;
            slider.minValue = min;
            slider.maxValue = maks;
            slider.wholeNumbers = bulat;
            slider.value = baku;
            label.text = $"{nama} {baku:0.##}";
            slider.onValueChanged.AddListener(n => { label.text = $"{nama} {n:0.##}"; ubah(n); });
        }

        void BuatDaftarTrait(string judul, IReadOnlyList<InfoPilihan> opsi, HashSet<string> pilihan)
        {
            Label(konten, judul, 44);
            foreach (var item in opsi)
                tombolTrait.Add(item.Id, BuatTombol(konten, Ringkas(item), () =>
                {
                    if (!pilihan.Remove(item.Id) && pilihan.Count < 2) pilihan.Add(item.Id);
                    Warnai();
                }, 126));
        }

        void BuatPemilih(string namaPilihan, string[] pilihan, System.Action<int> pilih)
        {
            int indeks = 0;
            var tombol = BuatTombol(konten, namaPilihan + " · " + pilihan[0], () => { }, 84);
            tombol.targetGraphic.color = TemaAntarmuka.Mentega;
            var teks = tombol.GetComponentInChildren<TextMeshProUGUI>();
            tombol.onClick.AddListener(() =>
            {
                indeks = (indeks + 1) % pilihan.Length;
                pilih(indeks);
                teks.text = namaPilihan + " · " + pilihan[indeks];
                studio.Tampilkan(rupa);
            });
        }

        void Mulai()
        {
            if (!profil.Daftarkan(nama.text, idJurusan, idAsal, bakat, kelemahan, kesulitan, rupa))
                validasi.text = "Lengkapi jurusan, latar, 2 bakat, dan 2 kelemahan.";
        }

        void Warnai()
        {
            if (validasi != null)
                validasi.text = $"Bakat {bakat.Count}/2 · Kelemahan {kelemahan.Count}/2";
            foreach (var (id, tombol) in tombolTrait)
                tombol.targetGraphic.color = bakat.Contains(id) || kelemahan.Contains(id) ? TemaAntarmuka.Mint : TemaAntarmuka.Mentega;
            for (int i = 0; i < jurusan.Count; i++)
                jurusan[i].targetGraphic.color = profil.DaftarJurusan[i].Id == idJurusan ? TemaAntarmuka.Mint : TemaAntarmuka.Mentega;
            for (int i = 0; i < asal.Count; i++)
                asal[i].targetGraphic.color = profil.DaftarAsal[i].Id == idAsal ? TemaAntarmuka.Mint : TemaAntarmuka.Mentega;
        }

        static string Ringkas(InfoPilihan item) =>
            $"{item.Nama}\n{HudKamar.BersihkanEmoji(item.Deskripsi ?? "")}";

        static TextMeshProUGUI Label(Transform induk, string isi, float ukuran)
        {
            var t = HudKamar.Teks(induk, isi, ukuran, ukuran, FontStyles.Normal);
            t.enableAutoSizing = false; t.fontSize = ukuran; t.textWrappingMode = TextWrappingModes.Normal; t.overflowMode = TextOverflowModes.Overflow;
            return t;
        }

        static Button BuatTombol(Transform induk, string isi, UnityEngine.Events.UnityAction aksi, float tinggi = 110)
        {
            var rt = HudKamar.BuatKotak("Pilihan profil", induk);
            rt.gameObject.AddComponent<LayoutElement>().minHeight = tinggi;
            var gambar = rt.gameObject.AddComponent<Image>();
            var b = rt.gameObject.AddComponent<Button>(); b.targetGraphic = gambar; b.onClick.AddListener(aksi);
            var teks = Label(rt, isi, 36); HudKamar.Rentangkan(teks.rectTransform, new Vector2(.03f, .04f), new Vector2(.97f, .96f));
            teks.enableAutoSizing = true;
            teks.fontSizeMin = 25;
            teks.fontSizeMax = 36;
            return b;
        }
    }
}
