// HELIO · el corte isométrico: el Sol en anillos concéntricos que se parten en mitades espejo.
// Modelo: Blender (fuente/blender/crear_corte.py → corte.glb). Visor: three.js con cámara
// ORTOGRÁFICA isométrica real (elevación 35,264°, regla 1 del kit iso-flat) y el sombreado de
// tres tonos del kit (shade(), regla 3): techo claro, lateral izquierdo base, derecho oscuro.
//
// Con el scroll, cada capa se parte y sus mitades se separan en horizontal, una a cada lado.
// Al alejarse del centro pierden el color hasta quedar en líneas (con líneas ocultas
// eliminadas, como un dibujo técnico); el núcleo se queda en el centro, en color.
import * as THREE from 'three';
import { leerGLB } from './lector-glb.js';
import { gsap } from 'gsap';
import { resolveColor } from 'syx-colors';
import { shade } from './kit/iso-tonos.js';
import glb from '../blender/corte.min.glb'; // glTF cuantizado y sin normales (montar.mjs): 455 KB → 70 KB

// Mismas capas y radios que crear_corte.py (radio exterior de cada anillo).
const ORDEN = ['nucleo', 'radiativa', 'tacoclina', 'convectiva', 'fotosfera', 'cromosfera', 'corona'];
const RADIO = { nucleo: 1.0, radiativa: 2.1, tacoclina: 2.3, convectiva: 3.2, fotosfera: 3.55, cromosfera: 3.9, corona: 4.6 };
const ALTO = { nucleo: 1.7, radiativa: 1.42, tacoclina: 1.24, convectiva: 1.06, fotosfera: 0.86, cromosfera: 0.68, corona: 0.46 };
const HUECO = 0.32;
// Al despiezarse, cada mitad se encoge en proporción a su distancia al centro: su radio exterior
// final es el del núcleo crecido (1 × 1,25) por 0,84 elevado a su orden. Así el núcleo, ya solo,
// es la pieza más grande, y cada capa es un 16 % más pequeña que la de dentro.
const NUCLEO_FINAL = 1.25, RAZON = 0.84;
const ESCALA = { nucleo: NUCLEO_FINAL };
ORDEN.slice(1).forEach((id, i) => { ESCALA[id] = (RADIO.nucleo * NUCLEO_FINAL * RAZON ** (i + 1)) / RADIO[id]; });
// Desplazamiento final de cada mitad: la mitad ocupa de 0 a r·escala desde su posición, así que
// basta con dejar atrás el borde exterior de la de dentro, ya encogida, más un hueco.
const DESPLAZA = {};
{ let d = 0, borde = RADIO.nucleo * NUCLEO_FINAL; ORDEN.slice(1).forEach((id) => { d = borde + HUECO; DESPLAZA[id] = d; borde = d + RADIO[id] * ESCALA[id]; }); }
const H = new THREE.Vector3(1, 0, -1).normalize(); // horizontal de pantalla en la vista isométrica

