using System;
using System.Linq;
using MS.Dunia;
using MS.Inti;
using MS.Kontrak;
using MS.Pemain;
using TMPro;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace MS.UI
{
    internal sealed class PanelModeAtur
    {
        static readonly Color Tinta = new(.12f,.26f,.26f);
        static readonly Color Kertas = new(.97f,.90f,.75f);
        static readonly Color Hijau = new(.63f,.82f,.73f);
        static readonly Color Bata = new(.93f,.64f,.45f);
        readonly RectTransform area, akar, tampah, kebutuhan, dekor;
        readonly TextMeshProUGUI suasana;
        readonly Image[] bar = new Image[6];
        readonly Button[] urutan = new Button[AntreanAksi.Kapasitas];
        readonly Action<PerintahAksi> jalankan;
        readonly Action<string> pesan;
        AntreanAksi antrean;
        KameraIsometric kamera;
        PenataanKamar kamar;
        float segar;
        TitikInteraksi tujuanTampah;

        public PanelModeAtur(RectTransform area, Action<PerintahAksi> jalankan, Action<string> pesan)
        {
            this.area = area;
            this.jalankan = jalankan;
            this.pesan = pesan;
            akar = HudKamar.BuatKotak("Mode Atur", area);
            HudKamar.Rentangkan(akar, Vector2.zero, Vector2.one);
            var mode = Tombol(akar, "Kebutuhan", () => kebutuhan.gameObject.SetActive(!kebutuhan.gameObject.activeSelf));
            Letak((RectTransform)mode.transform, Vector2.zero, new Vector2(145,46), new Vector2(247,83));
            kebutuhan = Kotak(akar, "Kebutuhan mahasiswa", new Vector2(0,0), new Vector2(210,242), new Vector2(370,245));
            kebutuhan.gameObject.AddComponent<Image>().color = Kertas;
            string[] nama = {"Kenyang","Energi","Stres","Hidrasi","Kebersihan","Sosial"};
            for (int i = 0; i < nama.Length; i++)
            {
                var label = Teks(kebutuhan,nama[i],20);
                Letak(label.rectTransform,new Vector2(0,1),new Vector2(89,-27 - 35*i),new Vector2(160,28));
                var bg = Kotak(kebutuhan,nama[i],new Vector2(0,1),new Vector2(255,-27 - 35*i),new Vector2(183,14));
                bg.gameObject.AddComponent<Image>().color = new Color(.75f,.76f,.69f);
                var isi = HudKamar.BuatKotak("Isi",bg);
                HudKamar.Rentangkan(isi,Vector2.zero,Vector2.one);
                bar[i] = isi.gameObject.AddComponent<Image>();
                bar[i].color = i == 2 ? Bata : Hijau;
            }
            kebutuhan.gameObject.SetActive(false);
            suasana = Teks(akar,"",21);
            Letak(suasana.rectTransform,new Vector2(0,0),new Vector2(253,117),new Vector2(490,52));
            tampah = Kotak(akar,"Tampah aksi",new Vector2(.5f,.5f),Vector2.zero,new Vector2(554,300));
            tampah.gameObject.SetActive(false);
            dekor = Kotak(akar,"Penataan kamar",new Vector2(0,.5f),new Vector2(220,-20),new Vector2(402,430));
            dekor.gameObject.AddComponent<Image>().color = Kertas;
            TambahDekor("Cat dinding", () => kamar.GantiCat(), 0);
            TambahDekor("Material lantai", () => kamar.GantiLantai(), 1);
            int baris = 2;
            foreach (var barang in PenataanKamar.Katalog)
            {
                var benda = barang;
                var tombol = TambahDekor(benda.Nama + "  Rp" + benda.Harga.ToString("N0"), () =>
                {
                    if (kamar.Pilih(benda, true)) pesan("Klik petak untuk menaruh. R untuk memutar.");
                    else pesan("Dana belum cukup atau perabot belum tersedia.");
                }, baris++);
                tombol.gameObject.name = benda.Id;
            }
            TambahDekor("Putar 90°   R", () => kamar.Putar(), 5);
            TambahDekor("Selesai menata", () => TampilkanDekor(false), 6);
            dekor.gameObject.SetActive(false);
            var tata = Tombol(akar,"Tata kamar", () => TampilkanDekor(!dekor.gameObject.activeSelf));
            Letak((RectTransform)tata.transform, Vector2.zero, new Vector2(365,46), new Vector2(171,83));
            tata.gameObject.SetActive(UnityEngine.SceneManagement.SceneManager.GetActiveScene().name == "KamarKos");
            for (int i = 0; i < urutan.Length; i++)
            {
                int posisi = i;
                urutan[i] = Tombol(akar,"", () => antrean?.Batal(posisi));
                Letak((RectTransform)urutan[i].transform,new Vector2(1,1),new Vector2(-144,-410-68*i),new Vector2(244,59));
            }
        }

        Button TambahDekor(string teks, Action aksi, int baris)
        {
            var b = Tombol(dekor,teks,aksi);
            Letak((RectTransform)b.transform,new Vector2(.5f,1),new Vector2(0,-35-57*baris),new Vector2(362,49));
            return b;
        }

        public void TampilkanDekor(bool aktif)
        {
            if (kamera?.ModeAtur != true || kamar == null || !kamar.Mulai(aktif)) return;
            dekor.gameObject.SetActive(aktif);
            if (antrean != null) antrean.Ditahan = aktif;
            tampah.gameObject.SetActive(false);
        }

        public void Tick()
        {
            if (kamera == null) kamera = Camera.main?.GetComponent<KameraIsometric>();
            var pemain = GameObject.Find("Pemain");
            if (antrean == null && pemain != null)
            {
                antrean = pemain.GetComponent<AntreanAksi>();
                if (antrean != null) { antrean.Berubah += IsiAntrean; antrean.Pesan += pesan; IsiAntrean(); }
            }
            if (kamar == null && kamera != null && kamera.gameObject.scene.name == "KamarKos")
                kamar = kamera.GetComponent<PenataanKamar>() ?? kamera.gameObject.AddComponent<PenataanKamar>();
            bool tampil = kamera?.ModeAtur == true && !Layanan.InputDitahan;
            akar.gameObject.SetActive(tampil);
            if (!tampil)
            {
                tampah.gameObject.SetActive(false);
                if (kamera?.ModeAtur == false && kamar?.Aktif == true)
                {
                    kamar.Mulai(false);
                    dekor.gameObject.SetActive(false);
                    if (antrean != null) antrean.Ditahan = false;
                }
                return;
            }
            if (Time.unscaledTime > segar)
            {
                segar = Time.unscaledTime + .35f;
                TampilkanKebutuhan();
            }
            if (kamar?.Aktif == true && Keyboard.current?.rKey.wasPressedThisFrame == true) kamar.Putar();
            var mouse = Mouse.current;
            if (!Application.isFocused || mouse == null || !mouse.leftButton.wasPressedThisFrame ||
                EventSystem.current?.IsPointerOverGameObject() == true || antrean == null) return;
            var posisi = mouse.position.ReadValue();
            var ray = Camera.main.ScreenPointToRay(posisi);
            if (kamar?.Aktif == true)
            {
                if (Physics.Raycast(ray, out var benda, 140f) && kamar.PilihObjek(benda.transform)) return;
                var bidang = new Plane(Vector3.up, Vector3.zero);
                if (bidang.Raycast(ray, out float jarak) && !kamar.Tempatkan(ray.GetPoint(jarak)))
                    pesan("Pilih petak kosong dan sisakan ruang di sekitarnya.");
                return;
            }
            bool kena = Physics.Raycast(ray, out var hit, 140f, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            var titik = kena ? hit.transform.GetComponentInParent<TitikInteraksi>() : null;
            float selisih = .65f;
            foreach (var calon in TitikInteraksi.Semua)
            {
                var dekat = ray.GetPoint(Mathf.Max(0,Vector3.Dot(calon.transform.position + Vector3.up*.45f-ray.origin, ray.direction)));
                float jarak = Vector3.Distance(calon.transform.position + Vector3.up*.45f, dekat);
                if (titik == null && jarak < selisih) { tujuanTampah = calon; selisih = jarak; }
            }
            if (titik == null && selisih < .65f) titik = tujuanTampah;
            if (titik != null) BukaAksi(titik,posisi);
            else
            {
                tampah.gameObject.SetActive(false);
                if (kena && hit.normal.y > .65f)
                    Tambah(new AntreanAksi.Entri { Nama = "Pergi ke sini", Tujuan = hit.point });
            }
        }

        void BukaAksi(TitikInteraksi titik, Vector2 mouse)
        {
            foreach (Transform lama in tampah) UnityEngine.Object.Destroy(lama.gameObject);
            var batas = area.rect;
            RectTransformUtility.ScreenPointToLocalPointInRectangle(area,mouse,null,out var lokal);
            tampah.anchoredPosition = new Vector2(Mathf.Clamp(lokal.x,batas.xMin+270,batas.xMax-270),
                Mathf.Clamp(lokal.y,batas.yMin+130,batas.yMax-130));
            tampah.gameObject.SetActive(true);
            tampah.SetAsLastSibling();
            var fokus = Tombol(tampah, "Tutup", () => tampah.gameObject.SetActive(false));
            Letak((RectTransform)fokus.transform,new Vector2(.5f,.5f),Vector2.zero,new Vector2(116,64));
            Petak(titik.nama ?? titik.idAksi, new PerintahAksi(titik.idAksi,titik.target), new Vector2(-130,91));
            Petak(titik.namaTambahan ?? titik.idAksiTambahan,new PerintahAksi(titik.idAksiTambahan,titik.targetTambahan),new Vector2(130,91));
            var jalan = Tombol(tampah,"Dekati",() => Tambah(new AntreanAksi.Entri { Nama = "Dekati", Titik = titik }));
            Letak((RectTransform)jalan.transform,new Vector2(.5f,.5f),new Vector2(0,-91),new Vector2(228,69));

            void Petak(string nama, PerintahAksi perintah, Vector2 posisi)
            {
                if (string.IsNullOrEmpty(perintah.Id)) return;
                if (string.IsNullOrEmpty(perintah.Target)) perintah = new PerintahAksi(perintah.Id);
                var b = Tombol(tampah,HudKamar.BersihkanEmoji(nama ?? perintah.Id),
                    () => Tambah(new AntreanAksi.Entri { Nama = nama, Titik = titik, Perintah = perintah, Jalankan = jalankan }));
                Letak((RectTransform)b.transform,new Vector2(.5f,.5f),posisi,new Vector2(236,69));
            }
        }

        void Tambah(AntreanAksi.Entri entri)
        {
            tampah.gameObject.SetActive(false);
            if (!antrean.Tambah(entri)) pesan("Antrean penuh. Klik satu aksi untuk membatalkannya.");
        }
        void IsiAntrean()
        {
            for (int i = 0; i < urutan.Length; i++)
            {
                bool ada = i < antrean.Daftar.Count;
                urutan[i].gameObject.SetActive(ada);
                if (ada) urutan[i].GetComponentInChildren<TMP_Text>().text = "×  " +
                    HudKamar.BersihkanEmoji(antrean.Daftar[i].Nama ?? "Aksi");
            }
        }
        void TampilkanKebutuhan()
        {
            var stat = Layanan.Stat;
            var vital = stat as IVitalPemain;
            var hidup = Layanan.Hidup;
            float sosial = hidup == null ? 0 : Mathf.Clamp(50 + (hidup.Relasi("bima") + hidup.Relasi("sari") + hidup.Relasi("buKos")) / 6f,0,100);
            float[] nilai = {vital?.Kenyang ?? 0, stat?.Energi ?? 0, stat?.Stres ?? 0, vital?.Hidrasi ?? 0, vital?.Kebersihan ?? 0,sosial};
            for (int i = 0; i < bar.Length; i++) bar[i].rectTransform.anchorMax = new Vector2(nilai[i] * .01f,1);
            var moodlet = GameInti.Instans?.Suasana?.Aktif().Select(m => $"{m.data.ikon} {m.data.judul} · {m.menit} m");
            suasana.text = moodlet == null ? "" : string.Join("\n",moodlet);
        }
        static RectTransform Kotak(RectTransform induk,string nama,Vector2 jangkar,Vector2 posisi,Vector2 ukuran)
        {
            var r = HudKamar.BuatKotak(nama,induk);
            Letak(r,jangkar,posisi,ukuran);
            return r;
        }
        static void Letak(RectTransform r,Vector2 jangkar,Vector2 posisi,Vector2 ukuran)
        { r.anchorMin = r.anchorMax = jangkar; r.pivot = new Vector2(.5f,.5f); r.anchoredPosition = posisi; r.sizeDelta = ukuran; }
        static TextMeshProUGUI Teks(Transform induk,string nama,int ukuran)
        {
            var t = HudKamar.Teks(induk,nama,14,ukuran,FontStyles.Bold);
            t.color = Tinta;
            t.raycastTarget = false;
            t.alignment = TextAlignmentOptions.Center;
            return t;
        }
        static Button Tombol(RectTransform induk,string nama,Action aksi)
        {
            var r = HudKamar.BuatKotak(nama,induk);
            var i = r.gameObject.AddComponent<Image>(); i.color = Hijau;
            var b = r.gameObject.AddComponent<Button>(); b.targetGraphic = i; b.onClick.AddListener(() => aksi());
            var t = Teks(r,nama,25);
            HudKamar.Rentangkan(t.rectTransform,new Vector2(.045f,.05f),new Vector2(.955f,.95f));
            return b;
        }
        public void Lepas()
        {
            if (antrean == null) return;
            antrean.Berubah -= IsiAntrean; antrean.Pesan -= pesan;
        }
    }
}
