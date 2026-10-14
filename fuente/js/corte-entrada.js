// HELIO · entrada del segundo script (helio-corte.js): el corte isométrico.
// three.js y GSAP no viajan aquí: montar.mjs los toma de window.HELIO, que pone helio.js.
import { iniciarCorte } from './corte.js';

window.HELIO.iniciarCorte = iniciarCorte;
