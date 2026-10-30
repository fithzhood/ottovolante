// Ottovolante — la penna. Ripresa dalla demo "Scarabocchi" del sito Stili.
// Ogni tratto di biro è una spezzata ricampionata e fatta tremare con un rumore che cambia
// solo 9 volte al secondo (line boil). Il grafico della funzione invece NON trema: lo disegna
// trattoFermo(), perché lì conta dove taglia l'asse.
// Niente ?? e ?. : deve girare anche sui Safari vecchi degli iPad di scuola.
'use strict';

var ctx = null;                       // lo assegna ottovolante.js
var BOIL = 0;                         // fotogramma di boil
var SEME = 1, CNT = 0;
function seme(s) { SEME = s | 0; CNT = 0; }
function def(v, d) { return v === undefined || v === null ? d : v; }

var BLU = '#1c3591', ROSSO = '#c4212b', MATITA = '#5a5a60', VERDE_INK = '#1f7a3a', AZZURRO_INK = '#1d7fc4', TERRA = '#7a5230';
var GIALLO = 'rgba(255, 232, 40, 0.50)', VERDE = 'rgba(150, 235, 70, 0.55)',
    ROSA = 'rgba(255, 120, 190, 0.42)', AZZURRO = 'rgba(110, 200, 255, 0.50)',
    ROSSO_EV = 'rgba(245, 80, 80, 0.42)';
var CARTA = '#f7f4ec';
var FONT = 'Gloria, "Segoe Print", "Comic Sans MS", cursive';

function hash(a, b, c) {
  var h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x3c6ef372, 0x165667b1) ^ Math.imul((c | 0) + 0x5bd1e995, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Un tratto di biro lungo una spezzata [[x,y],...]: ricampionato, tremolante, ripassato. */
function tratto(pts, o) {
  o = o || {};
  var col = o.col || BLU, lw = o.lw || 1.55, amp = def(o.amp, 1.0), passate = def(o.passate, 2);
  var chiuso = !!o.chiuso, passo = o.passo || 13;
  var k = CNT++;
  var P = chiuso ? pts.concat([pts[0]]) : pts;
  var R = [], i, s;
  for (i = 0; i < P.length - 1; i++) {
    var x0 = P[i][0], y0 = P[i][1], x1 = P[i + 1][0], y1 = P[i + 1][1];
    var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / passo));
    for (s = 0; s < n; s++) R.push([x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n]);
  }
  R.push(P[P.length - 1]);
  if (chiuso && R.length > 2) {
    var f = 0.3 + hash(SEME, k, BOIL + 7) * 0.9;
    R.push([R[1][0] * f + R[0][0] * (1 - f), R[1][1] * f + R[0][1] * (1 - f)]);
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (var p = 0; p < passate; p++) {
    var b = k * 31 + p * 7;
    var ox = (hash(SEME, b, BOIL) - 0.5) * amp * 1.4, oy = (hash(SEME, b + 1, BOIL) - 0.5) * amp * 1.4;
    var Q = R.map(function (q, j) {
      return [q[0] + ox + (hash(SEME + b * 3, j * 2, BOIL) - 0.5) * 2 * amp,
              q[1] + oy + (hash(SEME + b * 3, j * 2 + 1, BOIL) - 0.5) * 2 * amp];
    });
    if (!chiuso && Q.length > 1 && !o.secco) {     // i capi sforano un poco, come un tratto veloce
      var e0 = hash(SEME, b + 2, BOIL) * 2.4, e1 = hash(SEME, b + 3, BOIL) * 3.2;
      var a = Q[0], c = Q[1], L0 = Math.hypot(a[0] - c[0], a[1] - c[1]) || 1;
      Q[0] = [a[0] + (a[0] - c[0]) / L0 * e0, a[1] + (a[1] - c[1]) / L0 * e0];
      var m = Q.length, z = Q[m - 1], y = Q[m - 2], L1 = Math.hypot(z[0] - y[0], z[1] - y[1]) || 1;
      Q[m - 1] = [z[0] + (z[0] - y[0]) / L1 * e1, z[1] + (z[1] - y[1]) / L1 * e1];
    }
    ctx.beginPath();
    ctx.moveTo(Q[0][0], Q[0][1]);
    if (Q.length < 3) ctx.lineTo(Q[Q.length - 1][0], Q[Q.length - 1][1]);
    else {
      for (i = 1; i < Q.length - 1; i++) {
        ctx.quadraticCurveTo(Q[i][0], Q[i][1], (Q[i][0] + Q[i + 1][0]) / 2, (Q[i][1] + Q[i + 1][1]) / 2);
      }
      ctx.lineTo(Q[Q.length - 1][0], Q[Q.length - 1][1]);
    }
    ctx.strokeStyle = col;
    ctx.globalAlpha = def(o.alpha, 0.9) * (p ? 0.55 : 1);
    ctx.lineWidth = lw * (p ? 0.7 : 1) * (0.85 + 0.3 * hash(SEME, b + 4, BOIL));
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.stroke();
    if (o.dash) ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
}
function linea(x0, y0, x1, y1, o) { tratto([[x0, y0], [x1, y1]], o); }

/** Il grafico: inchiostro fermo, ripassato una volta con un filo di scarto (sempre lo stesso). */
function trattoFermo(pezzi, o) {
  o = o || {};
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.col || BLU;
  [[0, 0, 1, o.lw || 2.7], [0.7, 0.5, 0.45, (o.lw || 2.7) * 0.6]].forEach(function (pp) {
    ctx.globalAlpha = pp[2]; ctx.lineWidth = pp[3];
    ctx.beginPath();
    pezzi.forEach(function (pts) {
      pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0] + pp[0], q[1] + pp[1]); else ctx.moveTo(q[0] + pp[0], q[1] + pp[1]); });
    });
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

