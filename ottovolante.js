// Ottovolante — il quaderno: impaginazione, vista, carta, assi, grafico, tabella, appunti,
// fumetti, comandi e ciclo principale. I giri stanno in ov-giri.js.
'use strict';

var VER = ((document.currentScript && document.currentScript.src || '').match(/\?v=\d+/) || [''])[0];
var VERSIONE = (VER.match(/\d+/) || ['dev'])[0];

var tela = document.getElementById('tela'), scena = document.getElementById('scena');
ctx = tela.getContext('2d');

// ── Stato ──
var IDGIRI = ['dominio', 'segno', 'limiti', 'derivata', 'concavita'];
var S = {
  F: FUNZIONI[0], giro: null,
  prog: {}, fatto: {}, cartelli: [], limiti: [],
  play: false, ff: false, autoPausa: true, vel: 1,
  zoom: { z: 1, x0: 0 }, fumetti: []
};
var CLOCK = 0, GT = 0;     // orologio vero (per il tremolio) e tempo di gioco (si ferma in pausa)

function paginaPulita() {
  IDGIRI.forEach(function (id) { S.prog[id] = -INF; S.fatto[id] = false; });
  S.cartelli = []; S.limiti = []; S.fumetti = []; S.orizz = [];
  S.zoom = { z: 1, x0: 0 };
}

// ── Impaginazione, in unità: lo schermo è alto almeno 720 unità ──
var W = 0, H = 0, DPR = 1, U = 1, VW = 1280, VH = 720;
var NOTEW = 260, Gx0 = 0, Gx1 = 0, Gy0 = 0, Gy1 = 0, TAB0 = 0;
var QUAD = 24, sx = 40, sy = 40, ox = 0, oy = 0;
var RIGA0 = 34, RIGAH = 44;

function impagina() {
  W = scena.clientWidth; H = scena.clientHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  tela.width = Math.round(W * DPR); tela.height = Math.round(H * DPR);
  tela.style.width = W + 'px'; tela.style.height = H + 'px';
  U = Math.min(H / 720, W / 1060);
  VW = W / U; VH = H / U;
  NOTEW = Math.max(220, Math.min(300, VW * 0.2));
  TAB0 = VH - (RIGA0 + 4 * RIGAH) - 12;
  Gx0 = NOTEW + 28; Gx1 = VW - 20; Gy0 = 12; Gy1 = TAB0 - 10;
  calcolaVista();
  preparaFondo();
}
function calcolaVista() {
  var w = S.F.finestra;
  var qx = Math.max(1, Math.floor((Gx1 - Gx0) / (QUAD * (w[1] - w[0]))));
  var qy = Math.max(1, Math.floor((Gy1 - Gy0) / (QUAD * (w[3] - w[2]))));
  sx = QUAD * qx; sy = QUAD * qy;
  ox = Math.round(((Gx0 + Gx1) / 2 - (w[0] + w[1]) / 2 * sx) / QUAD) * QUAD;
  oy = Math.round(((Gy0 + Gy1) / 2 + (w[2] + w[3]) / 2 * sy) / QUAD) * QUAD;
}

// mondo → schermo (X con lo zoom dei limiti, Xb senza)
function X(x) { var z = S.zoom; return ox + z.x0 * sx + (x - z.x0) * z.z * sx; }
function Xb(x) { return ox + x * sx; }
function Y(y) { return oy - y * sy; }
function invX(px) { var z = S.zoom; return z.x0 + ((px - ox) / sx - z.x0) / z.z; }
function visA() { return (Gx0 - ox) / sx; }
function visB() { return (Gx1 - ox) / sx; }
function clampY(v) { return Math.max(-4000, Math.min(VH + 4000, v)); }

