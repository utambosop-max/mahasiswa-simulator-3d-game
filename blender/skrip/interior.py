# Model interior int_<nama>.fbx (prosedural, pastel membulat).
# Pivot di lantai tengah, depan = -Y Blender (= +Z Unity, sama seperti pintu gedung).
# Ukuran mengikuti nilai w/d paling umum di gedung.json; Unity boleh menskala bila w/d berbeda.
import sys, bpy
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import mat, box, cyl, export, start

R90 = 1.5708

def sph(r, loc, m, seg=10, ring=6):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object; o.data.materials.append(m); return o

def P():  # palet pastel Art Bible
    return dict(kayu=mat('kayu', 'a86b3c'), krem=mat('krem', 'fff6e5'), oranye=mat('oranye', 'f6a96b'), kuning=mat('kuning', 'ffe08a'),
                mint=mat('mint', '7cc6a4'), bata=mat('bata', 'e98a6b'), biru=mat('biru', '9ad0ec'), abu=mat('abu', '8a8f99'),
                gelap=mat('gelap', '3b2a20'), putih=mat('putih', 'fdfdf7'), kaca=mat('kaca', 'cfe9f5'), hijau=mat('daun', '4f9a45'))

def kaki4(w, d, h, m, t=.07):
    for x in (-w/2+t, w/2-t):
        for y in (-d/2+t, d/2-t): box('kaki', (t, t, h), (x, y, h/2), m, 0)

def meja(w, d, h, top, leg):
    box('daun meja', (w, d, .07), (0, 0, h-.035), top, .03); kaki4(w*.92, d*.85, h-.07, leg)

def konter(w, d, h, badan, atas, aksen):
    box('badan', (w, d*.9, h-.06), (0, 0, (h-.06)/2), badan, .05)
    box('atas', (w+.06, d, .06), (0, 0, h-.03), atas, .03)
    box('list', (w*.95, .03, .1), (0, -d*.45-.01, h*.55), aksen, 0)

def rotx(o): o.rotation_euler = (R90, 0, 0); return o
def roty(o): o.rotation_euler = (0, R90, 0); return o

def etalase(p):
    konter(3.4, .8, .85, p['krem'], p['kayu'], p['oranye'])
    box('kaca', (3.2, .6, .45), (0, .05, 1.1), p['kaca'], .03)
    for i, c in enumerate(('kuning', 'bata', 'mint', 'oranye')): box('lauk', (.6, .4, .08), (-1.2+i*.8, .05, .92), p[c], .03)
def mejaPanjang(p): meja(4, .9, .75, p['kayu'], p['kayu'])
def bangku(p):
    box('dudukan', (4, .35, .06), (0, 0, .43), p['kayu'], .03)
    for x in (-1.8, -.6, .6, 1.8): box('kaki', (.07, .28, .4), (x, 0, .2), p['kayu'], 0)
def mejaKuliah(p):
    meja(1.6, .7, .74, p['kayu'], p['abu'])
    for x in (-.45, .45):
        box('kursi', (.42, .4, .05), (x, .55, .44), p['oranye'], .02); box('sandaran', (.42, .05, .38), (x, .75, .66), p['oranye'], .02)
        for dx in (-.17, .17): box('kaki kursi', (.04, .04, .42), (x+dx, .55, .21), p['abu'], 0)
def papanTulis(p):
    box('bingkai', (3.0, .08, 1.3), (0, 0, 1.55), p['kayu'], .03); box('papan', (2.85, .03, 1.15), (0, -.04, 1.55), p['mint'], 0)
    box('rak kapur', (2.6, .12, .04), (0, -.07, .9), p['kayu'], 0)
    for x in (-1.4, 1.4): box('tiang', (.07, .07, .9), (x, 0, .45), p['kayu'], 0)
def mejaDosen(p):
    box('meja', (2.2, .8, .74), (0, 0, .37), p['kayu'], .05); box('panel', (2.0, .03, .5), (0, -.41, .36), p['krem'], 0)
    box('buku', (.3, .22, .08), (.6, .1, .78), p['bata'], .02); box('laptop', (.36, .26, .02), (-.4, .05, .75), p['abu'], 0)