/** Ellisse a mano: parte da un angolo a caso e si chiude sormontando l'inizio. */
function ellisse(cx, cy, rx, ry, o) {
  o = o || {};
  var k = CNT;
  var a0 = hash(SEME, k, 99) * Math.PI * 2 + (o.fisso ? 0 : hash(SEME, k, BOIL) * 0.5);
  var giro = Math.PI * 2 + 0.25 + hash(SEME, k + 1, BOIL) * 0.45;
  var n = Math.max(10, Math.ceil((rx + ry) * 0.55));
  var pts = [];
  for (var i = 0; i <= n; i++) {
    var a = a0 + giro * i / n;
    var rr = 1 + 0.04 * Math.sin(a * 2 + k) + (i / n) * 0.05 * (hash(SEME, k + 2, BOIL) - 0.5);
    pts.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr]);
  }
  var oo = Object.assign({ passo: 8 }, o);
  tratto(pts, oo);
}
function puntino(x, y, r, col) {
  r = r || 1.7;
  var k = CNT++;
  ctx.fillStyle = col || BLU; ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.arc(x + (hash(SEME, k, BOIL) - 0.5) * 0.9, y + (hash(SEME, k + 1, BOIL) - 0.5) * 0.9, r, 0, Math.PI * 2);
  ctx.fill(); ctx.globalAlpha = 1;
}

