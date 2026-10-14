// HELIO · la escena 3D: el Sol, su interior, el mundo atómico, el viento y la Tierra.
// Un solo renderizador. El relato (relato.js) escribe en `estado` con GSAP y esta escena
// lo lee en cada fotograma; la escena nunca sabe en qué sección está la página.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as S from './shaders.js';
import { crearAtomo } from './atomo.js';

export const ESTADO_INICIAL = {
  camX: 0, camY: 0.35, camZ: 5.1, miraX: 0, miraY: 0, miraZ: 0,
  desvio: 0.2,        // fracción del ancho que se desplaza el Sol a la derecha (deja sitio al texto)
  corte: 0,           // 0 cerrado · 1 cuña de 90° abierta
  orientar: 0,        // 0 giro libre · 1 la cuña mira a la cámara
  focoR0: 0, focoR1: 1, foco: 0,
  brillo: 1,          // brillo del Sol (se apaga al entrar en el mundo atómico)
  detalle: 0,         // granulación más fina al acercarse a la fotosfera
  corona: 0.55, bucles: 0.35, viento: 0, estrellas: 1,
  atomo: 0, pp: 0,    // visibilidad y progreso de la cadena protón-protón
  paseo: 0,           // camino aleatorio del fotón (0..1)
  conveccion: 0,      // burbujas que suben por la zona convectiva
  tierra: 0, flujo: 0, aurora: 0, escudo: 0,
  lienzo: 1,          // opacidad del lienzo (se apaga en la sección isométrica)
  cielo: 0,           // giro lento del campo de estrellas con el scroll (parallax del fondo)
  // Lenguaje de cámara (los anima el relato). La posición cam* se toma relativa a mira* y después:
  orbita: 0,          // gira la cámara alrededor del punto de mira (rad, eje vertical)
  alzado: 0,          // la sube (+) o la baja (−) sobre ese punto (rad): picado y contrapicado
  alabeo: 0,          // inclina el horizonte (rad): plano holandés
  vertigo: 0,         // dolly zoom 0..1: el objetivo se abre y la cámara se acerca para compensar
  mirar: 1,           // cuánto sigue la cámara al cursor (0..1)
};

