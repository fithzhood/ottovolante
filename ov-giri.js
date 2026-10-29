// Ottovolante — i giri. Ogni giro è una lista di passi (cammina, salta, dì, fai, aspetta) che un
// esecutore svolge uno dopo l'altro. Un passo "che ferma" è un punto notevole: con la pausa
// automatica il giro si ferma lì, e ⏭ corre fino al prossimo.
'use strict';

var VEL = 140;             // unità al secondo lungo il binario (velocità costante)
var OMINO = 1.3;           // scala degli omini: si devono vedere dal fondo dell'aula

function lerp(a, b, u) { return a + (b - a) * u; }
function pendenza(F, x) {
  var h = 1e-5 * Math.max(1, Math.abs(x)), a = F.f(x - h), b = F.f(x + h), c = F.f(x);
  if (isFinite(a) && isFinite(b)) return (b - a) / (2 * h);
  if (isFinite(b) && isFinite(c)) return (b - c) / h;
  if (isFinite(a) && isFinite(c)) return (c - a) / h;
  return 0;
}
function fuoriY(ys) { return !isFinite(ys) || ys < Gy0 - 40 || ys > Gy1 + 40; }

// ── I passi ──
function Cammina(x) { return { esegui: function (g, k) { return g.cammina(x, k); } }; }
function Salta(x, y) { var p = {}; p.esegui = function (g, k) { return g.salta(p, x, y, k); }; return p; }
function Di(chi, testo, ferma, dur) {
  return { ferma: !!ferma, esegui: function () { fumetto(chi, testo, dur || (ferma ? 5 : 3.6)); return true; } };
}
function Fai(fn) { return { esegui: function (g) { fn(g); return true; } }; }
function Attendi(s) { var p = { t: 0 }; p.esegui = function (g, k) { p.t += k; return p.t >= s; }; return p; }
function Tween(dur, inizio, fn) {
  var p = { t: -1 };
  p.esegui = function (g, k) {
    if (p.t < 0) { p.t = 0; inizio(g, p); }
    p.t += k;
    var u = Math.min(1, p.t / dur);
    fn(g, u * u * (3 - 2 * u), p);
    return u >= 1;
  };
  return p;
}
function fine(g) { S.prog[g.id] = INF; S.fatto[g.id] = true; }
function posa(nome) { return Fai(function (g) { g.W.posa = nome; }); }

/** Gli eventi di certi tipi fra a e b, in ordine. */
function eventi(F, a, b, tipi) {
  var ev = [];
  tipi.forEach(function (t) {
    F[t].forEach(function (p) { if (p.x > a + 1e-9 && p.x < b) ev.push({ x: p.x, tipo: t, dati: p }); });
  });
  ev.sort(function (p, q) { return p.x - q.x; });
  return ev;
}

// ── L'esecutore ──
function creaGiro(id) {
  var F = S.F;
  var g = {
    id: id, F: F, passi: [], i: 0, finito: false, modo: 'binario', amici: null,
    W: { x: 0, y: 0, hop: null, posa: 'cammina', passi: 0 },
    A: visA() + 14 / sx, B: visB() - 14 / sx
  };
  S.prog[id] = -INF; S.fatto[id] = false;
  if (id === 'dominio') S.cartelli = [];
  if (id === 'limiti') S.limiti = [];
  COSTRUTTORI[id](g, F);
  g.aggiorna = aggiornaGiro;
  g.cammina = cammina;
  g.salta = salta;
  g.pos = posizione;
  g.ancora = ancora;
  g.disegnaSfondo = disegnaSfondo;
  g.disegnaAttori = disegnaAttori;
  if (g.modo !== 'limiti') S.prog[id] = g.W.x;
  return g;
}
function aggiornaGiro(dt) {
  if (!S.play || this.finito) return;
  var k = dt * S.vel * (S.ff ? 6 : 1), n = 0;
  GT += k;
  while (this.i < this.passi.length && n++ < 40) {
    var p = this.passi[this.i];
    if (!p.esegui(this, k)) break;
    this.i++; k = 0;
    if (p.ferma && (S.autoPausa || S.ff)) { S.play = false; S.ff = false; break; }
  }
  if (this.modo !== 'limiti') S.prog[this.id] = Math.max(S.prog[this.id], this.W.x);
  if (this.i >= this.passi.length) {
    this.finito = true; S.play = false; S.ff = false;
    if (this.modo === 'limiti') S.zoom = { z: 1, x0: 0 };
  }
}
function cammina(xTo, k) {
  var W = this.W, F = this.F;
  if (W.x >= xTo) return true;
  var px = VEL * k;
  if (this.modo === 'asse') { W.x = Math.min(xTo, W.x + px / sx); W.y = 0; }
  else {
    var y = F.f(W.x);
    if (fuoriY(Y(y))) W.x = Math.min(xTo, W.x + (this.B - this.A) * 0.45 * k);   // fuori dallo schermo: si corre
    else {
      var sl = pendenza(F, W.x) * sy / sx;
      W.x = Math.min(xTo, W.x + px / (sx * Math.sqrt(1 + sl * sl)));
    }
    W.y = F.f(W.x);
  }
  W.passi += px; W.hop = null;
  return W.x >= xTo;
}
function salta(p, xTo, yTo, k) {
  var W = this.W, asse = this.modo === 'asse';
  if (!p.da) {
    p.da = [W.x, asse ? 0 : W.y];
    p.a = [xTo, yTo !== undefined ? yTo : asse ? 0 : this.F.f(xTo)];
    p.nascosto = fuoriY(Y(p.da[1])) && fuoriY(Y(p.a[1]));
    p.dur = p.nascosto ? 0.3 : 0.75; p.t = 0;
  }
  p.t += k;
  var u = Math.min(1, p.t / p.dur);
  W.x = lerp(p.da[0], p.a[0], u);
  W.hop = p.nascosto ? 'nascosto' : [lerp(X(p.da[0]), X(p.a[0]), u),
    lerp(clampY(Y(p.da[1])), clampY(Y(p.a[1])), u) - 46 * Math.sin(Math.PI * u)];
  if (u >= 1) { W.x = p.a[0]; W.y = p.a[1]; W.hop = null; p.da = null; return true; }
  return false;
}
function posizione() {
  var W = this.W;
  if (W.hop === 'nascosto') return null;
  if (W.hop) return W.hop;
  var ys = Y(this.modo === 'asse' ? 0 : W.y);
  return fuoriY(ys) ? null : [X(W.x), ys];
}
function ancora(chi) {
  if (this.modo === 'limiti') {
    var a = this.amici && this.amici[chi];
    if (!a) return null;
    var y = this.F.f(a.x);
    return [X(a.x) + (chi === 'sx' ? -10 : 10), clampY(Y(isFinite(y) ? y : 0)) - 56 * OMINO];
  }
  var p = this.pos();
  if (!p) return null;
  if (this.id === 'concavita') { var a2 = attrezzo(this); if (a2) return [a2.testa[0], a2.testa[1] - 10]; }
  return [p[0], p[1] - 58 * OMINO];
}

