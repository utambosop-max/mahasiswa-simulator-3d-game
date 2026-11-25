import json
import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import ROOT, box, mat, start, export

PALET = ('83BAA8', 'DD9B87', '94A9D2', 'D8B576', 'AE91BC')


def rambut(gaya, bahan):
    if gaya == 'botak':
        return
    box('rambut', (.66, .55, .19), (0, .035, 1.43), bahan, .075)
    if gaya in ('panjang', 'hijab'):
        box('belakang', (.61, .20, .49), (0, .22, 1.17), bahan, .075)
    if gaya == 'hijab':
        for x in (-.28, .28):
            box('sisi hijab', (.15, .31, .47), (x, .02, 1.16), bahan, .06)
    if gaya in ('poni', 'belah', 'jabrik'):
        for i in (-1, 0, 1):
            box('poni', (.18, .16, .13), (i*.16, -.21, 1.39 + (.045*i if gaya == 'belah' else 0)), bahan, .04)
    if gaya in ('kuncir', 'cepol'):
        box(gaya, (.22,.25,.23), (0,.32,1.27 if gaya == 'kuncir' else 1.49), bahan, .07)
    if gaya in ('keriting', 'jabrik'):
        for i in (-1, 0, 1):
            box('jambul', (.19,.23,.16), (i*.2,.03,1.57), bahan, .05)


def warga(data, i):
    start()
    kulit = mat('kulit', 'EFC39E')
    baju = mat('baju', PALET[i % len(PALET)])
    gelap = mat('gelap', '4A3631')
    for x in (-.13,.13):
        box('kaki', (.17,.21,.44), (x,0,.22), gelap, .04)
        box('lengan', (.14,.16,.35), (x*2.5,0,.64), baju, .045)
    box('badan', (.52,.33,.48), (0,0,.66), baju, .09)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=.36, location=(0,0,1.15))
    bpy.context.object.data.materials.append(kulit)
    for x in (-.13,.13):
        box('mata', (.062,.035,.07), (x,-.34,1.17), gelap, .012)
    rambut(data['gaya'], baju if data['gaya'] == 'hijab' else gelap)
    export('kar_warga_' + data['id'], 4000)


data = json.loads((ROOT / 'unity/MahasiswaSim3D/Assets/_Game/Data/fitur3.json').read_text(encoding='utf-8-sig'))
for i, orang in enumerate(data['warga']):
    warga(orang, i)