def konterKopi(p):
    konter(3.4, .8, .95, p['kayu'], p['krem'], p['kuning'])
    for i in range(5): cyl('toples', .1, .22, (-1.3+i*.3, .15, 1.06), p['kaca'], 8)
    box('mesin', (.4, .35, .45), (1.1, .1, 1.18), p['abu'], .05)
def mejaBulat(p):
    cyl('daun', .5, .06, (0, 0, .72), p['kayu'], 16); cyl('tiang', .06, .68, (0, 0, .35), p['gelap'], 8); cyl('alas', .3, .04, (0, 0, .02), p['gelap'], 12)
def termos(p):
    box('meja', (.6, .6, .7), (0, 0, .35), p['kayu'], .04)
    cyl('termos', .16, .5, (0, 0, .95), p['bata'], 12); cyl('tutup', .12, .08, (0, 0, 1.24), p['krem'], 12)
    rotx(cyl('kran', .03, .1, (0, -.18, .8), p['gelap'], 6))
def tv(p):
    box('kabinet', (1.4, .45, .5), (0, 0, .25), p['kayu'], .04); box('tv', (1.2, .08, .7), (0, .05, .9), p['gelap'], .04)
    box('layar', (1.08, .02, .6), (0, 0, .9), p['biru'], 0); box('kaki tv', (.3, .2, .06), (0, .05, .53), p['gelap'], 0)
def kasir(p):
    konter(2.4, .8, .95, p['krem'], p['bata'], p['kuning'])
    box('mesin kasir', (.45, .35, .25), (-.6, .1, 1.07), p['abu'], .04); box('layar', (.35, .04, .22), (-.6, -.05, 1.3), p['biru'], .01)
def rak(p):
    for z in (.1, .55, 1.0, 1.45): box('papan rak', (2.4, .55, .05), (0, 0, z), p['putih'], .02)
    for x in (-1.18, 1.18): box('sisi', (.05, .6, 1.55), (x, 0, .78), p['abu'], 0)
    for z in (.2, .65, 1.1):
        for i, c in enumerate(('bata', 'kuning', 'mint', 'biru', 'oranye')): box('barang', (.35, .35, .18), (-.9+i*.45, 0, z+.03), p[c], 0)
def kulkas(p):
    box('badan', (.8, .7, 1.8), (0, 0, .9), p['putih'], .08); box('pintu kaca', (.68, .03, 1.5), (0, -.36, 1.0), p['kaca'], 0)
    box('pegangan', (.04, .05, .5), (.3, -.39, 1.1), p['abu'], 0)
    for z in (.5, .9, 1.3): box('botol', (.6, .2, .2), (0, -.1, z), p['mint'] if z < 1 else p['bata'], .03)
def mejaPustakawan(p):
    konter(2.4, .8, .8, p['kayu'], p['krem'], p['mint'])
    box('tumpukan buku', (.35, .25, .2), (.7, .1, .9), p['bata'], .03); box('lampu', (.12, .12, .35), (-.8, .1, .97), p['kuning'], .04)
def rakBuku(p):
    box('rangka', (.6, 2.0, 2.0), (0, 0, 1.0), p['kayu'], .04)
    for z in (.35, .8, 1.25, 1.7):
        for i, c in enumerate(('bata', 'biru', 'mint', 'kuning')): box('buku', (.34, .4, .32), (-.15, -.7+i*.46, z), p[c], 0)
def mejaBaca(p):
    meja(2.2, 1.1, .75, p['kayu'], p['kayu'])
    for x in (-.6, .6):
        for y in (-.75, .75): box('kursi', (.42, .4, .45), (x, y, .225), p['mint'], .05)
def resepsionis(p):
    konter(3.0, .8, 1.05, p['putih'], p['mint'], p['biru'])
    box('monitor', (.45, .05, .3), (.7, .1, 1.25), p['gelap'], .02); box('bel', (.12, .12, .06), (-.6, -.1, 1.09), p['kuning'], .02)
