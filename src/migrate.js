// Domain-Umzug: Spielstaende von der alten Domain auf die neue mitnehmen.
// localStorage gehoert immer zu genau einer Domain. Deshalb:
//  1. Wer die ALTE Domain oeffnet, wird sofort auf die NEUE weitergeleitet. Seine Spielstaende
//     reisen dabei im Link-Anker (#hwlmigrate=...) mit (der Anker wird nie an einen Server geschickt).
//  2. Die NEUE Domain liest den Anker, fuehrt die Daten mit evtl. vorhandenen zusammen
//     und entfernt den Anker sofort wieder aus der Adresszeile.
// Normales Script (kein Modul), wird im <head> vor allem anderen geladen.
(function () {
  var OLD_HOSTS = ['hardwood-legacy.kowatschek-s.workers.dev'];
  var NEW_ORIGIN = 'https://hardwood-legacy.samus-arcade.com';
  var KEYS = ['hwl_meta_v1', 'hwl_hof_v1', 'hwl_settings_v1', 'hwl_run_v1'];
  var TAG = '#hwlmigrate=';

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* voll/blockiert */ } }
  function parse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

  // 1. Alte Domain: Daten einpacken und weiterleiten (Pfad und ?seed= bleiben erhalten)
  if (OLD_HOSTS.indexOf(location.hostname) >= 0) {
    var data = {}, any = false;
    KEYS.forEach(function (k) { var v = get(k); if (v) { data[k] = v; any = true; } });
    var hash = any ? TAG + encodeURIComponent(JSON.stringify(data)) : '';
    location.replace(NEW_ORIGIN + location.pathname + location.search + hash);
    return;
  }

  // 2. Neue Domain: Daten uebernehmen
  if (location.hash.indexOf(TAG) !== 0) return;
  var inc = parse(decodeURIComponent(location.hash.slice(TAG.length)));
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
  if (!inc || typeof inc !== 'object') return;

  // Zusammenfuehren ist idempotent (mehrfaches Weiterleiten verdoppelt nichts)
  var merge = {
    hwl_settings_v1: function (cur, old) { return cur || old; },
    hwl_run_v1: function (cur, old) { // neuerer Spielstand gewinnt
      var a = parse(cur), b = parse(old);
      if (!a) return old; if (!b) return cur;
      return (b.savedAt || 0) > (a.savedAt || 0) ? old : cur;
    },
    hwl_hof_v1: function (cur, old) { // beide Listen, doppelte Eintraege raus, Top 10
      var list = (parse(cur) || []).concat(parse(old) || []), seen = {}, out = [];
      list.forEach(function (e) {
        var id = [e.first, e.last, e.score, e.date, e.seed].join('|');
        if (!seen[id]) { seen[id] = 1; out.push(e); }
      });
      out.sort(function (x, y) { return y.score - x.score; });
      return JSON.stringify(out.slice(0, 10));
    },
    hwl_meta_v1: function (cur, old) {
      var a = parse(cur), b = parse(old);
      if (!a || !a.runs) return old; if (!b) return cur;
      var m = {}, k;
      for (k in b) m[k] = b[k];
      for (k in a) m[k] = a[k];
      ['runs', 'best', 'totalRings', 'fmvps', 'bestTier'].forEach(function (k) { m[k] = Math.max(a[k] || 0, b[k] || 0); });
      m.scores = (a.scores || []).length >= (b.scores || []).length ? a.scores : b.scores;
      m.unlocked = (a.unlocked || []).concat((b.unlocked || []).filter(function (x) { return (a.unlocked || []).indexOf(x) < 0; }));
      m.ach = {}; for (k in (b.ach || {})) if (b.ach[k]) m.ach[k] = true; for (k in (a.ach || {})) if (a.ach[k]) m.ach[k] = true;
      if (a.dailyDone || b.dailyDone) m.dailyDone = (a.dailyDone || '') > (b.dailyDone || '') ? a.dailyDone : b.dailyDone;
      return JSON.stringify(m);
    },
  };
  KEYS.forEach(function (k) {
    if (typeof inc[k] !== 'string') return;
    var v = merge[k](get(k), inc[k]);
    if (v) set(k, v);
  });
})();
