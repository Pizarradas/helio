// HELIO · datos de las capas (modelo solar estándar; R☉ = 695.700 km), en español e inglés.
// Las cifras de tiempo usan el PEOR CASO de su horquilla, y lo dicen.
import { LANG } from './i18n.js';

const CAPAS_ES = [
  {
    id: 'nucleo', n: '01', nombre: 'Núcleo',
    radio: '0–0,25 R☉', km: '0–174.000 km', temperatura: '15,7 MK en el centro', densidad: '150 g/cm³',
    transporte: 'radiación', tiempo: '—',
    texto: 'Aquí ocurre el 99 % de la fusión. La cadena protón-protón produce casi toda la energía; el ciclo CNO, catalizado por carbono, nitrógeno y oxígeno, apenas un 1 %.',
    dato: '4 protones → 1 helio-4 + 26,73 MeV',
  },
  {
    id: 'radiativa', n: '02', nombre: 'Zona radiativa',
    radio: '0,25–0,7 R☉', km: '174.000–487.000 km', temperatura: '7 → 2 MK', densidad: '20 → 0,2 g/cm³',
    transporte: 'difusión de fotones', tiempo: 'hasta 170.000 años (peor caso)',
    texto: 'La energía avanza como radiación, absorbida y reemitida trillones de veces. El fotón que sale no es el que entró: es su descendiente, con menos energía.',
    dato: 'Recorrido libre medio: fracciones de milímetro',
  },
  {
    id: 'tacoclina', n: '03', nombre: 'Tacoclina',
    radio: '≈0,7 R☉', km: '≈28.000 km de espesor', temperatura: '≈2 MK', densidad: '≈0,2 g/cm³',
    transporte: 'cizalla magnética', tiempo: '—',
    texto: 'La frontera entre el interior que gira como un sólido y la superficie que gira más deprisa en el ecuador. La cizalla estira y retuerce el campo magnético: es el origen de la dinamo y del ciclo de 11 años.',
    dato: 'Ecuador: ≈25 días por vuelta · polos: ≈35',
  },
  {
    id: 'convectiva', n: '04', nombre: 'Zona convectiva',
    radio: '0,7–1 R☉', km: '487.000–695.700 km', temperatura: '2 MK → 5.800 K', densidad: '0,2 → 2×10⁻⁷ g/cm³',
    transporte: 'convección', tiempo: 'semanas',
    texto: 'El plasma se vuelve opaco y la radiación no da abasto. El gas caliente sube, se enfría y baja en celdas que, en la superficie, vemos como gránulos y supergránulos.',
    dato: 'Supergránulos de ≈30.000 km',
  },
  {
    id: 'fotosfera', n: '05', nombre: 'Fotosfera',
    radio: '1 R☉', km: '≈500 km de espesor', temperatura: '5.772 K efectiva', densidad: '≈2×10⁻⁷ g/cm³',
    transporte: 'la radiación escapa', tiempo: '8 min 27 s hasta la Tierra (afelio)',
    texto: 'La superficie visible: el gas se vuelve transparente y la luz sale al espacio. Sus gránulos viven de 8 a 20 minutos; sus manchas son zonas más frías ancladas al campo magnético.',
    dato: 'Manchas: ≈3.800 K y hasta 0,4 T',
  },
  {
    id: 'cromosfera', n: '06', nombre: 'Cromosfera',
    radio: '1–1,003 R☉', km: '≈2.000 km', temperatura: '4.100 → 20.000 K', densidad: '≈10⁻¹² g/cm³',
    transporte: 'ondas y campo magnético', tiempo: '—',
    texto: 'Una capa fina y rosada (la línea H-alfa del hidrógeno) que solo se ve en los eclipses o con filtros. La atraviesan las espículas, chorros de plasma de hasta 10.000 km.',
    dato: 'Color: H-alfa, 656,3 nm',
  },
  {
    id: 'corona', n: '07', nombre: 'Corona',
    radio: '> 1,003 R☉', km: 'millones de km', temperatura: '1–3 MK', densidad: '≈10⁻¹⁵ g/cm³',
    transporte: 'viento solar', tiempo: '2,2–5,8 días hasta la Tierra',
    texto: 'Un halo de plasma a millones de grados, mucho más caliente que la superficie. Los bucles dibujan el campo magnético; de ella nace el viento solar que llena el sistema solar.',
    dato: 'Problema abierto: por qué está tan caliente',
  },
];

// Líneas de Fraunhofer (nm, en aire).
const LINEAS_ES = [
  { letra: 'K', nm: 393.37, elemento: 'Calcio ionizado (Ca II)' },
  { letra: 'H', nm: 396.85, elemento: 'Calcio ionizado (Ca II)' },
  { letra: 'h', nm: 410.17, elemento: 'Hidrógeno (H-delta)' },
  { letra: 'G', nm: 430.79, elemento: 'Hierro y banda de CH' },
  { letra: 'G′', nm: 434.05, elemento: 'Hidrógeno (H-gamma)' },
  { letra: 'F', nm: 486.13, elemento: 'Hidrógeno (H-beta)' },
  { letra: 'b', nm: 517.27, elemento: 'Magnesio' },
  { letra: 'E', nm: 527.04, elemento: 'Hierro' },
  { letra: 'D', nm: 589.29, elemento: 'Sodio (doblete D1–D2)' },
  { letra: 'C', nm: 656.28, elemento: 'Hidrógeno (H-alfa)' },
];

