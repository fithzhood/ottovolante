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
/** Il giro intorno al muro: l'omino si allontana dentro il foglio (più piccolo e un po' più in alto),
 *  passa dietro il muro e torna avanti dall'altra parte. */
function Aggira(xTo) {
  return Tween(2.6, function (g, p) { p.x = g.W.x; }, function (g, u, p) {
    var a = Math.min(1, u / 0.3), c = Math.max(0, (u - 0.7) / 0.3);
    g.W.dietro = a * (1 - c);
    g.W.x = lerp(p.x, xTo, Math.max(0, Math.min(1, (u - 0.25) / 0.5)));
    g.W.passi += 2.2;
    if (u >= 1) g.W.dietro = 0;
  });
}
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
  if (id === 'limiti') { S.limiti = []; S.orizz = []; }
  COSTRUTTORI[id](g, F);
  g.aggiorna = aggiornaGiro;
  g.cammina = cammina;
  g.salta = salta;
  g.pos = posizione;
  g.ancora = ancora;
  g.disegnaSfondo = disegnaSfondo;
  g.disegnaAttori = disegnaAttori;
  g.protetti = protetti;
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
  else if (this.adatta && !this.finito) adattaVista(this);
  if (this.i >= this.passi.length) {
    this.finito = true; S.play = false; S.ff = false;
    if (this.modo === 'limiti') S.zoom = zoomBase();
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
  var ys = Y(this.modo === 'asse' ? 0 : W.y) - (W.dietro || 0) * 26;
  return fuoriY(ys) ? null : [X(W.x), ys];
}
function ancora(chi) {
  if (this.modo === 'limiti') {
    var a = this.amici && this.amici[chi];
    if (!a) return null;
    var y = this.F.f(a.x);
    var k = scalaAmici(), hx = X(a.x) + (chi === 'sx' ? -10 : 10) * k, hy = clampY(Y(isFinite(y) ? y : 0)) - 56 * OMINO * k;
    return [hx, hy, [hx - 20 * OMINO * k, hy, 40 * OMINO * k, 58 * OMINO * k]];
  }
  if (this.id === 'concavita') return ancoraConcavita(this);
  var p = this.pos();
  if (!p) {                                          // fuori dallo schermo (asintoto): il fumetto resta, con la freccia
    var yy = this.modo === 'asse' ? 0 : this.F.f(this.W.x);
    return [X(this.W.x), isFinite(yy) ? clampY(Y(yy)) : Gy0 - 100, null];
  }
  if (this.modo === 'asse') return [p[0], p[1] - 58 * OMINO, [p[0] - 24, p[1] - 58 * OMINO, 48, 58 * OMINO]];
  return [p[0], p[1] - 58 * OMINO, [p[0] - 40, p[1] - 58 * OMINO, 80, 58 * OMINO + 4]];
}

/** Gli amici dei limiti stanno nel disegno: con lo zoom si ingrandiscono, con la vista allontanata
 *  si rimpiccioliscono (entro limiti che li tengano leggibili). */
function scalaAmici() { var z = S.zoom.z; return z < 1 ? Math.max(0.45, Math.pow(z, 0.25)) : Math.min(2, Math.pow(z, 0.3)); }

/** La vista più vicina che contiene sia il quaderno di partenza sia i punti dati: quando un limite va
 *  all'infinito il disegno si allontana quanto basta perché gli omini (e la funzione) restino in vista. */
// Oltre ×2 la funzione non si riconosce più (un'iperbole diventa due rette sugli assi): la vista non si
// allontana di più, e da lì in poi gli omini escono dal quaderno con il fumetto e la freccia.
var ZMIN = 1 / 2;
function scatola(pts) {
  var b = [visA(), visB(), (oy - Gy1) / sy, (oy - Gy0) / sy];
  pts.forEach(function (p) {
    if (!isFinite(p[0]) || !isFinite(p[1])) return;
    b[0] = Math.min(b[0], p[0]); b[1] = Math.max(b[1], p[0]); b[2] = Math.min(b[2], p[1]); b[3] = Math.max(b[3], p[1]);
  });
  return b;
}
function zoomPerContenere(pts) {
  var b = scatola(pts);
  var z0 = Math.min(1, (Gx1 - Gx0) / ((b[1] - b[0]) * sx), (Gy1 - Gy0) / ((b[3] - b[2]) * sy));
  return z0 * (0.86 + 0.14 * Math.max(0, (z0 - 0.7) / 0.3));   // margine dal bordo, che arriva senza scatti
}
function stannoInVista(pts) { return zoomPerContenere(pts) >= ZMIN * 0.999; }
/** L'omino in (x, f(x)) si vede tutto, testa compresa, con la vista allontanata al massimo. */
function ominoInVista(F, x) {
  var y = F.f(x), m = 90 / (ZMIN * sy);
  return isFinite(y) && stannoInVista([[x, y], [x, y + m], [x, y - m * 0.3]]);
}
function vaVerso(s) { return s === '+∞' ? 'salgo a +∞' : 'scendo a −∞'; }
function vistaCheContiene(pts) {
  var z = zoomPerContenere(pts);
  if (z > 0.999) return zoomBase();
  z = Math.max(ZMIN, z);
  var b = scatola(pts), cx = (b[0] + b[1]) / 2, cy = (b[2] + b[3]) / 2;
  // col tetto allo zoom non ci sta tutto: il centro si sposta il meno possibile dal quaderno di partenza
  var hw = (Gx1 - Gx0) / 2 / (z * sx), hh = (Gy1 - Gy0) / 2 / (z * sy);
  var a0 = visA(), a1 = visB(), c0 = (oy - Gy1) / sy, c1 = (oy - Gy0) / sy;
  cx = Math.max(a1 - hw, Math.min(a0 + hw, cx));
  cy = Math.max(c1 - hh, Math.min(c0 + hh, cy));
  return { z: z, x0: cx, y0: cy, px: (Gx0 + Gx1) / 2, py: (Gy0 + Gy1) / 2 };
}
function adattaVista(g) {
  var pts = [];
  ['sx', 'dx'].forEach(function (chi) {
    var a = g.amici && g.amici[chi];
    if (!a) return;
    var y = g.F.f(a.x);                                // anche la testa deve stare nel quaderno
    pts.push([a.x, y], [a.x, y + 80 * OMINO / (sy * Math.max(ZMIN, S.zoom.z))]);
  });
  S.zoom = vistaCheContiene(pts);
}
/** Ritorno alla vista normale, senza scatti, da qualunque ingrandimento. */
function TornaVista() {
  return Tween(0.9, function (g, p) {
    g.adatta = false;
    var z = S.zoom;
    p.z = z.z; p.x0 = z.x0; p.y0 = z.y0; p.px = centroX(z); p.py = centroY(z);
  }, function (g, u, p) {
    S.zoom = { z: Math.exp(lerp(Math.log(p.z), 0, u)), x0: p.x0, y0: p.y0,
               px: lerp(p.px, Xb(p.x0), u), py: lerp(p.py, oy - p.y0 * sy, u) };
  });
}

