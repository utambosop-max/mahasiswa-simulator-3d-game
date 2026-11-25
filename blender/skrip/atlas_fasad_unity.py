"""Siapkan atlas fasad dengan warna, normal, metalik, AO, dan kilap."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[2]
GAME=ROOT/"unity/MahasiswaSim3D/Assets/_Game"
BUKA=GAME/"Pihak3/PolyHaven/Katalog/Tekstur"
TARGET=GAME/"Models/Resources/Fasad"
SEL=256
UKURAN=(SEL*4,SEL*4)
WARNA_NORMAL=(128,128,255)
PBR_MATTE=(0,255,0,50)
ATAP_SENG={"warteg","warkop","fotokopi","laundry","tani","pasar","gor","warnet"}
PINTU_GULUNG={"minimarket","fotokopi","laundry","tani","pasar","warnet"}
CAP = {
    "kos":"KOS MELATI","kampus":"KAMPUS","warteg":"WARTEG BAROKAH",
    "warkop":"WARKOP BEGADANG","minimarket":"TOKO SERBA ADA 24",
    "perpus":"PERPUSTAKAAN","klinik":"KLINIK SEHAT","warnet":"WARNET GAMING",
    "fotokopi":"FOTOKOPI & PRINT","laundry":"LAUNDRY KILOAN","kafe":"KAFE RUANG KERJA",
    "bank":"BANK MAHASISWA","gor":"GOR SERBAGUNA","karier":"PUSAT KARIER",
    "tani":"TOKO TANI & DEPOT AIR","pasar":"PASAR PAGI",
    "salon":"PANGKAS BANG CUKUR","polisi":"POS POLISI"
}

def tile(id, key, mode, warna):
    if id:
        with Image.open(BUKA/id/key) as peta:
            return peta.convert(mode).resize((SEL,SEL),Image.Resampling.LANCZOS)
    return Image.new(mode,(SEL,SEL),warna)

def cat(rgb, warna, kekuatan=.5):
    if warna is None: return rgb
    mask=ImageOps.grayscale(rgb)
    dasar=tuple(round(32+c*.55) for c in warna)
    terang=tuple(min(255,round(94+c*.68)) for c in warna)
    return Image.blend(rgb,ImageOps.colorize(mask,dasar,terang),kekuatan)

def teks(kanvas, label, aksen):
    gambar=ImageDraw.Draw(kanvas)
    gambar.rectangle((12,25,SEL-12,SEL-25),fill=aksen,width=0)
    warna=(255,247,220) if sum(aksen)<485 else (39,38,34)
    for sumber in ("arialbd.ttf","DejaVuSans-Bold.ttf"):
        try:
            huruf=ImageFont.truetype(sumber,39)
        except OSError:
            continue
        break
    else:
        huruf=ImageFont.load_default()
    left,top,right,bottom=huruf.getbbox(label)
    mask=Image.new("L",(right-left,bottom-top))
    ImageDraw.Draw(mask).text((-left,-top),label,font=huruf,fill=255)
    lebar=min(round(SEL*.89),round(mask.width*1.25))
    mask=mask.resize((lebar,round(SEL*.53)),Image.Resampling.LANCZOS)
    kanvas.paste(warna,((SEL-mask.width)//2,(SEL-mask.height)//2),mask)
    return kanvas


def buat(b):
    id=b["id"]
    rumah=b["jenis"]=="rumah"
    bahan_atap="worn_corrugated_iron" if id in ATAP_SENG else "clay_roof_tiles_02"
    bahan_pintu="painted_metal_shutter" if id in PINTU_GULUNG else "wooden_planks"
    aksen=tuple(bytes.fromhex(b.get("aksen","#907951").lstrip("#")))
    dinding=tuple(bytes.fromhex(b.get("warna","#e0ccab").lstrip("#")))
    if len(aksen)!=3: aksen=(106,98,77)
    if len(dinding)!=3: dinding=(218,195,160)
    bahan=(
        ("painted_plaster_wall",dinding,None),
        ("worn_mossy_plasterwall",(191,178,154),None),
        ("red_bricks_04",(157,101,80),None),
        ("concrete_pavement_03",(155,149,130),None),
        (bahan_atap,None,None),
        (bahan_pintu,aksen,None),
        (None,(57,59,54),(95,255,95,126)),
        (None,aksen,None),
        (None,aksen,None),
    )
    base=Image.new("RGB",UKURAN,(168,149,120))
    gl=Image.new("RGB",UKURAN,WARNA_NORMAL)
    pbr=Image.new("RGBA",UKURAN,PBR_MATTE)
    for i,(sumber,warna,pack) in enumerate(bahan):
        x=i%4*SEL; y=(3-i//4)*SEL
        dif=tile(sumber,"warna.jpg","RGB",warna)
        if sumber: dif=cat(dif,warna)
        if i==8 and not rumah: dif=teks(dif,CAP.get(id,b["nama"].upper()),aksen)
        base.paste(dif,(x,y))
        gl.paste(tile(sumber,"normal.jpg","RGB",WARNA_NORMAL),(x,y))
        pbr.paste(tile(sumber,"pbr.png","RGBA",pack or PBR_MATTE),(x,y))
    keluar=TARGET/id
    keluar.mkdir(parents=True,exist_ok=True)
    base.save(keluar/"warna.jpg",quality=88,optimize=True)
    gl.save(keluar/"normal.jpg",quality=89,optimize=True)
    pbr.save(keluar/"pbr.png",optimize=True)

if __name__=="__main__":
    data=json.loads((GAME/"Data/dunia.json").read_text(encoding="utf-8"))
    for bangunan in data["bangunan"]:
        buat(bangunan)
