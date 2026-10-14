// HELIO · punto de entrada: monta la escena, el relato con GSAP y las piezas interactivas.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { crearEscena } from './escena.js';
import { CAPAS, LINEAS } from './datos.js';
import { T, fmt, LANG } from './i18n.js';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);
// GSAP y las piezas de three.js que usa el corte se comparten con helio-corte.js (que se carga
// aparte, tarde). Solo las que ya usa la escena del Sol: compartirlas no añade peso a este script.
const { WebGLRenderer, Scene, OrthographicCamera, Color, ShaderMaterial, LineSegments, EdgesGeometry, LineBasicMaterial,
  Vector2, Vector3, Raycaster, MathUtils, BufferGeometry, BufferAttribute, Mesh, Group } = THREE;
window.HELIO = { gsap, ScrollTrigger, THREE: { WebGLRenderer, Scene, OrthographicCamera, Color, ShaderMaterial, LineSegments,
  EdgesGeometry, LineBasicMaterial, Vector2, Vector3, Raycaster, MathUtils, BufferGeometry, BufferAttribute, Mesh, Group } };

const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const movil = window.matchMedia('(max-width: 47.99em)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

document.documentElement.classList.add('helio-js');
if (reducido) document.documentElement.classList.add('helio-reducido');

// ---------- Modo (vacío / papel) ----------
// La página nace en el vacío: el espacio es oscuro. El botón cambia data-theme en :root
// y no guarda nada entre visitas.
const botonModo = $('#modo');
function pintarModo() {
  const oscuro = document.documentElement.dataset.theme !== 'light';
  botonModo.querySelector('.helio-cabecera__modo-txt').textContent = oscuro ? T.modoPapel : T.modoVacio;
  botonModo.setAttribute('aria-label', oscuro ? T.ariaPapel : T.ariaVacio);
}
botonModo.removeAttribute('aria-pressed');
botonModo.addEventListener('click', () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  pintarModo();
});
pintarModo();

// ---------- Escena 3D ----------
let escena = null;
try {
  escena = crearEscena($('#lienzo'), { reducido, movil });
  window.HELIO.escena = escena;
} catch (err) {
  console.warn('HELIO: sin WebGL, el relato sigue sin la escena 3D.', err);
  document.documentElement.classList.add('helio-sin-3d');
}

// ---------- Cifras que cuentan ----------
if (!reducido) {
  $$('[data-contar]').forEach((el, i) => {
    const fin = parseFloat(el.dataset.contar), dec = +el.dataset.decimales || 0;
    const o = { v: 0 };
    gsap.to(o, { v: fin, duration: 2.2, delay: 0.6 + i * 0.12, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(o.v, dec)) });
  });
}

// ---------- Entrada de la portada ----------
if (!reducido) {
  gsap.from('.helio-portada__titulo', { yPercent: 18, opacity: 0, duration: 1.6, ease: 'expo.out', delay: 0.15 });
  gsap.from('.helio-portada__texto > :not(.helio-portada__titulo)', { y: 24, opacity: 0, duration: 1.1, stagger: 0.09, ease: 'power3.out', delay: 0.45 });
  gsap.from('.helio-cabecera', { y: -20, opacity: 0, duration: 1, ease: 'power2.out', delay: 0.9 });
}

// ---------- El relato: una línea de tiempo maestra, una unidad = una pantalla ----------
const actos = $$('.helio-acto');
const tramos = {}; // id → [inicio, fin] en pantallas de scroll
let cursor = 1; // la portada ocupa la primera pantalla
actos.forEach((a) => {
  const largo = parseFloat(a.dataset.largo) || 2;
  a.style.setProperty('--helio-acto-largo', largo);
  tramos[a.id] = [cursor, cursor + largo - 1];
  cursor += largo;
});
const total = cursor - 1;