// ── Il dominio: un omino a piedi sull'asse x, che pianta cartelli ──
var COSTRUTTORI = {};
COSTRUTTORI.dominio = function (g, F) {
  g.modo = 'asse';
  var A = g.A, B = g.B, P = g.passi, d = 24 / sx, x = A;
  var ints = F.dominio.filter(function (v) { return v.b > A && v.a < B; });
  g.W.x = A;
  function pianta(px, testo, lato) { return Fai(function () { S.cartelli.push({ x: px, testo: testo, lato: lato, t0: CLOCK }); }); }
  ints.forEach(function (iv, n) {
    var t;
    if (iv.a > x + 1e-9) {
      if (n === 0) P.push(Di('W', 'Qui il binario non c’è: sono fuori dal dominio'));
      P.push(Cammina(iv.a));
      t = etichetta(F, iv.a);
      P.push(pianta(iv.a, (iv.aIn ? '[' : '(') + t, 1));
      P.push(Di('W', iv.aIn ? 'Qui il binario comincia, e x = ' + t + ' c’è: parentesi quadra!'
                            : 'Qui il binario comincia, ma x = ' + t + ' è escluso: parentesi tonda', true));
    } else if (n === 0) {
      P.push(pianta(A, '(−∞', 1));
      P.push(Di('W', 'Parto da meno infinito e pianto il primo cartello'));
    }
    F.salti.forEach(function (s) {
      if (s.x > Math.max(iv.a, A) && s.x < Math.min(iv.b, B)) {
        P.push(Cammina(s.x), posa('perplesso'));
        P.push(Di('W', 'Il binario qui salta… ma un punto c’è: il dominio continua!', true));
        P.push(Attendi(0.6), posa('cammina'));
      }
    });
    if (iv.b >= B) { P.push(Cammina(B), pianta(B, '+∞)', -1)); x = B; return; }
    t = etichetta(F, iv.b);
    var dopo = ints[n + 1];
    if (dopo && Math.abs(dopo.a - iv.b) < 1e-9) {          // un solo punto escluso: lo si aggira
      var esc = cerca(F.esclusi, iv.b);
      P.push(Cammina(iv.b - d), pianta(iv.b, t + ')', -1));
      P.push(Di('W', esc && esc.tipo === 'asintoto'
        ? 'Un muro! In x = ' + t + ' c’è un asintoto: qui la funzione non esiste'
        : 'Un buco! In x = ' + t + ' la funzione non esiste', true));
      P.push(Salta(iv.b + d), pianta(iv.b, '(' + t, 1));
      P.push(Di('W', 'Lo aggiro, pianto un altro cartello e riparto!'));
      x = iv.b + d;
    } else {
      P.push(Cammina(iv.b), pianta(iv.b, t + (iv.bIn ? ']' : ')'), -1));
      P.push(Di('W', 'Qui il binario finisce', true));
      x = iv.b;
    }
  });
  if (x < B - 1e-9) P.push(Cammina(B));
  P.push(Fai(fine), Di('W', 'Fine! Il dominio è: ' + F.appunti.dominio, true, 6));
};

