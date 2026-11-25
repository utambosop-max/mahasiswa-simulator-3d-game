import sys, math
from pathlib import Path
import bpy
sys.path.insert(0, str(Path(__file__).resolve().parent))
from model_common import box, cyl, mat, export, start

def colors():
    start()
    bpy.context.preferences.filepaths.save_version = 0
    return {k: mat(k, v) for k, v in {
        "kayu":"A86B3C", "dark":"3B2A20", "cream":"FFF6E5",
        "biru":"7FB3E0", "hijau":"7CC6A4", "salem":"E98A6B", "emas":"F4C878"}.items()}

c=colors()
box("badan gitar",(.43,.1,.54),(0,0,.55),c["kayu"],.10)
box("leher",(.09,.09,.52),(0,0,1.05),c["dark"],.02)
box("kepala",(.15,.1,.16),(0,0,1.38),c["kayu"],.02)
box("lubang",(.16,.015,.16),(0,-.057,.57),c["dark"],.04)
for x in (-.025,0,.025):box("senar",(.008,.008,.82),(x,-.064,.9),c["cream"],0)
export("prop_gitar",1500)

c=colors()
box("akuarium",(.9,.38,.55),(0,0,.36),c["biru"],.03)
box("alas",(.96,.43,.10),(0,0,.05),c["dark"],.02)
box("atas",(.96,.43,.07),(0,0,.67),c["dark"],.02)
for x in (-.23,.2):
    box("ikan",(.16,.045,.09),(x,-.204,.39),c["salem"],.03)
export("prop_akuarium",1500)

c=colors()
cyl("pot",.16,.27,(0,0,.135),c["kayu"],12)
for x,y,z in ((-.09,0,.38),(.09,0,.39),(0,.05,.48)):
    box("daun",(.15,.12,.23),(x,y,z),c["hijau"],.04)
export("prop_tanamanPot",1500)

c=colors()
box("alat pancing",(.035,.035,2.15),(0,0,1.075),c["kayu"],0)
box("gagang",(.06,.06,.34),(0,0,.17),c["dark"],.02)
box("tali",(.009,.009,1.4),(.12,0,1.35),c["cream"],0)
export("prop_pancingan",1500)

c=colors()
cyl("landasan",1.55,.16,(0,0,.08),c["salem"],16)
cyl("tiang",.11,2.5,(0,0,1.33),c["kayu"],12)
cyl("atap",1.6,.2,(0,0,2.65),c["emas"],16)
for x,y in ((-.8,0),(.8,0),(0,-.8),(0,.8)):
    box("kursi",(.38,.34,.18),(x,y,.55),c["biru"],.04)
    cyl("penyangga",.025,1.75,(x,y,1.55),c["cream"],8)
export("prop_komidi",1500)

c=colors()
box("gerobak", (1.3,.75,.8),(0,0,.72),c["kayu"],.04)
box("atap",(1.5,.9,.12),(0,0,1.65),c["salem"],.03)
for x in (-.55,.55):
    for y in (-.28,.28):box("tiang",(.06,.06,.7),(x,y,1.25),c["cream"],0)
for x in (-.5,.5):
    roda=cyl("roda",.19,.08,(x,0,.19),c["dark"],12)
    roda.rotation_euler.x=math.pi/2
box("panci",(.45,.4,.22),(0,0,1.22),c["biru"],.03)
export("prop_gerobakCilok",1500)
