# Il Portico Fiori · sito web

Sito vetrina per **Fiorista Il Portico Fiori**, Strada Genova 108/D, 10024 Moncalieri (TO).

Sito statico in HTML, CSS e JavaScript nativo: nessuna libreria, nessun passaggio di build.
Si pubblica copiando la cartella su qualsiasi hosting (Netlify, GitHub Pages, hosting tradizionale).

```
index.html               ← tutti i testi e i contenuti
assets/css/style.css     ← colori, font e layout (variabili in cima al file)
assets/js/main.js        ← scena 3D, galleria, orari, mappa, modulo contatti
assets/img/              ← immagini WebP
tools/ottimizza-foto.sh  ← converte le foto in WebP leggeri
```

Anteprima in locale: apri `index.html` nel browser, oppure avvia `npx serve .`.

## Cosa contiene

- **Hero 3D**: una peonia con petali in orbita, disegnata su canvas senza librerie. Segue il mouse o il dito.
  Sui dispositivi lenti, con "risparmio dati" attivo o con animazioni ridotte, viene mostrata l'immagine WebP fissa con un leggero effetto parallasse.
  Se la scena gira sotto i 24 fps, il sito passa da solo all'immagine fissa.
- **Galleria**: griglia CSS con container queries che si adatta a desktop, iPad e smartphone. Le cornici in vetro si inclinano in 3D con mouse e tocco, ci sono i filtri per categoria e le immagini si ingrandiscono in un visualizzatore.
- **Contatti**: indirizzo, telefono, email, P.IVA, orari con l'indicatore "Aperto ora / Chiuso" (fuso orario di Roma) e una mappa che carica Google Maps solo quando il visitatore la chiede.
  Il modulo prepara un'email nel programma di posta di chi scrive, quindi non serve un server.
- **Accessibilità**: HTML semantico, etichette collegate ai campi, testo alternativo sulle immagini, aree cliccabili di almeno 48 px, link "Vai al contenuto", focus visibile, supporto a `prefers-reduced-motion`.

## Modifiche frequenti

### Sostituire le foto della galleria
Le immagini attuali sono **illustrazioni segnaposto**.
1. Converti le foto: `./tools/ottimizza-foto.sh ~/Foto/bouquet.jpg` (crea `assets/img/galleria/bouquet.webp`, sotto i 90 KB).
2. In `index.html`, sezione GALLERIA, aggiorna `href` e `src`, la descrizione `alt` e la didascalia.
3. Formato della cornice: `is-tall` per le foto verticali, `is-wide` per le orizzontali, nessuna classe per le quadrate.
4. Categoria per i filtri: `data-categoria="bouquet | matrimoni | eventi | piante"`.
5. Quando ci sono le foto vere, cancella la riga "Le immagini attuali sono illustrazioni segnaposto…".

### Cambiare gli orari
Modifica solo il testo delle celle nella tabella orari di `index.html`, per esempio `09:00 – 12:30 · 15:30 – 19:30` oppure `Chiuso`.
L'indicatore "Aperto ora" si aggiorna da solo.
Aggiorna anche il blocco `openingHoursSpecification` nei dati strutturati in cima alla pagina, così Google mostra gli stessi orari.

### Usare una scena Spline al posto della scena integrata
1. Su spline.design: Export → Code Export → copia l'URL `…/scene.splinecode`.
2. In `index.html` incollalo in `data-spline-scene="…"` sull'elemento `hero-stage`.
3. Il visualizzatore Spline viene scaricato solo sui dispositivi in grado di gestirlo.
   Se la scena non si carica entro 10 secondi, torna la scena integrata.

### Colori e font
Sono variabili CSS in cima a `assets/css/style.css` (`--accent`, `--bg`, `--ink`…).

## Da verificare prima della pubblicazione
- **Orari**: il sito usa Mar–Sab 09:00–12:30 / 15:30–19:30, ma la scheda Google indicava "chiude alle 19". Conferma gli orari corretti, anche quelli del lunedì.
- **Recensioni**: il sito mostra "4,9 su Google" con un link alla scheda Google, senza il numero di recensioni. Aggiungilo solo dopo averlo verificato.
- **Foto**: sostituisci i segnaposto con le foto vere delle composizioni.