// ── Il segno: sul carrello, sopra o sotto il suolo ──
function partenza(g, F) {
  var x0 = g.A;
  if (isFinite(F.rami[0][0]) && F.rami[0][0] > x0) x0 = F.rami[0][0];
  g.W.x = x0; g.W.y = F.f(x0);
  return x0;
}
function sopraSotto(s) { return s > 0 ? 'sopra il suolo: f(x) > 0' : 'sotto il suolo: f(x) < 0'; }
COSTRUTTORI.segno = function (g, F) {
  var P = g.passi, x0 = partenza(g, F);
  function prima(x) { return segnoDi(F.f(x - 1e-6)); }
  function dopo(x) { return segnoDi(F.f(x + 1e-6)); }
  if (cerca(F.zeri, x0)) P.push(Di('W', 'Parto da quota zero… e poi sono ' + sopraSotto(dopo(x0)), true));
  else P.push(Di('W', 'Si parte! Sono ' + sopraSotto(segnoDi(F.f(x0)))));
  eventi(F, x0, g.B, ['zeri', 'esclusi', 'salti']).forEach(function (e) {
    var t = etichetta(F, e.x), a = prima(e.x), b = dopo(e.x), d = 16 / sx;
    if (e.tipo === 'zeri') {
      P.push(Cammina(e.x));
      P.push(Di('W', a === b ? 'Sfioro il suolo e ' + (b > 0 ? 'risalgo' : 'riscendo') + ': zero doppio, il segno non cambia!'
                             : b > 0 ? 'Zero! Riemergo: ora f(x) > 0' : 'Zero! Vado sotto il suolo: ora f(x) < 0', true));
    } else if (e.tipo === 'esclusi') {
      P.push(Cammina(e.x - d));
      P.push(Di('W', e.dati.tipo === 'asintoto'
        ? 'Asintoto in x = ' + t + '! ' + (a === b ? 'Di là sono ancora ' + (b > 0 ? 'sopra' : 'sotto') + ': il segno non cambia'
                                                  : 'Di là sono ' + (b > 0 ? 'sopra' : 'sotto') + ': cambio segno senza passare da zero!')
        : 'Un buco nel binario in x = ' + t + ': lo salto!', true));
      P.push(Salta(e.x + d));
    } else {
      var b2 = segnoDi(F.f(e.x));
      P.push(Cammina(e.x - 1e-7), Salta(e.x, F.f(e.x)));
      P.push(Di('W', a === b2 ? 'Il binario salta, ma resto ' + (b2 > 0 ? 'sopra' : 'sotto') + ' il suolo'
        : 'Il binario salta ' + (b2 > 0 ? 'sopra' : 'sotto') + ' il suolo: cambio segno senza passare da zero!', true));
    }
  });
  P.push(Cammina(g.B), Fai(fine), Di('W', 'Fine corsa! Il segno è tutto nella tabella', true));
};

// ── La derivata: sul carrello, con l'asta tangente ──
function moto(s) { return s > 0 ? 'salgo: f′(x) > 0, f crescente' : s < 0 ? 'scendo: f′(x) < 0, f decrescente' : 'sono in piano'; }
COSTRUTTORI.derivata = function (g, F) {
  var P = g.passi, x0 = partenza(g, F);
  function dopo(x) { return segnoDi(F.d1(x + 1e-6)); }
  if (cerca(F.nonDer, x0)) P.push(Di('W', 'Parto in verticale: in x = ' + etichetta(F, x0) + ' la derivata non esiste. Poi ' + moto(dopo(x0)), true));
  else P.push(Di('W', 'Ho l’asta tangente: leggo la pendenza. Ora ' + moto(dopo(x0))));
  eventi(F, x0, g.B, ['staz', 'esclusi', 'salti', 'nonDer']).forEach(function (e, i, tutti) {
    var t = etichetta(F, e.x), d = 16 / sx;
    if (e.tipo === 'staz') {
      P.push(Cammina(e.x));
      P.push(Di('W', 'In piano! f′(x) = 0: ' + (e.dati.tipo === 'max' ? 'un massimo. Ora scendo' : 'un minimo. Ora salgo'), true));
    } else if (e.tipo === 'esclusi') {
      P.push(Cammina(e.x - d));
      P.push(Di('W', (e.dati.tipo === 'asintoto' ? 'Asintoto' : 'Un buco') + ': in x = ' + t + ' la derivata non esiste. Di là ' + moto(dopo(e.x)), true));
      P.push(Salta(e.x + d));
    } else if (e.tipo === 'salti') {
      P.push(Cammina(e.x - 1e-7), Salta(e.x, F.f(e.x)));
      P.push(Di('W', 'Salto! In x = ' + t + ' la derivata non esiste. Di là ' + moto(dopo(e.x)), true));
    } else if (!cerca(F.salti, e.x)) {
      P.push(Cammina(e.x), Di('W', 'Qui la derivata non esiste', true));
    }
  });
  P.push(Cammina(g.B), Fai(fine), Di('W', 'Fine corsa! Crescenza e decrescenza sono nella tabella', true));
};