/** Tratteggio dentro un poligono: linee parallele (a zig-zag se convesso), mai perfette. */
function tratteggio(poly, o) {
  o = o || {};
  var ang = def(o.ang, -0.85), sp = o.sp || 4.5, zig = def(o.zig, true);
  var k = CNT++;
  var c = Math.cos(-ang), s = Math.sin(-ang);
  var rp = poly.map(function (p) { return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; });
  var y0 = Infinity, y1 = -Infinity, i;
  rp.forEach(function (p) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  var segs = [];
  var off = hash(SEME, k, BOIL) * sp;
  for (var y = y0 + off; y < y1; y += sp) {
    var xs = [];
    for (i = 0; i < rp.length; i++) {
      var a = rp[i], b = rp[(i + 1) % rp.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort(function (p, q) { return p - q; });
    for (i = 0; i + 1 < xs.length; i += 2) segs.push([xs[i], xs[i + 1], y]);
  }
  var C = Math.cos(ang), S = Math.sin(ang);
  function giro(x, yy) { return [x * C - yy * S, x * S + yy * C]; }
  ctx.beginPath();
  var dir = 0, primo = true;
  segs.forEach(function (sg, j) {
    var xa = sg[0], xb = sg[1], yy = sg[2], L = xb - xa;
    xa += (hash(SEME + k, j * 2, BOIL) * 0.9 - 0.25) * Math.min(4, L * 0.3);
    xb -= (hash(SEME + k, j * 2 + 1, BOIL) * 0.9 - 0.25) * Math.min(4, L * 0.3);
    if (xb <= xa) return;
    var dy = (hash(SEME + k, j + 500, BOIL) - 0.5) * sp * 0.35;
    var A = giro(xa, yy + dy), B = giro(xb, yy - dy);
    if (dir) { var t = A; A = B; B = t; }
    if (zig && !primo) ctx.lineTo(A[0], A[1]); else ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    if (zig) dir ^= 1;
    primo = false;
  });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = o.col || BLU; ctx.lineWidth = o.lw || 1.05; ctx.globalAlpha = def(o.alpha, 0.6);
  ctx.stroke(); ctx.globalAlpha = 1;
}

/** Passata di evidenziatore: punta a scalpello, colore in trasparenza. */
function evidenzia(pts, larg, col) {
  var k = CNT++;
  ctx.save();
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  ctx.strokeStyle = col || GIALLO; ctx.lineWidth = larg;
  ctx.beginPath();
  pts.forEach(function (q, i) {
    var jx = (hash(SEME, k * 9 + i, BOIL) - 0.5) * 1.2, jy = (hash(SEME, k * 9 + i + 50, BOIL) - 0.5) * 1.2;
    if (i) ctx.lineTo(q[0] + jx, q[1] + jy); else ctx.moveTo(q[0] + jx, q[1] + jy);
  });
  ctx.stroke();
  ctx.restore();
}

/** Scritta a mano, che trema anche lei. */
function scrivi(txt, x, y, size, col, rot, allinea, base) {
  var k = CNT++;
  ctx.save();
  ctx.translate(x + (hash(SEME, k, BOIL) - 0.5) * 0.9, y + (hash(SEME, k + 1, BOIL) - 0.5) * 0.9);
  ctx.rotate((rot || 0) + (hash(SEME, k + 2, BOIL) - 0.5) * 0.014);
  ctx.font = size + 'px ' + FONT;
  ctx.textAlign = allinea || 'left'; ctx.textBaseline = base || 'alphabetic';
  ctx.fillStyle = col || BLU; ctx.globalAlpha = 0.92;
  ctx.fillText(txt, 0, 0);
  ctx.globalAlpha = 0.32;
  ctx.fillText(txt, 0.6, 0.4);
  ctx.restore();
}
function larghezza(txt, size) { ctx.font = size + 'px ' + FONT; return ctx.measureText(txt).width; }

/** Spezza un testo in righe che stanno in `max` unità. */
function aCapo(txt, size, max) {
  var righe = [];
  txt.split('\n').forEach(function (par) {
    var parole = par.split(' '), r = '';
    parole.forEach(function (w) {
      var prova = r ? r + ' ' + w : w;
      if (r && larghezza(prova, size) > max) { righe.push(r); r = w; } else r = prova;
    });
    righe.push(r);
  });
  return righe;
}

function rettangolo(x, y, w, h, r) {
  var P = [];
  [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]].forEach(function (c) {
    var n = Math.max(3, Math.ceil(r / 4));
    for (var i = 0; i <= n; i++) {
      var a = c[2] + i / n * Math.PI / 2;
      P.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
    }
  });
  return P;
}
function riempi(poly, col, alpha) {
  ctx.globalAlpha = def(alpha, 1); ctx.fillStyle = col;
  ctx.beginPath();
  poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
}
function stellina(x, y, r, col) {
  var P = [];
  for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  tratto(P, { chiuso: true, col: col || BLU, lw: 1.3, passo: 5 });
}

// ── Carta: grana pre-calcolata (fisica: non trema) ──
var grana = null;
function preparaCarta() {
  var g = document.createElement('canvas'); g.width = g.height = 256;
  var c = g.getContext('2d');
  var id = c.createImageData(256, 256), R = rng(7);
  for (var i = 0; i < 256 * 256; i++) {
    var v = 255 - R() * R() * 26;
    id.data[i * 4] = v; id.data[i * 4 + 1] = v; id.data[i * 4 + 2] = v - 2; id.data[i * 4 + 3] = 255;
  }
  c.putImageData(id, 0, 0);
  c.strokeStyle = 'rgba(150,140,120,0.10)'; c.lineWidth = 0.7;
  for (i = 0; i < 70; i++) {
    var x = R() * 256, y = R() * 256, a = R() * 6.28, l = 4 + R() * 12;
    c.beginPath(); c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    c.stroke();
  }
  grana = ctx.createPattern(g, 'repeat');
}
