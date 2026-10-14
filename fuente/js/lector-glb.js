// HELIO · lector mínimo del glTF binario del corte (sustituye a GLTFLoader).
// El corte solo trae nodos con nombre y transformación, mallas de triángulos indexadas con
// posiciones (en float o cuantizadas a 16 bits, KHR_mesh_quantization) y el color de cada
// material en `extras.iso_color`. Leerlo a mano ahorra el cargador completo de three.js y todo
// lo que arrastra (materiales PBR, luces, animación, texturas): el script del corte baja de 148 KB a lo que pesa su modelo.
import * as THREE from 'three';

const TIPOS = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COMPONENTES = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

export function leerGLB(bytes) {
  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (vista.getUint32(0, true) !== 0x46546c67) throw new Error('corte: no es un glTF binario');
  const largoJson = vista.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + largoJson)));
  const inicioBin = 20 + largoJson + 8;
  const bin = bytes.subarray(inicioBin);

  function accesor(i) {
    const a = json.accessors[i];
    const bv = json.bufferViews[a.bufferView];
    const n = COMPONENTES[a.type];
    const Tipo = TIPOS[a.componentType];
    const desde = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const paso = bv.byteStride ? bv.byteStride / Tipo.BYTES_PER_ELEMENT : n;
    // Copia alineada (el binario puede tener stride; three quiere datos compactos)
    const origen = new Tipo(bin.buffer, bin.byteOffset + desde, (a.count - 1) * paso + n);
    const datos = new Tipo(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) datos[k * n + c] = origen[k * paso + c];
    return new THREE.BufferAttribute(datos, n, !!a.normalized);
  }

  const mallas = json.meshes.map((m) => m.primitives.map((p) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', accesor(p.attributes.POSITION));
    if (p.indices !== undefined) g.setIndex(accesor(p.indices));
    const mat = json.materials?.[p.material];
    return { geometria: g, color: mat?.extras?.iso_color || '#888888' };
  }));

  function nodo(i) {
    const n = json.nodes[i];
    const o = new THREE.Group();
    o.name = n.name || '';
    if (n.translation) o.position.fromArray(n.translation);
    if (n.rotation) o.quaternion.fromArray(n.rotation);
    if (n.scale) o.scale.fromArray(n.scale);
    if (n.mesh !== undefined) {
      for (const prim of mallas[n.mesh]) {
        const malla = new THREE.Mesh(prim.geometria);
        malla.userData.isoColor = prim.color;
        o.add(malla);
      }
    }
    (n.children || []).forEach((h) => o.add(nodo(h)));
    return o;
  }
  const escena = new THREE.Group();
  json.scenes[json.scene || 0].nodes.forEach((i) => escena.add(nodo(i)));
  return escena;
}
