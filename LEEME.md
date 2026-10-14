# HELIO · del núcleo a la Tierra

Diseño y desarrollo: **José Luis Pizarro**.

Landing creativa en 3D sobre los procesos atómicos del Sol: la fusión en el núcleo, el camino aleatorio de un fotón por la zona radiativa, la convección, la fotosfera, la cromosfera y la corona, el viento solar y lo que llega a la Tierra. Cierra con una sección técnica en isometría: el Sol en corte, modelado en Blender, que se parte en mitades espejo y se separa en horizontal, perdiendo el color hasta quedar en líneas.

**Pila:** SYX (arquitectura del front e identidad, tema propio `helio`) · skill de grid-system (retícula derivada con `gridcalc.py`) · skill iso-flat (corte isométrico) · Blender 5.2 (modelado del corte, exportado a glTF y SVG) · three.js r160 (Sol, interior, mundo atómico, viento, Tierra y el visor isométrico) · GSAP 3.12 + ScrollTrigger (todo el movimiento).

## Abrirlo

`web/index.html` (español) o `web/en.html` (inglés). El botón ES / EN de la cabecera cambia de una a otra; las dos se declaran con `hreflang`.

Funciona con doble clic, sin servidor (scripts clásicos, no módulos). También se puede servir tal cual; con un servidor que comprima (gzip o brotli) la primera carga baja a unos 260 KB de código.

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `web/` | La página lista: `index.html` (es) y `en.html` (en), `helio.js` (el relato), `helio-corte.js` (el corte, se carga tarde), `helio.css`, `css/` (paquete mínimo de SYX: `helio.core.min.css` + `syx.utilities.min.css`), `corte-despiezado.svg` (respaldo sin WebGL) y `fonts/`. |
| `tema-syx/` | Dos parches para tu repo de SYX, en orden con `git am`: 0001 el tema `helio`; 0002 la tipografía de publicación científica. Después, `npm run build:css`. |
| `fuente/` | Código fuente: `js/` (módulos), `i18n/en.mjs` (la edición inglesa), `helio.css`, `plantilla.html` (español, la fuente), `montar.mjs` (monta `web/`) y `blender/`. |
| `fuente/blender/` | `crear_corte.py` (modela el corte), `corte.glb` (lo que carga la web), `corte-despiezado.blend` y `salida/` con el SVG despiezado, su manifiesto y el PNG de revisión. |

Para regenerar la web: `cd fuente && npm i && node montar.mjs RUTA_REPO_SYX`. El repo de SYX necesita los dos parches aplicados y `npm run build:css && npm run build:dist`. Con `DEPURAR=1` delante, los scripts salen sin minificar y con mapas de fuente.

Para regenerar el corte:
```bash
python3 fuente/blender/crear_corte.py fuente/blender/corte          # pip install bpy (Blender 5.x) → corte.glb + corte-despiezado.blend
python3 KIT/skills/iso-flat-blender/scripts/con_bpy.py fuente/blender/corte-despiezado.blend \
  KIT/skills/iso-flat-blender/scripts/iso_export_svg.py -- \
  --salida fuente/blender/salida/corte-despiezado.svg --tokens helio --unidad 40 --margen 8
```
(`KIT` = el repo `skill--isometric`; también vale `blender --background --python …`).

## Identidad: tema `helio`

Dirección: **cuaderno de observatorio**. Dos superficies que nunca se mezclan y tres luces con significado físico.

- **Vacío** (`oklch(0.13 0.018 285)`): el espacio, con la deriva violeta de una placa. Es el modo oscuro y también la superficie de énfasis en los dos modos: el espacio no tiene modo claro.
- **Papel** de placa fotográfica (crudo cálido): el modo claro, la libreta.
- **Plasma** (oro → naranja): la energía de fusión, primario. **Corona** (cian frío, el UV en falso color): secundario. **Aurora** (verde del oxígeno, 557,7 nm): terciario.
- **Tipografía de publicación científica**, de los repos y paquetes de sus autores, no de Google Fonts:
  - **STIX Two Text** (cuerpo): la letra que encargaron AIP, ACS, IEEE, Elsevier y Springer, entre otros, para publicar ciencia; griego de verdad (ν, γ). Los símbolos que el texto no trae (☉, ⊙, →, ≈) salen de un recorte de **STIX Two Math 2.0.2** (repo `stipub/stixfonts`), cosido a la misma familia con `unicode-range`.
  - **Newsreader** de Production Type (titulares), del repo `productiontype/Newsreader`, recortada a tamaño óptico 36–72 y peso 200–500, en peso 300: el titular de una revista, no de un cartel.
  - **IBM Plex Mono** (cifras, unidades, rótulos, pies de figura), del paquete oficial `@ibm/plex-mono`.
  - Todas SIL OFL 1.1 (licencias en `fonts/helio/`). Métricas leídas de los woff2 con `gridcalc.py font` y respaldos métricos (`size-adjust`) con `--fallback`, para que no haya salto al cargar.
