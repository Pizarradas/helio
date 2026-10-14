"""crear_corte.py — Modela en Blender el corte del Sol de HELIO para la sección isométrica.

El Sol como un disco estratificado: un núcleo central y seis anillos concéntricos, escalonados
(cada capa, más baja que la de dentro, para que desde arriba se lean todos los anillos). Cada
anillo se parte en dos MITADES ESPEJO por el plano vertical que contiene la línea de visión
isométrica (x = y en el mundo iso). Así, en pantalla, cada mitad se separa en HORIZONTAL: una
a la izquierda y su gemela a la derecha, y el núcleo se queda en el centro.

Piezas: `nucleo` (entero) y `<capa>-izq` / `<capa>-der`. Los detalles físicos son hijos de su
mitad: núcleos de helio-4 sobre el núcleo, gránulos en la fotosfera, espículas en la
cromosfera y bucles coronales en la corona.

Salidas:
  1) <salida>.glb            el corte montado, para el visor isométrico de three.js de la web
  2) <salida>-despiezado.blend  el mismo corte con las mitades separadas, para exportar el SVG
     estático con iso_export_svg.py (respaldo sin WebGL y verificación con iso-check)

Uso:  python3 crear_corte.py SALIDA_SIN_EXTENSION      (pip install bpy, Blender 5.x)
"""
import math
import os
import random
import sys

import bpy  # antes que bmesh: con el bpy de pip, bmesh se registra al importar bpy
import bmesh
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
SALIDA = os.path.abspath(ARGS[0] if ARGS else "corte")
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
escena = bpy.context.scene

# Ejes: mundo iso (x abajo-derecha, y abajo-izquierda, z arriba) → Blender X = x, Y = −y, Z = z.
# En el plano iso, v = (1, −1)/√2 es la horizontal de la pantalla y u = (1, 1)/√2, la profundidad.
R2 = math.sqrt(0.5)


def a_blender(s, t, z):
    """(s a lo largo de la horizontal de pantalla, t en profundidad, z) → coordenadas de Blender."""
    x = (s + t) * R2
    y = (-s + t) * R2
    return Vector((x, -y, z))


# Capas: nombre, radio interior, radio exterior, alto, color base sRGB (rampa de temperatura).
CAPAS = [
    ("nucleo", 0.0, 1.0, 1.7, "#f7dc8a"),
    ("radiativa", 1.0, 2.1, 1.42, "#f0a63c"),
    ("tacoclina", 2.1, 2.3, 1.24, "#8b63f0"),
    ("convectiva", 2.3, 3.2, 1.06, "#e2632c"),
    ("fotosfera", 3.2, 3.55, 0.86, "#d9472a"),
    ("cromosfera", 3.55, 3.9, 0.68, "#d93a6a"),
    ("corona", 3.9, 4.6, 0.46, "#6cc6e8"),
]
DETALLES = {"proton": "#ff6a52", "neutron": "#c8c6d8", "granulo": "#ffa040", "espicula": "#ff8fb0", "bucle": "#a6ecff"}