export function crearEscena(canvas, { reducido = false, movil = false } = {}) {
  const estado = { ...ESTADO_INICIAL };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !movil, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, movil ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(35, 1, 0.05, 400);
  const px = { value: dpr };

  // ---------- Estrellas ----------
  const nE = movil ? 1200 : 2600;
  const ePos = new Float32Array(nE * 3), eTam = new Float32Array(nE), eFase = new Float32Array(nE);
  for (let i = 0; i < nE; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(120 + Math.random() * 120);
    ePos.set([v.x, v.y, v.z], i * 3);
    eTam[i] = Math.random() < 0.03 ? 2.6 : 0.6 + Math.random() * 1.2;
    eFase[i] = Math.random() * 6.28;
  }
  const gE = new THREE.BufferGeometry();
  gE.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  gE.setAttribute('aTam', new THREE.BufferAttribute(eTam, 1));
  gE.setAttribute('aFase', new THREE.BufferAttribute(eFase, 1));
  const uEstrellas = { uTime: { value: 0 }, uPx: px, uOpacidad: { value: 1 } };
  const cielo = new THREE.Points(gE, new THREE.ShaderMaterial({
    vertexShader: S.ESTRELLAS_VERT, fragmentShader: S.ESTRELLAS_FRAG, uniforms: uEstrellas,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  escena.add(cielo);

  // ---------- El Sol ----------
  const sol = new THREE.Group();
  escena.add(sol);
  const manchas = [
    new THREE.Vector3(0.55, 0.28, 0.78), new THREE.Vector3(0.62, 0.22, 0.75),
    new THREE.Vector3(-0.4, -0.3, 0.86), new THREE.Vector3(0.1, 0.35, -0.93),
  ];
  const uSol = {
    uTime: { value: 0 }, uCorte: { value: 0 }, uBrillo: { value: 1 }, uExcita: { value: 0 },
    uDetalle: { value: 0 }, uToque: { value: new THREE.Vector3(0, 0, 1) }, uManchas: { value: manchas },
  };
  const fotosfera = new THREE.Mesh(new THREE.SphereGeometry(1, movil ? 96 : 160, movil ? 64 : 120),
    new THREE.ShaderMaterial({ vertexShader: S.SOL_VERT, fragmentShader: S.SOL_FRAG, uniforms: uSol }));
  sol.add(fotosfera);

  // Las dos caras del corte: medios discos que muestran las capas por dentro.
  const uCorte = { uTime: { value: 0 }, uBrillo: { value: 1 }, uOpacidad: { value: 1 }, uFoco: { value: new THREE.Vector4(0, 1, 0, 0) } };
  const matCorte = new THREE.ShaderMaterial({ vertexShader: S.CORTE_VERT, fragmentShader: S.CORTE_FRAG, uniforms: uCorte, side: THREE.DoubleSide });
  const geoMedio = new THREE.CircleGeometry(1, 128, -Math.PI / 2, Math.PI);
  const caraA = new THREE.Mesh(geoMedio, matCorte);
  const caraB = new THREE.Mesh(geoMedio, matCorte);
  sol.add(caraA, caraB);

  // El camino aleatorio de un fotón, dibujado sobre la cara A (plano z = 0, x > 0).
  const paseo = caminoAleatorio(0.25, 0.7, 0.024, 20260);
  const nP = paseo.length / 3;
  const colP = new Float32Array(nP * 3);
  const cGamma = new THREE.Color(0.75, 0.6, 1.0), cX = new THREE.Color(0.45, 0.75, 1.0), cUV = new THREE.Color(0.9, 0.95, 1.0), cVis = new THREE.Color(1.0, 0.85, 0.4);
  for (let i = 0; i < nP; i++) {
    const k = i / (nP - 1);
    const c = k < 0.4 ? cGamma.clone().lerp(cX, k / 0.4) : k < 0.8 ? cX.clone().lerp(cUV, (k - 0.4) / 0.4) : cUV.clone().lerp(cVis, (k - 0.8) / 0.2);
    colP.set([c.r * 2, c.g * 2, c.b * 2], i * 3);
  }
  const gPaseo = new THREE.BufferGeometry();
  gPaseo.setAttribute('position', new THREE.BufferAttribute(paseo, 3));
  gPaseo.setAttribute('color', new THREE.BufferAttribute(colP, 3));
  gPaseo.setDrawRange(0, 0);
  const matPaseo = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const lineaPaseo = new THREE.Line(gPaseo, matPaseo);
  sol.add(lineaPaseo);
  const cabeza = brillo(0.05, new THREE.Color(1, 0.95, 0.8));
  sol.add(cabeza);

  // Burbujas de convección: rollos sobre la cara A.
  const burbujas = [];
  for (let i = 0; i < 4; i++) {
    const b = brillo(0.035, new THREE.Color(1, 0.6, 0.25));
    b.userData = { a0: 0.45 + i * 0.75, fase: i * 1.7 };
    burbujas.push(b);
    sol.add(b);
  }

  // Corona: un plano siempre de cara a la cámara (8 radios de lado).
  const uCorona = { uTime: { value: 0 }, uCorona: { value: 0.5 } };
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShaderMaterial({
    vertexShader: S.UV_VERT, fragmentShader: S.CORONA_FRAG, uniforms: uCorona,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  escena.add(corona);

  // Bucles coronales: tubos entre dos pies sobre la superficie.
  const bucles = [];
  function crearBucle(centro, tam, altura, vida = 1, dinamico = false) {
    const c = centro.clone().normalize();
    const t = new THREE.Vector3().crossVectors(c, Math.abs(c.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    t.applyAxisAngle(c, Math.random() * Math.PI);
    const pA = c.clone().addScaledVector(t, tam).normalize();
    const pB = c.clone().addScaledVector(t, -tam).normalize();
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const k = i / 24;
      const base = pA.clone().lerp(pB, k).normalize();
      pts.push(base.multiplyScalar(1 + Math.sin(k * Math.PI) * altura));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.008 + tam * 0.03, 8, false);
    const u = { uTime: { value: 0 }, uVida: { value: vida }, uFase: { value: Math.random() * 6 }, uColor: { value: new THREE.Color(1, 0.55 + Math.random() * 0.2, 0.25) } };
    const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: S.UV_VERT, fragmentShader: S.BUCLE_FRAG, uniforms: u,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    m.userData = { u, dinamico, nacido: reloj.elapsedTime, vidaMax: 5 };
    sol.add(m);
    bucles.push(m);
    return m;
  }
  const reloj = new THREE.Clock();
  // Regiones activas sobre las manchas, y algunas sueltas.
  [manchas[0], manchas[0], manchas[2], manchas[3], new THREE.Vector3(-0.8, 0.5, 0.3), new THREE.Vector3(0.2, -0.7, 0.68), new THREE.Vector3(-0.3, 0.6, -0.7)]
    .forEach((v, i) => crearBucle(v, 0.07 + (i % 3) * 0.04, 0.06 + (i % 4) * 0.035));

  // ---------- Viento solar ----------
  const nV = movil ? 3500 : 7000;
  const vDir = new Float32Array(nV * 3), vDatos = new Float32Array(nV * 3);
  for (let i = 0; i < nV; i++) {
    const d = new THREE.Vector3().randomDirection();
    vDir.set([d.x, d.y, d.z], i * 3);
    vDatos.set([0.5 + Math.random() * 0.9, Math.random(), 1 + Math.random() * 2.2], i * 3);
  }
  const gV = new THREE.BufferGeometry();
  gV.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nV * 3), 3));
  gV.setAttribute('aDir', new THREE.BufferAttribute(vDir, 3));
  gV.setAttribute('aDatos', new THREE.BufferAttribute(vDatos, 3));
  const uViento = { uTime: { value: 0 }, uViento: { value: 0 }, uPx: px };
  const viento = new THREE.Points(gV, new THREE.ShaderMaterial({
    vertexShader: S.VIENTO_VERT, fragmentShader: S.VIENTO_FRAG, uniforms: uViento,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  viento.frustumCulled = false;
  escena.add(viento);

  // ---------- Eyecciones (clic) ----------
  const eyecciones = [];
  function eyectar(dirLocal) {
    const n = movil ? 500 : 1100;
    const vel = new Float32Array(n * 3), sem = new Float32Array(n);
    const base = dirLocal.clone().normalize();
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(0.35).add(base).normalize().multiplyScalar(0.5 + Math.random() * 1.3);
      vel.set([v.x, v.y, v.z], i * 3);
      sem[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(vel, 3));
    g.setAttribute('aSemilla', new THREE.BufferAttribute(sem, 1));
    const u = { uEdad: { value: 0 }, uPx: px, uOrigen: { value: base } };
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: S.EYECCION_VERT, fragmentShader: S.EYECCION_FRAG, uniforms: u,
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    pts.frustumCulled = false;
    sol.add(pts);
    eyecciones.push({ pts, u });
    crearBucle(base, 0.12, 0.45, 1, true);
    destello = 1;
    rig.temblor = 1; // la cámara acusa el golpe
  }
  let destello = 0;
  // Una eyección vacía e invisible: solo existe para que su shader se compile por adelantado.
  function eyectarSilencioso() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setAttribute('aVel', new THREE.BufferAttribute(new Float32Array(3), 3));
    g.setAttribute('aSemilla', new THREE.BufferAttribute(new Float32Array(1), 1));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      vertexShader: S.EYECCION_VERT, fragmentShader: S.EYECCION_FRAG,
      uniforms: { uEdad: { value: 99 }, uPx: px, uOrigen: { value: new THREE.Vector3(0, 0, 1) } },
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    pts.visible = false;
    pts.frustumCulled = false;
    sol.add(pts);
  }

  // ---------- La Tierra ----------
  const TIERRA = new THREE.Vector3(26, 0, 0);
  const tierra = new THREE.Group();
  tierra.position.copy(TIERRA);
  escena.add(tierra);
  const uTierra = { uTime: { value: 0 }, uSolDir: { value: new THREE.Vector3(-1, 0.1, 0.15).normalize() } };
  const globo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 96, 64),
    new THREE.ShaderMaterial({ vertexShader: S.SOL_VERT, fragmentShader: S.TIERRA_FRAG, uniforms: uTierra }));
  globo.rotation.z = 0.41; // 23,44°
  tierra.add(globo);
  // Líneas de campo de un dipolo, comprimidas de día y estiradas en la cola.
  const lineas = [];
  for (const L of [1.4, 2.0, 2.8, 3.8]) {
    for (let k = 0; k < 10; k++) {
      const lon = (k / 10) * Math.PI * 2;
      for (let i = 0; i < 64; i++) {
        const lat1 = -Math.PI / 2 + (i / 64) * Math.PI, lat2 = -Math.PI / 2 + ((i + 1) / 64) * Math.PI;
        for (const lat of [lat1, lat2]) {
          const r = 0.6 * L * Math.cos(lat) ** 2;
          let x = r * Math.cos(lat) * Math.cos(lon), z = r * Math.cos(lat) * Math.sin(lon);
          x *= x < 0 ? 0.62 : 1.9;
          lineas.push(x, r * Math.sin(lat), z);
        }
      }
    }
  }
  const gL = new THREE.BufferGeometry();
  gL.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lineas), 3));
  const matLineas = new THREE.LineBasicMaterial({ color: new THREE.Color(0.35, 0.7, 1.0), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  tierra.add(new THREE.LineSegments(gL, matLineas));
  // Choque de proa: paraboloide abierto hacia la cola.
  const perfil = [];
  for (let i = 0; i <= 30; i++) { const rho = (i / 30) * 4.2; perfil.push(new THREE.Vector2(rho, -2.2 + (rho * rho) / (2 * 1.8))); }
  const uEscudo = { uTime: { value: 0 }, uEscudo: { value: 0 } };
  const escudo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), new THREE.ShaderMaterial({
    vertexShader: S.SOL_VERT, fragmentShader: S.ESCUDO_FRAG, uniforms: uEscudo,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide,
  }));
  escudo.rotation.z = -Math.PI / 2; // el eje del torno (y) pasa a ser x: la nariz mira al Sol
  tierra.add(escudo);
  // Óvalos aurorales.
  const uAurora = { uTime: { value: 0 }, uAurora: { value: 0 } };
  const matAurora = new THREE.ShaderMaterial({ vertexShader: S.UV_VERT, fragmentShader: S.AURORA_FRAG, uniforms: uAurora, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide });
  for (const s of [1, -1]) {
    const anillo = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.08, 64, 1, true), matAurora);
    anillo.position.y = s * 0.56;
    globo.add(anillo);
  }
  // Viento que rodea la magnetosfera.
  const nF = movil ? 1800 : 3600;
  const fSem = new Float32Array(nF * 3);
  for (let i = 0; i < nF; i++) fSem.set([Math.sqrt(Math.random()) * 3.4, Math.random() * 6.283, Math.random()], i * 3);
  const gF = new THREE.BufferGeometry();
  gF.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nF * 3), 3));
  gF.setAttribute('aSemilla', new THREE.BufferAttribute(fSem, 3));
  const uFlujo = { uTime: { value: 0 }, uFlujo: { value: 0 }, uPx: px, uNariz: { value: -2.2 } };
  const flujo = new THREE.Points(gF, new THREE.ShaderMaterial({ vertexShader: S.FLUJO_VERT, fragmentShader: S.FLUJO_FRAG, uniforms: uFlujo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flujo.frustumCulled = false;
  tierra.add(flujo);

  // ---------- El mundo atómico (escena superpuesta) ----------
  const atomo = crearAtomo();

  // ---------- Posproceso ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(escena, camara));
  const pasoAtomo = new RenderPass(atomo.escena, atomo.camara);
  pasoAtomo.clear = false;
  pasoAtomo.clearDepth = true;
  composer.addPass(pasoAtomo);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------- Interacción ----------
  const raycaster = new THREE.Raycaster();
  const puntero = new THREE.Vector2(9, 9);
  const toque = { activo: false, local: new THREE.Vector3(0, 0, 1), ultimoBucle: 0, ultimo: null };
  const giro = { yaw: 0, pitch: 0, vYaw: reducido ? 0 : 0.035, vPitch: 0, arrastrando: false, x: 0, y: 0, auto: reducido ? 0 : 0.035 };
  const oyentes = new Set();
  let interactivo = true;

  let punteroMovido = false;
  function alPuntero(e) {
    punteroMovido = true;
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (giro.arrastrando) {
      const dx = e.clientX - giro.x, dy = e.clientY - giro.y;
      giro.x = e.clientX; giro.y = e.clientY;
      giro.vYaw = dx * 0.006; giro.vPitch = dy * 0.004;
      giro.yaw += giro.vYaw; giro.pitch = THREE.MathUtils.clamp(giro.pitch + giro.vPitch, -0.7, 0.7);
    }
  }
  function impacto() {
    raycaster.setFromCamera(puntero, camara);
    const h = raycaster.intersectObject(fotosfera, false)[0];
    if (!h) return null;
    return sol.worldToLocal(h.point.clone()).normalize();
  }
  canvas.addEventListener('pointermove', alPuntero);
  canvas.addEventListener('pointerleave', () => { puntero.set(9, 9); giro.arrastrando = false; });
  canvas.addEventListener('pointerdown', (e) => {
    alPuntero(e);
    if (!interactivo) return;
    giro.arrastrando = e.pointerType === 'mouse';
    giro.x = e.clientX; giro.y = e.clientY; giro.mov = 0; giro.t0 = performance.now();
  });
  canvas.addEventListener('pointerup', (e) => {
    const corto = performance.now() - (giro.t0 || 0) < 260;
    giro.arrastrando = false;
    if (!interactivo || !corto) return;
    const p = impacto();
    if (p) { eyectar(p); oyentes.forEach((f) => f({ tipo: 'eyeccion', punto: p })); }
  });

  // ---------- Tamaño ----------
  let ancho = 1, alto = 1;
  // El lienzo mide 100lvh (la pantalla con la barra del navegador escondida): en móvil, al
  // aparecer y desaparecer esa barra su tamaño CSS no cambia y no hay que redimensionar el búfer.
  // Los cambios reales se agrupan (150 ms) y se aplican al principio de un fotograma.
  let tamPendiente = false;
  function redimensionar(ya = false) {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    if (!ya && w === ancho && h === alto) return;
    ancho = w; alto = h;
    renderer.setSize(ancho, alto, false);
    composer.setSize(ancho, alto);
    bloom.resolution.set(ancho / 2, alto / 2); // el bloom trabaja a media resolución
    camara.aspect = ancho / alto;
    atomo.camara.aspect = ancho / alto;
    atomo.camara.updateProjectionMatrix();
  }
  redimensionar(true);
  let esperaTam = 0;
  window.addEventListener('resize', () => { clearTimeout(esperaTam); esperaTam = setTimeout(() => { tamPendiente = true; }, 150); });

  // ---------- Rig de cámara ----------
  const EJE_Y = new THREE.Vector3(0, 1, 0);
  const rig = { offset: new THREE.Vector3(), lado: new THREE.Vector3(), px: 0, py: 0, temblor: 0 };

  // ---------- Bucle ----------
  const mira = new THREE.Vector3();
  const proy = new THREE.Vector3();
  let tiempo = 0;
  let pausado = false;
  let opacidadLienzo = 1;

  // Calidad adaptativa. Cambiar la densidad de píxeles redimensiona el búfer del lienzo y lo
  // BORRA: si se hace después de pintar, el navegador muestra ese fotograma vacío (un parpadeo).
  // Por eso: (1) el cambio se aplica al principio del fotograma, justo antes de pintar;
  // (2) bajar exige 2 s seguidos por debajo de 40 fps; subir, 6 s por encima de 58;
  // (3) después de bajar dos veces ya no vuelve a subir, para que nunca oscile.
  // Las medias ignoran los 2 s que siguen a un cambio de tamaño o a una pestaña oculta.
  const dprMax = dpr;
  let dprActual = dpr, acumulado = 0, muestras = 0, malos = 0, buenos = 0, bajadas = 0, gracia = 2;
  let dprPendiente = null;
  function calidad(dt) {
    acumulado += dt; muestras++;
    if (acumulado < 1) return;
    const fps = muestras / acumulado;
    acumulado = 0; muestras = 0;
    if (gracia > 0) { gracia--; return; }
    malos = fps < 40 ? malos + 1 : 0;
    buenos = fps > 58 ? buenos + 1 : 0;
    if (malos >= 2 && dprActual > 0.75) { dprPendiente = Math.max(0.75, dprActual - 0.25); malos = 0; bajadas++; }
    else if (buenos >= 6 && bajadas < 2 && dprActual < dprMax) { dprPendiente = Math.min(dprMax, dprActual + 0.25); buenos = 0; }
  }
  function aplicarCalidad() {
    if (dprPendiente === null) return;
    dprActual = dprPendiente; dprPendiente = null; gracia = 2;
    renderer.setPixelRatio(dprActual);
    composer.setPixelRatio(dprActual);
    px.value = dprActual;
    redimensionar(true);
  }
  function fotograma() {
    if (pausado) return;
    // Lo que redimensiona el búfer va aquí, antes de pintar: nunca queda un fotograma vacío en pantalla.
    if (tamPendiente) { tamPendiente = false; redimensionar(); gracia = 2; }
    aplicarCalidad();
    const dt = Math.min(reloj.getDelta(), 0.05);
    if (!reducido) tiempo += dt;
    const e = estado;

    // Cámara (con desvío lateral en escritorio para dejar sitio al texto).
    mira.set(e.miraX, e.miraY, e.miraZ);
    rig.offset.set(e.camX, e.camY, e.camZ).sub(mira);
    // Mirar alrededor: la cámara sigue al cursor con retardo (solo con ratón y sin movimiento reducido).
    const sigue = reducido || movil ? 0 : e.mirar;
    rig.px += ((puntero.x > 2 ? 0 : puntero.x) * sigue - rig.px) * 0.04;
    rig.py += ((puntero.y > 2 ? 0 : puntero.y) * sigue - rig.py) * 0.04;
    // Órbita y alzado alrededor del punto de mira.
    rig.offset.applyAxisAngle(EJE_Y, e.orbita - rig.px * 0.09);
    const lado = rig.lado.crossVectors(rig.offset, EJE_Y).normalize();
    if (lado.lengthSq() > 0) rig.offset.applyAxisAngle(lado, e.alzado + rig.py * 0.06);
    // Dolly zoom: el ángulo de visión pasa de 35° a 78° y la distancia se reduce en la misma
    // proporción (tan(fov₀/2) / tan(fov/2)): lo que hay en el punto de mira no cambia de tamaño.
    const vert = reducido ? 0 : e.vertigo;
    const fov = 35 + 43 * vert;
    rig.offset.multiplyScalar(Math.tan(THREE.MathUtils.degToRad(17.5)) / Math.tan(THREE.MathUtils.degToRad(fov / 2)));
    camara.fov = fov - (reducido ? 0 : destello * 4); // golpe de zoom de las eyecciones
    camara.position.copy(mira).add(rig.offset);
    // Temblor de las eyecciones: ruido suave, no aleatorio por fotograma.
    if (!reducido && rig.temblor > 0.001) {
      const d = rig.offset.length() * 0.012 * rig.temblor;
      camara.position.x += Math.sin(tiempo * 61) * d; camara.position.y += Math.cos(tiempo * 53) * d;
      rig.temblor *= 0.92;
    }
    camara.lookAt(mira);
    if (!reducido) camara.rotateZ(e.alabeo);
    const desvio = movil ? 0 : e.desvio;
    // En móvil el texto entra por abajo: el Sol sube un 18 % de la pantalla.
    camara.setViewOffset(ancho, alto, -desvio * ancho, movil ? alto * 0.18 * (1 - e.tierra * 0.5) : 0, ancho, alto);
    camara.updateProjectionMatrix();

    // Giro del Sol: libre con inercia, u orientado para que la cuña mire a la cámara.
    if (!giro.arrastrando) {
      giro.vYaw += (giro.auto - giro.vYaw) * 0.02;
      giro.yaw += giro.vYaw * dt * (reducido ? 0 : 1) * 1.0;
      giro.pitch *= 0.985;
    }
    // La cuña gira hasta el acimut de la cámara: θ = φ − atan2(z, x). Con φ = corte·75° la cara A
    // (donde se dibuja el camino del fotón) queda casi de frente y la cara B, en escorzo: se lee el volumen.
    // La cuña mira al acimut de la cámara SIN la órbita: al orbitar, el corte se queda quieto y se ve su volumen.
    const yawCuna = e.corte * (5 * Math.PI / 12) - Math.atan2(e.camZ - e.miraZ, e.camX - e.miraX);
    const yaw = THREE.MathUtils.lerp(giro.yaw, yawCuna, e.orientar);
    sol.rotation.set(THREE.MathUtils.lerp(giro.pitch, 0, e.orientar), yaw, 0);
    if (e.orientar > 0.999) giro.yaw = yaw; // al soltar la orientación, el giro libre arranca de aquí

    // Uniformes del Sol.
    const brilloSol = e.brillo * (1 + destello * 0.25);
    uSol.uTime.value = tiempo; uSol.uCorte.value = e.corte; uSol.uBrillo.value = brilloSol; uSol.uDetalle.value = e.detalle;
    uCorte.uTime.value = tiempo; uCorte.uBrillo.value = brilloSol; uCorte.uFoco.value.set(e.focoR0, e.focoR1, e.foco, 0);
    caraA.visible = caraB.visible = e.corte > 0.001;
    caraB.rotation.y = -e.corte * Math.PI / 2;
    uCorona.uTime.value = tiempo; uCorona.uCorona.value = e.corona * (1 - e.corte * 0.6) * e.brillo * (1 + destello);
    corona.quaternion.copy(camara.quaternion);
    uEstrellas.uTime.value = tiempo; uEstrellas.uOpacidad.value = e.estrellas;
    cielo.rotation.set(e.cielo * 0.12, e.cielo * 0.55, 0);
    uViento.uTime.value = tiempo; uViento.uViento.value = e.viento;
    destello *= 0.94;

    // Interacción: excitación magnética bajo el cursor.
    // El rayo solo se lanza si el puntero se movió o el Sol giró: no en cada fotograma.
    let p = toque.ultimo;
    if (punteroMovido || Math.abs(giro.vYaw) > 1e-4 || e.orientar > 0) { p = interactivo && e.atomo < 0.5 ? impacto() : null; punteroMovido = false; }
    if (!interactivo || e.atomo >= 0.5) p = null;
    toque.ultimo = p;
    toque.activo = !!p;
    if (p) {
      uSol.uToque.value.lerp(p, 0.35);
      if (!reducido && tiempo - toque.ultimoBucle > 1.4 && bucles.filter((b) => b.userData.dinamico).length < 6) {
        crearBucle(p, 0.05 + Math.random() * 0.06, 0.06 + Math.random() * 0.12, 0, true);
        toque.ultimoBucle = tiempo;
      }
    }
    uSol.uExcita.value += ((p ? 1 : 0) - uSol.uExcita.value) * 0.08;
    oyentes.forEach((f) => f({ tipo: 'toque', punto: p }));

    // Bucles: los fijos siguen al estado; los dinámicos nacen y se apagan.
    for (let i = bucles.length - 1; i >= 0; i--) {
      const b = bucles[i], u = b.userData.u;
      u.uTime.value = tiempo;
      if (b.userData.dinamico) {
        const edad = reloj.elapsedTime - b.userData.nacido;
        u.uVida.value = Math.min(edad / 0.6, 1) * (1 - Math.max(0, edad - 3) / 2) * e.brillo;
        if (edad > b.userData.vidaMax) { sol.remove(b); b.geometry.dispose(); bucles.splice(i, 1); } // el material no se libera: su programa sigue compilado para el siguiente
      } else {
        u.uVida.value = e.bucles * e.brillo;
      }
      b.visible = u.uVida.value > 0.003 && e.corte < 0.05;
    }
    // Eyecciones.
    for (let i = eyecciones.length - 1; i >= 0; i--) {
      const ey = eyecciones[i];
      ey.u.uEdad.value += reducido ? 3.3 : dt;
      if (ey.u.uEdad.value > 3.3) { sol.remove(ey.pts); ey.pts.geometry.dispose(); eyecciones.splice(i, 1); } // ídem: la siguiente eyección no recompila
    }

    // Camino del fotón y convección.
    const n = Math.floor(e.paseo * nP);
    gPaseo.setDrawRange(0, n);
    lineaPaseo.visible = cabeza.visible = e.paseo > 0.001 && e.corte > 0.5;
    if (n > 0) cabeza.position.set(paseo[(n - 1) * 3], paseo[(n - 1) * 3 + 1], 0.012);
    cabeza.material.opacity = e.paseo > 0.001 ? 1 - e.conveccion * 0.8 : 0;
    matPaseo.opacity = 1 - e.conveccion * 0.75;
    burbujas.forEach((b) => {
      const ang = tiempo * 0.5 + b.userData.fase;
      const rc = 0.845, rr = 0.11;
      const r = rc + Math.cos(ang) * rr, th = b.userData.a0 + Math.sin(ang) * 0.12;
      b.position.set(Math.sin(th) * r, Math.cos(th) * r, 0.012); // θ desde +y hacia +x: siempre en la cara A
      b.material.opacity = e.conveccion;
      b.visible = e.conveccion > 0.01 && e.corte > 0.5;
    });

    // Tierra.
    tierra.visible = e.tierra > 0.001;
    uTierra.uTime.value = tiempo;
    globo.rotation.y = tiempo * 0.05;
    matLineas.opacity = e.escudo * 0.22;
    uEscudo.uTime.value = tiempo; uEscudo.uEscudo.value = e.escudo;
    uAurora.uTime.value = tiempo; uAurora.uAurora.value = e.aurora;
    uFlujo.uTime.value = tiempo; uFlujo.uFlujo.value = e.flujo;

    // Mundo atómico.
    atomo.actualizar(e.pp, e.atomo, tiempo, ancho, alto, movil);
    pasoAtomo.enabled = e.atomo > 0.001;

    bloom.strength = 0.65 + destello * 0.8 + e.atomo * 0.35;
    if (e.lienzo !== opacidadLienzo) { canvas.style.opacity = e.lienzo; opacidadLienzo = e.lienzo; }
    if (e.lienzo > 0.001) { composer.render(); calidad(dt); }
    oyentes.forEach((f) => f({ tipo: 'fotograma', proyectar }));
    requestAnimationFrame(fotograma);
  }

  // Proyecta un punto del mundo (o del mundo atómico) a píxeles de pantalla.
  function proyectar(v, mundoAtomico = false) {
    proy.copy(v).project(mundoAtomico ? atomo.camara : camara);
    return { x: (proy.x * 0.5 + 0.5) * ancho, y: (-proy.y * 0.5 + 0.5) * alto, delante: proy.z < 1 };
  }

  requestAnimationFrame(fotograma);

  // Precompilación: three.js compila el shader de un material la primera vez que lo pinta. La
  // Tierra, el mundo atómico y las eyecciones aparecen tarde y su compilación congelaba un
  // instante la escena (lo que se veía como un parpadeo). Se compilan todos al principio, en un
  // momento libre y, donde el navegador lo permite (KHR_parallel_shader_compile), sin bloquear.
  eyectarSilencioso();
  // Se compila de poco en poco, en los momentos libres del navegador: así la compilación tampoco
  // da un tirón. Con KHR_parallel_shader_compile, el enlazado además va en segundo plano.
  const paralelo = renderer.extensions.has('KHR_parallel_shader_compile');
  function precompilar() {
    // Todos los objetos con material, en el orden en que aparecen al bajar: primero el mundo
    // atómico (capítulo 01), luego el resto. Los que comparten programa salen casi gratis (caché);
    // en cuanto uno cuesta de verdad, se cede el turno hasta el siguiente momento libre.
    const cola = [];
    for (const [raiz, cam] of [[atomo.escena, atomo.camara], [escena, camara]]) raiz.traverse((o) => { if (o.material) cola.push([o, cam]); });
    const libre = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 50));
    const tanda = (plazo) => {
      while (cola.length && plazo.timeRemaining() > 2) {
        const [o, cam] = cola.shift();
        const visible = o.visible;
        o.visible = true;
        // La escena no se pinta en pantalla sino en el búfer intermedio del posproceso (para el
        // bloom), y three.js genera otra variante del shader para un búfer: se compila con él activo.
        const previo = renderer.getRenderTarget();
        renderer.setRenderTarget(composer.renderTarget1);
        const t0 = performance.now();
        try { paralelo ? renderer.compileAsync(o, cam) : renderer.compile(o, cam); }
        finally { renderer.setRenderTarget(previo); o.visible = visible; }
        if (performance.now() - t0 > 6) break;
      }
      if (cola.length) libre(tanda, { timeout: 500 });
    };
    libre(tanda, { timeout: 500 });
  }
  (window.requestIdleCallback || ((f) => setTimeout(f, 400)))(precompilar, { timeout: 1500 });
  document.addEventListener('visibilitychange', () => {
    pausado = document.hidden;
    if (!pausado) { reloj.getDelta(); gracia = 2; requestAnimationFrame(fotograma); }
  });

  return {
    estado,
    atomo,
    eyectar: (v) => eyectar(v || new THREE.Vector3(0.6, 0.35, 0.72)),
    alEvento: (f) => oyentes.add(f),
    setInteractivo: (v) => { interactivo = v; },
    TIERRA,
    renderer, // para medir (renderer.info) desde la consola
  };
}