// ── Il dominio: un omino a piedi sull'asse x, che pianta cartelli ──
var COSTRUTTORI = {};
COSTRUTTORI.dominio = function (g, F) {
  g.modo = 'asse';
  var A = g.A, B = g.B, P = g.passi, x = A;
  var ints = F.dominio.filter(function (v) { return v.b > A && v.a < B; });
  g.W.x = A;
  function pianta(px, testo, lato) { return Fai(function () { S.cartelli.push({ x: px, testo: testo, lato: lato, t0: CLOCK }); }); }
  // l'omino si ferma sempre fuori dalla tavola del cartello, così non la copre mentre ne parla
  function largo(testo) { return (larghezzaTavola(testo) + 44) / sx; }
  ints.forEach(function (iv, n) {
    var t;
    if (iv.a > x + 1e-9) {
      if (n === 0) P.push(Di('W', 'Qui il binario non c’è: sono fuori dal dominio'));
      P.push(Cammina(iv.a - 26 / sx));
      t = etichetta(F, iv.a);
      P.push(pianta(iv.a, (iv.aIn ? '[' : '(') + t, 1));
      P.push(Di('W', iv.aIn ? 'Qui il binario comincia, e x = ' + t + ' c’è: parentesi quadra!'
                            : 'Qui il binario comincia, ma x = ' + t + ' è escluso: parentesi tonda', true));
    } else if (n === 0) {
      g.W.x = x = A + largo('(−∞');
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
    if (iv.b >= B) {
      P.push(Cammina(B - largo('+∞)')), pianta(B, '+∞)', -1));
      P.push(Di('W', 'E arrivo fino a più infinito'));
      x = B; return;
    }
    t = etichetta(F, iv.b);
    var dopo = ints[n + 1];
    if (dopo && Math.abs(dopo.a - iv.b) < 1e-9) {          // un solo punto escluso: lo si aggira
      var esc = cerca(F.esclusi, iv.b);
      P.push(Cammina(iv.b - largo(t + ')')), pianta(iv.b, t + ')', -1));
      P.push(Di('W', esc && esc.tipo === 'asintoto'
        ? 'Un muro! In x = ' + t + ' c’è un asintoto: qui la funzione non esiste'
        : 'Un buco! In x = ' + t + ' la funzione non esiste', true));
      if (esc && esc.tipo === 'asintoto') {
        P.push(Di('W', 'È un muro infinito, in alto e in basso: non si scavalca! Ci giro intorno passandoci dietro…', false, 4.5));
        P.push(Attendi(1.2), Aggira(iv.b + largo('(' + t)), pianta(iv.b, '(' + t, 1));
        P.push(Di('W', 'Eccomi dall’altra parte! Pianto un altro cartello e riparto'));
      } else {
        P.push(Salta(iv.b + largo('(' + t)), pianta(iv.b, '(' + t, 1));
        P.push(Di('W', 'Lo salto, pianto un altro cartello e riparto!'));
      }
      x = iv.b + largo('(' + t);
    } else {
      P.push(Cammina(iv.b - largo(t + ')')), pianta(iv.b, t + (iv.bIn ? ']' : ')'), -1));
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
  g.bers = pianoBersaglio(g, F, x0);
  if (g.bers) g.B = g.bers.x;
  function dopo(x) { return segnoDi(F.d1(x + 1e-6)); }
  if (cerca(F.nonDer, x0)) P.push(Di('W', 'Parto in verticale: in x = ' + etichetta(F, x0) + ' la derivata non esiste. Poi ' + moto(dopo(x0)), true));
  else P.push(Di('W', 'Tengo la lancia parallela alla tangente: mi dice la pendenza. Ora ' + moto(dopo(x0))));
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
  if (g.bers) P.push(Cammina(g.B), Fai(function (g) { g.bers.colpito = CLOCK; }), Fai(fine),
                     Di('W', 'Centro! Fine corsa: crescenza e decrescenza sono nella tabella', true));
  else P.push(Cammina(g.B), Fai(fine), Di('W', 'Fine corsa! Crescenza e decrescenza sono nella tabella', true));
};

// ── I limiti: due amici, uno da sinistra e uno da destra, gridano la loro quota ──
COSTRUTTORI.limiti = function (g, F) {
  g.modo = 'limiti';
  var P = g.passi, H = [1, 0.5, 0.1, 0.01, 0.001], larg = Gx1 - Gx0;
  function vai(xs, xd, z, soloDx) {
    return Tween(1.3, function (g, p) { p.s = g.amici.sx.x; p.d = g.amici.dx.x; p.z = S.zoom.z; },
      function (g, u, p) {
        if (!soloDx) g.amici.sx.x = lerp(p.s, xs, u);
        g.amici.dx.x = lerp(p.d, xd, u);
        if (!g.adatta) S.zoom.z = Math.exp(lerp(Math.log(p.z), Math.log(z), u));
        g.amici.muove = u < 1;
      });
  }
  function grida(chi, x, h) {
    var v = F.f(x), d = h >= 0.1 ? 1 : h >= 0.01 ? 2 : 3;
    fumetto(chi, 'f(' + fmt(x, d) + ') = ' + (Math.abs(v) >= 1000 ? fmt(v, 0) : fmt(v, d)), 3.4);
  }
  // x → ±∞: un omino solo parte verso l'orizzonte, e la vista si allontana per stargli dietro
  function infinito(L) {
    var s = L.caso === 'piuinf' ? 1 : -1, chi = s > 0 ? 'sx' : 'dx', inf = s > 0 ? '+∞' : '−∞';
    var spazio = s > 0 ? Gx1 - ox : ox - Gx0;
    var x0 = s * Math.max(1, Math.min(2, Math.floor(0.6 * spazio / sx)));
    P.push(Fai(function (g) { S.zoom = zoomBase(); g.amici = {}; g.amici[chi] = { x: x0 }; g.lineaX0 = false; g.adatta = true; }));
    P.push(Di(chi, 'Vado verso ' + (s > 0 ? 'più' : 'meno') + ' infinito, sempre più lontano, e grido la mia quota', false, 4));
    P.push(Attendi(2.4));
    // ci si ferma quando la quota è già enorme: oltre, la vista si allontanerebbe tanto da non leggere più niente
    // le tappe che si vedono, più una che esce dal quaderno: la forma della funzione resta leggibile
    // solo le tappe in cui l'omino si vede ancora: si ferma sul bordo e dice dove porta la strada
    var tappe = [x0], fuori = false;
    [3, 5, 10, 20, 50, 100, 1000].forEach(function (v) {
      if (fuori || v <= Math.abs(x0)) return;
      if (ominoInVista(F, s * v)) { tappe.push(s * v); return; }
      fuori = true;
      // l'ultimo punto in vista fra la tappa precedente e questa: lì si ferma, sul bordo
      var lo = Math.abs(tappe[tappe.length - 1]), hi = v;
      for (var k = 0; k < 30; k++) { var m = (lo + hi) / 2; if (ominoInVista(F, s * m)) lo = m; else hi = m; }
      var ultimo = Math.floor(lo * 10) / 10;
      if (ultimo - Math.abs(tappe[tappe.length - 1]) > 0.25 && ominoInVista(F, s * ultimo)) tappe.push(s * ultimo);
    });
    tappe.forEach(function (xv, n) {
      if (n) P.push(Tween(1.6, function (g, p) { p.x = Math.abs(g.amici[chi].x); }, function (g, u, p) {
        g.amici[chi].x = s * Math.exp(lerp(Math.log(p.x), Math.log(Math.abs(xv)), u));
        g.amici.muove = u < 1;
      }));
      P.push(Fai(function () { fumetto(chi, 'f(' + (Math.abs(xv) >= 1000 ? fmtQuota(xv) : fmt(xv)) + ') = ' + fmtQuota(F.f(xv)), 3.4); }));
      P.push(Attendi(1.9));
    });
    var finito = L.val.indexOf('∞') < 0, ris = 'lim x→' + inf + ' f(x) = ' + L.val;
    if (finito) P.push(Fai(function () { S.orizz.push(L.y); }));
    P.push(Di(chi, finito ? 'Se continuo così mi avvicino sempre più a quota ' + L.val + ': ' + ris + '. Asintoto orizzontale y = ' + L.val
                          : 'Se continuo così ' + vaVerso(L.val) + ': ' + ris, true));
    P.push(Fai(function () { S.limiti.push(ris + (finito ? ' (asintoto y = ' + L.val + ')' : '')); }), Attendi(1.2));
    P.push(TornaVista());
  }
  F.limiti.forEach(function (L) {
    if (L.caso === 'piuinf' || L.caso === 'menoinf') { infinito(L); return; }
    var x0 = L.x0, t = L.t, soloDx = L.caso === 'destra';
    // ai buchi, ai salti e allo 0⁺ della radice si ingrandisce attorno al punto a cui si tende, non più di
    // quanto serve a tenere gli omini nel quaderno; all'asintoto invece la vista si allontana e li segue
    var yc = L.caso === 'salto' ? (L.ysx + L.ydx) / 2 : L.caso === 'infinito' ? 0 : L.yv;
    function zoomPer(h) {
      var z = 0.2 * larg / (h * sx), d = 0;
      if (L.caso !== 'infinito') {
        [x0 - h, x0 + h].forEach(function (x) { var v = F.f(x); if (isFinite(v)) d = Math.max(d, Math.abs(v - yc)); });
        if (d > 0) z = Math.min(z, 0.33 * (Gy1 - Gy0) / (d * sy));
      }
      return Math.max(1, z);
    }
    P.push(Fai(function (g) {
      S.zoom = { z: 1, x0: x0, y0: yc }; g.amici = { sx: { x: x0 - 1 }, dx: { x: x0 + 1 } }; g.lineaX0 = true; g.xLim = x0;
      g.adatta = L.caso === 'infinito';
    }));
    P.push(Di('sx', soloDx ? 'Io da sinistra non posso arrivare: qui la funzione non esiste!' : 'Io arrivo da sinistra!', false, 4));
    P.push(Di('dx', 'E io da destra! Ci avviciniamo a x = ' + t + ' e gridiamo la nostra quota', false, 4));
    P.push(Attendi(2.4));
    var passiH = H;
    if (L.caso === 'infinito') {                       // solo i passi in cui gli omini si vedono ancora
      passiH = [];
      var stop = false;
      [1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01].forEach(function (h) {
        if (stop) return;
        if (!passiH.length || (ominoInVista(F, x0 - h) && ominoInVista(F, x0 + h))) passiH.push(h); else stop = true;
      });
    }
    passiH.forEach(function (h, n) {
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
      P.push(Di('sx', 'Se continuo così ' + vaVerso(L.sx) + '!', false, 6));
      P.push(Attendi(0.8));
      P.push(Di('dx', 'E io ' + vaVerso(L.dx) + '! ' + (L.sx === L.dx ? 'Tutti e due: lim = ' + L.dx : 'Infiniti diversi: il limite non esiste'), true));
      ris = L.sx === L.dx ? 'lim x→' + t + ' f(x) = ' + L.dx : 'x→' + t + '⁻: ' + L.sx + ',  x→' + t + '⁺: ' + L.dx + ' → il limite non esiste';
    } else {
      P.push(vai(x0, x0, zf, true));
      P.push(Di('dx', 'Arrivo a quota ' + L.val + ': lim x→' + t + '⁺ f(x) = ' + L.val, true));
      ris = 'lim x→' + t + '⁺ f(x) = ' + L.val + ' (da sinistra non si arriva)';
    }
    P.push(Fai(function () { S.limiti.push(ris); }));
    P.push(Attendi(1.2));
    P.push(TornaVista());
  });
  P.push(Fai(fine));
};

// ── Disegno degli attori ──
function omino(x, y, o) {
  var c = o.col || BLU, sw = o.posa === 'cammina' ? Math.sin(o.fase || 0) * 7 : o.posa === 'corsa' ? Math.sin(o.fase || 0) * 11 : 0;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  var sc = OMINO * (o.scala || 1);
  ctx.scale((o.dir < 0 ? -1 : 1) * sc, sc);
  seme(o.seme || 40);
  if (o.posa === 'raccolto') {                       // gambe piegate per la capriola
    tratto([[0, -17], [8, -21], [4, -9]], { col: c, lw: 1.7, passo: 5 });
    tratto([[0, -17], [6, -24], [1, -12]], { col: c, lw: 1.7, passo: 5 });
  } else {
    tratto([[0, -17], [sw, 0], [sw + 4, 0]], { col: c, lw: 1.7, passo: 5 });
    tratto([[0, -17], [-sw, 0], [-sw + 4, 0]], { col: c, lw: 1.7, passo: 5 });
  }
  evidenzia([[-1, -32], [1, -19]], 11, o.maglia || GIALLO);
  tratto([[0, -33], [0, -16]], { col: c, lw: 1.8 });
  if (o.posa === 'perplesso') {
    tratto([[0, -29], [8, -37], [4, -47]], { col: c, lw: 1.6, passo: 5 });
    tratto([[0, -29], [-8, -21]], { col: c, lw: 1.6 });
    scrivi('?', 13, -58, 24, ROSSO);
  } else if (o.posa === 'lancia') {
    tratto([[0, -29], [9, -47]], { col: c, lw: 1.6 });
    tratto([[0, -29], [-8, -21]], { col: c, lw: 1.6 });
  } else if (o.posa === 'raccolto') {
    tratto([[0, -29], [9, -25], [7, -19]], { col: c, lw: 1.6, passo: 5 });
    tratto([[0, -29], [7, -27], [5, -20]], { col: c, lw: 1.6, passo: 5 });
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
function carrello(xs, ys, ang, conAsta, conTrivella) {
  ctx.save(); ctx.translate(xs, ys); ctx.rotate(ang);
  seme(31);
  if (conAsta) linea(-150, 0, 150, 0, { col: MATITA, lw: 1, passate: 1, amp: 0.3, dash: [6, 6], passo: 40, alpha: 0.6 });
  ctx.scale(OMINO, OMINO);
  if (conTrivella) trivella();
  evidenzia([[2, -36], [2, -24]], 10, GIALLO);
  tratto([[2, -37], [2, -22]], { lw: 1.8 });
  if (conAsta) {                                      // in sella con la lancia in resta, parallela alla tangente
    tratto([[2, -32], [-6, -30], [-4, -27]], { lw: 1.6, passo: 5 });
    tratto([[2, -32], [10, -29], [14, -27]], { lw: 1.6, passo: 5 });
    lancia();
  } else {
    tratto([[2, -32], [-8, -44], [-12, -51]], { lw: 1.6, passo: 5 });
    tratto([[2, -32], [13, -27]], { lw: 1.6 });
  }
  testa(3, -46, BLU, false);
  var corpo = [[-19, -9], [19, -9], [23, -28], [-23, -28]];
  riempi(corpo, 'rgba(255, 210, 60, 0.55)');
  tratto(corpo, { chiuso: true, lw: 1.8, passo: 8 });
  linea(-21, -19, 21, -19, { lw: 1, passate: 1 });
  ellisse(-11, -5, 5, 5, { lw: 1.6 }); ellisse(11, -5, 5, 5, { lw: 1.6 });
  ctx.restore();
}

/** Dove arriva la punta della lancia se il carrello sta in x. */
function puntaLancia(F, x) {
  var y = F.f(x), px = X(x), py = Y(y);
  if (!isFinite(py)) return null;
  var an = Math.atan2(-pendenza(F, x) * sy, sx), c = Math.cos(an), s = Math.sin(an), k = OMINO;
  return { p: [px, py], t: [px + c * 116 * k + s * 27 * k, py + s * 116 * k - c * 27 * k], an: an };
}
/** Il bersaglio sta alla fine della corsa: il carrello si ferma dove la punta della lancia lo centra,
 *  con carrello e bersaglio tutti e due dentro il quaderno. */
function pianoBersaglio(g, F, x0) {
  var A = Math.max(x0, g.A), x = g.B, passo = (g.B - A) / 400;
  for (var i = 0; i <= 400; i++, x -= passo) {
    var r = ramoDi(F, x);
    if (r < 0 || r !== ramoDi(F, g.B)) continue;
    var q = puntaLancia(F, x);
    if (!q) continue;
    var t = q.t, p = q.p;
    if (t[0] < Gx1 - 28 && t[0] > Gx0 + 30 && t[1] > Gy0 + 30 && t[1] < Gy1 - 60 && p[1] > Gy0 + 70 && p[1] < Gy1 - 10)
      return { x: x };
  }
  return null;
}
function bersaglio(b, F) {
  var q = puntaLancia(F, b.x);                        // in pixel: si ricalcola, la vista può cambiare
  if (!q) return;
  var c = b.c = q.t, t = b.colpito ? CLOCK - b.colpito : -1, w = t >= 0 ? Math.sin(t * 22) * Math.exp(-t * 4) * 0.25 : 0;
  ctx.save();
  ctx.translate(c[0], c[1]);
  seme(90);
  tratto([[0, 4], [0, Gy1 - c[1] > 70 ? 62 : 30]], { col: '#8a5a2b', lw: 3, amp: 0.4 });
  tratto([[-12, Gy1 - c[1] > 70 ? 62 : 30], [12, Gy1 - c[1] > 70 ? 62 : 30]], { col: '#8a5a2b', lw: 2.4, amp: 0.4 });
  ctx.rotate(w);
  ctx.scale(0.55, 1);                                  // visto di tre quarti
  [[26, 'rgba(196, 33, 43, 0.8)'], [19, '#fffdf6'], [12, 'rgba(196, 33, 43, 0.8)'], [5, '#fffdf6']].forEach(function (a) {
    ctx.fillStyle = a[1]; ctx.beginPath(); ctx.arc(0, 0, a[0], 0, 7); ctx.fill();
  });
  ellisse(0, 0, 26, 26, { col: '#3c3c48', lw: 1.6, fisso: true, amp: 0.4 });
  ellisse(0, 0, 12, 12, { col: '#3c3c48', lw: 1.1, fisso: true, amp: 0.3, passate: 1 });
  ctx.restore();
  if (t >= 0 && t < 1.6) {                             // il colpo: stelline che si allargano e svaniscono
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1.6);
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2 + 0.3, r = 22 + t * 45;
      stellina(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, 5, i % 2 ? ROSSO : '#e0a000');
    }
    ctx.restore();
  }
}

/** La lancia da torneo: impugnatura dietro la mano, rondella a cono che para la mano, asta a strisce
 *  che si assottiglia fino alla punta. Coordinate dell'omino (y = −27 è l'altezza della mano). */
function lancia() {
  var y = -27, coda = -34, mano = 12, cono = 30, punta = 112;
  seme(33);
  var asta = [[cono, y - 4.2], [punta, y - 0.6], [punta + 6, y], [punta, y + 0.6], [cono, y + 4.2]];
  riempi(asta, 'rgba(250, 244, 230, 0.95)');
  for (var x = cono + 4; x < punta - 6; x += 12) {     // le strisce rosse a spirale
    var t0 = (x - cono) / (punta - cono), t1 = (x + 6 - cono) / (punta - cono);
    riempi([[x, y - 4.2 * (1 - t0) - 0.6 * t0], [x + 6, y - 4.2 * (1 - t1) - 0.6 * t1], [x + 2, y + 4.2 * (1 - t1) + 0.6 * t1], [x - 4, y + 4.2 * (1 - t0) + 0.6 * t0]], 'rgba(196, 33, 43, 0.75)');
  }
  tratto(asta, { lw: 1.4, passo: 10, amp: 0.4 });
  riempi([[coda, y - 2.4], [cono, y - 2.4], [cono, y + 2.4], [coda, y + 2.4]], 'rgba(138, 90, 43, 0.85)');
  tratto([[coda, y - 2.4], [cono, y - 2.4]], { col: '#5a3a1b', lw: 1.1, passate: 1, amp: 0.3 });
  tratto([[coda, y + 2.4], [cono, y + 2.4]], { col: '#5a3a1b', lw: 1.1, passate: 1, amp: 0.3 });
  var rondella = [[mano + 4, y - 3], [cono, y - 10], [cono + 2, y], [cono, y + 10], [mano + 4, y + 3]];
  riempi(rondella, 'rgba(160, 165, 180, 0.85)');
  tratto(rondella, { chiuso: true, col: '#3c3c48', lw: 1.3, passo: 6, amp: 0.3 });
}

/** La concavità: dal binario salgono le fiamme, nei flessi ci sono le piattaforme. L'omino passa da una
 *  piattaforma all'altra senza toccare le fiamme, con attrezzi di lunghezza fissa:
 *  - concavità verso l'alto: lancia un rampino, si dondola lungo un arco di cerchio e lo lascia atterrando;
 *  - concavità verso il basso: pianta l'asta, sale fino al punto più alto, la lascia lì (a metà salto)
 *    e prosegue in volo con una capriola, atterrando in piedi.
 *  Tutta la geometria è in coordinate di schermo e si calcola quando parte il giro. */
var FIAMMA_H = 30, CL = 44;          // altezza massima delle fiamme e distanza di sicurezza dal binario
function curvaY(F, px) { var y = F.f(invX(px)); return isFinite(y) ? Y(y) : NaN; }
function pianoConcavita(g) {
  var F = g.F, zone = [];
  riga(F, 'concavita', g.A, g.B).segs.forEach(function (z) {
    if (!(z.s === 1 || z.s === -1)) return;
    // il tratto della zona che si vede nel quaderno: le piattaforme stanno ai suoi due capi (un flesso,
    // il bordo del quaderno, o il punto in cui il binario esce verso un asintoto)
    var n = 400, run = null, best = null, i, x, q;
    for (i = 0; i <= n; i++) {
      x = lerp(z.a, z.b, i / n);
      if (i === 0) x += 1e-6 * Math.max(1, Math.abs(x));
      if (i === n) x -= 1e-6 * Math.max(1, Math.abs(x));
      q = Y(F.f(x));
      var ok = isFinite(q) && q > Gy0 + 14 && q < Gy1 - 10 && X(x) > Gx0 + 24 && X(x) < Gx1 - 24;
      if (ok) { if (!run) run = [x, x]; else run[1] = x; }
      if (!ok || i === n) { if (run && (!best || X(run[1]) - X(run[0]) > X(best[1]) - X(best[0]))) best = run; run = null; }
    }
    if (!best || X(best[1]) - X(best[0]) < 40) return;
    var zz = { a: z.a, b: z.b, s: z.s, xa: best[0], xb: best[1],
               S: [X(best[0]), Y(F.f(best[0]))], E: [X(best[1]), Y(F.f(best[1]))] };
    if (z.s > 0) pianoLiana(F, zz); else pianoAsta(F, zz);
    zone.push(zz);
  });
  return zone;
}
/** Nessun punto dentro le fiamme (lontano dalle piattaforme, dove le fiamme non ci sono). */
function libero(F, pts, z) {
  if (!z.binario) {                                  // i punti del binario con le fiamme, ogni 3 pixel
    z.binario = [];
    for (var px = z.S[0]; px <= z.E[0]; px += 3) {
      var cy = curvaY(F, px);
      if (isFinite(cy) && !vicinoPiattaforma(z, px, cy)) z.binario.push([px, cy]);
    }
  }
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (Math.hypot(p[0] - z.S[0], p[1] - z.S[1]) < 85 || Math.hypot(p[0] - z.E[0], p[1] - z.E[1]) < 85) continue;   // stacco e atterraggio
    var c = curvaY(F, p[0]);
    if (isFinite(c) && p[0] > z.S[0] && p[0] < z.E[0] && !vicinoPiattaforma(z, p[0], c) && p[1] > c) return false;
    for (var j = 0; j < z.binario.length; j++) {
      var q = z.binario[j];
      if (Math.abs(q[0] - p[0]) < CL && Math.hypot(q[0] - p[0], q[1] - p[1]) < CL) return false;
    }
  }
  return true;
}
/** Attorno alle piattaforme le fiamme non ci sono (anche dove il binario è ripido). */
function vicinoPiattaforma(z, x, y) { return Math.hypot(x - z.S[0], y - z.S[1]) < 62 || Math.hypot(x - z.E[0], y - z.E[1]) < 62; }
function angolo(C, p) { var a = Math.atan2(p[1] - C[1], p[0] - C[0]); return a < -Math.PI / 2 ? a + 2 * Math.PI : a; }
function pianoLiana(F, z) {
  var S0 = z.S, E0 = z.E, dx = E0[0] - S0[0], dy = E0[1] - S0[1], c = Math.hypot(dx, dy);
  var M = [(S0[0] + E0[0]) / 2, (S0[1] + E0[1]) / 2], n = [-dy / c, dx / c], corpo = 52 * OMINO, scelta = null, h, R, C;
  if (n[1] < 0) n = [-n[0], -n[1]];                  // verso il basso dello schermo: verso il binario
  function prova(h) {
    var R = (c * c / 4 + h * h) / (2 * h);
    if (R < corpo + 50) return null;
    var C = [M[0] + n[0] * (h - R), M[1] + n[1] * (h - R)], a0 = angolo(C, S0), a1 = angolo(C, E0), pts = [];
    for (var i = 0; i <= 50; i++) { var a = lerp(a0, a1, i / 50); pts.push([C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R]); }
    return libero(F, pts, z) ? { C: C, R: R, a0: a0, a1: a1 } : null;
  }
  // l'arco più incavato che non tocca le fiamme: è il dondolo più ampio, con la fune più corta
  for (h = c * 0.5; h >= 3 && !scelta; h *= 0.9) scelta = prova(h);
  if (!scelta) { h = 3; R = (c * c / 4 + 9) / 6; C = [M[0] + n[0] * (h - R), M[1] + n[1] * (h - R)]; scelta = { C: C, R: R, a0: angolo(C, S0), a1: angolo(C, E0) }; }
  z.buono = !!scelta && h > 3;
  z.C = scelta.C; z.R = scelta.R; z.a0 = scelta.a0; z.a1 = scelta.a1; z.Rh = scelta.R - corpo;
  z.len = scelta.R * Math.abs(scelta.a1 - scelta.a0);
  z.punto = function (t) { var a = lerp(z.a0, z.a1, t); return [z.C[0] + Math.cos(a) * z.R, z.C[1] + Math.sin(a) * z.R]; };
}
function pianoAsta(F, z) {
  var h0 = 26 * OMINO, P0 = [z.S[0], z.S[1] - h0], Ec = [z.E[0], z.E[1] - h0], top = Math.min(P0[1], Ec[1]), i, scelto = null, primo = null, sicuro = null;
  for (i = 0; i <= 60; i++) { var c = curvaY(F, lerp(z.S[0], z.E[0], i / 60)); if (isFinite(c)) top = Math.min(top, c - h0); }
  for (var Ty = top - CL; Ty > Gy0 + 40 && !scelto; Ty -= 8) {
    // si pianta a metà salto se si può; se il pavimento finirebbe sopra la partenza si pianta più avanti
    [0.5, 0.58, 0.66, 0.74, 0.82, 0.9].forEach(function (fr) {
      if (scelto) return;
      var p = pianoSalto(P0, Ec, lerp(P0[0], Ec[0], fr), Ty);
      if (!p) return;
      if (!primo) primo = p;
      var ok = libero(F, campioniSalto(p), z);
      if (ok && !sicuro) sicuro = p;
      if (ok && p.pavimentoSotto) scelto = p;
    });
  }
  z.buono = !!scelto;
  scelto = scelto || sicuro || primo || pianoSalto(P0, Ec, (P0[0] + Ec[0]) / 2, Math.max(Gy0 + 40, top - CL));
  z.asta = scelto; z.len = scelto ? scelto.len : 100;
  z.punto = function (t) { return z.asta.stato(t).P; };
}
function pianoSalto(P0, Ec, Tx, Ty) {
  var d = Tx - P0[0], D = P0[1] - Ty;
  if (d <= 5 || D <= 5 || Ec[1] <= Ty + 2 || Ec[0] <= Tx + 5) return null;
  var Qy = (Ty + P0[1]) / 2 + d * d / (2 * D), L = Qy - Ty, al0 = Math.atan2(-d, Qy - P0[1]);
  var k = (Ec[1] - Ty) / ((Ec[0] - Tx) * (Ec[0] - Tx)), s1 = L * Math.abs(al0), s2 = 0, prec = [Tx, Ty];
  for (var i = 1; i <= 24; i++) {
    var x = lerp(Tx, Ec[0], i / 24), q = [x, Ty + k * (x - Tx) * (x - Tx)];
    s2 += Math.hypot(q[0] - prec[0], q[1] - prec[1]); prec = q;
  }
  var t1 = s1 / (s1 + s2);
  return {
    Q: [Tx, Qy], L: L, t1: t1, len: s1 + s2, pavimentoSotto: Qy > P0[1] + 26 * OMINO + 6,   // sotto i piedi di partenza
    stato: function (t) {
      if (t < t1) {                                  // con l'asta: si gira attorno al punto in cui è piantata
        var u = t / t1, al = lerp(al0, 0, u);
        return { P: [Tx + Math.sin(al) * L, Qy - Math.cos(al) * L], rot: Math.PI * u, conAsta: true, v: 0 };
      }
      var v = (t - t1) / (1 - t1), x = lerp(Tx, Ec[0], v);   // in volo: una parabola, e la capriola
      return { P: [x, Ty + k * (x - Tx) * (x - Tx)], rot: Math.PI * (1 + v), conAsta: false, v: v };
    }
  };
}
function campioniSalto(p) {
  var h0 = 26 * OMINO, pts = [];
  for (var i = 0; i <= 60; i++) {
    var st = p.stato(i / 60), P = st.P, s = Math.sin(st.rot), c = Math.cos(st.rot);
    pts.push(P, [P[0] - s * h0, P[1] + c * h0], [P[0] + s * h0, P[1] - c * h0]);   // anca, piedi e testa
  }
  return pts;
}

function attrezzoDi(s) { return s > 0 ? 'il rampino: concavità verso l’alto' : 'l’asta: concavità verso il basso'; }
COSTRUTTORI.concavita = function (g, F) {
  var P = g.passi, Z = pianoConcavita(g);
  g.piano = Z; g.att = null; g.lasciato = null; g.chiaveVista = chiaveVista();
  if (!Z.length) { P.push(Fai(fine), Di('W', 'Qui il binario esce dal quaderno: la concavità è nella tabella', true)); return; }
  g.W.x = Z[0].xa;
  P.push(Fai(function (g) { g.att = { fase: 'fermo', z: Z[0], lato: 'S' }; g.W.x = Z[0].xa; }));
  P.push(Di('W', 'Il binario brucia! Passo da una piattaforma all’altra senza toccare le fiamme. Prendo ' + attrezzoDi(Z[0].s), false, 5));
  P.push(Attendi(1.6));
  Z.forEach(function (z, i) {
    if (i) {
      var pr = Z[i - 1], stessa = Math.hypot(pr.E[0] - z.S[0], pr.E[1] - z.S[1]) < 12, cambia = pr.s !== z.s;
      var asintoto = F.esclusi.some(function (e) { return e.x > pr.xb && e.x < z.xa; });
      if (asintoto) P.push(Di('W', 'Asintoto! Di là ' + (cambia ? 'cambio attrezzo e prendo ' : 'tengo ') + attrezzoDi(z.s), true));
      else if (cerca(F.flessi, pr.b)) P.push(Di('W', 'Flesso! La concavità cambia: lascio ' + (pr.s > 0 ? 'il rampino' : 'l’asta') + ' e prendo ' + attrezzoDi(z.s), true));
      if (!stessa) P.push(Traversata(pr, z));
    }
    if (z.s > 0) P.push(Tween(0.9, function (g) { g.att = { fase: 'lancio', z: z, k: 0 }; }, function (g, u) { g.att.k = u; }));
    else P.push(Tween(0.9, function (g) { g.att = { fase: 'rincorsa', z: z, k: 0 }; }, function (g, u) { g.att.k = u; }));
    P.push(Tween(0.8 + z.len / 210, function (g) { g.att = { fase: z.s > 0 ? 'liana' : 'asta', z: z, t: 0 }; }, function (g, u) {
      g.att.t = u;
      g.W.x = Math.max(z.xa, Math.min(z.xb, invX(z.punto(u)[0])));
    }));
    P.push(Fai(function (g) {
      if (z.s > 0) g.lasciato = { z: z, t0: GT };
      g.att = { fase: 'fermo', z: z, lato: 'E' }; g.W.x = z.xb;
    }));
  });
  P.push(Fai(fine), Di('W', 'Fine corsa! La concavità è nella tabella', true));
};
/** Da una piattaforma alla successiva quando non coincidono (un asintoto, un tratto fuori dal quaderno). */
function Traversata(da, a) {
  return Tween(1.1, function (g) { g.att = { fase: 'salto', da: da, a: a, u: 0 }; }, function (g, u) {
    g.att.u = u;
    if (u >= 1) { g.att = { fase: 'fermo', z: a, lato: 'S' }; g.W.x = a.xa; }
  });
}
function puntoSalto(a) {
  var A = a.da.E, B = a.a.S, u = a.u;
  return [lerp(A[0], B[0], u), lerp(A[1], B[1], u) - 120 * Math.sin(Math.PI * u)];
}
/** La geometria è in pixel: se la finestra cambia misura, si ricalcola sugli stessi oggetti. */
function chiaveVista() { return [sx, sy, ox, oy, Gx0, Gx1, Gy0, Gy1].join(','); }
function aggiornaPiano(g) {
  if (!g.piano || g.chiaveVista === chiaveVista()) return;
  g.chiaveVista = chiaveVista();
  var nuovo = pianoConcavita(g);
  g.piano.forEach(function (z, i) { if (nuovo[i]) { var p = nuovo[i]; for (var k in p) z[k] = p[k]; } });
}

function rampino(x, y, ang) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  tratto([[-13, 0], [2, 0]], { col: '#3c3c48', lw: 2 });
  tratto([[0, 0], [6, -5], [3, -10]], { col: '#3c3c48', lw: 1.7, passo: 4 });
  tratto([[0, 0], [6, 5], [3, 10]], { col: '#3c3c48', lw: 1.7, passo: 4 });
  ctx.restore();
}
function ramo(c) {
  tratto([[c[0] - 30, c[1] + 3], [c[0], c[1] - 2], [c[0] + 30, c[1] + 4]], { col: VERDE_INK, lw: 2.6 });
  ellisse(c[0] - 20, c[1] - 6, 7, 3.5, { col: VERDE_INK, lw: 1.3 }); ellisse(c[0] + 19, c[1] - 5, 7, 3.5, { col: VERDE_INK, lw: 1.3 });
}
function pavimento(c) {
  linea(c[0] - 38, c[1], c[0] + 38, c[1], { col: MATITA, lw: 2 });
  tratteggio([[c[0] - 38, c[1]], [c[0] + 38, c[1]], [c[0] + 38, c[1] + 11], [c[0] - 38, c[1] + 11]], { col: MATITA, sp: 4, alpha: 0.55, ang: 0.8 });
  tratto([[c[0] - 7, c[1] - 1], [c[0] - 3, c[1] + 6], [c[0] + 9, c[1] + 6], [c[0] + 13, c[1] - 1]], { col: MATITA, lw: 1.4, passo: 5 });
}
function appeso(p, rot) {
  ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(rot - Math.PI / 2); ctx.scale(OMINO, OMINO);
  seme(71);
  tratto([[-3, 0], [0, 20]], { lw: 1.6 }); tratto([[3, 0], [0, 20]], { lw: 1.6 });
  evidenzia([[0, 20], [0, 34]], 11, GIALLO);
  tratto([[0, 18], [0, 36]], { lw: 1.8 });
  var sw = Math.sin(GT * 3) * 4;
  tratto([[0, 35], [-5 + sw, 52]], { lw: 1.7 }); tratto([[0, 35], [5 + sw, 52]], { lw: 1.7 });
  ctx.rotate(Math.PI);
  testa(0, -10, BLU, false);
  ctx.restore();
}
function piattaforma(p, i) {
  var x = p[0], y = p[1] + 1, w = 34, LEGNO = '#8a5a2b';
  seme(3500 + i);
  var asse = [[x - w, y], [x + w, y], [x + w - 3, y + 9], [x - w + 3, y + 9]];
  riempi(asse, 'rgba(200, 145, 80, 0.6)');
  tratto(asse, { chiuso: true, col: LEGNO, lw: 1.6, passo: 9 });
  linea(x - w + 9, y + 9, x - w + 15, y + 34, { col: LEGNO, lw: 1.6, passate: 1 });
  linea(x + w - 9, y + 9, x + w - 15, y + 34, { col: LEGNO, lw: 1.6, passate: 1 });
  linea(x - w + 12, y + 22, x + w - 12, y + 22, { col: LEGNO, lw: 1.1, passate: 1 });
}
function fiamma(bx, by, k) {
  var H = FIAMMA_H * (0.62 + 0.38 * (0.5 + 0.5 * Math.sin(CLOCK * 9 + k * 2.1))), w = 7, sw = Math.sin(CLOCK * 6 + k * 1.3) * 3.5;
  var P = [[bx - w, by], [bx - w * 0.85, by - H * 0.42], [bx - w * 0.2 + sw * 0.5, by - H * 0.7], [bx + sw, by - H],
           [bx + w * 0.6, by - H * 0.55], [bx + w, by]];
  riempi(P, 'rgba(255, 125, 30, 0.55)');
  riempi([[bx - w * 0.45, by], [bx + sw * 0.6, by - H * 0.55], [bx + w * 0.45, by]], 'rgba(255, 225, 70, 0.75)');
  tratto(P, { col: '#d0451b', lw: 1.1, passate: 1, amp: 0.35, passo: 6 });
}
function disegnaFiamme(g) {
  var F = g.F, k = 0;
  g.piano.forEach(function (z) {
    var xa = Math.max(X(z.a) + 2, Gx0), xb = Math.min(X(z.b) - 2, Gx1), prec = null, fatta = 12;
    for (var px = xa; px <= xb; px += 2) {
      var y = curvaY(F, px);
      if (!isFinite(y) || y < Gy0 + 4 || y > Gy1) { prec = null; continue; }
      if (prec) fatta += Math.hypot(px - prec[0], y - prec[1]);
      prec = [px, y];
      if (fatta < 24) continue;
      fatta = 0;
      if (vicinoPiattaforma(z, px, y)) continue;
      seme(4000 + k);
      fiamma(px, y - 1, k++);
    }
  });
}
function scenaConcavita(g) {
  if (!g.piano) return;
  aggiornaPiano(g);
  var visti = [];
  g.piano.forEach(function (z) {
    [z.S, z.E].forEach(function (p) { if (visti.every(function (q) { return Math.hypot(q[0] - p[0], q[1] - p[1]) > 12; })) visti.push(p); });
  });
  visti.forEach(piattaforma);
  disegnaFiamme(g);
  var a = g.att, LEGNO = '#8a5a2b', h0 = 26 * OMINO;
  if (g.lasciato) {                                   // il rampino lasciato: la fune dondola e sparisce
    var L = g.lasciato, tz = GT - L.t0, al = Math.max(0, 1 - tz / 1.6);
    if (al <= 0) g.lasciato = null;
    else {
      var aa = Math.PI / 2 + (L.z.a1 - Math.PI / 2) * Math.cos(tz * 4) * Math.exp(-tz * 1.6);
      ramo(L.z.C);
      rampino(L.z.C[0], L.z.C[1] + 4, Math.PI / 2);
      tratto([L.z.C, [L.z.C[0] + Math.cos(aa) * L.z.Rh, L.z.C[1] + Math.sin(aa) * L.z.Rh]], { col: VERDE_INK, lw: 1.8, passo: 10, alpha: 0.9 * al });
    }
  }
  if (!a) return;
  var z = a.z;
  if (a.fase === 'fermo') { var pf = a.z[a.lato]; omino(pf[0], pf[1], { posa: 'fermo' }); return; }
  if (a.fase === 'salto') { var ps = puntoSalto(a); omino(ps[0], ps[1], { posa: 'raccolto' }); return; }
  if (a.fase === 'lancio') {                          // lancia il rampino verso il ramo
    ramo(z.C);
    omino(z.S[0], z.S[1], { posa: 'lancia' });
    var mano = [z.S[0] + 9 * OMINO, z.S[1] - 47 * OMINO];
    var hk = [lerp(mano[0], z.C[0], a.k), lerp(mano[1], z.C[1], a.k) - 50 * Math.sin(Math.PI * a.k)];
    tratto([mano, hk], { col: VERDE_INK, lw: 1.4, passo: 12, dash: [5, 4] });
    rampino(hk[0], hk[1], Math.atan2(z.C[1] - mano[1], z.C[0] - mano[0]));
    return;
  }
  if (a.fase === 'liana') {                           // fune di lunghezza fissa, appesa al ramo
    var an = lerp(z.a0, z.a1, a.t), H = [z.C[0] + Math.cos(an) * z.Rh, z.C[1] + Math.sin(an) * z.Rh];
    ramo(z.C);
    rampino(z.C[0], z.C[1] + 4, Math.PI / 2);
    tratto([z.C, H], { col: VERDE_INK, lw: 1.8, passo: 10 });
    appeso(H, an);
    return;
  }
  var J = z.asta;
  if (!J) { omino(z.S[0], z.S[1], { posa: 'fermo' }); return; }
  pavimento(J.Q);
  if (a.fase === 'rincorsa') {                        // la punta dell'asta scende fino al pavimento
    omino(z.S[0], z.S[1], { posa: 'corsa', fase: CLOCK * 14 });
    var m2 = [z.S[0] + 9 * OMINO, z.S[1] - 26 * OMINO], avanti = [m2[0] + 90, m2[1] - 30];
    tratto([m2, [lerp(avanti[0], J.Q[0], a.k * a.k), lerp(avanti[1], J.Q[1], a.k * a.k)]], { col: LEGNO, lw: 3.2, passo: 20, amp: 0.4 });
    return;
  }
  var st = J.stato(a.t), P = st.P, Lp = J.L - 18 * OMINO;
  if (st.conAsta) {                                    // l'asta resta lunga uguale: si gira attorno al pavimento
    var dq = Math.hypot(J.Q[0] - P[0], J.Q[1] - P[1]) || 1;
    var Hm = [P[0] + (J.Q[0] - P[0]) / dq * 18 * OMINO, P[1] + (J.Q[1] - P[1]) / dq * 18 * OMINO];
    tratto([J.Q, Hm], { col: LEGNO, lw: 3.2, passo: 20, amp: 0.4 });
  } else {                                             // lasciata nel punto più alto: cade in avanti e sparisce
    var th = -Math.PI / 2 + Math.min(1, st.v * 1.8) * 1.25, al2 = Math.max(0, 1 - st.v * 1.4);
    if (al2 > 0) tratto([J.Q, [J.Q[0] + Math.cos(th) * Lp, J.Q[1] + Math.sin(th) * Lp]], { col: LEGNO, lw: 3.2, passo: 20, amp: 0.4, alpha: 0.9 * al2 });
  }
  ctx.save();
  ctx.translate(P[0], P[1]); ctx.rotate(st.rot);
  omino(0, h0, { posa: st.conAsta ? 'fermo' : st.v > 0.85 ? 'fermo' : 'raccolto' });
  ctx.restore();
}
/** Dove sta l'omino del giro della concavità: la testa (per il fumetto) e il rettangolo che lo contiene. */
function ancoraConcavita(g) {
  var a = g.att, h0 = 26 * OMINO;
  if (!a) return null;
  aggiornaPiano(g);
  var pts;
  if (a.fase === 'fermo') { var pf = a.z[a.lato]; pts = [pf, [pf[0], pf[1] - 2 * h0 - 8]]; }
  else if (a.fase === 'salto') { var p = puntoSalto(a); pts = [p, [p[0], p[1] - 2 * h0]]; }
  else if (a.fase === 'lancio' || a.fase === 'rincorsa') pts = [a.z.S, [a.z.S[0], a.z.S[1] - 2 * h0 - 8]];
  else if (a.fase === 'liana') {
    var z = a.z, an = lerp(z.a0, z.a1, a.t);
    pts = [[z.C[0] + Math.cos(an) * z.Rh, z.C[1] + Math.sin(an) * z.Rh], [z.C[0] + Math.cos(an) * z.R, z.C[1] + Math.sin(an) * z.R]];
  } else { var P = a.z.asta.stato(a.t).P; pts = [[P[0] - h0, P[1] - h0], [P[0] + h0, P[1] + h0]]; }
  var x0 = Math.min(pts[0][0], pts[1][0]) - 20, x1 = Math.max(pts[0][0], pts[1][0]) + 20;
  var y0 = Math.min(pts[0][1], pts[1][1]) - 6, y1 = Math.max(pts[0][1], pts[1][1]) + 4;
  return [(x0 + x1) / 2, y0, [x0, y0, x1 - x0, y1 - y0]];
}

function disegnaAttori() {
  var g = this, F = g.F;
  if (g.modo === 'limiti') {
    if (!g.amici) return;
    var x0 = g.xLim;
    seme(60);
    if (g.lineaX0) linea(X(x0), Gy0 + 10, X(x0), Gy1 - 10, { col: MATITA, lw: 1, passate: 1, dash: [3, 7], amp: 0.3 });
    ['sx', 'dx'].forEach(function (chi) {
      var a = g.amici[chi];
      if (!a) return;
      var y = F.f(a.x), fuori = !isFinite(y);
      var ys = Y(fuori ? 0 : y);
      if (fuoriY(ys)) return;
      var k = scalaAmici();
      omino(X(a.x) + (chi === 'sx' ? -10 : 10) * k, ys, { scala: k,
        col: chi === 'sx' ? BLU : ROSSO, maglia: chi === 'sx' ? GIALLO : ROSA, amico: chi === 'dx',
        posa: fuori ? 'perplesso' : g.amici.muove ? 'cammina' : 'fermo', fase: GT * 9, dir: chi === 'sx' ? 1 : -1,
        seme: chi === 'sx' ? 41 : 43 });
    });
    return;
  }
  if (g.id === 'concavita') { scenaConcavita(g); return; }
  var p = g.pos();
  if (!p) return;
  if (g.modo === 'asse') {
    var d = g.W.dietro || 0;
    if (d > 0) {                                      // dietro il foglio: un'ombra a terra, l'omino rimpicciolito
      ctx.save(); ctx.globalAlpha = 0.25 * d; ctx.fillStyle = '#444';
      ctx.beginPath(); ctx.ellipse(p[0], p[1] + 1, 14 * (1 - 0.3 * d), 3, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    omino(p[0], p[1] - 1, { posa: g.W.hop ? 'fermo' : d > 0 ? 'cammina' : g.W.posa, fase: g.W.passi / 9, scala: 1 - 0.38 * d });
    if (d > 0) F.esclusi.forEach(function (e, i) { if (e.tipo === 'asintoto') muro(X(e.x), 2200 + i); });   // il muro gli passa davanti
    return;
  }

  var ang = g.W.hop ? 0 : Math.atan2(-pendenza(F, g.W.x) * sy, sx);
  if (g.id === 'derivata' && g.bers) bersaglio(g.bers, F);
  carrello(p[0], p[1], ang, g.id === 'derivata' && !g.W.hop, g.id === 'segno' && !g.W.hop && g.W.y < 0);
  if (g.id === 'derivata' && !g.W.hop) {
    var m = pendenza(F, g.W.x);
    seme(80);
    scrivi('f′ = ' + (Math.abs(m) >= 100 ? fmtSegnato(m, 0) : fmtSegnato(m, 1)), p[0], Math.min(Gy1 - 8, p[1] + 54), 19, ROSSO, 0, 'center');
  }
}

// ── Sfondo del giro in corso: grandi segni a evidenziatore ──
function piu(cx, cy, r) { evidenzia([[cx - r, cy], [cx + r, cy]], r * 0.34, ROSSO_EV); evidenzia([[cx, cy - r], [cx, cy + r]], r * 0.34, ROSSO_EV); }
function meno(cx, cy, r) { evidenzia([[cx - r, cy], [cx + r, cy]], r * 0.34, AZZURRO); }
function frecciona(cx, cy, r, s) {
  var col = s > 0 ? ROSSO_EV : AZZURRO, a = [cx - r, cy + s * r * 0.6], b = [cx + r, cy - s * r * 0.6];
  evidenzia([a, b], r * 0.26, col);
  var ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), uy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]);
  evidenzia([[b[0] - ux * r * 0.5 - uy * r * 0.4, b[1] - uy * r * 0.5 + ux * r * 0.4], b, [b[0] - ux * r * 0.5 + uy * r * 0.4, b[1] - uy * r * 0.5 - ux * r * 0.4]], r * 0.26, col);
}
function coppa(cx, cy, r, s) {
  var pts = [];
  for (var i = 0; i <= 16; i++) { var t = Math.PI * i / 16; pts.push([cx + r * Math.cos(t), cy - s * r * 0.5 + s * r * Math.sin(t)]); }
  evidenzia(pts, r * 0.26, s > 0 ? ROSSO_EV : AZZURRO);
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

// ── Gli asintoti verticali sono muri: mattoni dal fondo alla cima del quaderno, e oltre ──
var MURO_L = 9;                                       // mezza larghezza, in unità
function muroVisibile(F, e) {
  var id = S.giro && S.giro.id;
  if (id === 'limiti' || id === 'derivata' || id === 'concavita') return true;
  return e.x <= Math.max(S.prog.dominio, S.prog.segno) || S.fatto.dominio || S.fatto.segno;
}
function eMuro(F, x) { return F.esclusi.some(function (e) { return e.tipo === 'asintoto' && Math.abs(e.x - x) < 1e-9; }); }
function muro(cx, sm) {
  var y0 = Gy0 - 4, y1 = Gy1 + 4, L = MURO_L, h = 11, r, x;
  if (cx < Gx0 - L || cx > Gx1 + L) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';      // il muro è pieno: copre quello che c'è dietro
  ctx.fillStyle = '#e8c2a6'; ctx.fillRect(cx - L, y0, 2 * L, y1 - y0);
  ctx.fillStyle = 'rgba(160, 70, 40, 0.18)';
  for (r = 0, x = y0; x < y1; x += h, r++) {          // mattoni sfalsati, uno sì e uno no un po' più scuri
    var off = r % 2 ? L : 0;
    for (var bx = cx - L - off; bx < cx + L; bx += 2 * L) if ((r + Math.round(bx)) % 3 === 0) ctx.fillRect(Math.max(cx - L, bx), x, Math.min(2 * L, cx + L - Math.max(cx - L, bx)), h);
  }
  ctx.strokeStyle = 'rgba(120, 60, 35, 0.75)'; ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (r = 0, x = y0; x < y1; x += h, r++) {
    ctx.moveTo(cx - L, x); ctx.lineTo(cx + L, x);
    var v = r % 2 ? cx : cx - L + 0.01;
    if (r % 2) { ctx.moveTo(v, x); ctx.lineTo(v, x + h); }
  }
  ctx.stroke();
  ctx.restore();
  seme(sm);
  tratto([[cx - L, y0], [cx - L, y1]], { col: '#7a3b22', lw: 1.6, passo: 40, amp: 0.4 });
  tratto([[cx + L, y0], [cx + L, y1]], { col: '#7a3b22', lw: 1.6, passo: 40, amp: 0.4 });
  // le frecce: il muro continua all'infinito, in su e in giù
  tratto([[cx - L - 4, Gy0 + 16], [cx, Gy0 + 2], [cx + L + 4, Gy0 + 16]], { col: ROSSO, lw: 2, passo: 6 });
  tratto([[cx - L - 4, Gy1 - 16], [cx, Gy1 - 2], [cx + L + 4, Gy1 - 16]], { col: ROSSO, lw: 2, passo: 6 });
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
    if (q) tratteggio(q, { col: VIOLA, sp: 9, alpha: 0.6, lw: 1.4, ang: 0.85 });
  });
  F.esclusi.forEach(function (e, i) {
    if (!muroVisibile(F, e)) return;
    seme(2200 + i);
    if (e.tipo === 'asintoto') muro(X(e.x), 2200 + i);
    else linea(X(e.x), Gy0, X(e.x), Gy1, { col: ROSSO, lw: 1.3, passate: 1, dash: [9, 7], amp: 0.4, passo: 40 });
  });
  S.orizz.forEach(function (y, i) {
    var yy = Y(y);
    if (yy < Gy0 || yy > Gy1) return;
    seme(2250 + i);
    linea(Gx0, yy - 3, Gx1, yy - 3, { col: ROSSO, lw: 1.4, passate: 1, dash: [10, 7], amp: 0.4, passo: 40 });
    scrivi('y = ' + fmt(y), Gx1 - 10, yy - 12, 17, ROSSO, 0, 'right');
  });
  var pS = S.prog.segno;
  if (pS === -INF) return;
  terraETunnel(F, A, Math.min(B, pS));
  var y0 = Math.max(Gy0 - 6, Math.min(Gy1 + 6, Y(0)));
  riga(F, 'segno', A, B).segs.forEach(function (s, i) {
    if (!(s.s === 1 || s.s === -1) || s.a >= pS) return;
    seme(2300 + i);
    q = s.s > 0 ? striscia(X(s.a), X(Math.min(s.b, pS)), y0, Gy1 + 6) : striscia(X(s.a), X(Math.min(s.b, pS)), Gy0 - 6, y0);
    if (q) tratteggio(q, { col: VIOLA, sp: 8, alpha: 0.6, lw: 1.4, ang: -0.85 });
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
    scrivi(p.tipo, x, y + 32, 17, ROSSO, 0, 'center');
  });
  F.flessi.forEach(function (p) {
    if (S.prog.concavita < p.x) return;
    var x = X(p.x), y = Y(F.f(p.x));
    ellisse(x, y, 12, 12, { col: ROSSO, lw: 1.7 });
    scrivi('flesso', x + 16, y + 26, 17, ROSSO);
  });
}
function larghezzaTavola(testo) { return larghezza(testo, 20) + 18; }
function disegnaCartelli() {
  S.cartelli.forEach(function (c, i) {
    var k = Math.min(1, (CLOCK - c.t0) / 0.25), x = X(c.x) + c.lato * (eMuro(S.F, c.x) ? MURO_L + 6 : 3), y = Y(0);
    if (k <= 0) return;
    seme(3000 + i);
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    linea(0, 2, 0, -50, { col: '#8a5a2b', lw: 2.2 });
    var w = larghezzaTavola(c.testo), bx = c.lato > 0 ? -4 : -w + 4;
    var tav = [[bx, -76], [bx + w, -78], [bx + w, -50], [bx, -48]];
    riempi(tav, 'rgba(255, 220, 120, 0.55)');
    tratto(tav, { chiuso: true, lw: 1.6, col: '#8a5a2b', passo: 9 });
    scrivi(c.testo, bx + w / 2, -56, 20, BLU, 0, 'center');
    ctx.restore();
  });
}

// ── Sotto terra: terriccio, il tunnel scavato dal carrello e la trivella ──
var SASSI = (function () {
  var R = rng(77), s = [];
  for (var i = 0; i < 170; i++) s.push([R(), R(), 0.6 + R() * 2.4, R() * 3.14, R()]);
  return s;
})();
/** I tratti di binario sotto il suolo (o appena sopra: lì il tunnel sbuca), già percorsi. */
function tratteTunnel(F, A, B) {
  var y0 = Y(0), tratte = [], cur = null;
  if (B <= A) return tratte;
  var n = Math.ceil((X(B) - X(A)) / 6);
  for (var i = 0; i <= n; i++) {
    var x = A + (B - A) * i / n, y = F.f(x), ys = Y(y);
    var dentro = isFinite(ys) && ys > y0 - 30 && ys < Gy1 + 200 && ramoDi(F, x) >= 0;
    if (dentro && cur && ramoDi(F, x) !== cur.ramo) dentro = false;
    if (dentro) {
      if (!cur) {
        var rr = F.rami[ramoDi(F, x)];
        cur = { ramo: ramoDi(F, x), pts: [], xa: isFinite(rr[0]) ? X(rr[0]) + 3 : -1e5, xb: isFinite(rr[1]) ? X(rr[1]) - 3 : 1e5 };
        tratte.push(cur);
      }
      cur.pts.push([X(x), ys]);
    } else cur = null;
  }
  tratte = tratte.filter(function (t) { return t.pts.length > 1; });
  tratte.forEach(function (t) {                     // il soffitto segue la normale al binario
    var P = t.pts;
    t.su = P.map(function (q, i) {
      var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      var tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1, nx = ty / L, ny = -tx / L;
      if (ny > 0) { nx = -nx; ny = -ny; }
      return [nx, ny];
    });
  });
  return tratte;
}
function soffitto(t, i, d) {                     // il tunnel non scavalca l'asintoto: resta nel suo ramo
  return [Math.max(t.xa, Math.min(t.xb, t.pts[i][0] + t.su[i][0] * d)), t.pts[i][1] + t.su[i][1] * d];
}
function terraETunnel(F, A, B) {
  var y0 = Y(0);
  if (y0 >= Gy1) return;
  var top = Math.max(Gy0 - 6, y0), tratte = tratteTunnel(F, A, B);
  ctx.save();
  ctx.beginPath(); ctx.rect(Gx0 - 6, top, Gx1 - Gx0 + 12, Gy1 + 6 - top); ctx.clip();
  ctx.beginPath(); ctx.rect(0, 0, VW, VH);
  tratte.forEach(function (t) {                     // il vuoto del tunnel: dal binario fino al soffitto
    t.pts.forEach(function (q, i) { var s = soffitto(t, i, 76); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); });
    for (var i = t.pts.length - 1; i >= 0; i--) { var s = soffitto(t, i, -5); ctx.lineTo(s[0], s[1]); }
    ctx.closePath();
  });
  ctx.clip('evenodd');
  ctx.fillStyle = 'rgba(176, 124, 72, 0.17)';
  ctx.fillRect(Gx0 - 6, top, Gx1 - Gx0 + 12, Gy1 + 6 - top);
  ctx.fillStyle = TERRA; ctx.strokeStyle = TERRA; ctx.lineWidth = 0.9;
  var h = Gy1 + 6 - top, w = Gx1 - Gx0;
  SASSI.forEach(function (s) {
    var x = Gx0 + s[0] * w, y = top + 8 + s[1] * (h - 8);
    ctx.globalAlpha = 0.28 + s[4] * 0.25;
    ctx.beginPath();
    if (s[4] > 0.7) { ctx.ellipse(x, y, s[2] * 2.2, s[2] * 1.4, s[3], 0, 7); ctx.stroke(); }
    else { ctx.arc(x, y, s[2] * 0.7, 0, 7); ctx.fill(); }
  });
  ctx.globalAlpha = 1;
  ctx.restore();
  // pareti e puntelli di legno
  ctx.save();
  ctx.beginPath(); ctx.rect(Gx0 - 6, top, Gx1 - Gx0 + 12, Gy1 + 6 - top); ctx.clip();
  tratte.forEach(function (t, k) {
    seme(2700 + k);
    tratto(t.pts.map(function (q, i) { return soffitto(t, i, 76); }), { col: TERRA, lw: 1.5, passo: 18, amp: 0.6 });
    var fatta = 0;
    t.pts.forEach(function (q, i) {                 // puntelli di legno, perpendicolari al binario
      if (i && (fatta += Math.hypot(q[0] - t.pts[i - 1][0], q[1] - t.pts[i - 1][1])) < 110) return;
      fatta = 0;
      var b = soffitto(t, i, 2), c = soffitto(t, i, 74), n = t.su[i];
      linea(b[0], b[1], c[0], c[1], { col: '#8a5a2b', lw: 1.8, passate: 1, amp: 0.5 });
      linea(c[0] + n[1] * 11, c[1] - n[0] * 11, c[0] - n[1] * 11, c[1] + n[0] * 11, { col: '#8a5a2b', lw: 1.8, passate: 1, amp: 0.5 });
    });
  });
  ctx.restore();
}
function trivella() {
  var punta = [[21, -9], [48, -18.5], [24, -28]];
  riempi(punta, 'rgba(150, 150, 165, 0.75)');
  tratto(punta, { chiuso: true, lw: 1.5, col: '#3c3c48', passo: 6, amp: 0.5 });
  ctx.strokeStyle = '#3c3c48'; ctx.lineWidth = 1.1; ctx.globalAlpha = 0.8;
  for (var k = 0; k < 4; k++) {                    // la spirale che gira
    var t = (CLOCK * 2.6 + k / 4) % 1, x = 22.5 + t * 24, hh = 9.5 * (1 - t);
    ctx.beginPath(); ctx.moveTo(x, -18.5 - hh); ctx.lineTo(x + 4, -18.5 + hh); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (var j = 0; j < 5; j++) {                    // terriccio che vola
    var u = (CLOCK * 1.7 + j * 0.21) % 1;
    puntino(48 - u * 30 + Math.sin(j * 7) * 4, -18 - u * 22 * (j % 2 ? 1 : -0.6), 1.3 + (j % 3) * 0.5, TERRA);
  }
}

// ── Che cosa i fumetti non devono coprire: gli omini e quello di cui si parla ──
function protetti() {
  var g = this, F = g.F, r = [];
  function box(x, y, w, h, peso) { r.push([x, y, w, h, peso || 10]); }
  function omone(p, k) { k = OMINO * (k || 1); box(p[0] - 30 * k, p[1] - 64 * k, 60 * k, 68 * k); }
  function punto(x, y, raggio, peso) { if (isFinite(y)) box(X(x) - raggio, Y(y) - raggio, 2 * raggio, 2 * raggio, peso); }
  // i segni notevoli già sul quaderno pesano meno; quello sotto l'omino pesa come lui
  F.zeri.forEach(function (z) { punto(z.x, 0, 14, 2); });
  F.staz.forEach(function (z) { punto(z.x, F.f(z.x), 20, 2); });
  F.flessi.forEach(function (z) { punto(z.x, F.f(z.x), 20, 2); });
  S.cartelli.forEach(function (c) {
    var w = larghezzaTavola(c.testo), x = X(c.x) + c.lato * 3, bx = c.lato > 0 ? x - 4 : x - w + 4;
    box(bx, Y(0) - 80, w, 34, 6);
  });
  if (g.modo === 'limiti') {
    if (!g.amici) return r;
    var k = scalaAmici();
    ['sx', 'dx'].forEach(function (chi) {
      var a = g.amici[chi];
      if (!a) return;
      var y = F.f(a.x), ys = Y(isFinite(y) ? y : 0);
      if (!fuoriY(ys)) omone([X(a.x) + (chi === 'sx' ? -10 : 10) * k, ys], k);
    });
    if (g.lineaX0) {                                  // il punto a cui si tende (il buco, il salto)
      F.vuoti.concat(F.pieni).forEach(function (q) { if (Math.abs(q[0] - g.xLim) < 1e-9) punto(q[0], q[1], 22, 10); });
    }
    return r;
  }
  if (g.id === 'concavita') {
    var an = ancoraConcavita(g);
    if (an) box(an[2][0], an[2][1], an[2][2], an[2][3]);
    (g.piano || []).forEach(function (z) { box(z.S[0] - 36, z.S[1] - 4, 72, 14, 4); box(z.E[0] - 36, z.E[1] - 4, 72, 14, 4); });
    return r;
  }
  var p = g.pos();
  if (!p) return r;
  box(p[0] - 24, p[1] - 24, 48, 48);                  // il punto del binario di cui si sta parlando
  if (g.modo === 'asse') { omone(p); return r; }
  box(p[0] - 42, p[1] - 86, 84, 94);                  // carrello con l'omino
  if (g.id === 'derivata') {
    if (g.bers && g.bers.c) box(g.bers.c[0] - 20, g.bers.c[1] - 30, 40, 92, 8);
    box(p[0] - 52, p[1] + 34, 104, 30, 6);
    var an = Math.atan2(-pendenza(F, g.W.x) * sy, sx), c = Math.cos(an), s = Math.sin(an);
    for (var d = 0; d <= 150; d += 30) {             // la lancia, a tratti lungo la tangente
      var lx = p[0] + c * d * OMINO / 1.3 * 1.3 + s * 35, ly = p[1] + s * d - c * 35;
      box(lx - 14, ly - 14, 28, 28, 6);
    }
  }
  return r;
}