- **Forma:** esquinas vivas, filetes de 1 px, retícula de puntos de una línea (la unidad `u`, 28→32 px) bajo el corte.
- **Firma:** el espectro solar con sus **líneas de Fraunhofer** reales (Ca II K y H, Hδ, banda G, Hγ, Hβ, Mg b, Fe E, Na D, Hα), interactivo.

La página arranca en el vacío (`data-theme="dark"`); el botón de la cabecera pasa al modo papel sin guardar nada. El lienzo 3D es siempre oscuro; en modo papel, los paneles del relato se vuelven papel translúcido y la sección isométrica, papel.

**Validación del tema** (`CONSUMING.md` / `THEMING-RULES.md`): `check:themes` ✓ · `check:modo-claro` ✓ · `check:contraste` ✓ (109 pares × 8 temas × 4 estados, 0 fallos) · `check:plantilla` ✓ · `check:setups` ✓ en los 7 temas de su lista.

> **Para revisar (nivel humano, no lo he tocado):** `theme:new` añade `helio` a la lista de `scripts/check-setups.js` en tu copia de trabajo, pero el parche no la incluye. Si la añades, el guardián compara `helio` con `example-01` y echa en falta cinco clases `atom-evidence--*`, que son de la capa del sitio: un tema de producto no la lleva (`_setup.scss` de la plantilla lo dice así). Parece que el guardián debería comparar los temas de producto contra la plantilla sin sitio.

## Retícula (Grid Spec)

```
GRID SPEC — HELIO
Contexto       : web, landing narrativa de scroll sobre un lienzo 3D fijo; texto de divulgación en
                 paneles + sección técnica; expresividad editorial (variedad con unidad)
Tipografía     : cuerpo STIX Two Text (xh 0.473, char 0.4193 em en es, kerning GPOS) · 17→20 px / 1.647
                 · medida 70 car. reales = 30.939em (prosa larga) · 28.3em en paneles (≈64 car.)
                 titulares Newsreader 72pt peso 300 (lh_min 1.167) · cifras IBM Plex Mono · perfiles con SHA-1 (L13)
Densidad       : uso reading · densidad spacious · razón de cadena 2
Cadena         : micro 4→6 · inner 10 · padding 14→22 · gutter 16→42 · margen 16→134 · sección 150→170
                 (padding bajado de 18 a 14 en el mínimo: compose daba 18 > gutter 16 a 320)
Retícula base  : 12 columnas · gutter clamp(1rem, 0.5938rem + 2.0312vw, 2.625rem)
                 · margen clamp(1rem, -0.8438rem + 9.2188vw, 8.375rem) · máx. 1440 px · u = 1lh
Proporciones   : escala tipográfica 4:3 (perfect-fourth), titulares fluidos 320→1600 con gridcalc clamp
                 · lectura del corte: texto 5 : datos 7 ≈ 1 : √2 (gridcalc ratio --ratio sqrt2: error −1 %)
Operadores     : O3 desplazamiento — los paneles empiezan en la línea 1 y dejan libres las columnas de la derecha
                 O14 vacío activo — esas columnas son del Sol
                 O11 solapamiento reglado — el texto se superpone al lienzo, nunca a la inversa
Invariantes    : línea 1 de la retícula, margen y gutter continuos, medida ≤ 75 car., orden del DOM = lectura
Ruptura        : el lienzo 3D y la figura del corte sangran a todo el ancho, anclados a las líneas full
Transformación : < 48em — 1 columna en uso; panel a 52svh; Sol desplazado arriba un 18 %; veladura en la portada
                 48–64em — 6 columnas en uso (compose)
                 64–80em — panel 1/span 7, portada 1/span 8 (compose sigue en 6 columnas en uso)
                 80–90em — panel 1/span 6 · ≥ 90em — panel 1/span 5
Validación     : C1 ✓ · C2 ✓ (sin scroll horizontal a 320, medido) · C3 ✓ · C4 ✓ · C5 ✓ con excepción (abajo)
                 · C6 ✓ · C7 ✓ (≥ 24 px; capas 44 px) · C8–C9 n/a · C10 ✓ · C11 ✓ · C12 ✓ · C13 ✓ · Q 13/16 (autoevaluación)
Implementación : fuente/helio.css (tokens --helio-* en :root, reglas en @layer syx.app)
```