def ranjang(p):
    box('rangka', (1.1, 2.1, .3), (0, 0, .35), p['putih'], .05); kaki4(1.0, 2.0, .2, p['abu'])
    box('kasur', (1.0, 2.0, .18), (0, 0, .58), p['biru'], .07); box('bantal', (.7, .35, .12), (0, .75, .72), p['putih'], .05)
    box('sandaran', (1.1, .06, .5), (0, 1.05, .6), p['abu'], .03)
def kursiTunggu(p):
    box('palang', (2.6, .1, .06), (0, 0, .3), p['abu'], 0)
    for x in (-.85, 0, .85):
        box('dudukan', (.75, .45, .06), (x, 0, .44), p['oranye'], .03); box('sandaran', (.75, .06, .4), (x, .22, .7), p['oranye'], .03)
    for x in (-1.2, 1.2): box('kaki', (.06, .4, .42), (x, 0, .21), p['abu'], 0)
def tanaman(p):
    cyl('pot', .22, .4, (0, 0, .2), p['bata'], 12); sph(.35, (0, 0, .7), p['hijau']); sph(.25, (.1, .05, 1.0), p['mint'])
def mejaPC(p):
    meja(2.4, .7, .74, p['putih'], p['abu'])
    for x in (-.6, .6):
        box('monitor', (.55, .05, .38), (x, .15, 1.0), p['gelap'], .02); box('kaki monitor', (.08, .08, .15), (x, .2, .8), p['gelap'], 0)
        box('keyboard', (.42, .14, .02), (x, -.12, .75), p['abu'], 0)
def konterBiasa(p): konter(2.2, .8, .95, p['krem'], p['kayu'], p['oranye'])
def mesinFotokopi(p):
    box('badan', (1.2, .9, .9), (0, 0, .45), p['putih'], .06); box('tutup', (1.0, .75, .12), (0, 0, .96), p['abu'], .04)
    box('nampan', (.5, .4, .04), (.75, 0, .6), p['abu'], 0); box('panel', (.3, .15, .05), (-.4, -.35, 1.04), p['biru'], 0)
def rakKertas(p):
    box('rangka', (.6, 1.4, 1.5), (0, 0, .75), p['kayu'], .04)
    for z in (.3, .7, 1.1): box('rim kertas', (.45, 1.2, .2), (-.1, 0, z), p['putih'], .02)
def mesinCuci(p):
    box('badan', (1.0, .9, .95), (0, 0, .475), p['putih'], .08); rotx(cyl('pintu', .3, .04, (0, -.46, .5), p['kaca'], 16))
    rotx(cyl('cincin', .34, .02, (0, -.45, .5), p['abu'], 16)); box('panel', (.8, .05, .12), (0, -.44, .85), p['biru'], 0)
def keranjang(p):
    cyl('keranjang', .33, .5, (0, 0, .25), p['biru'], 12); sph(.28, (0, 0, .5), p['kuning'], 10, 5)
def konterKafe(p):
    konter(3.4, .8, .95, p['gelap'], p['kayu'], p['kuning']); box('mesin espresso', (.5, .4, .45), (-1.0, .1, 1.18), p['abu'], .05)
    box('etalase kue', (.9, .5, .35), (.8, 0, 1.13), p['kaca'], .03)
def mejaKafe(p):
    cyl('daun', .5, .05, (0, 0, .73), p['krem'], 16); cyl('tiang', .05, .7, (0, 0, .36), p['gelap'], 8); cyl('alas', .25, .03, (0, 0, .015), p['gelap'], 12)
    for y in (-.75, .75): cyl('kursi', .22, .45, (0, y, .225), p['oranye'], 12)
def sofa(p):
    box('dudukan', (2.0, .8, .4), (0, 0, .2), p['mint'], .1); box('sandaran', (2.0, .22, .45), (0, .29, .62), p['mint'], .1)
    for x in (-.95, .95): box('lengan', (.2, .8, .3), (x, 0, .55), p['mint'], .08)
    for x in (-.45, .45): box('bantal', (.85, .55, .12), (x, -.05, .46), p['krem'], .05)
