# Tokoh penjaga gedung kar_penjaga_<id>.fbx: chibi statis tanpa rig, gaya kar_mahasiswa (fase2.py).
# Tinggi +-1,5 m, kepala +-1/2 tinggi. Depan = -Y Blender (= +Z Unity). Warna baju/rambut dari gedung.json.
import sys, json, bpy
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import ROOT, mat, box, cyl, export, start

def sph(r, loc, m, seg=16, ring=8, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.object; o.scale = scale; o.data.materials.append(m); return o

def cone(r1, r2, h, loc, m, v=12):
    bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r1, radius2=r2, depth=h, location=loc)
    o = bpy.context.object; o.data.materials.append(m); return o

HEAD_Z, HR = 1.12, .38  # kepala: tinggi 0,76 dari total ~1,5 m

def aksesori(gid, c):
    fy = -HR*.92  # permukaan depan wajah
    def kacamata():
        for x in (-.13, .13): box('lensa', (.15, .03, .1), (x, fy-.03, HEAD_Z+.02), c['gelap'], .02)
    def dasi(m): box('dasi', (.07, .03, .26), (0, -.165, .78), m, .01)
    def celemek(m): box('celemek', (.42, .03, .4), (0, -.165, .66), m, .03)
    def topi(m):
        cyl('topi', HR*.85, .14, (0, 0, HEAD_Z+HR*.82), m, 14); box('lidah topi', (.36, .2, .03), (0, -.38, HEAD_Z+HR*.68), m, .01)
    def sanggul(): sph(.13, (0, .22, HEAD_Z+.3), c['rambut'], 10, 6)
    if gid == 'kampus': kacamata(); dasi(c['bata'])
    elif gid in ('warteg', 'laundry'): celemek(c['krem'])
    elif gid == 'warkop': cyl('peci', .26, .16, (0, 0, HEAD_Z+HR*.85), c['gelap'], 14)
    elif gid in ('minimarket', 'fotokopi'): topi(c['kuning'] if gid == 'minimarket' else c['oranye'])
    elif gid == 'perpus': kacamata(); sanggul()
    elif gid == 'klinik':
        box('stetoskop', (.32, .03, .04), (0, -.165, .9), c['abu'], 0); box('stetoskop2', (.04, .03, .2), (.1, -.165, .8), c['abu'], 0)
    elif gid == 'warnet':
        bpy.ops.mesh.primitive_torus_add(major_radius=HR*1.02, minor_radius=.035, major_segments=16, minor_segments=6, location=(0, 0, HEAD_Z), rotation=(0, 1.5708, 0))
        bpy.context.object.data.materials.append(c['gelap'])
        for x in (-HR, HR): cyl('earpad', .09, .08, (x, 0, HEAD_Z), c['bata'], 10).rotation_euler = (0, 1.5708, 0)
    elif gid == 'kafe': celemek(c['kayu']); cyl('baret', .3, .08, (.04, 0, HEAD_Z+HR*.9), c['bata'], 14)
    elif gid == 'bank': dasi(c['biru']); box('kerah', (.36, .04, .06), (0, -.165, .95), c['putih'], .01)
    elif gid == 'gor':
        cyl('ikat kepala', HR*1.0, .07, (0, 0, HEAD_Z+.16), c['putih'], 16); box('peluit', (.06, .04, .05), (0, -.17, .82), c['kuning'], .01)
    elif gid == 'karier': sanggul(); box('papan klip', (.22, .03, .28), (.36, -.12, .7), c['krem'], .02)
    elif gid == 'tani': cone(.6, .04, .25, (0, 0, HEAD_Z+HR*.9), c['kuning'], 16)
    elif gid == 'pasar': sph(HR*1.08, (0, .03, HEAD_Z+.02), c['bata'], 14, 7, (1, 1, 1.02))  # kerudung
    elif gid == 'salon': sph(.2, (0, -.12, HEAD_Z+HR*.9), c['rambut'], 10, 6, (1.3, 1.2, .8))  # jambul
    elif gid == 'polisi':
        cyl('topi polisi', HR*.9, .16, (0, 0, HEAD_Z+HR*.85), c['baju'], 14); box('lidah', (.38, .2, .03), (0, -.35, HEAD_Z+HR*.68), c['gelap'], .01)
        box('lencana', (.08, .03, .08), (-.12, -.165, .88), c['kuning'], .01)

def penjaga(b):
    start(); h = lambda s: s.lstrip('#')
    c = dict(kulit=mat('kulit', 'ffd7b5'), rambut=mat('rambut', h(b['rambutPenjaga'])), baju=mat('baju', h(b['bajuPenjaga'])),
             celana=mat('celana', '4a5a7a'), sepatu=mat('sepatu', '6b4430'), gelap=mat('gelap', '2a1d15'), putih=mat('putih', 'fdfdf7'),
             krem=mat('krem', 'fff6e5'), kuning=mat('kuning', 'ffe08a'), oranye=mat('oranye', 'f6a96b'), bata=mat('bata', 'e98a6b'),
             biru=mat('biru', '7fb3e0'), abu=mat('abu', '8a8f99'), kayu=mat('kayu', 'a86b3c'), pipi=mat('pipi', 'f7a8a8'))
    for x in (-.12, .12): box('kaki', (.15, .19, .36), (x, 0, .18), c['celana'], .06); box('sepatu', (.16, .24, .08), (x, -.03, .04), c['sepatu'], .03)
    box('badan', (.5, .3, .44), (0, 0, .58), c['baju'], .12)
    for x in (-.31, .31): box('lengan', (.14, .18, .38), (x, 0, .6), c['baju'], .06); sph(.07, (x, 0, .38), c['kulit'], 8, 5)
    sph(HR, (0, 0, HEAD_Z), c['kulit'])
    if b['id'] != 'pasar': sph(HR*1.04, (0, .06, HEAD_Z+.08), c['rambut'], 14, 7, (1, .95, .78))  # rambut menutupi belakang/atas
    for x in (-.13, .13):
        sph(.045, (x, -HR*.93, HEAD_Z-.01), c['gelap'], 8, 4)
        sph(.05, (x*1.5, -HR*.85, HEAD_Z-.11), c['pipi'], 8, 4, (1, .4, .7))
    box('mulut', (.1, .02, .025), (0, -HR*.97, HEAD_Z-.15), c['gelap'], 0)
    aksesori(b['id'], c)
    export('kar_penjaga_'+b['id'], 4000)

data = json.loads((ROOT/'unity/MahasiswaSim3D/Assets/_Game/Data/gedung.json').read_text(encoding='utf-8'))
ids = [b for b in data['gedung'] if b.get('penjaga') and b.get('namaPenjaga')]
for b in ids: penjaga(b)
print('PENJAGA SELESAI', len(ids))