**Medida real medida en Chromium** (media · línea más larga): 1920 → 47–70 · ≤ 73; 1440 → 39–60 · ≤ 64; 768 → 51–62 · ≤ 66; 320 → 28–35 · ≤ 37. **Excepción declarada:** a 320 px y en el panel del núcleo (su cursiva más grande) la media queda bajo 45; ninguna línea pasa de 80.

## Parallax (GSAP)

- **Portada:** el titular, la entradilla y las cifras se quedan atrás a velocidades distintas (0,32 · 0,16 · 0,08 de la pantalla) mientras el Sol sigue.
- **Fondo:** el campo de estrellas gira despacio con todo el relato.
- **Anatomía:** titular y entradilla se adelantan; la retícula de puntos bajo el corte se mueve a otra velocidad que las piezas. Las filas de la tabla entran escalonadas.
- En móvil solo la portada (en una columna, desplazar titulares los montaría sobre su rótulo). Con movimiento reducido, nada.

## Guion de cámara

La cámara tiene un recurso propio por capítulo, para que el relato no repita plano. `escena.js` aplica cinco parámetros sobre la posición de base: **órbita** alrededor del punto de mira, **alzado** (picado y contrapicado), **alabeo** (horizonte inclinado), **vértigo** (dolly zoom) y **mirar** (cuánto sigue al cursor).

| Capítulo | Recurso |
|---|---|
| Portada | La cámara sigue al cursor con retardo: miras alrededor del Sol. |
| 01 Núcleo | **Dolly zoom**: el objetivo se abre de 35° a 78° mientras la cámara se acerca en la misma proporción (tan(35°/2) / tan(fov/2)). El Sol no cambia de tamaño y el fondo se estira. Después, el movimiento inverso: el núcleo se nos echa encima. |
| 02 Radiativa | **Cámara en mano**: orbita 29° el corte, que se queda quieto para que se vea su volumen, y el horizonte se inclina siguiendo al fotón. |
| 03 Convectiva | **Contrapicado**: la cámara baja 24° bajo el ecuador y mira hacia arriba. |
| 04 Fotosfera | **Vuelo rasante**: a un 10 % del radio sobre la superficie, 30° por debajo de la tangente. El limbo es un horizonte curvo. |
| 05 Corona | Nos alejamos **girando** 72° alrededor del Sol. |
| 06 Viento | **Travelling**: viajamos con el viento mirando atrás. |
| 07 Tierra | **Contraplano**: rodeamos la Tierra 119° hasta que el Sol asoma por su limbo y la atmósfera se enciende a contraluz. |
| Eyecciones | Temblor de cámara y golpe de zoom. |

Con movimiento reducido no hay temblor, alabeo, vértigo ni seguimiento del cursor; las órbitas siguen al scroll sin inercia.

## La escena 3D (three.js)

Un solo renderizador con bloom (`UnrealBloomPass`) y un objeto `estado` que escribe GSAP; la escena nunca sabe en qué sección está la página.

- **Sol:** shader de fotosfera con granulación (celdas de Worley deformadas con fbm), supergranulación, manchas con umbra y penumbra, y oscurecimiento del limbo con la ley lineal (u ≈ 0,6). Corona en un plano que siempre mira a la cámara, con serpentinas. Bucles coronales como tubos con flujo de plasma.
- **Interior:** el Sol se abre en una cuña de 90°; las dos caras del corte muestran las capas por radio (núcleo 0,25 R☉, zona radiativa hasta 0,7, tacoclina violeta, zona convectiva con rollos, borde fotosférico). La capa del capítulo se ilumina y el resto se apaga.
- **Mundo atómico:** escena superpuesta con la cadena protón-protón (pp-I) coreografiada por el scroll, con etiquetas HTML que siguen a cada partícula: p + p → ²H + e⁺ + νₑ; ²H + p → ³He + γ; ³He + ³He → ⁴He + 2p.
- **Fotón:** camino aleatorio reproducible (semilla fija) dibujado sobre la cara del corte; cambia de γ a rayos X, UV y visible, con el contador de años.
- **Viento solar:** 7.000 partículas en espiral de Parker. **Eyecciones:** clic sobre el Sol o botón.
- **Tierra:** globo procedimental, líneas de un dipolo comprimidas de día y estiradas en la cola, choque de proa (paraboloide), viento que lo rodea con líneas de corriente analíticas, y óvalos aurorales (557,7 nm y 630 nm).