const VERT = /* glsl */ `
varying vec3 vP;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FRAG = /* glsl */ `
uniform vec3 uTop, uIzq, uDer; uniform float uColor;
varying vec3 vP;
void main(){
  // Normal de la cara a partir de las derivadas de la posición: el modelo viaja sin normales
  // (todo es facetado) y la de cada cara sale exacta.
  vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));
  // Techo si la normal sube más de 30° (nz > 0,5), igual que iso_comun.py; si no, lateral
  // derecho (cara x máx del mundo iso, X de three) u izquierdo (y máx, Z de three).
  vec3 c = n.y > .5 ? uTop : (n.x > n.z ? uDer : uIzq);
  gl_FragColor = vec4(c, uColor);
}`;

export function iniciarCorte({ capas, reducido, alElegir, textos, alFallar = () => {} }) {
  const lienzo = document.querySelector('#corte-lienzo');
  const escenario = document.querySelector('#corte');
  const capaEtiquetas = document.querySelector('#corte-etiquetas');
  const ficha = document.querySelector('#ficha');
  const botones = [...document.querySelectorAll('.helio-capa')];
  if (!lienzo) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  } catch (e) {
    alFallar(); // sin WebGL: el SVG despiezado exportado del mismo modelo
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const escena = new THREE.Scene();
  const camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camara.position.set(40, 40, 40); // (1,1,1): isométrica real
  camara.lookAt(0, 0.85, 0);

  // ---------- Color de las líneas: el de SYX, en el modo actual ----------
  const tintaLinea = new THREE.Color();
  function leerTema() {
    try { tintaLinea.set(resolveColor('--semantic-color-text-primary')); } catch { tintaLinea.set(0x888888); }
    piezas.forEach((p) => p.lineas.forEach((l) => l.material.color.copy(tintaLinea)));
    pedir();
  }
  new MutationObserver(leerTema).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- Carga del modelo ----------
  const piezas = []; // { id, capa, lado, grupo, uColor, lineas, materiales }
  const porCapa = {};
  const estado = { p: reducido ? 1 : 0, elegida: 'nucleo', sube: Object.fromEntries(ORDEN.map((c) => [c, 0])) };
  // Se llama al final de iniciarCorte, cuando todo lo que usa ya está declarado.
  // Se monta POR PARTES en los momentos libres del navegador (unas pocas piezas cada vez): las
  // 73 piezas con sus aristas costaban un bloque de trabajo que congelaba la escena del Sol.
  function montarModelo() {
    const nodos = leerGLB(glb).children.slice();
    const libre = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 16));
    const tanda = (plazo) => {
      while (nodos.length && plazo.timeRemaining() > 3) montarPieza(nodos.shift());
      if (nodos.length) libre(tanda, { timeout: 500 });
      else terminar();
    };
    libre(tanda, { timeout: 500 });
  }
  function terminar() {
    leerTema();
    crearEtiquetas();
    colocar();
    elegir(estado.elegida, false);
    // Compila los shaders del corte ya, fuera de pantalla, para que su primer fotograma no espere.
    if (renderer.extensions.has('KHR_parallel_shader_compile')) renderer.compileAsync(escena, camara).then(pedir, pedir);
    else { renderer.compile(escena, camara); pedir(); }
  }
  function montarPieza(nodo) {
    {
      const [capa, lado] = nodo.name.split('-');
      // Pivote propio en el centro del Sol: el nodo conserva su transformación (la de la
      // cuantización) y el despiece mueve y escala el pivote.
      const pivote = new THREE.Group();
      pivote.add(nodo);
      const pieza = { id: nodo.name, capa, lado: lado === 'izq' ? -1 : lado === 'der' ? 1 : 0, grupo: pivote, uColor: { value: 1 }, lineas: [], materiales: [] };
      nodo.traverse((o) => {
        if (!o.isMesh) return;
        const base = o.userData.isoColor;
        const t = shade(base);
        const m = new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG, transparent: true,
          polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
          uniforms: { uTop: { value: new THREE.Color(t.top) }, uIzq: { value: new THREE.Color(t.left) }, uDer: { value: new THREE.Color(t.right) }, uColor: pieza.uColor },
        });
        o.material = m;
        pieza.materiales.push(m);
        const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), new THREE.LineBasicMaterial({ transparent: true, opacity: 0 }));
        l.raycast = () => {};
        o.add(l);
        pieza.lineas.push(l);
        o.userData.pieza = pieza;
      });
      piezas.push(pieza);
      (porCapa[capa] ||= []).push(pieza);
      escena.add(pivote);
    }
  }

  // ---------- Etiquetas: número sobre cada mitad, nombre en la de la derecha ----------
  const etiquetas = [];
  function crearEtiquetas() {
    capas.forEach((c) => {
      for (const lado of c.id === 'nucleo' ? [0] : [-1, 1]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'helio-corte__etiqueta' + (lado < 0 ? ' helio-corte__etiqueta--espejo' : '');
        b.dataset.capa = c.id;
        // Solo el número sobre cada mitad (los nombres se pisarían); el nombre aparece en la elegida.
        b.innerHTML = `<span class="helio-corte__n">${c.n}</span><span class="helio-corte__nombre">${c.nombre}</span>`;
        b.setAttribute('aria-label', textos.verFicha(c.nombre));
        if (lado < 0) b.tabIndex = -1; // la gemela de la izquierda repite la de la derecha
        b.addEventListener('click', () => elegir(c.id));
        capaEtiquetas.appendChild(b);
        etiquetas.push({ el: b, capa: c.id, lado });
      }
    });
  }

  // ---------- Disposición según el progreso ----------
  const v = new THREE.Vector3();
  function ancho() { return lienzo.clientWidth || 1; }
  function alto() { return lienzo.clientHeight || 1; }
  function colocar() {
    const p = estado.p;
    let extremo = 0;
    piezas.forEach((pz) => {
      const k = ORDEN.indexOf(pz.capa);
      const inicio = (k - 1) * 0.055;
      const t = pz.lado === 0 ? 0 : gsap.parseEase('power2.inOut')(THREE.MathUtils.clamp((p - inicio) / 0.62, 0, 1));
      const d = (DESPLAZA[pz.capa] || 0) * t;
      // La escala va un poco por detrás del desplazamiento: primero se aparta, después se encoge,
      // así una mitad nunca atraviesa a la de dentro mientras aún son concéntricas.
      const te = pz.lado === 0 ? THREE.MathUtils.smoothstep(p, 0.55, 1) : THREE.MathUtils.smoothstep(t, 0.3, 1);
      const sc = THREE.MathUtils.lerp(1, ESCALA[pz.capa], te);
      pz.escala = sc;
      pz.grupo.scale.setScalar(sc);
      pz.grupo.position.copy(H).multiplyScalar(d * pz.lado);
      pz.grupo.position.y = estado.sube[pz.capa];
      // Pierde el color con la distancia al centro (las de fuera antes que las de dentro) y, al
      // final del tramo, todas quedan en líneas: solo el núcleo conserva el suyo.
      const dMax = DESPLAZA.corona;
      const lejos = pz.lado === 0 ? 0 : Math.max(THREE.MathUtils.smoothstep(d, 0, dMax * 0.7), THREE.MathUtils.smoothstep(p, 0.78, 0.98));
      const elegida = estado.elegida === pz.capa ? 1 : 0;
      const color = Math.max(1 - lejos, elegida);
      pz.uColor.value = color;
      pz.materiales.forEach((m) => { m.colorWrite = color > 0.01; });
      pz.lineas.forEach((l) => { l.material.opacity = 0.18 + 0.82 * (1 - color); });
      extremo = Math.max(extremo, d + RADIO[pz.capa] * sc);
    });
    // Encuadre: el ancho visible sigue al despiece, con aire a los lados.
    // El alto lo marca la pieza más honda (su radio, en escorzo isométrico: × sen 35,26° ≈ 0,58)
    // más la altura del núcleo y su etiqueta. Al final el núcleo es la pieza mayor y llena el plano.
    const aspecto = ancho() / alto();
    const hondo = piezas.reduce((m, pz) => Math.max(m, RADIO[pz.capa] * (pz.escala || 1)), RADIO.nucleo);
    const semiAncho = extremo * 1.06 + 0.5;
    const semiAlto = Math.max(semiAncho / aspecto, hondo * 0.58 + 2.0);
    const semiAnchoReal = semiAlto * aspecto;
    camara.left = -semiAnchoReal; camara.right = semiAnchoReal; camara.top = semiAlto; camara.bottom = -semiAlto;
    camara.updateProjectionMatrix();
    // Etiquetas encima de cada pieza.
    const mostrar = THREE.MathUtils.smoothstep(p, 0.35, 0.6);
    etiquetas.forEach((e) => {
      const pz = porCapa[e.capa]?.find((x) => x.lado === e.lado);
      if (!pz) return;
      const sc = pz.escala || 1;
      // Encima de la pieza: a media anchura de la mitad y por encima de su techo (y de los bucles).
      v.copy(pz.grupo.position).addScaledVector(H, e.lado * RADIO[e.capa] * sc * 0.5)
        .add(new THREE.Vector3(0, (ALTO[e.capa] + (e.capa === 'corona' ? 1.3 : 0.35)) * sc + 0.45, 0));
      v.project(camara);
      e.el.style.transform = `translate(${((v.x * 0.5 + 0.5) * ancho()).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * alto()).toFixed(1)}px)`;
      e.el.style.opacity = e.capa === 'nucleo' ? 1 : mostrar;
      e.el.style.pointerEvents = e.capa === 'nucleo' || mostrar > 0.5 ? 'auto' : 'none';
      e.el.classList.toggle('is-elegida', e.capa === estado.elegida);
    });
    pedir();
  }

  // ---------- Elegir una capa: recupera su color y se eleva ----------
  function elegir(id, animar = true) {
    const antes = estado.elegida;
    estado.elegida = id;
    const destino = Object.fromEntries(ORDEN.map((c) => [c, c === id && c !== 'nucleo' ? 0.55 : 0]));
    if (animar && !reducido) gsap.to(estado.sube, { ...destino, duration: 0.8, ease: 'power3.out', onUpdate: colocar, overwrite: true });
    else { Object.assign(estado.sube, destino); colocar(); }
    botones.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.capa === id)));
    if (antes !== id || !ficha.childElementCount) alElegir(capas.find((c) => c.id === id), ficha);
  }
  botones.forEach((b) => b.addEventListener('click', () => elegir(b.dataset.capa)));

  // ---------- Puntero sobre las piezas ----------
  const rc = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function piezaBajo(e) {
    const r = lienzo.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rc.setFromCamera(ndc, camara);
    const h = rc.intersectObjects(escena.children, true).find((i) => i.object.userData.pieza);
    return h ? h.object.userData.pieza : null;
  }
  lienzo.addEventListener('pointermove', (e) => { lienzo.style.cursor = piezaBajo(e) ? 'pointer' : ''; });
  lienzo.addEventListener('click', (e) => { const pz = piezaBajo(e); if (pz) elegir(pz.capa); });

  // ---------- Scroll: el despiece ----------
  if (!reducido) {
    gsap.to(estado, {
      p: 1, ease: 'none', onUpdate: colocar,
      // Escritorio: tramo pegado de 2,6 pantallas. Móvil (sin escena pegada): mientras la figura cruza la pantalla.
      scrollTrigger: window.matchMedia('(min-width: 64em)').matches
        ? { trigger: escenario, start: 'top top+=56', end: 'bottom bottom', scrub: 0.9 }
        : { trigger: lienzo, start: 'top 85%', end: 'bottom 20%', scrub: 0.9 },
    });
  }

  // ---------- Pintado bajo demanda ----------
  let pendiente = false;
  function pedir() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; renderer.render(escena, camara); });
  }
  function redimensionar() {
    renderer.setSize(ancho(), alto(), false);
    colocar();
  }
  montarModelo();
  new ResizeObserver(redimensionar).observe(lienzo);
  redimensionar();
}