const CAPAS_EN = [
  {
    id: 'nucleo', n: '01', nombre: 'Core',
    radio: '0–0.25 R☉', km: '0–174,000 km', temperatura: '15.7 MK at the centre', densidad: '150 g/cm³',
    transporte: 'radiation', tiempo: '—',
    texto: '99% of the fusion happens here. The proton–proton chain makes almost all of the energy; the CNO cycle, catalysed by carbon, nitrogen and oxygen, barely 1%.',
    dato: '4 protons → 1 helium-4 + 26.73 MeV',
  },
  {
    id: 'radiativa', n: '02', nombre: 'Radiative zone',
    radio: '0.25–0.7 R☉', km: '174,000–487,000 km', temperatura: '7 → 2 MK', densidad: '20 → 0.2 g/cm³',
    transporte: 'photon diffusion', tiempo: 'up to 170,000 years (worst case)',
    texto: 'Energy travels as radiation, absorbed and re-emitted trillions of times. The photon that leaves is not the one that came in: it is its descendant, with less energy.',
    dato: 'Mean free path: fractions of a millimetre',
  },
  {
    id: 'tacoclina', n: '03', nombre: 'Tachocline',
    radio: '≈0.7 R☉', km: '≈28,000 km thick', temperatura: '≈2 MK', densidad: '≈0.2 g/cm³',
    transporte: 'magnetic shear', tiempo: '—',
    texto: 'The boundary between an interior that spins like a solid and a surface that spins faster at the equator. The shear stretches and twists the magnetic field: the origin of the dynamo and the 11-year cycle.',
    dato: 'Equator: ≈25 days per turn · poles: ≈35',
  },
  {
    id: 'convectiva', n: '04', nombre: 'Convective zone',
    radio: '0.7–1 R☉', km: '487,000–695,700 km', temperatura: '2 MK → 5,800 K', densidad: '0.2 → 2×10⁻⁷ g/cm³',
    transporte: 'convection', tiempo: 'weeks',
    texto: 'The plasma turns opaque and radiation cannot keep up. Hot gas rises, cools and sinks in cells that we see at the surface as granules and supergranules.',
    dato: 'Supergranules ≈30,000 km across',
  },
  {
    id: 'fotosfera', n: '05', nombre: 'Photosphere',
    radio: '1 R☉', km: '≈500 km thick', temperatura: '5,772 K effective', densidad: '≈2×10⁻⁷ g/cm³',
    transporte: 'radiation escapes', tiempo: '8 min 27 s to Earth (aphelion)',
    texto: 'The visible surface: the gas turns transparent and light leaves for space. Its granules live 8 to 20 minutes; its sunspots are cooler patches anchored to the magnetic field.',
    dato: 'Sunspots: ≈3,800 K and up to 0.4 T',
  },
  {
    id: 'cromosfera', n: '06', nombre: 'Chromosphere',
    radio: '1–1.003 R☉', km: '≈2,000 km', temperatura: '4,100 → 20,000 K', densidad: '≈10⁻¹² g/cm³',
    transporte: 'waves and magnetic field', tiempo: '—',
    texto: 'A thin, pinkish layer (the hydrogen H-alpha line) seen only during eclipses or through filters. Spicules, jets of plasma up to 10,000 km tall, shoot through it.',
    dato: 'Colour: H-alpha, 656.3 nm',
  },
  {
    id: 'corona', n: '07', nombre: 'Corona',
    radio: '> 1.003 R☉', km: 'millions of km', temperatura: '1–3 MK', densidad: '≈10⁻¹⁵ g/cm³',
    transporte: 'solar wind', tiempo: '2.2–5.8 days to Earth',
    texto: 'A halo of plasma at millions of degrees, far hotter than the surface. Its loops trace the magnetic field; from it blows the solar wind that fills the solar system.',
    dato: 'Open problem: why it is so hot',
  },
];

const LINEAS_EN = [
  { letra: 'K', nm: 393.37, elemento: 'Ionised calcium (Ca II)' },
  { letra: 'H', nm: 396.85, elemento: 'Ionised calcium (Ca II)' },
  { letra: 'h', nm: 410.17, elemento: 'Hydrogen (H-delta)' },
  { letra: 'G', nm: 430.79, elemento: 'Iron and the CH band' },
  { letra: 'G′', nm: 434.05, elemento: 'Hydrogen (H-gamma)' },
  { letra: 'F', nm: 486.13, elemento: 'Hydrogen (H-beta)' },
  { letra: 'b', nm: 517.27, elemento: 'Magnesium' },
  { letra: 'E', nm: 527.04, elemento: 'Iron' },
  { letra: 'D', nm: 589.29, elemento: 'Sodium (D1–D2 doublet)' },
  { letra: 'C', nm: 656.28, elemento: 'Hydrogen (H-alpha)' },
];

export const CAPAS = LANG === 'en' ? CAPAS_EN : CAPAS_ES;
export const LINEAS = LANG === 'en' ? LINEAS_EN : LINEAS_ES;