**Interacción:** arrastrar con el ratón gira el Sol (con inercia); el cursor excita el campo magnético local (fáculas), hace brotar bucles y muestra latitud, longitud, temperatura y región; un clic lanza una eyección. En táctil, un toque lanza la eyección y el gesto vertical sigue siendo scroll.

**Movimiento reducido:** el scroll mueve la cámara sin inercia, el Sol no gira solo, no hay animaciones de entrada y todo el texto se ve completo. **Sin WebGL:** el relato se lee entero sin la escena.

## El corte isométrico (Blender → three.js)

`crear_corte.py` modela el Sol como un disco estratificado: el núcleo en el centro y seis anillos concéntricos escalonados (cada capa más baja que la de dentro, para que desde arriba se lean todos). Cada anillo se parte en dos **mitades espejo** por el plano vertical que contiene la línea de visión isométrica; así cada mitad se separa en **horizontal** en pantalla, una a cada lado. Encima van núcleos de helio-4, gránulos, espículas y bucles coronales, como piezas hijas.

- **En la web** (`js/corte.js`): three.js con cámara **ortográfica isométrica real** (35,264°) y el **sombreado de tres tonos del kit** (`shade()` copiado literal de `iso.mjs`: techo, lateral izquierdo y derecho por la normal, el mismo criterio de 30° que `iso_comun.py`).
- **Con el scroll** (tramo pegado de 2,6 pantallas), las mitades se apartan escalonadas y **se encogen en proporción a su distancia al centro**: el radio final de cada capa es 1,25 × 0,84ⁿ (n = su orden), un 16 % menor que la de dentro, mientras el núcleo crece a 1,25. Así, revelado del todo, el núcleo es la pieza más grande. La escala va un poco por detrás del desplazamiento (primero se aparta, después se encoge) para que ninguna mitad atraviese a la de dentro, y el encuadre se ajusta al tamaño real de las piezas. Pierden el color con la distancia al centro (las de fuera antes) y al final quedan **solo en líneas**, con las líneas ocultas eliminadas como en un dibujo técnico. **El núcleo se queda en el centro, en color.**
- **Elegir una capa** (en su número sobre el dibujo, en la fila de capas o haciendo clic en la pieza) le devuelve el color a sus dos mitades, las eleva y abre su ficha.
- **Las líneas** toman `--semantic-color-text-primary` con `resolveColor` de SYX (`js/syx-colors.js`, desde el repo), y cambian con el modo.
- **Sin WebGL:** se ve `corte-despiezado.svg`, exportado del mismo modelo con `iso_export_svg.py` (73 piezas, tokens `--helio-*`). `iso-check.py --tokens`: **0 errores, 0 avisos**; revisado renderizado (`salida/corte-despiezado.png`).

## Idiomas

- **Español** (`index.html`) es la fuente: `plantilla.html`. **Inglés** (`en.html`, inglés británico) lo genera `montar.mjs` sustituyendo cada fragmento por su par de `i18n/en.mjs`. Si un fragmento del español cambia y su par ya no encaja, el montaje se para y dice cuál: el inglés nunca se queda a medias sin aviso.
- Lo que escribe JavaScript (botón de modo, HUD, longitudes de onda, líneas de Fraunhofer, fichas y tabla de capas) sale de `js/i18n.js` y `js/datos.js`, según `<html lang>`.
- Las cifras siguen las normas de cada idioma con `toLocaleString` (`es-ES`: 5.772 K, 15,7; `en-GB`: 5,772 K, 15.7). Unidades y símbolos no cambian.
- Cada página declara la otra con `<link rel="alternate" hreflang>`; `x-default` apunta al inglés.

## Rendimiento

Medido en Chromium (escritorio, 1440 × 900, carga desde servidor local), antes y después de la revisión:

| | Antes | Después |
|---|---|---|
| Primer pintado (FCP) | 948 ms | 184–232 ms |
| Peso de la primera carga (sin comprimir) | 2,4 MB | 1,4 MB |
| Peso comprimido (gzip) de scripts + CSS de la primera carga | ≈ 430 KB | ≈ 260 KB |
| Nodos del DOM al cargar | 3.670 | ≈ 1.000 |

