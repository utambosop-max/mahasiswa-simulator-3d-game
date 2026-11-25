"""Ekspor katalog prop untuk Unity dari salinan Poly Haven 1K.

Jalankan Blender dengan --background --disable-autoexec --python skrip ini.
Setelah --, berikan folder kerja yang berisi siap.json dan sumber/<id>/source.blend.
"""

import json
import re
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Matrix


def nama_file(nama):
    return re.sub(r"[^a-z0-9_]+", "_", nama.lower()).strip("_")


def gambar_input(soket):
    for sambungan in soket.links:
        node = sambungan.from_node
        if node.type == "TEX_IMAGE" and node.image and all(node.image.size):
            return node.image
        for masukan in node.inputs:
            if masukan.is_linked:
                gambar = gambar_input(masukan)
                if gambar is not None:
                    return gambar
    return None


def siapkan_warna(mesh, folder):
    for indeks, material in enumerate(mesh.data.materials):
        if material is None or material.node_tree is None:
            continue
        bsdf = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        nama = f"{indeks:02}_{nama_file(material.name)}"
        material.name = nama
        warna = gambar_input(bsdf.inputs["Base Color"])
        if warna is None:
            continue
        alpha = gambar_input(bsdf.inputs["Alpha"])
        aktif = warna
        if alpha is not None and alpha != warna:
            lebar, tinggi = warna.size
            if tuple(alpha.size) != (lebar, tinggi):
                alpha.scale(lebar, tinggi)
            piksel = np.empty(lebar * tinggi * 4, dtype=np.float32)
            mask = np.empty_like(piksel)
            warna.pixels.foreach_get(piksel)
            alpha.pixels.foreach_get(mask)
            piksel[3::4] = mask[0::4]
            aktif = bpy.data.images.new(nama, width=lebar, height=tinggi, alpha=True)
            aktif.pixels.foreach_set(piksel)
            node = bsdf.inputs["Base Color"].links[0].from_node
            if node.type == "TEX_IMAGE":
                node.image = aktif
        aktif.file_format = "PNG" if alpha is not None else "JPEG"
        ekstensi = "png" if alpha is not None else "jpg"
        akhir = folder / f"{nama}.{ekstensi}"
        aktif.save(filepath=str(akhir))
        aktif.filepath = str(akhir)


def jumlah_segitiga(mesh):
    mesh.calc_loop_triangles()
    return len(mesh.loop_triangles)


def kurangi(objek, sasaran):
    awal = jumlah_segitiga(objek.data)
    if awal <= sasaran:
        return
    modifier = objek.modifiers.new("LOD", "DECIMATE")
    modifier.ratio = sasaran / awal
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = objek
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    sisa = jumlah_segitiga(objek.data)
    if sisa <= sasaran:
        return
    mesh = bmesh.new()
    mesh.from_mesh(objek.data)
    bmesh.ops.triangulate(mesh, faces=list(mesh.faces))
    mesh.faces.ensure_lookup_table()
    # Daun lepas tidak bisa diciutkan tanpa merusak UV, jadi pilih kartu yang tersebar.
    total = len(mesh.faces)
    buang = [face for i, face in enumerate(mesh.faces)
             if ((i + 1) * sasaran) // total == (i * sasaran) // total]
    bmesh.ops.delete(mesh, geom=buang, context="FACES")
    mesh.to_mesh(objek.data)
    mesh.free()


def ekspor(root, nama):
    sumber = root / "sumber" / nama / "source.blend"
    hasil = root / "hasil" / "Model" / nama
    hasil.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(sumber), use_scripts=False)
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    koleksi = bpy.context.scene.collection
    graph = bpy.context.evaluated_depsgraph_get()
    objek = []
    for asal in tuple(bpy.context.scene.objects):
        if asal.type != "MESH" or asal.hide_render or not asal.visible_get():
            continue
        bagian = asal.evaluated_get(graph)
        data = bpy.data.meshes.new_from_object(bagian, preserve_all_data_layers=True, depsgraph=graph)
        if not data.polygons:
            continue
        data.transform(asal.matrix_world)
        salinan = bpy.data.objects.new(asal.name + " Ekspor", data)
        koleksi.objects.link(salinan)
        objek.append(salinan)
    if not objek:
        raise ValueError("Tidak ada mesh yang bisa diekspor")
    bpy.ops.object.select_all(action="DESELECT")
    for item in objek:
        item.select_set(True)
    utama = objek[0]
    bpy.context.view_layer.objects.active = utama
    if len(objek) > 1:
        bpy.ops.object.join()

    pusat_x = (max(v.co.x for v in utama.data.vertices) + min(v.co.x for v in utama.data.vertices)) * .5
    pusat_y = (max(v.co.y for v in utama.data.vertices) + min(v.co.y for v in utama.data.vertices)) * .5
    lantai = min(v.co.z for v in utama.data.vertices)
    utama.data.transform(Matrix.Translation((-pusat_x, -pusat_y, -lantai)))
    utama.name = nama + "_LOD0"
    utama.data.name = utama.name
    siapkan_warna(utama, hasil)
    kurangi(utama, 3200)

    rendah = utama.copy()
    rendah.data = utama.data.copy()
    rendah.name = nama + "_LOD1"
    rendah.data.name = rendah.name
    koleksi.objects.link(rendah)
    rendah.select_set(True)
    kurangi(rendah, max(60, int(jumlah_segitiga(utama.data) * .36)))
    bpy.ops.export_scene.fbx(
        filepath=str(hasil / (nama + ".fbx")),
        object_types={"MESH"},
        use_selection=True,
        bake_anim=False,
        path_mode="RELATIVE",
    )
    return jumlah_segitiga(utama.data), jumlah_segitiga(rendah.data)


def main():
    root = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
    daftar = json.loads((root / "siap.json").read_text(encoding="utf-8"))
    laporan = root / "model.json"
    ekspor_berhasil = json.loads(laporan.read_text(encoding="utf-8")) if laporan.exists() else {}
    for nama in sorted(daftar["model"]):
        ukuran = ekspor_berhasil.get(nama)
        if ukuran and ukuran[0] <= 3200 and ukuran[1] <= max(60, int(ukuran[0] * .36)):
            continue
        try:
            ekspor_berhasil[nama] = ekspor(root, nama)
        except (RuntimeError, ValueError, AttributeError, TypeError) as galat:
            print(f"GALAT {nama}: {galat}", flush=True)
        else:
            print(f"EKSPOR {nama}: {ekspor_berhasil[nama]}", flush=True)
    laporan.write_text(json.dumps(ekspor_berhasil, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
