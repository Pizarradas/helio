// Copia literal de shade() y sus ayudantes de skill--isometric/skills/iso-flat-svg-web/scripts/iso.mjs
// (líneas 28–57): la misma fórmula de tres tonos que iso.mjs e iso_comun.py (regla 3 del kit).
function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const towards = (h, target, amt) => { const d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); };

// Tres tonos por material: top (más claro, ligeramente cálido), left (base), right (más oscuro, ligeramente frío).
// light: 'left' (luz desde arriba-izquierda, por defecto) o 'right' (intercambia los laterales).
export function shade(hex, { light = 'left', up = 12, down = 16, hueShift = 6 } = {}) {
  const [h, s, l] = hexToHsl(hex);
  const top = hslToHex(towards(h, 50, hueShift), s, l + up);
  const mid = hex.toLowerCase();
  const dark = hslToHex(towards(h, 230, hueShift), s * 0.85, l - down);
  return light === 'left' ? { top, left: mid, right: dark } : { top, left: dark, right: mid };
}
