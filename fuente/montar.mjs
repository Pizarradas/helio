// HELIO · monta la web lista para servir en ../web
//   node montar.mjs [RUTA_REPO_SYX]
// - empaqueta dos scripts clásicos (la página funciona también con doble clic, sin servidor):
//     helio.js        el relato: three.js, GSAP, la escena del Sol;
//     helio-corte.js  el corte isométrico y su modelo, que la página pide tarde, cerca de la
//                     sección 08; reutiliza el three.js y el GSAP de helio.js (window.HELIO);
// - cuantiza el modelo del corte (glTF-Transform) antes de empaquetarlo;
// - copia el paquete mínimo de SYX del tema helio (núcleo + utilidades) y minifica el del proyecto;
// - escribe la página en los dos idiomas: index.html (español) y en.html (inglés);
// - copia el corte despiezado estático como respaldo sin WebGL.
import { build, transform } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARES } from './i18n/en.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SYX = path.resolve(process.argv[2] || path.join(AQUI, '../../syx'));
const WEB = path.resolve(AQUI, '../web');

fs.rmSync(WEB, { recursive: true, force: true });
fs.mkdirSync(path.join(WEB, 'css'), { recursive: true });
fs.mkdirSync(path.join(WEB, 'fonts'), { recursive: true });

// 0 · Modelo del corte: posiciones en 16 bits (KHR_mesh_quantization, three.js lo lee sin decodificador)
const glb = path.join(AQUI, 'blender/corte.glb'), glbMin = path.join(AQUI, 'blender/corte.min.glb');
if (!fs.existsSync(glbMin) || fs.statSync(glbMin).mtimeMs < fs.statSync(glb).mtimeMs) {
  execFileSync(path.join(AQUI, 'node_modules/.bin/gltf-transform'), ['quantize', glb, glbMin], { stdio: 'inherit' });
}

// 1 · JavaScript
const comun = {
  bundle: true, minify: !process.env.DEPURAR, sourcemap: !!process.env.DEPURAR, format: 'iife', target: ['es2020'], legalComments: 'eof',
  alias: { 'syx-colors': path.join(SYX, 'js/syx-colors.js') }, // la conversión de color de SYX, desde su repo
};
await build({ ...comun, entryPoints: [path.join(AQUI, 'js/helio.js')], outfile: path.join(WEB, 'helio.js') });
// En el segundo script, `three` y `gsap` son los que ya cargó el primero.
const compartidos = {
  name: 'compartidos',
  setup(b) {
    b.onResolve({ filter: /^(three|gsap)$/ }, (a) => ({ path: a.path, namespace: 'helio' }));
    b.onLoad({ filter: /.*/, namespace: 'helio' }, (a) => ({
      contents: a.path === 'three' ? 'module.exports = window.HELIO.THREE;' : 'module.exports = { gsap: window.HELIO.gsap, default: window.HELIO.gsap };',
      loader: 'js',
    }));
  },
};
await build({
  ...comun, entryPoints: [path.join(AQUI, 'js/corte-entrada.js')], outfile: path.join(WEB, 'helio-corte.js'),
  loader: { '.glb': 'binary' }, plugins: [compartidos],
});

// 2 · CSS: el paquete mínimo de SYX para el tema helio (núcleo + utilidades, de su dist/,
//     `npm run build:dist` en SYX) en vez del completo: la página solo usa atom-btn, atom-progress,
//     atom-table y syx-skip-link. 242 KB → 186 KB (39 → 25 KB comprimido). Y el CSS del proyecto, minificado.
const dist = (f) => path.join(SYX, 'dist', f);
for (const f of ['helio.core.min.css', 'syx.utilities.min.css']) {
  if (!fs.existsSync(dist(f))) throw new Error(`No encuentro ${dist(f)}: aplica los parches del tema y ejecuta npm run build:css && npm run build:dist en SYX.`);
  fs.copyFileSync(dist(f), path.join(WEB, 'css', f));
}
{
  const { code } = await transform(fs.readFileSync(path.join(AQUI, 'helio.css'), 'utf8'), { loader: 'css', minify: true, target: ['chrome111', 'safari16.2', 'firefox121'] });
  fs.writeFileSync(path.join(WEB, 'helio.css'), code);
}

// 3 · Fuentes: las del tema y las del sistema que el tema carga (DM Mono como respaldo)
for (const dir of ['helio', 'google-dm-mono']) {
  fs.cpSync(path.join(SYX, 'fonts', dir), path.join(WEB, 'fonts', dir), { recursive: true });
}

// 4 · HTML en los dos idiomas y respaldo estático del corte
fs.copyFileSync(path.join(AQUI, 'blender/salida/corte-despiezado.svg'), path.join(WEB, 'corte-despiezado.svg'));
const plantilla = fs.readFileSync(path.join(AQUI, 'plantilla.html'), 'utf8')
  .replace('<!--CSS-->', '<link rel="stylesheet" href="css/helio.core.min.css">\n  <link rel="stylesheet" href="css/syx.utilities.min.css">\n  <link rel="stylesheet" href="helio.css">')
  .replace('<!--JS-->', '<script src="helio.js" defer></script>')
  .replace('<!--ALTERNATES-->', '<link rel="alternate" hreflang="es" href="index.html">\n  <link rel="alternate" hreflang="en" href="en.html">\n  <link rel="alternate" hreflang="x-default" href="en.html">');
fs.writeFileSync(path.join(WEB, 'index.html'), plantilla);
let en = plantilla;
const faltan = [];
for (const [es, ing] of PARES) {
  if (!en.includes(es)) { faltan.push(es.slice(0, 70)); continue; }
  en = en.split(es).join(ing);
}
if (faltan.length) throw new Error(`en.html: ${faltan.length} fragmento(s) del español ya no están en la plantilla:\n  ${faltan.join('\n  ')}`);
fs.writeFileSync(path.join(WEB, 'en.html'), en);

const kb = (f) => (fs.statSync(path.join(WEB, f)).size / 1024).toFixed(0) + ' KB';
console.log(`HELIO montado en ${WEB}: index.html ${kb('index.html')} · en.html ${kb('en.html')} · helio.js ${kb('helio.js')} · helio-corte.js ${kb('helio-corte.js')} · SYX ${kb('css/helio.core.min.css')} + ${kb('css/syx.utilities.min.css')} · helio.css ${kb('helio.css')}`);
