"""Rakit set PBR tanah kampung dari tiga permukaan CC0."""
from pathlib import Path
import random

from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[2]
POLY=ROOT/"unity/MahasiswaSim3D/Assets/_Game/Pihak3/PolyHaven"
SRC=POLY/"Katalog/Tekstur"
OUT=POLY/"Resources/Bahan/tanah_kampung"
UKURAN=1024

def noise(frekuensi, seed):
    rng=random.Random(seed)
    bagian=Image.new("L",(frekuensi,frekuensi))
    bagian.putdata([rng.randrange(256) for _ in range(frekuensi**2)])
    bidang=Image.new("L",(frekuensi*2,frekuensi*2))
    bidang.paste(bagian,(0,0))
    bidang.paste(ImageOps.mirror(bagian),(frekuensi,0))
    bidang.paste(ImageOps.flip(bagian),(0,frekuensi))
    bidang.paste(ImageOps.flip(ImageOps.mirror(bagian)),(frekuensi,frekuensi))
    return bidang.resize((UKURAN,UKURAN),Image.Resampling.BICUBIC)

def baca(nama, png):
    with Image.open(SRC/nama/png) as img:
        format="RGBA" if png.endswith(".png") else "RGB"
        return img.convert(format).resize((UKURAN,UKURAN),Image.Resampling.LANCZOS)

def main():
    lapis=noise(14,8103).point(lambda v:max(0,min(235,round((v-54)*1.72))))
    tanah=noise(7,8105).point(lambda v:max(0,min(218,round((v-137)*2.45))))
    OUT.mkdir(parents=True,exist_ok=True)
    for nama in ("warna.jpg","normal.jpg","pbr.png"):
        hijau=baca("grass_ground",nama)
        tipis=baca("sparse_grass",nama)
        kering=baca("red_dirt_mud_01",nama)
        hasil=Image.composite(kering,Image.composite(tipis,hijau,lapis),tanah)
        if nama.endswith(".jpg"):
            hasil.save(OUT/nama,quality=89,optimize=True)
        else:
            hasil.save(OUT/nama,optimize=True)

if __name__=="__main__":
    main()