def brankas(p):
    box('badan', (1.0, .8, 1.1), (0, 0, .55), p['abu'], .06); rotx(cyl('putaran', .14, .05, (0, -.42, .6), p['kuning'], 12))
    box('engsel', (.05, .05, .8), (-.42, -.41, .55), p['gelap'], 0)
def matras(p): box('matras', (2.0, 1.0, .08), (0, 0, .04), p['biru'], .03)
def alatGym(p):
    box('bangku', (.4, 1.2, .1), (0, 0, .45), p['bata'], .04)
    for y in (-.45, .45): box('kaki', (.3, .1, .4), (0, y, .2), p['gelap'], 0)
    for x in (-.28, .28): box('tiang', (.06, .06, 1.1), (x, .55, .55), p['abu'], 0)
    roty(cyl('barbel', .03, 1.3, (0, .55, 1.0), p['abu'], 6))
    for x in (-.55, .55): roty(cyl('beban', .18, .07, (x, .55, 1.0), p['gelap'], 12))
def galonRak(p):
    for z in (.05, .5): box('rak', (1.8, .7, .05), (0, 0, z), p['kayu'], 0)
    for x in (-.85, .85): box('sisi', (.05, .7, .55), (x, 0, .27), p['kayu'], 0)
    for x in (-.6, 0, .6):
        for z in (.08, .53): cyl('galon', .2, .42, (x, 0, z+.21), p['kaca'], 10)
def lapak(p):
    box('meja', (2.0, .9, .7), (0, 0, .35), p['kayu'], .04); box('taplak', (2.05, .95, .04), (0, 0, .72), p['bata'], 0)
    for i, c in enumerate(('kuning', 'mint', 'oranye')): sph(.22, (-.6+i*.6, 0, .85), p[c], 8, 5)
def cermin(p):
    box('bingkai', (.9, .08, 1.2), (0, 0, 1.2), p['kayu'], .04); box('kaca', (.78, .02, 1.08), (0, -.045, 1.2), p['kaca'], 0)
    box('meja rias', (1.0, .4, .8), (0, .1, .4), p['krem'], .04)
def kursiCukur(p):
    cyl('alas', .3, .08, (0, 0, .04), p['abu'], 12); cyl('tiang', .07, .35, (0, 0, .25), p['abu'], 8)
    box('dudukan', (.6, .6, .15), (0, 0, .5), p['bata'], .06); box('sandaran', (.6, .12, .65), (0, .26, .9), p['bata'], .06)
    for x in (-.3, .3): box('lengan', (.08, .5, .08), (x, 0, .7), p['gelap'], .02)

FN = dict(etalase=etalase, mejaPanjang=mejaPanjang, bangku=bangku, mejaKuliah=mejaKuliah, papanTulis=papanTulis, mejaDosen=mejaDosen,
          konterKopi=konterKopi, mejaBulat=mejaBulat, termos=termos, tv=tv, kasir=kasir, rak=rak, kulkas=kulkas, mejaPustakawan=mejaPustakawan,
          rakBuku=rakBuku, mejaBaca=mejaBaca, resepsionis=resepsionis, ranjang=ranjang, kursiTunggu=kursiTunggu, tanaman=tanaman, mejaPC=mejaPC,
          konter=konterBiasa, mesinFotokopi=mesinFotokopi, rakKertas=rakKertas, mesinCuci=mesinCuci, keranjang=keranjang, konterKafe=konterKafe,
          mejaKafe=mejaKafe, sofa=sofa, brankas=brankas, matras=matras, alatGym=alatGym, galonRak=galonRak, lapak=lapak, cermin=cermin, kursiCukur=kursiCukur)
for n, f in FN.items():
    start(); f(P()); export('int_'+n, 1500)
print('INTERIOR SELESAI', len(FN))