Qué cambió:
- **El corte se carga tarde**: su visor y su modelo van en `helio-corte.js`, que la página pide cuando la sección 08 está a pantalla y media. Reutiliza el three.js y el GSAP del primer script, así que no los descarga dos veces.
- **Modelo del corte de 455 KB a 70 KB**: sin normales (el shader calcula la de cada cara con derivadas, exacta en un modelo facetado) y posiciones cuantizadas a 16 bits con glTF-Transform. Un lector propio de 60 líneas (`js/lector-glb.js`) sustituye a `GLTFLoader` y a todo lo que arrastra.
- **Paquete mínimo de SYX**: `helio.core.min.css` + `syx.utilities.min.css` en vez del tema completo (39 → 25 KB comprimido). El CSS del proyecto se minifica.
- **El SVG de respaldo** (374 KB) ya no se descarga: solo si no hay WebGL.
- **Fotosfera más barata**: la deformación de los gránulos usa 6 ruidos en vez de 15 por píxel, y la textura fina solo se calcula de cerca.
- **Calidad adaptativa**: si el Sol baja de ≈ 45 fps durante un segundo, se reduce la densidad de píxeles (hasta 0,75) y se recupera cuando sobra margen.
- **Menos trabajo por fotograma y por scroll**: el rayo del cursor solo se lanza si el puntero se movió o el Sol gira; los elementos que actualiza el scroll se buscan una vez y solo se escribe lo que cambia.
- Los scripts van con `defer` y los lienzos con `contain: strict`.

### Parpadeos (revisión del 14 de octubre)

Cuatro causas, todas corregidas:

1. **La calidad adaptativa borraba el lienzo.** Cambiar la densidad de píxeles redimensiona el búfer del lienzo y lo deja vacío; se hacía justo después de pintar, así que en pantalla quedaba un fotograma en negro. Además, con un equipo que rondaba los 45–57 fps, subía y bajaba cada segundo. Ahora el cambio se aplica al principio del fotograma, antes de pintar; bajar exige 2 s seguidos por debajo de 40 fps, subir 6 s por encima de 58, y tras bajar dos veces ya no vuelve a subir.
2. **Shaders compilados a destiempo.** La Tierra, el mundo atómico y las eyecciones compilaban su shader la primera vez que aparecían, congelando la escena un instante. Además, la escena se pinta en el búfer del posproceso, que usa otra variante del shader, así que una precompilación normal no servía. Ahora los 24 programas se compilan al cargar, con ese búfer activo, de poco en poco en los momentos libres del navegador (y en paralelo donde existe `KHR_parallel_shader_compile`). Medido: 0 compilaciones durante el recorrido (antes, 10). Los materiales de bucles y eyecciones ya no se liberan al desaparecer, para que la siguiente no recompile.
3. **La barra del navegador en móvil.** Al aparecer y desaparecer con el scroll, redimensionaba el lienzo (y lo borraba). El lienzo mide ahora `100lvh`, que no cambia; los cambios de tamaño reales se agrupan (150 ms) y se aplican antes de pintar.
4. **Centelleo de la granulación** cuando el Sol se ve pequeño y gira: los gránulos de menos de unos 2 píxeles se sustituyen por su media (antialias por derivadas, `fwidth`).

Y dos tirones de carga: el corte se descarga en un momento libre tras la carga y se monta por partes (unas pocas piezas cada vez), en vez de montarse de golpe al acercarse a la sección mientras el Sol aún se movía; y el scroll recalcula sus posiciones una sola vez, cuando las fuentes ya han llegado.

Lo que sigue pesando: `helio.js` son 231 KB comprimidos, casi todo three.js (r160 no se deja recortar). Es el precio del 3D; la página pinta su texto antes de que llegue.

## Contrato de SYX

- Clases de SYX copiadas del registro: `atom-btn` (+ `--primary`, `--secondary`, `--filled`, `--size-sm`), `atom-progress`, `atom-table` (+ `__container`, `--resp`, `__th`, `__td`), `syx-skip-link`. Colores del corte con `resolveColor` de `js/syx-colors.js`.
- Lo propio, con prefijo `helio-` en `@layer syx.app`, y `syx-reuse:` en cada bloque que pinta.
- Tokens `--helio-*` que solo leen roles semánticos (`--semantic-*`, `--theme-*`). En modo papel, el acento sobre el lienzo pasa a `--semantic-color-on-emphasis`.
- `syx-scan` (contra `helio`): **0 altos, 0 medios**, 12 bajos, todos `position` deliberados y marcados con `syx-allow R03` (lienzo fijo, cabecera, etiquetas 3D, líneas del espectro, panel y escena del corte pegajosos, etiquetas del corte, números fantasma).

## Cifras y peor caso

Los tiempos se dan en el **peor caso** y lo dicen: luz y neutrinos 8 min 27 s (Tierra en el afelio, 152,1 millones de km), escape del fotón hasta 170.000 años (horquilla de 10.000 a 170.000 según el modelo), viento solar lento 5,8 días (300 km/s). El resto viene del modelo solar estándar y de NASA, ESA, NOAA SWPC y Borexino.