// Un punto brillante (sprite aditivo con textura radial generada).
let texturaBrillo = null;
function brillo(tam, color) {
  if (!texturaBrillo) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    texturaBrillo = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaBrillo, color: color.clone().multiplyScalar(2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(tam * 2);
  return s;
}

// Camino aleatorio 2D en el semianillo r0..r1 (x > 0) con generador reproducible.
function caminoAleatorio(r0, r1, paso, semilla) {
  let s = semilla;
  const azar = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  let x = r0 + 0.002, y = 0.05;
  const pts = [x, y, 0.008];
  for (let i = 0; i < 6000; i++) {
    // Dirección al azar con una deriva mínima hacia fuera (el gradiente de temperatura).
    const r0a = Math.hypot(x, y);
    const a = azar() * Math.PI * 2;
    let nx = x + Math.cos(a) * paso + (x / r0a) * paso * 0.12, ny = y + Math.sin(a) * paso + (y / r0a) * paso * 0.12;
    const r = Math.hypot(nx, ny);
    if (nx < 0.03 || r < r0) { nx = x - Math.cos(a) * paso; ny = y - Math.sin(a) * paso; } // rebota
    x = nx; y = ny;
    pts.push(x, y, 0.008);
    if (Math.hypot(x, y) >= r1) break;
  }
  return new Float32Array(pts);
}
