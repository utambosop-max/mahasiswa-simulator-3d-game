"""Perabot upgrade kamar. Jalankan lewat Blender dengan --background --python."""
from pathlib import Path
import math
import sys
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import box, cyl, export, mat, start


def palet():
    start()
    bpy.context.preferences.filepaths.save_version = 0
    return {name: mat(name, color) for name, color in {
        "kayu": "BA8159", "gelap": "524455", "krem": "FFF3DF",
        "biru": "78AACB", "mint": "77C7AA", "emas": "F4C878",
        "salem": "E89387", "daun": "669A70",
    }.items()}


def lemari():
    p = palet()
    box("Badan", (1.18, .56, 1.8), (0, 0, .9), p["kayu"])
    for x in (-.29, .29):
        box("Pintu", (.55, .06, 1.64), (x, -.29, .91), p["krem"])
    for x in (-.08, .08):
        box("Pegangan", (.04, .06, .22), (x, -.34, .95), p["emas"], 0)
    export("prop_lemari", 1500)


def kasur(level):
    p = palet()
    tinggi = .28 if level == 2 else .40
    box("Alas", (1.38, 2.04, tinggi), (0, 0, tinggi / 2), p["kayu" if level == 2 else "gelap"])
    box("Matras", (1.31, 1.96, .24), (0, 0, tinggi + .12), p["biru" if level == 2 else "krem"])
    box("Selimut", (1.27, .9, .07), (0, -.47, tinggi + .25), p["mint" if level == 2 else "salem"])
    box("Bantal", (.91, .36, .15), (0, .64, tinggi + .27), p["krem"])
    if level == 3:
        box("Sandaran", (1.38, .12, .88), (0, .96, .44), p["gelap"])
        for x in (-.42, 0, .42):
            box("Jahitan", (.035, .013, .20), (x, .892, .73), p["salem"], 0)
    export(f"prop_kasur_lv{level}", 1500)


def meja(level):
    p = palet()
    warna = p["kayu" if level == 2 else "gelap"]
    box("Permukaan", (1.6, .8, .10), (0, 0, .75), warna)
    for x in (-.67, .67):
        for y in (-.29, .29):
            box("Kaki", (.10, .10, .70), (x, y, .35), warna, 0)
    if level == 2:
        cyl("Alas lampu", .13, .04, (.51, .23, .82), p["mint"])
        cyl("Tiang lampu", .035, .36, (.51, .23, 1.02), p["gelap"])
        box("Kap lampu", (.31, .24, .13), (.51, .14, 1.21), p["emas"])
        box("Buku", (.31, .22, .05), (-.42, .04, .83), p["biru"], 0)
    else:
        box("Strip meja", (1.4, .025, .035), (0, -.401, .74), p["mint"], 0)
        box("Layar", (.78, .09, .47), (0, .22, 1.16), p["gelap"])
        box("Panel layar", (.71, .015, .40), (0, .172, 1.16), p["biru"], 0)
        box("Dudukan", (.2, .21, .15), (0, .22, .86), p["gelap"], 0)
        box("Papan ketik", (.49, .16, .025), (0, -.19, .819), p["mint"], 0)
    export(f"prop_meja_lv{level}", 1500)


def cakram(nama, radius, tebal, posisi, bahan):
    objek = cyl(nama, radius, tebal, posisi, bahan, 20)
    objek.rotation_euler.x = math.pi / 2
    return objek


def kipas(level):
    p = palet()
    if level == 1:
        box("Gagang", (.045, .036, .24), (0, 0, .12), p["kayu"], 0)
        cakram("Kipas tangan", .22, .035, (0, 0, .38), p["salem"])
        cakram("Motif", .12, .04, (0, -.005, .38), p["emas"])
    elif level == 2:
        cyl("Alas", .25, .09, (0, 0, .045), p["gelap"])
        cyl("Tiang", .04, .95, (0, 0, .53), p["biru"])
        cakram("Bingkai", .29, .12, (0, 0, 1.17), p["biru"])
        cakram("Muka kipas", .25, .035, (0, -.073, 1.17), p["krem"])
        for i in range(4):
            sudut = i * math.pi / 2
            bilah = box("Baling-baling", (.09, .025, .19),
                        (.105 * math.sin(sudut), -.101, 1.17 + .105 * math.cos(sudut)), p["mint"], 0)
            bilah.rotation_euler.y = sudut
        cakram("Tutup poros", .069, .04, (0, -.12, 1.17), p["gelap"])
    else:
        box("Unit AC", (1.05, .26, .34), (0, 0, .17), p["krem"])
        box("Ventilasi", (.86, .018, .07), (0, -.133, .10), p["gelap"], 0)
        box("Indikator", (.035, .018, .025), (.39, -.133, .23), p["mint"], 0)
    export(f"prop_kipas_lv{level}", 1500)


def dekorasi(level):
    p = palet()
    if level == 2:
        for x in (-.42, .42):
            box("Penyangga rak", (.10, .34, 1.12), (x, 0, .56), p["kayu"], 0)
        for z in (.10, .57, 1.08):
            box("Papan rak", (.95, .34, .065), (0, 0, z), p["kayu"], 0)
        for i, nama in enumerate(("salem", "biru", "mint", "emas")):
            box("Buku", (.09, .19, .28 + i * .025), (i * .115 - .21, -.02, .745 + i * .0125), p[nama], 0)
        box("Bingkai poster", (.58, .07, .46), (0, .09, 1.38), p["gelap"])
        box("Poster", (.51, .025, .39), (0, .043, 1.38), p["biru"], 0)
        box("Motif poster", (.22, .014, .12), (.05, .023, 1.43), p["emas"], 0)
    else:
        box("Karpet", (1.22, .83, .035), (0, -.16, .0175), p["salem"])
        for x in (-.32, 0, .32):
            box("Pola karpet", (.065, .74, .008), (x, -.16, .038), p["krem"], 0)
        cyl("Pot", .17, .25, (-.39, .26, .125), p["kayu"], 12)
        for x, y, z in ((-.43, .26, .43), (-.30, .26, .34), (-.47, .16, .36)):
            box("Daun", (.19, .17, .24), (x, y, z), p["daun"])
        for x in (-.55, .55):
            box("Tiang lampu", (.045, .055, 1.42), (x, .31, .71), p["gelap"], 0)
        box("Kabel", (1.1, .026, .026), (0, .31, 1.36), p["gelap"], 0)
        for i in range(7):
            cyl("Bohlam", .037, .07, (i * .15 - .45, .31, 1.31), p["emas"], 8)
    export(f"prop_dekorasi_lv{level}", 1500)


if __name__ == "__main__":
    lemari()
    for level in (2, 3):
        kasur(level)
        meja(level)
        dekorasi(level)
    for level in (1, 2, 3):
        kipas(level)
