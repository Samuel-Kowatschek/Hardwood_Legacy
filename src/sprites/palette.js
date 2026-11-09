// Sprite-Farben (UI selbst bleibt strikt Blau/Weiss/Orange).
export const OUTLINE = '#0b1026';
export const SKIN = ['#f6d3b3', '#e8b98f', '#c98e5f', '#a8703f', '#7d4f2a', '#5a3820'];
export const HAIR_COLORS = ['#1a1a1a', '#1a1a1a', '#3b2414', '#6b4423', '#c9a24a', '#a0452a'];
export const GREY = '#b8b8b8';
export const GLASS = '#9fd3ff';
export const ACC_COLORS = ['#ffffff', '#1a1a1a', 'trim'];
// Schuh-Stile: [Schuh, Sohle]; 'team' = Jersey-Primaerfarbe
export const SHOES = [['#ffffff', '#1a1a1a'], ['#1a1a1a', '#ffffff'], ['team', '#ffffff'], ['#f97316', '#1a1a1a']];

export function shade(hex, f = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// Jersey-Farben je Team, frei erfunden und nur lose an Originale angelehnt (Schluessel = Original-Kuerzel)
export const TEAM_COLORS = {
  ATL: ['#c8102e', '#e8e8e8'], BOS: ['#1f7a3d', '#f2f2f2'], CLE: ['#7a1f3d', '#e0b04a'], NOP: ['#16305c', '#c4a35a'],
  CHI: ['#b0122b', '#1a1a1a'], DAL: ['#1f5fbf', '#c0c6cc'], DEN: ['#14284d', '#f2b632'], GSW: ['#1d4fa8', '#f5c518'],
  HOU: ['#c41a30', '#d9d9d9'], LAC: ['#c8102e', '#2252a6'], LAL: ['#5b2a86', '#f2b632'], MIA: ['#8a1030', '#f2a33a'],
  MIL: ['#1d4a2e', '#e9dcc0'], MIN: ['#1a3550', '#7ac143'], BKN: ['#1a1a1a', '#f2f2f2'], NYK: ['#1f5fbf', '#f58426'],
  ORL: ['#1f6fc4', '#1a1a1a'], IND: ['#14305c', '#f2b632'], PHI: ['#1e5aa8', '#d8233a'], PHX: ['#3b1f6b', '#e56020'],
  POR: ['#c8102e', '#1a1a1a'], SAC: ['#5a2d82', '#a6acaf'], SAS: ['#2b2b2b', '#c4ced4'], OKC: ['#1f7ec1', '#ef5b2a'],
  TOR: ['#b0122b', '#1a1a1a'], UTA: ['#2a2a5a', '#f9c80e'], MEM: ['#5d76a9', '#12173f'], WAS: ['#1f3a7a', '#e31837'],
  DET: ['#1d42ba', '#c8102e'], CHA: ['#1d8a99', '#2e1a6e'],
};
