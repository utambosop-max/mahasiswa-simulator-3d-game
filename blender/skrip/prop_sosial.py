import sys
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import box, cyl, mat, start, export

for tahap in range(1, 4):
    start()
    tanah = mat('tanah', '75503F')
    pot = mat('pot', 'CF9271')
    daun = mat('daun', '679966')
    buah = mat('cabai', 'DA614F' if tahap == 3 else '89AF52')
    cyl('pot', .19, .29, (0,0,.145), pot, 12)
    cyl('tanah', .165, .035, (0,0,.29), tanah, 12)
    tinggi = .18 + tahap * .13
    cyl('batang', .017, tinggi, (0,0,.29 + tinggi/2), daun, 8)
    for i in range(tahap + 1):
        x = (-1 if i % 2 else 1) * .08
        z = .38 + i * .095
        box('daun', (.19,.065,.055), (x,0,z), daun, .017)
        if tahap > 1:
            box('cabai', (.045,.045,.13), (x,-.045,z-.06), buah, .015)
    export('prop_potCabai_' + str(tahap), 1500)

start()
kain = mat('kain', 'FFF7E7')
mata = mat('mata', '514456')
pipi = mat('pipi', 'ECA5A6')
box('selimut', (.66,.58,.85), (0,0,.45), kain, .18)
for x in (-.13,.13):
    box('mata', (.065,.035,.09), (x,-.30,.60), mata, .012)
    box('pipi', (.08,.036,.04), (x*1.5,-.29,.50), pipi, .01)
export('prop_hantu', 1500)