// ── La concavità: liana (verso l'alto) o asta (verso il basso) ──
function attrezzoDi(s) { return s > 0 ? 'la liana: concavità verso l’alto' : 'l’asta: concavità verso il basso'; }
COSTRUTTORI.concavita = function (g, F) {
  var P = g.passi, x0 = partenza(g, F);
  function prima(x) { return segnoDi(F.d2(x - 1e-6)); }
  function dopo(x) { return segnoDi(F.d2(x + 1e-6)); }
  P.push(Di('W', 'Prendo ' + attrezzoDi(dopo(x0))));
  eventi(F, x0, g.B, ['flessi', 'esclusi']).forEach(function (e) {
    var d = 16 / sx, a = prima(e.x), b = dopo(e.x);
    if (e.tipo === 'flessi') {
      P.push(Cammina(e.x));
      P.push(Di('W', 'Flesso! La concavità cambia: lascio ' + (a > 0 ? 'la liana' : 'l’asta') + ' e prendo ' + attrezzoDi(b), true));
    } else {
      P.push(Cammina(e.x - d));
      P.push(Di('W', 'Asintoto! Di là ' + (a === b ? 'tengo ' + attrezzoDi(b) : 'cambio attrezzo e prendo ' + attrezzoDi(b)), true));
      P.push(Salta(e.x + d));
    }
  });
  P.push(Cammina(g.B), Fai(fine), Di('W', 'Fine corsa! La concavità è nella tabella', true));
};

// ── I limiti: due amici, uno da sinistra e uno da destra, gridano la loro quota ──
COSTRUTTORI.limiti = function (g, F) {
  g.modo = 'limiti';
  var P = g.passi, H = [1, 0.5, 0.1, 0.01, 0.001], larg = Gx1 - Gx0;
  function zoomPer(h) { return Math.max(1, 0.2 * larg / (h * sx)); }
  function vai(xs, xd, z, soloDx) {
    return Tween(1.3, function (g, p) { p.s = g.amici.sx.x; p.d = g.amici.dx.x; p.z = S.zoom.z; },
      function (g, u, p) {
        if (!soloDx) g.amici.sx.x = lerp(p.s, xs, u);
        g.amici.dx.x = lerp(p.d, xd, u);
        S.zoom.z = Math.exp(lerp(Math.log(p.z), Math.log(z), u));
        g.amici.muove = u < 1;
      });
  }
  function grida(chi, x, h) {
    var v = F.f(x), d = h >= 0.1 ? 1 : h >= 0.01 ? 2 : 3;
    fumetto(chi, 'f(' + fmt(x, d) + ') = ' + (Math.abs(v) >= 1000 ? fmt(v, 0) : fmt(v, d)), 3.4);
  }
  F.limiti.forEach(function (L) {
    var x0 = L.x0, t = L.t, soloDx = L.caso === 'destra';
    P.push(Fai(function (g) { S.zoom = { z: 1, x0: x0 }; g.amici = { sx: { x: x0 - 1 }, dx: { x: x0 + 1 } }; }));
    P.push(Di('sx', soloDx ? 'Io da sinistra non posso arrivare: qui la funzione non esiste!' : 'Io arrivo da sinistra!', false, 4));
    P.push(Di('dx', 'E io da destra! Ci avviciniamo a x = ' + t + ' e gridiamo la nostra quota', false, 4));
    P.push(Attendi(2.4));
    H.forEach(function (h, n) {
      if (n) P.push(vai(x0 - h, x0 + h, zoomPer(h), soloDx));
      P.push(Fai(function () { if (!soloDx) grida('sx', x0 - h, h); grida('dx', x0 + h, h); }));
      P.push(Attendi(1.9));
    });
    var zf = zoomPer(0.001), ris;
    if (L.caso === 'continua') {
      P.push(vai(x0, x0, zf));
      P.push(Di('sx', 'Ci siamo incontrati!', false, 6));
      P.push(Di('dx', 'lim = f(' + t + ') = ' + L.val, true));
      ris = 'lim x→' + t + ' f(x) = ' + L.val;
    } else if (L.caso === 'buco') {
      var e = 20 / (sx * zf);
      P.push(vai(x0 - e, x0 + e, zf));
      P.push(Di('sx', 'Stessa quota… ma in mezzo c’è un buco!', false, 6));
      P.push(Di('dx', 'lim = ' + L.val + ', però f(' + t + ') non esiste', true));
      ris = 'lim x→' + t + ' f(x) = ' + L.val + ' (ma f(' + t + ') non esiste)';
    } else if (L.caso === 'salto') {
      P.push(Di('sx', 'Io dico ' + L.sx + '!', false, 6));
      P.push(Attendi(0.8));
      P.push(Di('dx', 'Io dico ' + L.dx + '! Non ci incontriamo: il limite non esiste', true));
      ris = 'x→' + t + '⁻: ' + L.sx + ',  x→' + t + '⁺: ' + L.dx + ' → il limite non esiste';
    } else if (L.caso === 'infinito') {
      P.push(vai(x0 - 1e-4, x0 + 1e-4, zf));
      P.push(Di('sx', L.sx + '!', false, 6));
      P.push(Attendi(0.6));
      P.push(Di('dx', L.sx === L.dx ? L.dx + '! Tutti e due: lim = ' + L.dx : L.dx + '! Infiniti diversi: il limite non esiste', true));
      ris = L.sx === L.dx ? 'lim x→' + t + ' f(x) = ' + L.dx : 'x→' + t + '⁻: ' + L.sx + ',  x→' + t + '⁺: ' + L.dx + ' → il limite non esiste';
    } else {
      P.push(vai(x0, x0, zf, true));
      P.push(Di('dx', 'Arrivo a quota ' + L.val + ': lim x→' + t + '⁺ f(x) = ' + L.val, true));
      ris = 'lim x→' + t + '⁺ f(x) = ' + L.val + ' (da sinistra non si arriva)';
    }
    P.push(Fai(function () { S.limiti.push(ris); }));
    P.push(Attendi(1.2));
    P.push(Tween(0.9, function (g, p) { p.z = S.zoom.z; }, function (g, u, p) { S.zoom.z = Math.exp(lerp(Math.log(p.z), 0, u)); }));
  });
  P.push(Fai(fine));
};

