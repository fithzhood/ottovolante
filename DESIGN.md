# DESIGN.md — Ottovolante

## Soggetto e persone
Lo studio di funzione (dominio, segno, limiti, derivata, concavità) raccontato da omini sulle montagne russe.
Per studenti di quarta e quinta su PC o tablet, e per l'insegnante che lo proietta alla LIM.
Deve sembrare il quaderno di matematica di uno studente, preso vita: si riconosce, non intimidisce.

## Colori (dal quaderno, ognuno con un ruolo)
- Carta #F7F4EC con quadretti azzurri: il foglio. È il crema del quaderno vero, non un tema scelto: tic-ok V07.
- Biro blu #1C3591: grafico, assi, omini, testo.
- Biro rossa #C4212B: segno +, titoli degli appunti, avvisi, punti notevoli.
- Azzurro #1D7FC4: segno −.
- Viola #A020C8: tratteggio delle zone escluse (non si confonde col terriccio).
- Evidenziatore giallo: formula e bottone attivo. Arancio/azzurro solo per i due portali.

## Tipografia
Gloria Hallelujah, una sola, per tutto: è la grafia a mano del quaderno. I numeri hanno decimali fissi.

## Un dettaglio caratterizzante
Il tratto di biro che trema (line boil) su tutto tranne il grafico, che resta fermo: lì conta dove taglia l'asse.

## Glossario
"giro" (dominio, segno, limiti, derivata, concavità), "binario" (il grafico), "carrello", "omino",
"piattaforma", "fiamme", "rampino", "asta", "lancia", "portale", "muro" (asintoto verticale).
Nell'app: "concavità verso l'alto / verso il basso" (mai "convessa/concava").

## Tono per momento
Sistema (bottoni, tooltip, scritte): imperativo, niente "!", nessuna emoji.
Fumetti: parlano gli omini, in prima persona e al presente. "!" solo per una sorpresa vera
(un muro, uno zero, un flesso, il centro). A fine giro dicono il risultato, non "è nella tabella".

## Stati
Nessun giro scelto: "scegli un giro qui sopra ↑" sotto il grafico.
Giro fermo a un punto notevole: bottone "continua il giro" subito sotto il grafico.
Giro finito: comandi spenti tranne "rifai il giro" e "pulisci la pagina".

## Default
Si parte da x − 1, senza giro attivo, velocità normale, pausa ai punti notevoli accesa.

## Movimento
Il tremolio si ferma con prefers-reduced-motion. I bottoni al passaggio si evidenziano, non si ingrandiscono.