if (escena) {
  const E = escena.estado;
  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
  const a = (vars, inicio, dur) => tl.to(E, { ...vars, duration: dur }, inicio);
  const [n0, n1] = tramos.nucleo, [r0, r1] = tramos.radiativa, [c0] = tramos.convectiva;
  const [f0] = tramos.fotosfera, [k0] = tramos.corona, [v0, v1] = tramos.viento, [t0, t1] = tramos.tierra;
  const POS_TIERRA = escena.TIERRA;

  // Guion de cámara: un recurso por capítulo (órbita, alzado, alabeo y dolly zoom los aplica escena.js).
  // 01 · Núcleo: se abre la cuña con un DOLLY ZOOM (vértigo): el objetivo se abre mientras la cámara
  // avanza; el Sol no cambia de tamaño y el fondo se estira. Después, al revés: el núcleo se nos echa encima.
  a({ corte: 1, orientar: 1, camX: 0.55, camY: 0.6, camZ: 2.9, miraX: 0.2, miraY: 0, miraZ: 0, bucles: 0, corona: 0.25, foco: 1, focoR0: 0, focoR1: 0.25, desvio: 0.24, vertigo: 1, mirar: 0.4 }, n0 - 0.65, 1.1);
  a({ camX: 0.3, camY: 0.28, camZ: 1.75, miraX: 0.06, miraY: 0.02, vertigo: 0 }, n0 + 0.45, 0.7);
  a({ atomo: 1, brillo: 0, estrellas: 0.35 }, n0 + 1.0, 0.45);
  tl.to(E, { pp: 1, duration: n1 - n0 - 1.7, ease: 'none' }, n0 + 1.35);
  a({ atomo: 0, brillo: 1, estrellas: 1, camX: 0.7, camY: 0.45, camZ: 2.55, miraX: 0.32, miraY: 0.04, focoR0: 0.25, focoR1: 0.7, alabeo: -0.05, mirar: 1 }, n1 - 0.25, 0.85);
  // 02 · Zona radiativa: CÁMARA EN MANO. Orbita despacio el corte (que se queda quieto: se ve su
  // volumen) y el horizonte se inclina siguiendo al fotón.
  tl.to(E, { paseo: 1, duration: r1 - r0 + 0.3, ease: 'none' }, r0 - 0.2);
  a({ camX: 0.55, camY: 0.32, camZ: 2.25, miraX: 0.36, miraY: 0.08, orbita: -0.5, alzado: 0.12, alabeo: 0.06 }, r0 - 0.2, r1 - r0 + 0.5);
  // 03 · Convectiva: CONTRAPICADO. La cámara baja por debajo del ecuador y mira hacia arriba: la
  // zona convectiva cae sobre nosotros como una ola.
  a({ focoR0: 0.68, focoR1: 1, conveccion: 1, camX: 0.8, camY: 0.55, camZ: 2.6, miraX: 0.42, miraY: 0.22, orbita: 0.2, alzado: -0.42, alabeo: -0.09 }, c0 - 0.6, 0.9);
  // 04 · Fotosfera: VUELO RASANTE. La cámara a un 10 % del radio sobre la superficie, mirando 30°
  // por debajo de la tangente: el limbo del Sol es un horizonte curvo y los gránulos pasan debajo.
  a({ corte: 0, orientar: 0, foco: 0, conveccion: 0, paseo: 0, orbita: 0, alzado: 0, alabeo: -0.12,
      camX: 0, camY: 0.605, camZ: 0.915, miraX: 0, miraY: 1.27, miraZ: -0.42, detalle: 1, desvio: 0.12, bucles: 0.35, corona: 0.3, mirar: 0.6 }, f0 - 0.7, 1.1);
  // 05 · Corona: nos alejamos GIRANDO hasta ver el Sol de perfil contra su corona.
  a({ camX: 0, camY: 0.45, camZ: 5.2, miraX: 0, miraY: 0, miraZ: 0, detalle: 0, bucles: 1, corona: 1, desvio: 0.22, alabeo: 0.04, orbita: 0.6, mirar: 1 }, k0 - 0.7, 1.0);
  a({ orbita: 1.25, alabeo: 0 }, k0 + 0.3, 1.6);
  // 06 · Viento: TRAVELLING. Viajamos con el viento, alejándonos del Sol y mirando atrás.
  a({ camY: 1.3, camZ: 11.5, viento: 1, bucles: 0.7, corona: 0.45, orbita: 0.4 }, v0 - 0.7, 1.0);
  a({ camX: 9.5, camY: 0.7, camZ: 6.5, miraX: 2.5, orbita: 0, alabeo: -0.05 }, v0 + 0.4, v1 - v0 + 0.2);
  // 07 · La Tierra: llegamos de frente y, al final, CONTRAPLANO: rodeamos la Tierra 115° hasta verla
  // a contraluz, con el Sol (pequeño, a 26 unidades) detrás.
  a({ tierra: 1, camX: POS_TIERRA.x - 3.4, camY: 1.1, camZ: 6.8, miraX: POS_TIERRA.x - 0.9, miraY: 0, miraZ: 0, flujo: 1, escudo: 1, viento: 0.4, desvio: 0.2, alabeo: 0 }, t0 - 0.8, 1.3);
  a({ aurora: 1 }, t0 + 0.9, 0.9);
  a({ camX: POS_TIERRA.x - 3.8, camY: 0.9, camZ: 5.2, miraX: POS_TIERRA.x, alzado: 0.03 }, t0 + 0.9, 0.5);
  a({ orbita: 2.08, alabeo: 0.07 }, t0 + 1.2, t1 - t0 - 1.3); // termina antes de que se apague el lienzo
  a({ lienzo: 0 }, t1 + 0.55, 0.45);
  tl.to(E, { cielo: 1, duration: total, ease: 'none' }, 0); // el cielo gira despacio: parallax del fondo
  tl.set({}, {}, total);

  ScrollTrigger.create({
    trigger: '#relato', start: 'top top', end: 'bottom bottom',
    scrub: reducido ? true : 1.1, animation: tl,
  });
  // El texto sigue a la animación (que llega con inercia), no a la barra de scroll.
  tl.eventCallback('onUpdate', () => alAvanzar(tl.time()));
  escena.setInteractivo(true);

  // Una eyección automática al cruzar el acto del viento (una vez por pasada).
  let lanzada = false;
  // Elementos que el scroll actualiza, buscados una vez; y solo se escribe lo que cambia.
  const pasos = $$('.helio-paso'), llegadas = $$('.helio-llegada').map((li) => [li, parseFloat(li.dataset.umbral)]);
  const elAnos = $('#anos'), barra = $('#barra-paseo'), elOnda = $('#onda');
  const previo = { anos: -1, barra: -1, onda: -1, paso: -2, llegadas: -1 };
  function alAvanzar(t) {
    const local = (id) => { const [i, f] = tramos[id]; return gsap.utils.clamp(0, 1, (t - i) / Math.max(f - i, 0.001)); };
    // Pasos de la cadena pp.
    const paso = E.atomo > 0.3 ? Math.min(2, Math.floor(E.pp * 3 - 1e-6)) + (E.pp > 0.999 ? 10 : 0) : -1;
    if (paso !== previo.paso) {
      previo.paso = paso;
      pasos.forEach((li, i) => {
        li.classList.toggle('is-activo', paso >= 0 && paso < 10 && i === paso);
        li.classList.toggle('is-hecho', (paso >= 0 && i < paso % 10) || paso >= 10);
      });
    }
    // Camino del fotón.
    const anos = Math.round(E.paseo * 170000 / 37) * 37; // el último dígito no se mueve en cada píxel
    if (anos !== previo.anos) { previo.anos = anos; elAnos.textContent = fmt(Math.min(anos, 170000)); }
    const pc = Math.round(E.paseo * 100);
    if (pc !== previo.barra) { previo.barra = pc; barra.value = pc; barra.textContent = `${pc} %`; }
    const onda = E.paseo < 0.4 ? 0 : E.paseo < 0.8 ? 1 : E.paseo < 0.97 ? 2 : 3;
    if (onda !== previo.onda) { previo.onda = onda; elOnda.textContent = T.onda[onda]; }
    // Llegadas a la Tierra.
    const pt = local('tierra');
    const n = llegadas.filter(([, u]) => pt >= u).length;
    if (n !== previo.llegadas) { previo.llegadas = n; llegadas.forEach(([li], i) => li.classList.toggle('is-llegado', i < n)); }
    // Eyección automática.
    if (t > v0 + 0.4 && t < v1 + 0.5 && !lanzada) { escena.eyectar(); lanzada = true; }
    if (t < v0) lanzada = false;
    // La interacción con el Sol solo tiene sentido cuando el Sol está a la vista.
    const inter = E.atomo < 0.5 && E.tierra < 0.5;
    if (inter !== previo.inter) { previo.inter = inter; escena.setInteractivo(inter); }
  }
  alAvanzar(0);

  $('#lanzar').addEventListener('click', () => escena.eyectar());

  // Etiquetas del mundo atómico: HTML colocado con la proyección de cada partícula.
  const etiquetas = Object.fromEntries($$('[data-etq]').map((el) => [el.dataset.etq, el]));
  const capaEtiquetas = $('#etiquetas');
  escena.alEvento((ev) => {
    if (ev.tipo === 'fotograma') {
      const vis = E.atomo;
      capaEtiquetas.style.opacity = vis;
      if (vis < 0.01) return;
      const activos = escena.atomo.etiquetas;
      for (const [id, el] of Object.entries(etiquetas)) {
        const p = activos[id];
        if (!p) { el.classList.remove('is-visible'); continue; }
        const s = ev.proyectar(p, true);
        el.classList.add('is-visible');
        el.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`;
      }
    } else if (ev.tipo === 'toque') {
      pintarHud(ev.punto);
    }
  });
} else {
  $('#lanzar').hidden = true;
}

// ---------- HUD de la portada: dónde apunta el cursor ----------
const hud = Object.fromEntries($$('[data-hud]').map((el) => [el.dataset.hud, el]));
let ultimoHud = 0;
function pintarHud(p) {
  const ahora = performance.now();
  if (ahora - ultimoHud < 80) return;
  ultimoHud = ahora;
  $('#hud').classList.toggle('is-activo', !!p);
  if (!p) return;
  const lat = Math.asin(p.y) * 180 / Math.PI, lon = Math.atan2(p.x, p.z) * 180 / Math.PI;
  hud.lat.textContent = `${fmt(Math.abs(lat), 1)}° ${lat >= 0 ? T.norte : T.sur}`;
  hud.lon.textContent = `${fmt(Math.abs(lon), 1)}° ${lon >= 0 ? T.este : T.oeste}`;
  // Cerca de las manchas de la escena, la temperatura baja; en el resto, la efectiva.
  const manchas = [[0.55, 0.28, 0.78], [-0.4, -0.3, 0.86]].map((m) => { const l = Math.hypot(...m); return m.map((c) => c / l); });
  const d = Math.min(...manchas.map((m) => Math.hypot(p.x - m[0], p.y - m[1], p.z - m[2])));
  const umbra = d < 0.06, penumbra = d < 0.13;
  hud.t.textContent = `≈${fmt(umbra ? 3800 : penumbra ? 5000 : 5772)} K`;
  hud.region.textContent = umbra ? T.umbra : penumbra ? T.penumbra : T.fotosfera;
}

// ---------- Índice: el capítulo en curso ----------
const enlaces = $$('#indice a');
const secciones = enlaces.map((a) => $(a.getAttribute('href')));
secciones.forEach((sec, i) => {
  ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: (st) => { if (st.isActive) enlaces.forEach((a, j) => (j === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'))); },
  });
});

// ---------- Tabla de capas ----------
$('#tabla-capas').innerHTML = CAPAS.map((c) => `
  <tr>
    <th class="atom-table__td" scope="row">${c.nombre}</th>
    <td class="atom-table__td">${c.radio}<br><span class="helio-tabla__sub">${c.km}</span></td>
    <td class="atom-table__td">${c.temperatura}</td>
    <td class="atom-table__td">${c.densidad}</td>
    <td class="atom-table__td">${c.transporte}</td>
  </tr>`).join('');

// ---------- Parallax ----------
// Cada [data-parallax] se desplaza una fracción de la altura de la pantalla mientras su sección
// cruza la vista: positivo, va por detrás (más lento que el scroll); negativo, por delante.
if (!reducido) {
  // En móvil solo la portada: en columna única, desplazar titulares los montaría sobre su rótulo.
  const ancho = window.matchMedia('(min-width: 64em)').matches;
  $$('[data-parallax]').filter((el) => ancho || el.closest('#portada')).forEach((el) => {
    const v = parseFloat(el.dataset.parallax) || 0;
    const seccion = el.closest('section, footer') || el;
    const portada = seccion.id === 'portada';
    // Arranca en 0 (en reposo nada se monta) cuando la sección toca el borde superior. En la portada
    // las capas se quedan atrás (bajan); en el resto se adelantan (suben) y se separan entre sí.
    gsap.fromTo(el, { y: 0 }, {
      y: () => (portada ? 1 : -1) * Math.abs(v) * innerHeight * (portada ? 0.8 : 0.5),
      ease: 'none',
      scrollTrigger: { trigger: seccion, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
    });
  });
  // La retícula de puntos bajo el corte va a otra velocidad que las piezas: profundidad.
  gsap.to('.helio-corte__figura', {
    backgroundPositionY: '+=160px', ease: 'none',
    scrollTrigger: { trigger: '#corte', start: 'top bottom', end: 'bottom top', scrub: true },
  });
  // Filas de la tabla: entran escalonadas.
  gsap.from('#tabla-capas tr', {
    y: 18, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'power3.out',
    scrollTrigger: { trigger: '.helio-anatomia__tabla', start: 'top 80%' },
  });
}

// ---------- Paneles del relato: entran escalonados ----------
if (!reducido) {
  actos.forEach((acto) => {
    const piezas = $$('.helio-acto__panel > *', acto);
    gsap.from(piezas, {
      y: 28, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out',
      scrollTrigger: { trigger: acto, start: 'top 70%', toggleActions: 'play none none reverse' },
    });
  });
}

// ---------- Espectro con líneas de Fraunhofer ----------
const NM0 = 380, NM1 = 700;
dibujarEspectro();
window.addEventListener('resize', dibujarEspectro);
function dibujarEspectro() {
  const c = $('#espectro');
  const w = c.clientWidth, h = c.clientHeight;
  if (!w) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  c.width = w * dpr; c.height = h * dpr;
  const g = c.getContext('2d');
  for (let x = 0; x < c.width; x++) {
    const nm = NM0 + (x / c.width) * (NM1 - NM0);
    const [r, gg, b] = longitudDeOndaARGB(nm);
    g.fillStyle = `rgb(${r},${gg},${b})`;
    g.fillRect(x, 0, 1, c.height);
  }
  // Líneas de absorción: oscuras, con su anchura relativa.
  LINEAS.forEach((l) => {
    const x = ((l.nm - NM0) / (NM1 - NM0)) * c.width;
    g.fillStyle = 'rgba(0,0,0,0.88)';
    const ancho = (l.letra === 'H' || l.letra === 'K' || l.letra === 'C' ? 3 : 2) * dpr;
    g.fillRect(x - ancho / 2, 0, ancho, c.height);
  });
}
const listaLineas = $('#lineas');
const pie = $('#espectro-pie');
const pieOriginal = pie.innerHTML;
LINEAS.forEach((l) => {
  const li = document.createElement('li');
  li.className = 'helio-espectro__item';
  li.style.setProperty('--helio-x', ((l.nm - NM0) / (NM1 - NM0)).toFixed(4));
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'helio-espectro__linea';
  b.textContent = l.letra;
  b.setAttribute('aria-label', T.linea(l, fmt(l.nm, 2)));
  const mostrar = () => { pie.innerHTML = `<strong>${l.letra} · ${fmt(l.nm, 2)} nm</strong> — ${l.elemento}`; };
  b.addEventListener('pointerenter', mostrar);
  b.addEventListener('focus', mostrar);
  b.addEventListener('pointerleave', () => (pie.innerHTML = pieOriginal));
  b.addEventListener('blur', () => (pie.innerHTML = pieOriginal));
  li.appendChild(b);
  listaLineas.appendChild(li);
});

// Conversión aproximada longitud de onda → RGB (Dan Bruton), con caída en los extremos.
function longitudDeOndaARGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
  const f = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 680 ? 0.3 + 0.7 * (700 - nm) / 20 + 0.0 : 1;
  return [r, g, b].map((v) => Math.round(255 * Math.pow(v * Math.max(f, 0.3), 0.8)));
}

// ---------- Anatomía: el corte isométrico ----------
// El corte (su modelo de Blender, el cargador glTF y su visor) no hace falta hasta la sección 08:
// se pide en un script aparte cuando la anatomía está a pantalla y media.
function respaldoCorte() {
  const img = $('.helio-corte__respaldo');
  $('#corte').classList.add('is-sin-3d');
  if (img && !img.src) img.src = img.dataset.src;
}
function cargarCorte() {
  const s = document.createElement('script');
  s.src = 'helio-corte.js';
  s.async = true;
  s.onload = () => {
    window.HELIO.iniciarCorte({ capas: CAPAS, reducido, alElegir: pintarFicha, textos: T, alFallar: respaldoCorte });
  };
  s.onerror = respaldoCorte;
  document.head.appendChild(s);
}
// Se descarga en el primer momento libre tras la carga (la red no compite con lo importante) y se
// monta por partes; si el lector llega antes a la anatomía, se pide en ese momento.
let pedido = false;
const pedirCorte = () => { if (!pedido) { pedido = true; cargarCorte(); } };
window.addEventListener('load', () => (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(pedirCorte, { timeout: 4000 }));
if ('IntersectionObserver' in window) {
  const vigia = new IntersectionObserver((entradas) => {
    if (entradas.some((e) => e.isIntersecting)) { vigia.disconnect(); pedirCorte(); }
  }, { rootMargin: '150% 0px' });
  vigia.observe($('#anatomia'));
}
function pintarFicha(c, ficha) {
  ficha.innerHTML = `
    <p class="helio-ficha__n">${c.n} · ${c.radio}</p>
    <h3 class="helio-ficha__titulo">${c.nombre}</h3>
    <p class="helio-ficha__texto">${c.texto}</p>
    <dl class="helio-datos helio-ficha__datos">
      <div><dt>${T.ficha.extension}</dt><dd>${c.km}</dd></div>
      <div><dt>${T.ficha.temperatura}</dt><dd>${c.temperatura}</dd></div>
      <div><dt>${T.ficha.densidad}</dt><dd>${c.densidad}</dd></div>
      <div><dt>${T.ficha.transporte}</dt><dd>${c.transporte}</dd></div>
    </dl>
    <p class="helio-ficha__dato">${c.dato}</p>`;
  if (!reducido) gsap.from(ficha.children, { y: 12, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'power3.out' });
}

// Las posiciones del scroll se recalculan una sola vez, cuando las fuentes ya están: así ningún
// tramo salta a mitad de lectura.
(document.fonts?.ready || Promise.resolve()).then(() => ScrollTrigger.refresh());