// ── Carta, quadretti, margine, buchi: non cambiano, si preparano una volta per impaginazione ──
var fondo = null;
function preparaFondo() {
  fondo = document.createElement('canvas');
  fondo.width = tela.width; fondo.height = tela.height;
  var vero = ctx;
  ctx = fondo.getContext('2d');
  ctx.setTransform(DPR * U, 0, 0, DPR * U, 0, 0);
  disegnaCartaVera();
  ctx = vero;
}
function disegnaCarta() {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fondo, 0, 0);
  ctx.restore();
}
function disegnaCartaVera() {
  ctx.fillStyle = CARTA; ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grana; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
  ctx.strokeStyle = 'rgba(90, 130, 185, 0.30)'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (var x = 0; x < VW; x += QUAD) { ctx.moveTo(x, 0); ctx.lineTo(x, VH); }
  for (var y = 0; y < VH; y += QUAD) { ctx.moveTo(0, y); ctx.lineTo(VW, y); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214, 60, 70, 0.55)'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.moveTo(NOTEW, 0); ctx.lineTo(NOTEW, VH); ctx.moveTo(NOTEW + 4, 0); ctx.lineTo(NOTEW + 4, VH); ctx.stroke();
  for (y = 40; y < VH; y += 88) {
    ctx.fillStyle = '#3a2f26';
    ctx.beginPath(); ctx.arc(18, y, 6.5, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(120, 100, 80, 0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(18, y, 7.2, 0.4, 2.8); ctx.stroke();
  }
  var g = ctx.createLinearGradient(0, 0, 40, 0);
  g.addColorStop(0, 'rgba(60,45,30,0.18)'); g.addColorStop(1, 'rgba(60,45,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 40, VH);
}

// ── Assi ──
function passoTacche(s) { return s >= 40 ? 1 : s >= 20 ? 2 : 5; }
function disegnaAssi() {
  seme(500);
  var y0 = Y(0), x0 = X(0);
  if (y0 > Gy0 && y0 < Gy1) {
    tratto([[Gx0, y0], [Gx1, y0]], { lw: 1.6, amp: 0.35, passo: 40 });
    tratto([[Gx1 - 11, y0 - 6], [Gx1, y0], [Gx1 - 11, y0 + 6]], { lw: 1.5, amp: 0.3 });
    scrivi('x', Gx1 - 10, y0 + 24, 18, BLU);
  }
  if (x0 > Gx0 && x0 < Gx1) {
    tratto([[x0, Gy1], [x0, Gy0]], { lw: 1.6, amp: 0.35, passo: 40 });
    tratto([[x0 - 6, Gy0 + 11], [x0, Gy0], [x0 + 6, Gy0 + 11]], { lw: 1.5, amp: 0.3 });
    scrivi('y', x0 + 10, Gy0 + 16, 18, BLU);
  }
  var lab = 15, k, t;
  if (Math.abs(S.zoom.z - 1) < 0.02) {
    var px = passoTacche(sx);
    for (k = Math.ceil(visA() / px) * px; k <= visB(); k += px) {
      if (k === 0 || X(k) > Gx1 - 24) continue;
      t = X(k);
      linea(t, y0 - 4, t, y0 + 4, { lw: 1.1, passate: 1, amp: 0.3, col: MATITA });
      scrivi(fmt(k), t, y0 + 19, lab, MATITA, 0, 'center');
    }
  } else if (S.zoom.z < 1) {                     // vista allontanata (limiti a ±∞): tacche a potenze di 10
    var pz = Math.pow(10, Math.ceil(Math.log(70 / (S.zoom.z * sx)) / Math.LN10));
    for (k = Math.ceil(invX(Gx0) / pz) * pz; k <= invX(Gx1); k += pz) {
      if (Math.abs(k) < pz / 2 || X(k) > Gx1 - 30) continue;
      t = X(k);
      linea(t, y0 - 4, t, y0 + 4, { lw: 1.1, passate: 1, amp: 0.3, col: MATITA });
      scrivi(Math.abs(k) >= 1000 ? fmtQuota(k) : fmt(k), t, y0 + 19, lab, MATITA, 0, 'center');
    }
    var rz = Math.round(1 / S.zoom.z);
    scrivi('vista allontanata ×' + (rz >= 1000 ? fmtQuota(rz) : fmt(rz)), Gx1 - 8, Gy1 - 8, 16, MATITA, 0, 'right');
  } else {
    t = X(S.zoom.x0);
    linea(t, y0 - 5, t, y0 + 5, { lw: 1.2, passate: 1, amp: 0.3, col: MATITA });
    scrivi(etichetta(S.F, S.zoom.x0), t, y0 + 19, lab, MATITA, 0, 'center');
    scrivi('zoom ×' + fmt(S.zoom.z, 0), Gx1 - 8, Gy1 - 8, 16, MATITA, 0, 'right');
  }
  var py = passoTacche(sy);
  for (k = Math.ceil((oy - Gy1) / sy / py) * py; k <= (oy - Gy0) / sy; k += py) {
    if (k === 0 || Y(k) < Gy0 + 20) continue;
    t = Y(k);
    linea(x0 - 4, t, x0 + 4, t, { lw: 1.1, passate: 1, amp: 0.3, col: MATITA });
    scrivi(fmt(k), x0 - 8, t + 5, lab, MATITA, 0, 'right');
  }
  if (x0 > Gx0 && x0 < Gx1 && y0 > Gy0 && y0 < Gy1 && S.zoom.z < 1.02) scrivi('0', x0 - 8, y0 + 19, lab, MATITA, 0, 'right');
  if (x0 <= Gx0 || x0 >= Gx1) {                  // l'asse y è fuori (zoom dei limiti): un righello delle quote
    var rx = Gx0 + 30;
    linea(rx, Gy1 - 6, rx, Gy0 + 6, { lw: 1.2, passate: 1, col: MATITA, amp: 0.3, passo: 40 });
    for (k = Math.ceil((oy - Gy1) / sy / py) * py; k <= (oy - Gy0) / sy; k += py) {
      t = Y(k);
      if (t < Gy0 + 10 || t > Gy1 - 10) continue;
      linea(rx - 5, t, rx + 5, t, { lw: 1.1, passate: 1, amp: 0.3, col: MATITA });
      scrivi(fmt(k), rx - 9, t + 5, lab, MATITA, 0, 'right');
    }
  }
}

// ── Il grafico ──
function pezziCurva() {
  var F = S.F, pezzi = [];
  var A = invX(Gx0 - 6), B = invX(Gx1 + 6);
  F.rami.forEach(function (r) {
    var a = Math.max(r[0], A), b = Math.min(r[1], B);
    if (a >= b) return;
    var e = 1e-7 * Math.max(1, Math.abs(a), Math.abs(b)) / S.zoom.z;
    var n = Math.ceil((X(b) - X(a)) / 1.5) + 1, pts = [];
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n;
      if (i === 0 && a === r[0]) x += e;
      if (i === n && b === r[1]) x -= e;
      var y = F.f(x);
      if (!isFinite(y)) { if (pts.length > 1) pezzi.push(pts); pts = []; continue; }
      pts.push([X(x), clampY(Y(y))]);
    }
    if (pts.length > 1) pezzi.push(pts);
  });
  return pezzi;
}
function disegnaGrafico() {
  trattoFermo(pezziCurva(), { lw: 2.8 });
  seme(600);
  S.F.pieni.forEach(function (p) { puntino(X(p[0]), Y(p[1]), 4.6, BLU); });
}
function disegnaVuoti() {           // pallini vuoti: coprono il binario, quindi vanno sopra e in source-over
  S.F.vuoti.forEach(function (p) {
    var x = X(p[0]), y = Y(p[1]);
    ctx.fillStyle = CARTA; ctx.beginPath(); ctx.arc(x, y, 5.2, 0, 7); ctx.fill();
    seme(700 + p[0] * 13);
    ellisse(x, y, 5.2, 5.2, { lw: 1.8, fisso: true, amp: 0.3 });
  });
}

// ── La tabella dei segni, allineata sotto il grafico ──
var RIGHE = [['dominio', 'dominio'], ['segno', 'segno di f'], ['derivata', 'segno di f′'], ['concavita', 'segno di f″']];
function disegnaTabella() {
  var F = S.F, A = visA(), B = visB(), vis = RIGHE.filter(function (r) { return S.prog[r[0]] > -INF; });
  seme(800);
  if (!vis.length) {
    scrivi(S.giro ? '' : 'scegli un giro qui sopra ↑', (Gx0 + Gx1) / 2, TAB0 + 90, 24, MATITA, -0.02, 'center');
    return;
  }
  var yTop = TAB0 + 6, yFine = TAB0 + RIGA0 + vis.length * RIGAH;
  ctx.save();
  if (S.zoom.z > 1.02) ctx.globalAlpha = 0.25;
  // i punti di tutte le righe visibili, con la loro x scritta in testa
  var tutti = [];
  vis.forEach(function (r) {
    puntiRiga(F, r[0]).forEach(function (x) {
      if (x > A && x < B && x <= S.prog[r[0]] && tutti.every(function (v) { return Math.abs(v - x) > 1e-9; })) tutti.push(x);
    });
  });
  scrivi('x', Gx0 - 14, yTop + 20, 20, BLU, 0, 'right');
  linea(Gx0 - 50, yTop + 28, Gx1, yTop + 28, { lw: 1.2, passate: 1, col: MATITA, amp: 0.4, passo: 40 });
  tutti.forEach(function (x) {
    scrivi(etichetta(F, x), Xb(x), yTop + 20, 18, BLU, 0, 'center');
    linea(Xb(x), yTop + 30, Xb(x), yFine, { lw: 0.9, passate: 1, col: MATITA, amp: 0.3, dash: [5, 5] });
  });
  vis.forEach(function (r, i) {
    var id = r[0], yc = TAB0 + RIGA0 + i * RIGAH + RIGAH / 2 + 4;
    var lim = Math.min(B, S.prog[id]);
    scrivi(r[1], Gx0 - 14, yc + 6, 19, ROSSO, 0, 'right');
    var R = riga(F, id, A, B);
    R.segs.forEach(function (s) {
      if (s.a >= lim) return;
      var xa = Xb(s.a) + 4, xb = Xb(Math.min(s.b, lim)) - 4, m = (xa + xb) / 2;
      if (xb - xa < 6) return;
      if (isNaN(s.s)) {
        tratteggio([[xa, yc - 7], [xb, yc - 7], [xb, yc + 7], [xa, yc + 7]], { col: MATITA, sp: 5, alpha: 0.5, ang: 0.9 });
        return;
      }
      if (s.s > 0 || id === 'dominio') linea(xa, yc, xb, yc, { lw: 2.1, passo: 30, amp: 0.5 });
      else if (s.s < 0) linea(xa, yc, xb, yc, { lw: 2.1, passo: 30, amp: 0.5, dash: [8, 7] });
      else linea(xa, yc, xb, yc, { lw: 1, passate: 1, col: MATITA, amp: 0.4 });
      if (id === 'dominio' || xb - xa < 30) return;
      var seg = s.s > 0 ? '+' : s.s < 0 ? '−' : '0';
      scrivi(seg, m - (id === 'segno' ? 0 : 14), yc - 6, s.s < 0 ? 34 : 26, s.s > 0 ? ROSSO : s.s < 0 ? AZZURRO_INK : BLU, 0, 'center');
      if (id === 'derivata' && s.s) freccina(m + 12, yc - 13, s.s);
      if (id === 'concavita' && s.s) scrivi(s.s > 0 ? '∪' : '∩', m + 14, yc - 6, 24, BLU, 0, 'center');
    });
    R.punti.forEach(function (p) {
      if (p.x > lim) return;
      var x = Xb(p.x);
      if (p.lab === '∄') {
        linea(x - 2.5, yc - 14, x - 2.5, yc + 14, { lw: 1.4, passate: 1 });
        linea(x + 2.5, yc - 14, x + 2.5, yc + 14, { lw: 1.4, passate: 1 });
        scrivi('∄', x + 8, yc - 12, 16, ROSSO, 0, 'left');
      } else if (p.lab) {
        ctx.save(); ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = CARTA; ctx.beginPath(); ctx.arc(x, yc, 10, 0, 7); ctx.fill(); ctx.restore();
        scrivi(p.lab, x, yc + 7, 20, BLU, 0, 'center');
      }
    });
  });
  ctx.restore();
}
function freccina(x, y, s) {
  var d = s > 0 ? -1 : 1;
  tratto([[x - 9, y - d * 7], [x + 9, y + d * 7]], { lw: 1.6, passate: 1 });
  tratto([[x + 1, y + d * 7], [x + 9, y + d * 7], [x + 7, y + d * -1]], { lw: 1.6, passate: 1 });
}

// ── La colonna degli appunti ──
var NOMI = { dominio: 'dominio', segno: 'segno', derivata: 'derivata', concavita: 'concavità' };
function disegnaAppunti() {
  var F = S.F, x = 46, y = 50, w = NOTEW - x - 14;
  seme(900);
  scrivi('f(x) =', x, y, 22, BLU, -0.02);
  var righe = F.formula.split('\n'), dim = righe.length > 1 ? 21 : 30;
  y += righe.length > 1 ? 34 : 44;
  if (righe.length > 1) tratto([[x + 8, y - 26], [x + 2, y - 22], [x + 2, y + 6], [x - 4, y + 10], [x + 2, y + 14], [x + 2, y + 40], [x + 8, y + 46]], { lw: 1.6, passo: 6 });
  righe.forEach(function (r, i) {
    var lx = x + (righe.length > 1 ? 14 : 4);
    evidenzia([[lx - 4, y - dim * 0.35], [lx + larghezza(r, dim) + 6, y - dim * 0.38]], dim * 0.9, GIALLO);
    scrivi(r, lx, y, dim, BLU, -0.015);
    y += dim + 14;
  });
  y += 8;
  var blocchi = [];
  ['dominio', 'segno', 'derivata', 'concavita'].forEach(function (id) {
    if (S.fatto[id] && F.appunti[id]) blocchi.push([NOMI[id], [F.appunti[id]]]);
  });
  if (S.limiti.length) blocchi.push(['limiti', S.limiti]);
  // gli appunti non devono mai invadere la tabella: si rimpicciolisce la grafia finché ci stanno
  var dims = [18, 16, 14, 12], d = dims[0];
  for (var i = 0; i < dims.length; i++) {
    d = dims[i];
    if (y + altezzaAppunti(blocchi, d, w) < TAB0 - 6) break;
  }
  blocchi.forEach(function (b) {
    scrivi(b[0] + ':', x, y, d - 1, ROSSO); y += d + 6;
    b[1].forEach(function (t) { aCapo(t, d, w).forEach(function (r) { scrivi(r, x + 6, y, d, BLU); y += d + 6; }); });
    y += 6;
  });
  scrivi('v' + VERSIONE, 30, VH - 10, 12, MATITA);
}
function altezzaAppunti(blocchi, d, w) {
  var h = 0;
  blocchi.forEach(function (b) {
    h += d + 6 + 6;
    b[1].forEach(function (t) { h += aCapo(t, d, w).length * (d + 6); });
  });
  return h;
}

// ── Fumetti ──
function fumetto(chi, testo, dur) {
  S.fumetti = S.fumetti.filter(function (b) { return b.chi !== chi; });
  S.fumetti.push({ chi: chi, testo: testo, t0: GT, dur: dur || 3.6 });
}
function disegnaFumetti() {
  S.fumetti = S.fumetti.filter(function (b) { return GT - b.t0 < b.dur; });
  S.fumetti.forEach(function (b, n) {
    var an = S.giro && S.giro.ancora(b.chi);
    if (!an) return;
    var ax = an[0], ay = an[1], testo = b.testo;
    if (ay < Gy0 + 20) { ay = Gy0 + 20; testo = '↑ ' + testo; }
    if (ay > Gy1 - 20) { ay = Gy1 - 20; testo = '↓ ' + testo; }
    ax = Math.max(Gx0 + 10, Math.min(Gx1 - 10, ax));
    var size = 21, righe = aCapo(testo, size, 320);
    var w = 0; righe.forEach(function (r) { w = Math.max(w, larghezza(r, size)); });
    w += 30; var h = righe.length * 27 + 18;
    var lato = b.chi === 'sx' ? -1 : 1;
    var bx = lato > 0 ? ax + 16 : ax - 16 - w, by = ay - 34 - h, sotto = false;
    bx = Math.max(Gx0 + 4, Math.min(Gx1 - 4 - w, bx));
    if (by < Gy0 + 4) { by = ay + 34; sotto = true; }
    by = Math.max(Gy0 + 4, Math.min(Gy1 - 4 - h, by));
    var age = GT - b.t0, a = Math.min(1, age / 0.15, (b.dur - age) / 0.3);
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    var tx = Math.max(bx + 18, Math.min(bx + w - 18, ax)), ey = sotto ? by : by + h;
    var coda = [[tx - 9, ey], [ax + (tx > ax ? 4 : -4), sotto ? ay + 12 : ay - 12], [tx + 9, ey]];
    var corpo = rettangolo(bx, by, w, h, 14);
    riempi(corpo, '#fffdf6', 0.94); riempi(coda, '#fffdf6', 0.94);
    seme(1000 + n * 50 + (b.chi === 'dx' ? 7 : 0));
    var col = b.chi === 'dx' ? ROSSO : BLU;
    tratto(corpo, { chiuso: true, lw: 1.7, passo: 10, col: col });
    tratto(coda, { lw: 1.5, col: col });
    righe.forEach(function (r, i) { scrivi(r, bx + 15, by + 31 + i * 27, size, col); });
    ctx.restore();
  });
}

// ── Disegno di un fotogramma ──
function disegna() {
  ctx.setTransform(DPR * U, 0, 0, DPR * U, 0, 0);
  disegnaCarta();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  disegnaAppunti();
  ctx.save();
  ctx.beginPath(); ctx.rect(Gx0 - 4, Gy0 - 4, Gx1 - Gx0 + 8, Gy1 - Gy0 + 8); ctx.clip();
  segniSotto();
  if (S.giro) S.giro.disegnaSfondo();
  disegnaAssi();
  disegnaGrafico();
  segniSopra();
  ctx.restore();
  disegnaTabella();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.rect(Gx0 - 4, Gy0 - 4, Gx1 - Gx0 + 8, Gy1 - Gy0 + 8); ctx.clip();
  disegnaVuoti();
  ctx.globalCompositeOperation = 'multiply';
  disegnaCartelli();
  if (S.giro) S.giro.disegnaAttori();
  ctx.restore();
  disegnaFumetti();
}

// ── Comandi ──
var $ = function (id) { return document.getElementById(id); };
function scegliFunzione(i) {
  S.F = FUNZIONI[i];
  S.giro = null; S.play = false; S.ff = false;
  paginaPulita(); calcolaVista(); aggiornaComandi();
}
function scegliGiro(id) {
  if (!haGiro(S.F, id)) return;
  S.zoom = { z: 1, x0: 0 }; S.fumetti = [];
  S.giro = creaGiro(id);
  S.play = true; S.ff = false;
  aggiornaComandi();
}
function aggiornaComandi() {
  var F = S.F;
  $('btnFunz').innerHTML = '<span class="fx">f(x) =</span> ' + (F.formula.indexOf('\n') >= 0 ? 'a tratti' : F.formula) + ' <span class="giu">▾</span>';
  document.querySelectorAll('#giri button').forEach(function (b) {
    var id = b.getAttribute('data-giro');
    b.disabled = !haGiro(F, id);
    b.title = b.disabled ? 'È una retta: non ha curvatura' : '';
    b.classList.toggle('attivo', !!(S.giro && S.giro.id === id));
  });
  $('btnPlay').textContent = S.play ? '⏸' : '▶';
  $('btnPlay').title = S.play ? 'Pausa (spazio)' : 'Avanti (spazio)';
  var c = !S.giro || S.giro.finito;
  $('btnPlay').disabled = c; $('btnNext').disabled = c;
  $('btnRifai').disabled = !S.giro;
  document.querySelectorAll('#vel button').forEach(function (b) { b.classList.toggle('attivo', +b.getAttribute('data-v') === S.vel); });
  $('chkPausa').checked = S.autoPausa;
}
function playPausa() {
  if (!S.giro || S.giro.finito) return;
  S.play = !S.play; S.ff = false; aggiornaComandi();
}
function prossimo() {
  if (!S.giro || S.giro.finito) return;
  S.play = true; S.ff = true; aggiornaComandi();
}

function costruisciMenu() {
  var m = $('menuFunz');
  m.innerHTML = '';
  FUNZIONI.forEach(function (F, i) {
    var b = document.createElement('button');
    b.innerHTML = '<span class="num">' + (i + 1) + '</span><span class="form">' + F.formula.replace(/\n/g, '<br>') + '</span><span class="tag">' + F.breve + '</span>';
    b.addEventListener('click', function () { m.hidden = true; scegliFunzione(i); });
    m.appendChild(b);
  });
  $('btnFunz').addEventListener('click', function (e) { e.stopPropagation(); m.hidden = !m.hidden; });
  document.addEventListener('click', function (e) { if (!m.contains(e.target)) m.hidden = true; });
  document.querySelectorAll('#giri button').forEach(function (b) {
    b.addEventListener('click', function () { scegliGiro(b.getAttribute('data-giro')); });
  });
  $('btnPlay').addEventListener('click', playPausa);
  $('btnNext').addEventListener('click', prossimo);
  $('btnRifai').addEventListener('click', function () { if (S.giro) scegliGiro(S.giro.id); });
  $('btnPulita').addEventListener('click', function () { S.giro = null; S.play = false; paginaPulita(); aggiornaComandi(); });
  document.querySelectorAll('#vel button').forEach(function (b) {
    b.addEventListener('click', function () { S.vel = +b.getAttribute('data-v'); aggiornaComandi(); });
  });
  $('chkPausa').addEventListener('change', function () { S.autoPausa = $('chkPausa').checked; });
  document.addEventListener('keydown', function (e) {
    if (e.key === ' ') { e.preventDefault(); playPausa(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); prossimo(); }
  });
}

// ── Ciclo ──
var ultimo = 0, eraPlay = null, eraFinito = null;
function passo(dt, muto) {
  CLOCK += dt;
  BOIL = Math.floor(CLOCK * 9);
  if (S.giro) S.giro.aggiorna(dt);
  var fin = !!(S.giro && S.giro.finito);
  if (S.play !== eraPlay || fin !== eraFinito) { eraPlay = S.play; eraFinito = fin; aggiornaComandi(); }
  if (!muto) disegna();
}
function ciclo(t) {
  var dt = ultimo ? Math.min(0.05, (t - ultimo) / 1000) : 0;
  ultimo = t;
  passo(dt);
  requestAnimationFrame(ciclo);
}
// gancio per il collaudo: in headless il tempo non scorre, lo si fa avanzare a mano
window.OV = {
  S: S, scegliFunzione: scegliFunzione, scegliGiro: scegliGiro, prossimo: prossimo,
  tick: function (ms) {
    for (var t = 0; t < ms && (S.play || t === 0); t += 1000 / 60) passo(1 / 60, true);
    disegna();
  }
};

function avvia() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  preparaCarta();
  paginaPulita();
  costruisciMenu();
  impagina();
  aggiornaComandi();
  window.addEventListener('resize', impagina);
  // collaudo: ?f=5&g=dominio&n=2 → funzione, giro, e quanti "prossimo punto" eseguire
  var q = {};
  location.search.replace(/[?&](\w+)=([^&]*)/g, function (m, k, v) { q[k] = decodeURIComponent(v); });
  if (q.f) {
    scegliFunzione(+q.f - 1);
    if (q.g) q.g.split(',').forEach(function (id, j, tutti) {
      var ultimo = j === tutti.length - 1;
      scegliGiro(id); window.OV.tick(+(q.t || 300));
      for (var n = 0; n < (ultimo ? +(q.n || 0) : 99); n++) { prossimo(); window.OV.tick(60000); }
      if (ultimo && q.t2) { S.play = true; window.OV.tick(+q.t2); }
    });
  }
  if (q.bench) {                                 // banco: quanto costa un fotogramma
    var c0 = performance.now();
    for (var i = 0; i < 60; i++) { passo(1 / 60); }
    ctx.getImageData(0, 0, 1, 1);
    document.title = 'BENCH ' + ((performance.now() - c0) / 60).toFixed(1) + ' ms';
  }
  requestAnimationFrame(ciclo);
}
(function () {
  var fatto = false;
  function via() { if (!fatto) { fatto = true; avvia(); } }
  try {
    var f = new FontFace('Gloria', 'url(assets/GloriaHallelujah.ttf)');
    f.load().then(function () { document.fonts.add(f); via(); }, via);
    setTimeout(via, 2500);
  } catch (e) { via(); }
})();
