using MS.Inti;
using MS.Kontrak;
using MS.Pemain;
using UnityEngine;

namespace MS.Dunia
{
    internal sealed class WilayahSemester : MonoBehaviour
    {
        readonly Bounds cekungan = new Bounds(new Vector3(32f,0,-46.2f),new Vector3(6.8f,2.4f,11.0f));
        readonly Bounds depanGang = new Bounds(new Vector3(-70.5f, 0, 5.4f), new Vector3(5.3f, 2.4f, 3f));
        readonly Bounds jalanPenghubung = new Bounds(new Vector3(-32f, 0, 20f), new Vector3(5.7f, 2.4f, 7.2f));
        Transform pemain, air, airGang, airJalan, busKampus;
        BoxCollider tutupJalur;
        Material bahanAir;
        int tingkat;
        bool basah;
        float cekBerikut;

        internal static void Pasang(Transform induk, BahanRealistis bahan)
        {
            var akar = new GameObject("Empat sektor Kampung");
            akar.transform.SetParent(induk, false);
            var zona = akar.AddComponent<WilayahSemester>();
            zona.Bangun(bahan);
        }

        void Bangun(BahanRealistis bahan)
        {
            var putih = bahan.Ambil(null, new Color(.88f,.86f,.75f),Vector2.one);
            var biru = bahan.Ambil(null, new Color(.10f,.25f,.39f),Vector2.one);
            var gelap = bahan.Ambil(null, new Color(.16f,.18f,.21f),Vector2.one);
            var kuning = bahan.Ambil(null, new Color(.87f,.68f,.22f),Vector2.one);

            var utara = Grup("Utara · Kampus", new Vector3(23,0,-19));
            Kotak(bahan,utara,"Menara Jam Rektorat",new Vector3(0,6.2f,0),new Vector3(2.25f,12.4f,2.25f),putih);
            for(int lapis=0;lapis<4;lapis++)
                Kotak(bahan,utara,"Atap limas",new Vector3(0,12.5f+lapis*.34f,0),
                    new Vector3(2.85f-lapis*.58f,.37f,2.85f-lapis*.58f),biru);
            var jam = bahan.Detail(utara,"Muka jam rektorat",new Vector3(0,10.7f,1.16f),
                new Vector3(1.46f,.08f,1.46f),biru,PrimitiveType.Cylinder);
            jam.transform.localRotation = Quaternion.Euler(90,0,0);
            Kotak(bahan,utara,"Jarum jam",new Vector3(.13f,10.84f,1.26f),new Vector3(.06f,.38f,.04f),putih)
                .transform.localRotation = Quaternion.Euler(0,0,-33);
            Kotak(bahan,utara,"Jarum menit",new Vector3(-.05f,10.9f,1.26f),new Vector3(.06f,.54f,.04f),putih);
            Papan(utara,"REKTORAT • KAMPUS",new Vector3(0,7.9f,1.16f));
            
            var selatan = Grup("Selatan · Gang Kosan",new Vector3(-73,0,5.4f));
            Kotak(bahan,selatan,"Gapura besi",new Vector3(0,3.2f,0),new Vector3(.16f,.32f,2.7f),biru);
            for(int i=-1;i<=1;i+=2)
                Kotak(bahan,selatan,"Tiang kabel",new Vector3(0,3.1f,i*1.32f),new Vector3(.13f,6.2f,.13f),gelap);
            for(int jalur=0;jalur<3;jalur++)
            {
                var kabel = new GameObject("Kabel gang").AddComponent<LineRenderer>();
                kabel.transform.SetParent(selatan,false);
                kabel.useWorldSpace = false;
                kabel.sharedMaterial = gelap;
                kabel.widthMultiplier = .025f;
                kabel.positionCount = 7;
                for(int titik=0;titik<7;titik++)
                {
                    float t=titik/6f;
                    kabel.SetPosition(titik,new Vector3(.18f*jalur,5.65f+jalur*.15f-Mathf.Sin(t*Mathf.PI)*.5f,Mathf.Lerp(-1.3f,1.3f,t)));
                }
            }
            Papan(selatan,"GANG KOS • WARTEG BAHARI",new Vector3(.13f,3.35f,0)).localRotation=Quaternion.Euler(0,90,0);

            var tengah = Grup("Tengah · Simpang dan Pos Polisi",new Vector3(-37,0,24));
            Kotak(bahan,tengah,"Tiang lampu merah",new Vector3(0,2,0),new Vector3(.18f,4,.18f),gelap);
            Kotak(bahan,tengah,"Boks sinyal",new Vector3(.27f,3.4f,0),new Vector3(.54f,.99f,.35f),gelap);
            for(int i=0;i<3;i++)
                bahan.Detail(tengah,"Lensa sinyal",new Vector3(.27f,3.70f-i*.29f,.20f),Vector3.one*.20f,
                    bahan.Ambil(null,i==0?Color.red:i==1?Color.yellow:new Color(.26f,.72f,.34f),Vector2.one),PrimitiveType.Sphere);
            Papan(tengah,"SIMPANG • POS POLISI",new Vector3(0,2.30f,.12f));

            var timur = Grup("Timur · Cekungan Jembatan",cekungan.center);
            Papan(timur,"JEMBATAN • JALUR RENDAH",new Vector3(3.8f,2.05f,0));
            var palang = Kotak(bahan,timur,"Peringatan banjir",new Vector3(0,.59f,0),new Vector3(5.2f,.12f,.16f),kuning,true);
            tutupJalur = palang.GetComponent<BoxCollider>();
            tutupJalur.size = new Vector3(1, 10.0f, 1);
            palang.SetActive(false);
            bahanAir = new Material(biru);
            bahanAir.color = new Color(.13f,.34f,.43f,.70f);
            bahanAir.SetFloat("_Surface",1f);
            bahanAir.SetFloat("_SrcBlend",(float)UnityEngine.Rendering.BlendMode.SrcAlpha);
            bahanAir.SetFloat("_DstBlend",(float)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            bahanAir.SetFloat("_ZWrite",0f);
            bahanAir.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            bahanAir.renderQueue=3000;
            air = Kotak(bahan,timur,"Banjir bertingkat",new Vector3(0,.11f,0),new Vector3(6.45f,.018f,10.8f),bahanAir).transform;
            air.gameObject.SetActive(false);
            airGang = BidangAir(bahan, "Genangan gang", depanGang, .10f);
            airJalan = BidangAir(bahan, "Banjir jalan penghubung", jalanPenghubung, .35f);

            Halte(bahan,"halteBarat",new Vector3(-24,0,-4.4f),false,kuning,biru);
            Halte(bahan,"halteTimur",new Vector3(48,0,4.4f),false,kuning,biru);
            Halte(bahan,"halteBusBarat",new Vector3(-24,0,-7.5f),true,kuning,biru);
            Halte(bahan,"halteKampus",new Vector3(16,0,-4.3f),true,kuning,biru);
            busKampus = BuatBus(bahan, kuning, biru, gelap);
        }

        Transform BidangAir(BahanRealistis bahan, string nama, Bounds lokasi, float kedalaman)
        {
            var objek = Kotak(bahan, transform, nama, lokasi.center + Vector3.up * kedalaman,
                new Vector3(lokasi.size.x, .02f, lokasi.size.z), bahanAir);
            objek.SetActive(false);
            return objek.transform;
        }

        Transform BuatBus(BahanRealistis bahan, Material kuning, Material biru, Material gelap)
        {
            var akar = Grup("Bus Kampus Kuning Biru", Vector3.zero);
            Kotak(bahan, akar, "Bodi bus", new Vector3(0, 1.08f, 0), new Vector3(1.95f, 1.40f, 5.0f), kuning);
            Kotak(bahan, akar, "Garis biru", new Vector3(0, .85f, 0), new Vector3(1.98f, .30f, 5.05f), biru);
            Kotak(bahan, akar, "Kaca depan", new Vector3(0, 1.41f, 2.54f), new Vector3(1.60f, .59f, .035f), gelap);
            for (int sisi = -1; sisi <= 1; sisi += 2)
            {
                for (int j = 0; j < 4; j++)
                    Kotak(bahan, akar, "Kaca samping", new Vector3(sisi * .994f, 1.40f, -1.65f + 1.06f * j),
                        new Vector3(.035f, .54f, .83f), gelap);
                foreach (float z in new[] { -1.60f, 1.60f })
                {
                    var roda = bahan.Detail(akar, "Roda bus", new Vector3(sisi * .86f, .36f, z),
                        new Vector3(.68f, .20f, .68f), gelap, PrimitiveType.Cylinder);
                    roda.transform.localRotation = Quaternion.Euler(0, 0, 90);
                }
            }
            return akar;
        }

        void Halte(BahanRealistis bahan,string id,Vector3 posisi,bool bus,Material kuning,Material biru)
        {
            var akar = Grup(bus ? "Halte Bus Kampus" : "Halte Angkot " + id,posisi);
            akar.gameObject.AddComponent<TitikSpawn>().id=id;
            if (!bus) return;
            Kotak(bahan,akar,"Tiang halte bus",new Vector3(1.6f,1.42f,0),new Vector3(.10f,2.84f,.10f),biru);
            Kotak(bahan,akar,"Rambu bus kuning biru",new Vector3(1.6f,2.49f,0),new Vector3(1.4f,.48f,.12f),kuning);
            Papan(akar,"BUS KAMPUS",new Vector3(1.6f,2.49f,.075f));
            var titik=akar.gameObject.AddComponent<TitikInteraksi>();
            titik.idAksi="naikBusKampus";
            titik.target=id;
            titik.nama="Naik Bus Kampus";
        }

        Transform Grup(string nama,Vector3 posisi)
        {
            var objek=new GameObject(nama).transform;
            objek.SetParent(transform,false);
            objek.position=posisi;
            return objek;
        }

        static GameObject Kotak(BahanRealistis bahan,Transform induk,string nama,Vector3 posisi,Vector3 ukuran,Material mat,bool tabrakan=false) =>
            bahan.Detail(induk,nama,posisi,ukuran,mat,PrimitiveType.Cube,tabrakan);

        static Transform Papan(Transform induk,string teks,Vector3 posisi)
        {
            var papan=new GameObject(teks).AddComponent<TextMesh>();
            papan.transform.SetParent(induk,false);
            papan.transform.localPosition=posisi;
            papan.text=teks;
            papan.font=Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            papan.GetComponent<MeshRenderer>().sharedMaterial=papan.font.material;
            papan.fontSize=55;
            papan.characterSize=.042f;
            papan.anchor=TextAnchor.MiddleCenter;
            papan.color=new Color(.99f,.97f,.84f);
            return papan.transform;
        }

        void Update()
        {
            if(Time.unscaledTime<cekBerikut) return;
            cekBerikut=Time.unscaledTime+.25f;
            var jam=Layanan.Jam;
            if(jam==null) return;
            AturBus(jam);
            var cuaca=Layanan.Kondisi?.CuacaId;
            int baru = cuaca switch
            {
                "badai" when jam.Menit >= 240 => 3,
                "badai" or "hujan" when jam.Menit >= 120 => 2,
                "badai" or "hujan" => 1,
                _ => 0
            };
            if(baru!=tingkat)
            {
                tingkat=baru;
                air.gameObject.SetActive(tingkat>0);
                airGang.gameObject.SetActive(tingkat >= 1);
                airJalan.gameObject.SetActive(tingkat >= 2);
                if(tingkat>0) air.localPosition=new Vector3(0,tingkat==1?.10f:tingkat==2?.35f:.55f,0);
                tutupJalur.gameObject.SetActive(tingkat>=3);
            }

            if(pemain==null) pemain=GameObject.FindWithTag("Player")?.transform ?? GameObject.Find("Pemain")?.transform;
            int lokal = 0;
            if (pemain != null && tingkat > 0)
            {
                if (cekungan.Contains(pemain.position)) lokal = tingkat;
                else if (depanGang.Contains(pemain.position)) lokal = 1;
                else if (tingkat >= 2 && jalanPenghubung.Contains(pemain.position)) lokal = 2;
            }
            bool dalam = lokal > 0;
            GerakPemain.PengaliMedan = lokal switch { 1 => .85f, 2 => .62f, 3 => .42f, _ => 1f };
            if(dalam && !basah && GameInti.Instans!=null)
            {
                var game=GameInti.Instans;
                game.Simpanan.kebersihan=Mathf.Max(0,game.Simpanan.kebersihan-5);
                if (lokal >= 2 && Layanan.Kendaraan?.NaikMotor == true)
                {
                    game.Hidup.Turun();
                    game.Aksi.Umumkan("Motor terendam. Turun dan cari jalur yang kering.");
                    game.Stat.TambahUang(-35000);
                }
            }
            basah=dalam;
        }

        void AturBus(IJamGame jam)
        {
            float menit = (jam.Menit + 300f) % 1440f;
            busKampus.gameObject.SetActive(menit >= 390f && menit <= 1050f);
            if (!busKampus.gameObject.activeSelf) return;
            float lintasan = Mathf.PingPong((menit - 390f) / 30f, 1f);
            bool balik = Mathf.FloorToInt((menit - 390f) / 30f) % 2 == 1;
            busKampus.SetPositionAndRotation(new Vector3(Mathf.Lerp(-28f, 25f, lintasan), 0, -1.1f),
                Quaternion.Euler(0, balik ? -90f : 90f, 0));
        }

        void OnDisable() => GerakPemain.PengaliMedan=1f;
        void OnDestroy() { if(bahanAir!=null) Destroy(bahanAir); }
    }
}