MAT = {}
for nombre, hx in [(c[0], c[4]) for c in CAPAS] + list(DETALLES.items()):
    m = bpy.data.materials.new(nombre)
    m["iso_color"] = hx
    m["iso_token"] = nombre
    h = hx.lstrip("#")
    lin = [(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in lin]
    m.diffuse_color = (*lin, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*lin, 1)  # el glTF lleva el color base exacto
        bsdf.inputs["Roughness"].default_value = 1.0
    MAT[nombre] = m


def objeto(nombre, bm, material, padre=None):
    malla = bpy.data.meshes.new(nombre)
    bm.normal_update()
    bm.to_mesh(malla)
    bm.free()
    o = bpy.data.objects.new(nombre, malla)
    escena.collection.objects.link(o)
    o.data.materials.append(MAT[material])
    if padre is not None:
        o.parent = padre
    return o


def medio_anillo(nombre, r0, r1, alto, lado, material, segmentos=36):
    """Medio anillo (o medio disco si r0 = 0). lado −1: mitad izquierda en pantalla (s < 0)."""
    bm = bmesh.new()
    phis = [math.pi / 2 + i * math.pi / segmentos for i in range(segmentos + 1)]  # s = r·cos φ ≤ 0
    if lado > 0:
        phis = [p + math.pi for p in phis]
    anillos = []
    for r in (r1, r0) if r0 > 0 else (r1,):
        for z in (0.0, alto):
            anillos.append([bm.verts.new(a_blender(r * math.cos(p), r * math.sin(p), z)) for p in phis])
    if r0 > 0:
        ext_b, ext_a, int_b, int_a = anillos
        for i in range(segmentos):
            bm.faces.new((ext_b[i], ext_b[i + 1], ext_a[i + 1], ext_a[i]))      # pared exterior
            bm.faces.new((int_b[i + 1], int_b[i], int_a[i], int_a[i + 1]))      # pared interior
            bm.faces.new((ext_a[i], ext_a[i + 1], int_a[i + 1], int_a[i]))      # techo
            bm.faces.new((ext_b[i + 1], ext_b[i], int_b[i], int_b[i + 1]))      # base
        for k in (0, segmentos):                                                 # caras del corte
            bm.faces.new((ext_b[k], ext_a[k], int_a[k], int_b[k]))
    else:
        ext_b, ext_a = anillos
        cb, ca = bm.verts.new(a_blender(0, 0, 0)), bm.verts.new(a_blender(0, 0, alto))
        for i in range(segmentos):
            bm.faces.new((ext_b[i], ext_b[i + 1], ext_a[i + 1], ext_a[i]))
            bm.faces.new((ext_a[i], ext_a[i + 1], ca))
            bm.faces.new((ext_b[i + 1], ext_b[i], cb))
        bm.faces.new((ext_b[0], ext_a[0], ca, cb))
        bm.faces.new((cb, ca, ext_a[-1], ext_b[-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objeto(nombre, bm, material)


def cilindro(nombre, centro, z, r, h, material, padre, lados=12):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=lados, radius1=r, radius2=r, depth=h)
    bmesh.ops.translate(bm, vec=centro + Vector((0, 0, z + h / 2)), verts=bm.verts)
    return objeto(nombre, bm, material, padre)


def esfera(nombre, centro, z, r, material, padre):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=r)
    bmesh.ops.translate(bm, vec=centro + Vector((0, 0, z + r)), verts=bm.verts)
    return objeto(nombre, bm, material, padre)


def arco(nombre, pA, pB, z, altura, grosor, material, padre):
    """Bucle coronal: tubo en arco entre dos pies sobre el techo de la corona."""
    bm = bmesh.new()
    seg, lados = 20, 8
    puntos = [pA.lerp(pB, k / seg) + Vector((0, 0, z + math.sin(math.pi * k / seg) * altura)) for k in range(seg + 1)]
    aros = []
    for k, c in enumerate(puntos):
        t = (puntos[min(k + 1, seg)] - puntos[max(k - 1, 0)]).normalized()
        n1 = t.cross(Vector((0, 0, 1))).normalized() if abs(t.z) < 0.99 else Vector((1, 0, 0))
        n2 = t.cross(n1).normalized()
        aros.append([bm.verts.new(c + grosor * (math.cos(2 * math.pi * j / lados) * n1 + math.sin(2 * math.pi * j / lados) * n2)) for j in range(lados)])
    for k in range(seg):
        for j in range(lados):
            bm.faces.new((aros[k][j], aros[k][(j + 1) % lados], aros[k + 1][(j + 1) % lados], aros[k + 1][j]))
    bm.faces.new(aros[0])
    bm.faces.new(list(reversed(aros[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objeto(nombre, bm, material, padre)


# ---------- Piezas ----------
piezas = {}
for nombre, r0, r1, alto, _ in CAPAS:
    if nombre == "nucleo":
        # El núcleo, entero: dos medios discos unidos en un solo objeto.
        izq = medio_anillo("nucleo", 0.0, r1, alto, -1, nombre)
        der = medio_anillo("nucleo-b", 0.0, r1, alto, +1, nombre)
        bpy.ops.object.select_all(action="DESELECT")
        izq.select_set(True); der.select_set(True)
        bpy.context.view_layer.objects.active = izq
        bpy.ops.object.join()
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.remove_doubles(threshold=1e-4); bpy.ops.object.mode_set(mode="OBJECT")
        piezas["nucleo"] = (izq, alto)
        continue
    for lado, suf in ((-1, "izq"), (1, "der")):
        piezas[f"{nombre}-{suf}"] = (medio_anillo(f"{nombre}-{suf}", r0, r1, alto, lado, nombre), alto)


def en_anillo(lado, r, ang):
    """Punto sobre el anillo, en la mitad indicada (ang en 0..π dentro de la mitad)."""
    phi = math.pi / 2 + ang + (math.pi if lado > 0 else 0)
    return a_blender(r * math.cos(phi), r * math.sin(phi), 0)


# Núcleo: tres núcleos de helio-4 y dos protones sueltos.
nucleo, alto = piezas["nucleo"]
rn = 0.13
for k, c in enumerate((a_blender(-0.35, 0.25, 0), a_blender(0.4, 0.2, 0), a_blender(0.0, -0.45, 0))):
    for i, (d, dz, m) in enumerate(((Vector((-rn, 0, 0)), 0, "proton"), (Vector((rn, 0, 0)), 0, "neutron"),
                                    (Vector((0, -rn, 0)), rn * 1.3, "neutron"), (Vector((0, rn, 0)), rn * 1.3, "proton"))):
        esfera(f"he4-{k + 1}-{i + 1}", c + d, alto + dz, rn, m, nucleo)
for i, c in enumerate((a_blender(-0.62, -0.5, 0), a_blender(0.65, -0.48, 0))):
    esfera(f"proton-{i + 1}", c, alto, rn, "proton", nucleo)

for lado, suf in ((-1, "izq"), (1, "der")):
    # Fotosfera: gránulos hexagonales en fila.
    padre, alto = piezas[f"fotosfera-{suf}"]
    for i in range(9):
        cilindro(f"granulo-{suf}-{i + 1}", en_anillo(lado, 3.375, (i + 0.5) * math.pi / 9), alto, 0.14, 0.06 + random.random() * 0.05, "granulo", padre, 6)
    # Cromosfera: espículas.
    padre, alto = piezas[f"cromosfera-{suf}"]
    for i in range(12):
        c = en_anillo(lado, 3.725 + random.uniform(-0.07, 0.07), (i + 0.5) * math.pi / 12)
        cilindro(f"espicula-{suf}-{i + 1}", c, alto, 0.035, 0.18 + random.random() * 0.3, "espicula", padre, 4)
    # Corona: dos bucles por mitad, con los pies sobre el anillo.
    padre, alto = piezas[f"corona-{suf}"]
    for i, (a0, a1, h) in enumerate(((0.35, 0.95, 0.9), (1.7, 2.5, 1.2))):
        arco(f"bucle-{suf}-{i + 1}", en_anillo(lado, 4.25, a0), en_anillo(lado, 4.25, a1), alto, h, 0.045, "bucle", padre)

# ---------- 1) glTF del corte montado ----------
bpy.ops.export_scene.gltf(filepath=SALIDA + ".glb", export_format="GLB", export_yup=True,
                          export_apply=True, export_materials="EXPORT", export_extras=True, export_texcoords=False,
                          export_normals=False)  # la web calcula la normal de cada cara (flat) en el shader

# ---------- 2) Despiezado para el SVG estático ----------
# El mismo despiece final que la web (js/corte.js): cada mitad se encoge en proporción a su
# distancia al centro (radio final = 1,25 × 0,84^orden) y se aparta lo justo para no pisar a la
# de dentro. El núcleo crece a 1,25: es la pieza más grande.
NUCLEO_FINAL, RAZON, HUECO = 1.25, 0.84, 0.32
nucleo_obj = piezas["nucleo"][0]
nucleo_obj.scale = (NUCLEO_FINAL,) * 3
borde = CAPAS[0][2] * NUCLEO_FINAL
for i, (nombre, r0, r1, alto, _) in enumerate(CAPAS[1:], start=1):
    esc = CAPAS[0][2] * NUCLEO_FINAL * RAZON ** i / r1
    d = borde + HUECO
    borde = d + r1 * esc
    for lado, suf in ((-1, "izq"), (1, "der")):
        o = piezas[f"{nombre}-{suf}"][0]
        o.scale = (esc,) * 3            # el origen de cada mitad es el centro del Sol: escala desde ahí
        o.location = a_blender(lado * d, 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=SALIDA + "-despiezado.blend")
print(f"crear_corte: {len(escena.objects)} objetos → {SALIDA}.glb y {SALIDA}-despiezado.blend")