// ── Disegno degli attori ──
function omino(x, y, o) {
  var c = o.col || BLU, sw = o.posa === 'cammina' ? Math.sin(o.fase || 0) * 7 : 0;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale((o.dir < 0 ? -1 : 1) * OMINO, OMINO);
  seme(o.seme || 40);
  tratto([[0, -17], [sw, 0], [sw + 4, 0]], { col: c, lw: 1.7, passo: 5 });
  tratto([[0, -17], [-sw, 0], [-sw + 4, 0]], { col: c, lw: 1.7, passo: 5 });
  evidenzia([[-1, -32], [1, -19]], 11, o.maglia || GIALLO);
  tratto([[0, -33], [0, -16]], { col: c, lw: 1.8 });
  if (o.posa === 'perplesso') {
    tratto([[0, -29], [8, -37], [4, -47]], { col: c, lw: 1.6, passo: 5 });
    tratto([[0, -29], [-8, -21]], { col: c, lw: 1.6 });
    scrivi('?', 13, -58, 24, ROSSO);
  } else {
    tratto([[0, -29], [-8 - sw * 0.3, -20]], { col: c, lw: 1.6 });
    tratto([[0, -29], [8 + sw * 0.3, -20]], { col: c, lw: 1.6 });
  }
  testa(0, -42, c, o.amico);
  ctx.restore();
}
function testa(x, y, c, amico) {
  ellisse(x, y, 8.5, 9, { col: c, lw: 1.7 });
  puntino(x + 3, y - 1, 1.5, c); puntino(x + 6.5, y - 1.5, 1.5, c);
  if (amico) tratto([[x - 6, y - 7], [x - 3, y - 13], [x, y - 8], [x + 3, y - 14], [x + 6, y - 8]], { col: c, lw: 1.4, passo: 4 });
  else {
    tratto([[x - 8, y - 4], [x - 5, y - 11], [x + 5, y - 11], [x + 8, y - 4]], { col: c, lw: 1.6, passo: 5 });
    linea(x + 5, y - 6, x + 14, y - 5, { col: c, lw: 1.6 });
  }
}
function carrello(xs, ys, ang, conAsta) {
  ctx.save(); ctx.translate(xs, ys); ctx.rotate(ang);
  seme(31);
  if (conAsta) linea(-110, 0, 110, 0, { col: ROSSO, lw: 2.4, amp: 0.4, passo: 30 });
  ctx.scale(OMINO, OMINO);
  evidenzia([[2, -36], [2, -24]], 10, GIALLO);
  tratto([[2, -37], [2, -22]], { lw: 1.8 });
  tratto([[2, -32], [-8, -44], [-12, -51]], { lw: 1.6, passo: 5 });
  tratto([[2, -32], [13, -27]], { lw: 1.6 });
  testa(3, -46, BLU, false);
  var corpo = [[-19, -9], [19, -9], [23, -28], [-23, -28]];
  riempi(corpo, 'rgba(255, 210, 60, 0.55)');
  tratto(corpo, { chiuso: true, lw: 1.8, passo: 8 });
  linea(-21, -19, 21, -19, { lw: 1, passate: 1 });
  ellisse(-11, -5, 5, 5, { lw: 1.6 }); ellisse(11, -5, 5, 5, { lw: 1.6 });
  ctx.restore();
}

