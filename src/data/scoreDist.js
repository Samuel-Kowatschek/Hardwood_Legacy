// Referenzverteilung des Legacy-Scores (Perzentile 0..100) aus 6000 simulierten Karrieren
// mit gemischten Spielweisen. Dient als Schaetzung, bis es eine echte globale Rangliste (Server) gibt.
// Neu erzeugen: Balancing-Simulation laufen lassen und die Quantile hier eintragen.
export const SCORE_QUANTILES = [10,20,25,28,32,37,42,52,63,72,81,89,98,107,117,126,136,145,154,165,176,183,194,202,210,218,228,237,245,255,263,273,283,293,300,310,319,329,339,347,357,366,375,386,394,403,411,419,427,437,445,454,463,470,481,488,500,511,524,535,546,555,566,575,587,596,608,620,629,643,658,671,682,694,708,724,741,753,770,783,803,823,845,861,883,906,923,952,979,1006,1039,1068,1109,1144,1200,1260,1324,1422,1540,1737,3046];

// Anteil (0-99) der Referenz-Karrieren, die schlechter sind als score
export function percentileOf(score) {
  const q = SCORE_QUANTILES;
  let i = 0;
  while (i < q.length - 1 && q[i + 1] <= score) i++;
  if (score < q[0]) return 0;
  const lo = q[i], hi = q[Math.min(q.length - 1, i + 1)];
  const frac = hi > lo ? (score - lo) / (hi - lo) : 0;
  return Math.max(0, Math.min(99, Math.floor(i + frac)));
}
