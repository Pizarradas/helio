// HELIO · textos que escribe JavaScript, en los dos idiomas de la página.
// El HTML de cada idioma lo monta montar.mjs (index.html en español, en.html en inglés);
// aquí solo vive lo que se pinta en tiempo de ejecución. El idioma lo dice <html lang>.
export const LANG = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';

const TEXTOS = {
  es: {
    locale: 'es-ES',
    modoPapel: 'Modo papel', modoVacio: 'Modo vacío',
    ariaPapel: 'Cambiar al modo papel (claro)', ariaVacio: 'Cambiar al modo vacío (oscuro)',
    norte: 'N', sur: 'S', este: 'E', oeste: 'O',
    umbra: 'umbra', penumbra: 'penumbra', fotosfera: 'fotosfera · gránulos',
    onda: ['γ · < 0,01 nm', 'rayos X · 0,01–10 nm', 'ultravioleta · 10–380 nm', 'visible · 380–750 nm'],
    linea: (l, nm) => `Línea ${l.letra}: ${l.elemento}, ${nm} nanómetros`,
    verFicha: (nombre) => `${nombre}: ver su ficha`,
    ficha: { extension: 'Extensión', temperatura: 'Temperatura', densidad: 'Densidad', transporte: 'Transporte' },
  },
  en: {
    locale: 'en-GB',
    modoPapel: 'Paper mode', modoVacio: 'Void mode',
    ariaPapel: 'Switch to paper mode (light)', ariaVacio: 'Switch to void mode (dark)',
    norte: 'N', sur: 'S', este: 'E', oeste: 'W',
    umbra: 'umbra', penumbra: 'penumbra', fotosfera: 'photosphere · granules',
    onda: ['γ · < 0.01 nm', 'X-rays · 0.01–10 nm', 'ultraviolet · 10–380 nm', 'visible · 380–750 nm'],
    linea: (l, nm) => `Line ${l.letra}: ${l.elemento}, ${nm} nanometres`,
    verFicha: (nombre) => `${nombre}: open its data sheet`,
    ficha: { extension: 'Extent', temperatura: 'Temperature', densidad: 'Density', transporte: 'Transport' },
  },
};
export const T = TEXTOS[LANG];
export const fmt = (n, d = 0) => n.toLocaleString(T.locale, { minimumFractionDigits: d, maximumFractionDigits: d });