/** Liana o asta: un solo perno per zona, la lunghezza si adatta. */
var cachePerni = { chiave: '', zone: [] };
function zoneConcavita(g) {
  var chiave = [g.F.id, sx, sy, ox, oy].join(',');
  if (cachePerni.chiave === chiave) return cachePerni.zone;
  var F = g.F, zone = riga(F, 'concavita', g.A, g.B).segs.filter(function (z) { return z.s === 1 || z.s === -1; });
  zone.forEach(function (z) {
    var best = null, i, n = 160;
    for (i = 1; i < n; i++) {
      var x = lerp(z.a, z.b, i / n), y = F.f(x), ys = Y(y);
      if (!isFinite(ys) || ys < Gy0 + 30 || ys > Gy1 - 30) continue;
      var p = -F.d1(x) * sy / sx, q = -F.d2(x) * sy / (sx * sx);
      var k = Math.abs(q) / Math.pow(1 + p * p, 1.5);
      if (!best || k > best.k) best = { x: x, xs: X(x), ys: ys, p: p, q: q, k: k };
    }
    if (!best) { z.perno = null; return; }
    var cx = best.xs - best.p * (1 + best.p * best.p) / best.q, cy = best.ys + (1 + best.p * best.p) / best.q;
    var dx = cx - best.xs, dy = cy - best.ys, r = Math.hypot(dx, dy);
    if (r > 300) { cx = best.xs + dx / r * 300; cy = best.ys + dy / r * 300; }
    if (r < 90) { cx = best.xs + dx / r * 90; cy = best.ys + dy / r * 90; }
    cx = Math.max(Math.max(X(z.a), Gx0) + 12, Math.min(Math.min(X(z.b), Gx1) - 12, cx));
    cy = Math.max(Gy0 + 14, Math.min(Gy1 - 14, cy));
    var yc = Y(F.f(invX(cx)));                         // il perno deve stare dalla parte giusta
    if (z.s > 0 && cy > yc - 40) cy = Math.max(Gy0 + 14, yc - 120);
    if (z.s < 0 && cy < yc + 40) cy = Math.min(Gy1 - 14, yc + 120);
    z.perno = [cx, cy];
  });
  cachePerni = { chiave: chiave, zone: zone };
  return zone;
}
function attrezzo(g) {
  var p = g.pos();
  if (!p) return null;
  var zone = zoneConcavita(g), x = g.W.x, z = null;
  for (var i = 0; i < zone.length; i++) if (x >= zone[i].a - 1e-9 && x <= zone[i].b + 1e-9) { z = zone[i]; if (x < zone[i].b) break; }
  if (!z || !z.perno) return null;
  if (g.ultimaZona && Math.abs(x - z.a) < 1e-6 && g.ultimaZona !== z) z = g.ultimaZona;   // fermo sul flesso: tiene l'attrezzo di prima
  g.ultimaZona = z;
  var ux = p[0] - z.perno[0], uy = p[1] - z.perno[1], L = Math.hypot(ux, uy) || 1;
  ux /= L; uy /= L;
  var d = (z.s > 0 ? 12 : 44) * OMINO, testa = [p[0] + ux * d, p[1] + uy * d];
  return { z: z, p: p, u: [ux, uy], testa: testa };
}

