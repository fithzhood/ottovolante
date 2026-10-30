// Ottovolante — le funzioni-binario e quello che si sa di ciascuna.
// I punti notevoli sono scritti a mano (esatti, con la loro etichetta per la tabella):
// il gioco non li cerca numericamente, così non sbaglia mai un'etichetta.
'use strict';

var INF = Infinity;
function iv(a, b, aIn, bIn) { return { a: a, b: b, aIn: aIn, bIn: bIn }; }
var R3 = 1 / Math.sqrt(3);

var FUNZIONI = [
  { id: 'retta', breve: 'una retta', formula: 'x − 1',
    finestra: [-4, 5, -4, 4],
    f: function (x) { return x - 1; }, d1: function () { return 1; }, d2: function () { return 0; },
    dominio: [iv(-INF, INF)], rami: [[-INF, INF]], esclusi: [], salti: [],
    zeri: [{ x: 1, m: 1, t: '1' }], staz: [], flessi: [], nonDer: [], pieni: [], vuoti: [],
    curva: false,
    limiti: [{ caso: 'menoinf', val: '−∞' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = ℝ', segno: 'zero in x = 1', derivata: 'f′(x) = 1: sempre crescente' } },

  { id: 'parabola', breve: 'due zeri', formula: 'x² − 4',
    finestra: [-4, 4, -5, 6],
    f: function (x) { return x * x - 4; }, d1: function (x) { return 2 * x; }, d2: function () { return 2; },
    dominio: [iv(-INF, INF)], rami: [[-INF, INF]], esclusi: [], salti: [],
    zeri: [{ x: -2, m: 1, t: '−2' }, { x: 2, m: 1, t: '2' }],
    staz: [{ x: 0, t: '0', tipo: 'min' }], flessi: [], nonDer: [], pieni: [], vuoti: [],
    curva: true,
    limiti: [{ caso: 'menoinf', val: '+∞' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = ℝ', segno: 'zeri in x = −2 e x = 2', derivata: 'minimo in (0, −4)',
               concavita: 'concavità sempre verso l’alto' } },

  { id: 'cubica', breve: 'tre zeri', formula: 'x³ − x',
    finestra: [-2, 2, -1.6, 1.6],
    f: function (x) { return x * x * x - x; }, d1: function (x) { return 3 * x * x - 1; }, d2: function (x) { return 6 * x; },
    dominio: [iv(-INF, INF)], rami: [[-INF, INF]], esclusi: [], salti: [],
    zeri: [{ x: -1, m: 1, t: '−1' }, { x: 0, m: 1, t: '0' }, { x: 1, m: 1, t: '1' }],
    staz: [{ x: -R3, t: '−1/√3', tipo: 'max' }, { x: R3, t: '1/√3', tipo: 'min' }],
    flessi: [{ x: 0, t: '0' }], nonDer: [], pieni: [], vuoti: [],
    curva: true,
    limiti: [{ caso: 'menoinf', val: '−∞' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = ℝ', segno: 'zeri in x = −1, 0, 1', derivata: 'max in x = −1/√3, min in x = 1/√3',
               concavita: 'flesso in (0, 0)' } },

  { id: 'doppio', breve: 'zero doppio', formula: '(x − 1)²(x + 2)',
    finestra: [-3, 3, -2, 6],
    f: function (x) { return (x - 1) * (x - 1) * (x + 2); }, d1: function (x) { return 3 * x * x - 3; }, d2: function (x) { return 6 * x; },
    dominio: [iv(-INF, INF)], rami: [[-INF, INF]], esclusi: [], salti: [],
    zeri: [{ x: -2, m: 1, t: '−2' }, { x: 1, m: 2, t: '1' }],
    staz: [{ x: -1, t: '−1', tipo: 'max' }, { x: 1, t: '1', tipo: 'min' }],
    flessi: [{ x: 0, t: '0' }], nonDer: [], pieni: [], vuoti: [],
    curva: true,
    limiti: [{ caso: 'menoinf', val: '−∞' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = ℝ', segno: 'zeri in x = −2 e x = 1 (doppio: il segno non cambia)',
               derivata: 'max in (−1, 4), min in (1, 0)', concavita: 'flesso in (0, 2)' } },

  { id: 'radice', breve: 'dominio ristretto', formula: '√x',
    finestra: [-2, 9, -1.5, 3.5],
    f: function (x) { return x >= 0 ? Math.sqrt(x) : NaN; },
    d1: function (x) { return x > 0 ? 0.5 / Math.sqrt(x) : NaN; },
    d2: function (x) { return x > 0 ? -0.25 / (x * Math.sqrt(x)) : NaN; },
    dominio: [iv(0, INF, true, false)], rami: [[0, INF]], esclusi: [], salti: [],
    zeri: [{ x: 0, m: 1, t: '0' }], staz: [], flessi: [], nonDer: [{ x: 0, t: '0' }],
    pieni: [[0, 0]], vuoti: [],
    curva: true,
    limiti: [{ x0: 0, t: '0', caso: 'destra', val: '0' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = [0, +∞)', segno: 'zero in x = 0, poi sempre positiva',
               derivata: 'sempre crescente; in 0 la tangente è verticale', concavita: 'concavità sempre verso il basso' } },

  { id: 'iperbole', breve: 'asintoto', formula: '1/x',
    finestra: [-5, 5, -4, 4],
    f: function (x) { return x !== 0 ? 1 / x : NaN; },
    d1: function (x) { return x !== 0 ? -1 / (x * x) : NaN; },
    d2: function (x) { return x !== 0 ? 2 / (x * x * x) : NaN; },
    dominio: [iv(-INF, 0, false, false), iv(0, INF, false, false)], rami: [[-INF, 0], [0, INF]],
    esclusi: [{ x: 0, t: '0', tipo: 'asintoto' }], salti: [],
    zeri: [], staz: [], flessi: [], nonDer: [], pieni: [], vuoti: [],
    curva: true,
    limiti: [{ caso: 'menoinf', val: '0', y: 0 }, { x0: 0, t: '0', caso: 'infinito', sx: '−∞', dx: '+∞' }, { caso: 'piuinf', val: '0', y: 0 }],
    appunti: { dominio: 'D = (−∞, 0) ∪ (0, +∞)', segno: 'mai zero: cambia segno all’asintoto',
               derivata: 'decrescente su ciascuno dei due intervalli',
               concavita: 'verso il basso per x < 0, verso l’alto per x > 0' } },

  { id: 'buco', breve: 'un buco', formula: '(x² − 1)/(x − 1)',
    finestra: [-3, 4, -2, 5],
    f: function (x) { return x !== 1 ? (x * x - 1) / (x - 1) : NaN; },
    d1: function (x) { return x !== 1 ? 1 : NaN; }, d2: function (x) { return x !== 1 ? 0 : NaN; },
    dominio: [iv(-INF, 1, false, false), iv(1, INF, false, false)], rami: [[-INF, 1], [1, INF]],
    esclusi: [{ x: 1, t: '1', tipo: 'buco' }], salti: [],
    zeri: [{ x: -1, m: 1, t: '−1' }], staz: [], flessi: [], nonDer: [], pieni: [], vuoti: [[1, 2]],
    curva: false,
    limiti: [{ caso: 'menoinf', val: '−∞' }, { x0: 1, t: '1', caso: 'buco', val: '2' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = (−∞, 1) ∪ (1, +∞)', segno: 'zero in x = −1',
               derivata: 'f′(x) = 1 dove esiste: sempre crescente' } },

  { id: 'tratti', breve: 'un salto', formula: 'x + 2   se x < 1\nx − 3   se x ≥ 1',
    finestra: [-4, 5, -3.5, 4.5],
    f: function (x) { return x < 1 ? x + 2 : x - 3; },
    d1: function (x) { return x !== 1 ? 1 : NaN; }, d2: function (x) { return x !== 1 ? 0 : NaN; },
    dominio: [iv(-INF, INF)], rami: [[-INF, 1], [1, INF]], esclusi: [],
    salti: [{ x: 1, t: '1' }],
    zeri: [{ x: -2, m: 1, t: '−2' }, { x: 3, m: 1, t: '3' }], staz: [], flessi: [],
    nonDer: [{ x: 1, t: '1' }], pieni: [[1, -2]], vuoti: [[1, 3]],
    curva: false,
    limiti: [{ caso: 'menoinf', val: '−∞' }, { x0: 1, t: '1', caso: 'salto', sx: '3', dx: '−2' }, { caso: 'piuinf', val: '+∞' }],
    appunti: { dominio: 'D = ℝ (il salto non toglie niente)',
               segno: 'zeri in x = −2 e x = 3; cambia segno anche nel salto',
               derivata: 'crescente su ciascun tratto; in x = 1 f′ non esiste' } },

  { id: 'iperbole2', breve: 'asintoto, stesso segno', formula: '1/x²',
    finestra: [-4, 4, -1, 5],
    f: function (x) { return x !== 0 ? 1 / (x * x) : NaN; },
    d1: function (x) { return x !== 0 ? -2 / (x * x * x) : NaN; },
    d2: function (x) { return x !== 0 ? 6 / (x * x * x * x) : NaN; },
    dominio: [iv(-INF, 0, false, false), iv(0, INF, false, false)], rami: [[-INF, 0], [0, INF]],
    esclusi: [{ x: 0, t: '0', tipo: 'asintoto' }], salti: [],
    zeri: [], staz: [], flessi: [], nonDer: [], pieni: [], vuoti: [],
    curva: true,
    limiti: [{ caso: 'menoinf', val: '0', y: 0 }, { x0: 0, t: '0', caso: 'infinito', sx: '+∞', dx: '+∞', val: '+∞' }, { caso: 'piuinf', val: '0', y: 0 }],
    appunti: { dominio: 'D = (−∞, 0) ∪ (0, +∞)', segno: 'sempre positiva',
               derivata: 'crescente per x < 0, decrescente per x > 0', concavita: 'concavità sempre verso l’alto' } }
];

// ── Numeri all'italiana: virgola, meno tipografico, decimali fissi ──
function fmt(v, dec) {
  if (!isFinite(v)) return v > 0 ? '+∞' : '−∞';
  var s;
  if (dec === undefined) s = Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2);
  else s = v.toFixed(dec);
  if (/^-0[.,]?0*$/.test(s)) s = s.slice(1);
  return s.replace('.', ',').replace('-', '−');
}
/** Numeri grandi col punto delle migliaia, piccoli con abbastanza decimali da non sembrare zero. */
function fmtQuota(v) {
  var a = Math.abs(v);
  if (a >= 1000) return (v < 0 ? '−' : '') + String(Math.round(a)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (a >= 100) return fmt(v, 0);
  if (a >= 1 || a === 0) return fmt(v, 2);
  return fmt(v, Math.max(3, Math.ceil(-Math.log(a) / Math.LN10 - 1e-9)));
}
function fmtSegnato(v, dec) { var s = fmt(v, dec); return v > 0 && s.charAt(0) !== '+' && !/^0[,0]*$/.test(s) ? '+' + s : s; }

function inDom(F, x) {
  for (var i = 0; i < F.dominio.length; i++) {
    var d = F.dominio[i];
    if ((x > d.a || (x === d.a && d.aIn)) && (x < d.b || (x === d.b && d.bIn))) return true;
  }
  return false;
}
function haGiro(F, id) { return id !== 'concavita' || F.curva; }

/** L'etichetta di un punto notevole come la si scrive sul quaderno. */
function etichetta(F, x) {
  var liste = [F.zeri, F.staz, F.flessi, F.nonDer, F.esclusi, F.salti, F.limiti];
  for (var i = 0; i < liste.length; i++) for (var j = 0; j < liste[i].length; j++) {
    var p = liste[i][j], px = p.x !== undefined ? p.x : p.x0;
    if (Math.abs(px - x) < 1e-9 && p.t) return p.t;
  }
  return fmt(x);
}
function cerca(lista, x) {
  for (var i = 0; i < lista.length; i++) if (Math.abs(lista[i].x - x) < 1e-9) return lista[i];
  return null;
}

function bordiDominio(F) {
  var b = [];
  F.dominio.forEach(function (d) { if (isFinite(d.a)) b.push(d.a); if (isFinite(d.b)) b.push(d.b); });
  return b;
}
function xs(lista) { return lista.map(function (p) { return p.x; }); }

/** I punti in cui la riga `id` della tabella cambia (o può cambiare). */
function puntiRiga(F, id) {
  var p = bordiDominio(F);
  if (id === 'segno') p = p.concat(xs(F.zeri), xs(F.salti));
  if (id === 'derivata') p = p.concat(xs(F.staz), xs(F.nonDer), xs(F.salti));
  if (id === 'concavita') p = p.concat(xs(F.flessi), xs(F.nonDer), xs(F.salti));
  p.sort(function (a, b) { return a - b; });
  return p.filter(function (v, i) { return i === 0 || Math.abs(v - p[i - 1]) > 1e-9; });
}

function funzioneRiga(F, id) {
  if (id === 'dominio') return function (x) { return inDom(F, x) ? 1 : NaN; };
  if (id === 'segno') return F.f;
  if (id === 'derivata') return F.d1;
  return F.d2;
}
function segnoDi(v) { return isNaN(v) ? NaN : v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0; }

/** Una riga della tabella fra A e B: intervalli col loro segno e punti con la loro scritta. */
function riga(F, id, A, B) {
  var g = funzioneRiga(F, id);
  var punti = puntiRiga(F, id).filter(function (p) { return p > A && p < B; });
  var bordi = [A].concat(punti, [B]);
  var segs = [];
  for (var i = 0; i < bordi.length - 1; i++) {
    var a = bordi[i], b = bordi[i + 1];
    segs.push({ a: a, b: b, s: segnoDi(g((a + b) / 2)) });
  }
  var marchi = punti.map(function (x) {
    var lab = '';
    if (!inDom(F, x)) lab = '∄';
    else if (id === 'segno' && cerca(F.zeri, x)) lab = '0';
    else if ((id === 'derivata' || id === 'concavita') && cerca(F.nonDer, x)) lab = '∄';
    else if (id === 'derivata' && cerca(F.staz, x)) lab = '0';
    else if (id === 'concavita' && cerca(F.flessi, x)) lab = '0';
    return { x: x, lab: lab };
  });
  return { segs: segs, punti: marchi };
}

/** Il ramo (pezzo continuo di binario) che contiene x, oppure -1. */
function ramoDi(F, x) {
  for (var i = 0; i < F.rami.length; i++) {
    var r = F.rami[i];
    if (x >= r[0] && x < r[1]) return i;
  }
  return F.rami.length && x === F.rami[F.rami.length - 1][1] ? F.rami.length - 1 : -1;
}
