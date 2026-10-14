// HELIO · el mundo atómico: la cadena protón-protón (rama pp-I) paso a paso.
//   1) p + p → ²H + e⁺ + νₑ      (fuerza débil: un protón se convierte en neutrón)
//   2) ²H + p → ³He + γ
//   3) ³He + ³He → ⁴He + 2p
// `pp` va de 0 a 1 (un tercio por reacción). Las posiciones son una coreografía
// determinista: el mismo `pp` da siempre la misma imagen, que es lo que pide un scroll.
import * as THREE from 'three';
import { ATOMO_VERT, ATOMO_FRAG } from './shaders.js';

const C_PROTON = new THREE.Color(1.0, 0.36, 0.24);
const C_NEUTRON = new THREE.Color(0.55, 0.62, 0.9);
const C_POSITRON = new THREE.Color(0.35, 0.95, 1.0);
const C_NEUTRINO = new THREE.Color(0.85, 1.0, 0.75);
const C_GAMMA = new THREE.Color(1.0, 0.95, 0.55);
const R = 0.22; // radio de un nucleón en la escena

const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const tramo = (s, a, b) => THREE.MathUtils.clamp((s - a) / (b - a), 0, 1);
const suave = (t) => t * t * (3 - 2 * t);

export function crearAtomo() {
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camara.position.set(0, 0.3, 9);
  camara.lookAt(0, 0, 0);
  const raiz = new THREE.Group();
  escena.add(raiz);

  function particula(color, radio) {
    const u = { uColor: { value: color.clone() }, uOpacidad: { value: 1 } };
    const m = new THREE.Mesh(new THREE.SphereGeometry(radio, 32, 20), new THREE.ShaderMaterial({
      vertexShader: ATOMO_VERT, fragmentShader: ATOMO_FRAG, uniforms: u, transparent: true, depthWrite: true,
    }));
    m.userData.u = u;
    raiz.add(m);
    return m;
  }
  // Nucleones: p1, p2 (se vuelve neutrón), p3, y el segundo ³He (q1, q2 protones, qn neutrón).
  const p1 = particula(C_PROTON, R), p2 = particula(C_PROTON, R), p3 = particula(C_PROTON, R);
  const q1 = particula(C_PROTON, R), q2 = particula(C_PROTON, R), qn = particula(C_NEUTRON, R);
  const positron = particula(C_POSITRON, 0.09);
  const neutrino = particula(C_NEUTRINO, 0.05);
  const gamma = particula(C_GAMMA, 0.08);
  const destello = particula(new THREE.Color(1, 0.9, 0.7), 0.6);
  destello.material.blending = THREE.AdditiveBlending;
  destello.material.depthWrite = false;

  // Estela ondulada del fotón gamma.
  const nOnda = 120;
  const gOnda = new THREE.BufferGeometry();
  gOnda.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nOnda * 3), 3));
  const matOnda = new THREE.LineBasicMaterial({ color: C_GAMMA.clone().multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const onda = new THREE.Line(gOnda, matOnda);
  raiz.add(onda);
  // Estela recta del neutrino (casi no interactúa con nada: atraviesa el Sol).
  const gRastro = new THREE.BufferGeometry();
  gRastro.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const matRastro = new THREE.LineBasicMaterial({ color: C_NEUTRINO.clone().multiplyScalar(1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const rastro = new THREE.Line(gRastro, matRastro);
  raiz.add(rastro);

  // Desplazamientos de nucleones dentro de un núcleo (tetraedro compacto).
  const OFF = [v(-0.19, -0.11, 0.1), v(0.19, -0.11, 0.1), v(0, 0.2, 0.08), v(0, 0, -0.22)];

  // Etiquetas (las coloca relato.js en HTML con proyectar()).
  const etiquetas = [];
  function etiqueta(id, obtener) { etiquetas.push({ id, obtener, pos: new THREE.Vector3(), visible: false }); }

  function poner(m, pos, opacidad = 1, color = null) {
    m.position.copy(pos);
    m.userData.u.uOpacidad.value = opacidad;
    m.visible = opacidad > 0.01;
    if (color) m.userData.u.uColor.value.copy(color);
  }

  const estadoEtiquetas = {};
  function actualizar(pp, visible, tiempo, ancho, alto, movil) {
    raiz.visible = visible > 0.001;
    if (!raiz.visible) { etiquetas.forEach((e) => (e.visible = false)); return; }
    camara.setViewOffset(ancho, alto, movil ? 0 : -0.2 * ancho, 0, ancho, alto);
    camara.updateProjectionMatrix();
    raiz.rotation.y = Math.sin(tiempo * 0.25) * 0.18;
    raiz.rotation.x = Math.sin(tiempo * 0.19) * 0.08;
    const vis = visible;
    const vib = (k) => v(Math.sin(tiempo * 7 + k) * 0.015, Math.cos(tiempo * 6 + k * 2) * 0.015, 0); // agitación térmica

    const a = tramo(pp, 0, 1 / 3), b = tramo(pp, 1 / 3, 2 / 3), c = tramo(pp, 2 / 3, 1);
    const fase = pp < 1 / 3 ? 0 : pp < 2 / 3 ? 1 : 2;
    let flash = 0;
    let centroDeut = v(0, 0, 0), centroHe3 = v(0, 0, 0), centroHe4 = v(0, 0, 0);
    Object.keys(estadoEtiquetas).forEach((k) => delete estadoEtiquetas[k]);
    [p1, p2, p3, q1, q2, qn, positron, neutrino, gamma].forEach((m) => (m.visible = false));
    onda.visible = rastro.visible = false;

    if (fase === 0) {
      // 1) Dos protones vencen la repulsión eléctrica por efecto túnel.
      const t = suave(tramo(a, 0, 0.55));
      const choque = a >= 0.55;
      const mueve = suave(tramo(a, 0.78, 1));
      centroDeut = v(0, 0, 0).lerp(v(-1.7, -0.25, 0), mueve);
      poner(p1, choque ? centroDeut.clone().add(v(-0.19, 0, 0)) : v(-3.4, 0.5, 0).lerp(v(-0.2, 0, 0), t).add(vib(1)), vis);
      const conv = suave(tramo(a, 0.55, 0.66));
      poner(p2, choque ? centroDeut.clone().add(v(0.19, 0, 0)) : v(3.4, -0.5, 0).lerp(v(0.2, 0, 0), t).add(vib(2)), vis, C_PROTON.clone().lerp(C_NEUTRON, conv));
      const sale = tramo(a, 0.58, 1);
      if (sale > 0) {
        poner(positron, v(0.2, 0, 0).lerp(v(2.8, 2.1, 0.4), suave(sale)), vis * (1 - tramo(a, 0.9, 1) * 0.6));
        const sn = tramo(a, 0.58, 0.8);
        const pn = v(0.2, 0, 0).lerp(v(-4.2, 3, -1), sn);
        poner(neutrino, pn, vis * (1 - tramo(a, 0.85, 1)));
        rastro.visible = true;
        gRastro.attributes.position.array.set([0.2, 0, 0, pn.x, pn.y, pn.z]);
        gRastro.attributes.position.needsUpdate = true;
        matRastro.opacity = vis * (1 - tramo(a, 0.8, 1)) * 0.9;
        estadoEtiquetas.positron = positron.position;
        estadoEtiquetas.neutrino = neutrino.position;
      }
      flash = (1 - Math.abs(a - 0.58) / 0.06) * (a > 0.52 && a < 0.64 ? 1 : 0);
      if (!choque) { estadoEtiquetas.p1 = p1.position; estadoEtiquetas.p2 = p2.position; } else { estadoEtiquetas.deuterio = centroDeut; }
    } else if (fase === 1) {
      // 2) El deuterio captura otro protón: helio-3 y un fotón gamma.
      const t = suave(tramo(b, 0, 0.55));
      const choque = b >= 0.55;
      const mueve = suave(tramo(b, 0.8, 1));
      centroDeut = v(-1.7, -0.25, 0).lerp(v(-0.2, 0, 0), t);
      centroHe3 = v(0, 0, 0).lerp(v(-1.9, 0.55, 0), mueve);
      if (!choque) {
        poner(p1, centroDeut.clone().add(v(-0.19, 0, 0)).add(vib(1)), vis);
        poner(p2, centroDeut.clone().add(v(0.19, 0, 0)).add(vib(1)), vis, C_NEUTRON);
        poner(p3, v(3.2, 1.3, 0).lerp(v(0.25, 0.05, 0), t).add(vib(3)), vis);
        estadoEtiquetas.deuterio = centroDeut; estadoEtiquetas.p3 = p3.position;
      } else {
        poner(p1, centroHe3.clone().add(OFF[0]), vis);
        poner(p2, centroHe3.clone().add(OFF[1]), vis, C_NEUTRON);
        poner(p3, centroHe3.clone().add(OFF[2]), vis);
        estadoEtiquetas.helio3 = centroHe3;
        const g = tramo(b, 0.58, 0.95);
        if (g > 0) {
          const desde = v(0.1, 0, 0), hasta = v(3.2, -2.3, 0.3);
          const cab = desde.clone().lerp(hasta, g);
          poner(gamma, cab, vis * (1 - tramo(b, 0.9, 1)));
          onda.visible = true;
          const dir = hasta.clone().sub(desde).normalize(), perp = v(-dir.y, dir.x, 0);
          const arr = gOnda.attributes.position.array;
          for (let i = 0; i < nOnda; i++) {
            const k = i / (nOnda - 1) * g;
            const p = desde.clone().lerp(hasta, k).addScaledVector(perp, Math.sin(k * 60 - tiempo * 18) * 0.06);
            arr.set([p.x, p.y, p.z], i * 3);
          }
          gOnda.attributes.position.needsUpdate = true;
          matOnda.opacity = vis * (1 - tramo(b, 0.9, 1));
          estadoEtiquetas.gamma = gamma.position;
        }
      }
      flash = (1 - Math.abs(b - 0.58) / 0.06) * (b > 0.52 && b < 0.64 ? 1 : 0);
    } else {
      // 3) Dos núcleos de helio-3 chocan: helio-4 y dos protones libres.
      const t = suave(tramo(c, 0, 0.5));
      const choque = c >= 0.5;
      const cA = v(-1.9, 0.55, 0).lerp(v(-0.32, 0, 0), t), cB = v(3.6, -0.9, 0).lerp(v(0.32, 0, 0), t);
      if (!choque) {
        poner(p1, cA.clone().add(OFF[0]).add(vib(1)), vis); poner(p2, cA.clone().add(OFF[1]).add(vib(1)), vis, C_NEUTRON); poner(p3, cA.clone().add(OFF[2]).add(vib(1)), vis);
        poner(q1, cB.clone().add(OFF[0]).add(vib(4)), vis); poner(qn, cB.clone().add(OFF[1]).add(vib(4)), vis); poner(q2, cB.clone().add(OFF[2]).add(vib(4)), vis);
        estadoEtiquetas.helio3a = cA; estadoEtiquetas.helio3b = cB;
      } else {
        centroHe4 = v(0, 0, 0);
        const gira = (o) => o.clone().applyAxisAngle(v(0, 1, 0), tiempo * 0.8);
        poner(p1, gira(OFF[0]), vis); poner(p2, gira(OFF[1]), vis, C_NEUTRON); poner(p3, gira(OFF[2]), vis); poner(qn, gira(OFF[3]), vis);
        const s = suave(tramo(c, 0.52, 1));
        poner(q1, v(0.3, 0.1, 0).lerp(v(2.9, 2.0, 0.2), s), vis);
        poner(q2, v(0.3, -0.1, 0).lerp(v(2.6, -2.2, 0.4), s), vis);
        estadoEtiquetas.helio4 = centroHe4; estadoEtiquetas.libre1 = q1.position; estadoEtiquetas.libre2 = q2.position;
      }
      flash = (1 - Math.abs(c - 0.52) / 0.06) * (c > 0.46 && c < 0.58 ? 1 : 0);
    }
    poner(destello, v(0, 0, 0), Math.max(flash, 0) * vis * 0.9);
    destello.scale.setScalar(0.4 + Math.max(flash, 0) * 1.2);
  }

  return { escena, camara, actualizar, etiquetas: estadoEtiquetas };
}