function disegnaAttori() {
  var g = this, F = g.F;
  if (g.modo === 'limiti') {
    if (!g.amici) return;
    var x0 = S.zoom.x0;
    seme(60);
    linea(X(x0), Gy0 + 10, X(x0), Gy1 - 10, { col: MATITA, lw: 1, passate: 1, dash: [3, 7], amp: 0.3 });
    ['sx', 'dx'].forEach(function (chi) {
      var a = g.amici[chi], y = F.f(a.x), fuori = !isFinite(y);
      var ys = Y(fuori ? 0 : y);
      if (fuoriY(ys)) return;
      omino(X(a.x) + (chi === 'sx' ? -10 : 10), ys, {
        col: chi === 'sx' ? BLU : ROSSO, maglia: chi === 'sx' ? GIALLO : ROSA, amico: chi === 'dx',
        posa: fuori ? 'perplesso' : g.amici.muove ? 'cammina' : 'fermo', fase: GT * 9, dir: chi === 'sx' ? 1 : -1,
        seme: chi === 'sx' ? 41 : 43 });
    });
    return;
  }
  var p = g.pos();
  if (!p) return;
  if (g.modo === 'asse') {
    omino(p[0], p[1] - 1, { posa: g.W.hop ? 'fermo' : g.W.posa, fase: g.W.passi / 9 });
    return;
  }
  if (g.id === 'concavita') {
    var a = attrezzo(g);
    if (!a) { carrello(p[0], p[1], 0, false); return; }
    var c = a.z.perno, rot = Math.atan2(a.u[1], a.u[0]);
    seme(70);
    if (a.z.s > 0) {                                   // liana appesa a un ramo
      tratto([[c[0] - 26, c[1] + 2], [c[0], c[1] - 2], [c[0] + 26, c[1] + 3]], { col: VERDE_INK, lw: 2.4 });
      ellisse(c[0] - 18, c[1] - 6, 6, 3, { col: VERDE_INK, lw: 1.3 }); ellisse(c[0] + 16, c[1] - 5, 6, 3, { col: VERDE_INK, lw: 1.3 });
      var mx = (c[0] + a.p[0]) / 2 - a.u[1] * 7, my = (c[1] + a.p[1]) / 2 + a.u[0] * 7;
      tratto([c, [mx, my], a.p], { col: VERDE_INK, lw: 1.8, passo: 10 });
      ctx.save(); ctx.translate(a.p[0], a.p[1]); ctx.rotate(rot - Math.PI / 2); ctx.scale(OMINO, OMINO);
      seme(71);
      tratto([[-3, 0], [0, 20]], { lw: 1.6 }); tratto([[3, 0], [0, 20]], { lw: 1.6 });
      evidenzia([[0, 20], [0, 34]], 11, GIALLO);
      tratto([[0, 18], [0, 36]], { lw: 1.8 });
      var sw = Math.sin(GT * 3) * 4;
      tratto([[0, 35], [-5 + sw, 52]], { lw: 1.7 }); tratto([[0, 35], [5 + sw, 52]], { lw: 1.7 });
      ctx.rotate(Math.PI);
      testa(0, -10, BLU, false);
      ctx.restore();
    } else {                                           // asta piantata sotto
      tratto([[c[0] - 10, c[1] + 6], [c[0], c[1] - 3], [c[0] + 10, c[1] + 6]], { col: MATITA, lw: 1.8 });
      tratto([c, a.p], { col: '#8a5a2b', lw: 3.2, passo: 20, amp: 0.4 });
      omino(a.p[0], a.p[1], { posa: 'fermo', rot: rot + Math.PI / 2 });
    }
    return;
  }
  var ang = g.W.hop ? 0 : Math.atan2(-pendenza(F, g.W.x) * sy, sx);
  carrello(p[0], p[1], ang, g.id === 'derivata' && !g.W.hop);
  if (g.id === 'derivata' && !g.W.hop) {
    var m = pendenza(F, g.W.x);
    seme(80);
    scrivi('f′ = ' + (Math.abs(m) >= 100 ? fmtSegnato(m, 0) : fmtSegnato(m, 1)), p[0], Math.min(Gy1 - 8, p[1] + 34), 19, ROSSO, 0, 'center');
  }
}

// ── Sfondo del giro in corso: grandi segni a evidenziatore ──
function piu(cx, cy, r) { evidenzia([[cx - r, cy], [cx + r, cy]], r * 0.34, VERDE); evidenzia([[cx, cy - r], [cx, cy + r]], r * 0.34, VERDE); }
function meno(cx, cy, r) { evidenzia([[cx - r, cy], [cx + r, cy]], r * 0.34, ROSA); }
function frecciona(cx, cy, r, s) {
  var col = s > 0 ? VERDE : ROSA, a = [cx - r, cy + s * r * 0.6], b = [cx + r, cy - s * r * 0.6];
  evidenzia([a, b], r * 0.26, col);
  var ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), uy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  evidenzia([[b[0] - ux * r * 0.5 - uy * r * 0.4, b[1] - uy * r * 0.5 + ux * r * 0.4], b, [b[0] - ux * r * 0.5 + uy * r * 0.4, b[1] - uy * r * 0.5 - ux * r * 0.4]], r * 0.26, col);
}
function coppa(cx, cy, r, s) {
  var pts = [];
  for (var i = 0; i <= 16; i++) { var t = Math.PI * i / 16; pts.push([cx + r * Math.cos(t), cy - s * r * 0.5 + s * r * Math.sin(t)]); }
  evidenzia(pts, r * 0.26, s > 0 ? VERDE : ROSA);
}
function disegnaSfondo() {
  var g = this, F = g.F, id = g.id;
  if (id !== 'segno' && id !== 'derivata' && id !== 'concavita') return;
  var A = visA(), B = visB(), y0 = Math.max(Gy0, Math.min(Gy1, Y(0)));
  seme(1500);
  riga(F, id, A, B).segs.forEach(function (s) {
    if (!(s.s === 1 || s.s === -1) || s.a >= g.W.x) return;
    if (id === 'concavita' && !F.curva) return;
    var dentro = !g.finito && g.W.x < s.b, xa = Math.max(X(s.a), Gx0), xb = Math.min(X(s.b), Gx1), cx = (xa + xb) / 2;
    var h0 = Gy0, h1 = Gy1;
    if (id === 'segno') { h0 = s.s > 0 ? Gy0 : y0; h1 = s.s > 0 ? y0 : Gy1; }
    var alt = (h1 - h0) / (id === 'segno' ? 1 : 2), yc = Y(F.f(invX(cx)));
    var c1 = h0 + (h1 - h0) * 0.28, c2 = h0 + (h1 - h0) * 0.72;   // dove il binario non passa
    var cy = !isFinite(yc) || Math.abs(c1 - yc) > Math.abs(c2 - yc) ? c1 : c2;
    var r = Math.min(dentro ? 64 : 26, alt * 0.38, (xb - xa) * 0.4);
    if (r < 8) return;
    if (id === 'segno') { if (s.s > 0) piu(cx, cy, r); else meno(cx, cy, r); }
    else if (id === 'derivata') frecciona(cx, cy, r, s.s);
    else coppa(cx, cy, r, s.s);
  });
}

// ── Segni che restano sul quaderno ──
function fuoriDominio(F) {
  var g = [], ints = F.dominio.slice().sort(function (p, q) { return p.a - q.a; });
  if (isFinite(ints[0].a)) g.push([-INF, ints[0].a]);
  for (var i = 0; i < ints.length - 1; i++) if (ints[i + 1].a > ints[i].b) g.push([ints[i].b, ints[i + 1].a]);
  if (isFinite(ints[ints.length - 1].b)) g.push([ints[ints.length - 1].b, INF]);
  return g;
}
function striscia(xa, xb, ya, yb) {
  xa = Math.max(xa, Gx0 - 6); xb = Math.min(xb, Gx1 + 6);
  if (xb - xa < 2 || yb - ya < 2) return null;
  return [[xa, ya], [xb, ya], [xb, yb], [xa, yb]];
}
function segniSotto() {
  var F = S.F, A = visA(), B = visB(), pD = Math.max(S.prog.dominio, S.prog.segno), q;
  fuoriDominio(F).forEach(function (iv, i) {
    var b = Math.min(iv[1], pD);
    if (b <= iv[0] || b <= A || iv[0] >= B) return;
    seme(2100 + i);
    q = striscia(X(Math.max(iv[0], A - 1)), X(b), Gy0 - 6, Gy1 + 6);
    if (q) tratteggio(q, { col: MATITA, sp: 9, alpha: 0.42, ang: 0.85 });
  });
  F.esclusi.forEach(function (e, i) {
    if (e.x > pD) return;
    seme(2200 + i);
    linea(X(e.x), Gy0, X(e.x), Gy1, { col: ROSSO, lw: 1.3, passate: 1, dash: [9, 7], amp: 0.4, passo: 40 });
  });
  var pS = S.prog.segno;
  if (pS === -INF) return;
  var y0 = Math.max(Gy0 - 6, Math.min(Gy1 + 6, Y(0)));
  riga(F, 'segno', A, B).segs.forEach(function (s, i) {
    if (!(s.s === 1 || s.s === -1) || s.a >= pS) return;
    seme(2300 + i);
    q = s.s > 0 ? striscia(X(s.a), X(Math.min(s.b, pS)), y0, Gy1 + 6) : striscia(X(s.a), X(Math.min(s.b, pS)), Gy0 - 6, y0);
    if (q) tratteggio(q, { col: MATITA, sp: 8, alpha: 0.42, ang: -0.85 });
  });
}
function segniSopra() {
  var F = S.F;
  seme(2500);
  F.zeri.forEach(function (z) { if (S.prog.segno >= z.x) puntino(X(z.x), Y(0), 4.6, ROSSO); });
  F.staz.forEach(function (p) {
    if (S.prog.derivata < p.x) return;
    var x = X(p.x), y = Y(F.f(p.x));
    linea(x, y, x, Y(0), { col: MATITA, lw: 1, passate: 1, dash: [4, 5], amp: 0.3 });
    ellisse(x, y, 12, 12, { col: ROSSO, lw: 1.7 });
    scrivi(p.tipo, x, p.tipo === 'max' ? y - 20 : y + 32, 17, ROSSO, 0, 'center');
  });
  F.flessi.forEach(function (p) {
    if (S.prog.concavita < p.x) return;
    var x = X(p.x), y = Y(F.f(p.x));
    ellisse(x, y, 12, 12, { col: ROSSO, lw: 1.7 });
    scrivi('flesso', x + 16, y + 26, 17, ROSSO);
  });
}
function disegnaCartelli() {
  S.cartelli.forEach(function (c, i) {
    var k = Math.min(1, (CLOCK - c.t0) / 0.25), x = X(c.x) + c.lato * 3, y = Y(0);
    if (k <= 0) return;
    seme(3000 + i);
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    linea(0, 2, 0, -50, { col: '#8a5a2b', lw: 2.2 });
    var w = larghezza(c.testo, 20) + 18, bx = c.lato > 0 ? -4 : -w + 4;
    var tav = [[bx, -76], [bx + w, -78], [bx + w, -50], [bx, -48]];
    riempi(tav, 'rgba(255, 220, 120, 0.55)');
    tratto(tav, { chiuso: true, lw: 1.6, col: '#8a5a2b', passo: 9 });
    scrivi(c.testo, bx + w / 2, -56, 20, BLU, 0, 'center');
    ctx.restore();
  });
}
