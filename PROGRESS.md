# PROGRESS — My Statistics (A.S.D. Fiamma Monza 1970)

Documento di avanzamento del progetto. **Va aggiornato ad ogni nuova funzione,
opzione o modifica di configurazione** (regola registrata anche in CLAUDE.md).
Documentazione completa (manuale utente + tecnica): PDF "MyStatistics_Documentazione"
del 25/05/2026, archiviato in OneDrive `MyStatistics/Docs/`.

## Riferimenti rapidi
| Voce | Valore |
|------|--------|
| URL app | https://massimovassalli643-ship-it.github.io/mystatistics/ |
| Repository GitHub | github.com/massimovassalli643-ship-it/mystatistics (branch `main`, GitHub Pages) |
| Cartella locale | `C:\Users\maxvas\claude-test\mystatistics` |
| Frontend | `index.html` unico (HTML + CSS + JS inline), zero build, PWA landscape per iPad |
| Backend | Google Apps Script "MyStatisticsBackend" — copia di riferimento in `backend/Code.gs` |
| Deployment attivi | Situazione al 20/09/2026 sera (da Gestisci deployment): attivi **"v5.3 - OCR numeri d…"** (quello usato dall'iPad: risponde v5.3) e due "v5 (13/09/2026)…" portati da Max alla versione 17 (v5.3) la sera del 20/09/2026; **"Senza titolo"** (ex deployment dell'iPad, v5.2) è stato **archiviato** e non risponde più; archiviati anche "v5.2 - ping GET c…" e le versioni v4.x. Un deployment archiviato non risponde: prima di archiviarne uno, controllare che non sia l'URL salvato sull'iPad |
| Database | Google Sheets "My Statistics - Fiamma Monza 2026 2027" (tab Partite, Statistiche, Eventi, Marcatrici, ATLETE = elenco tesserate, compilato a mano) |
| OCR | API Anthropic, modello `claude-sonnet-4-5`, chiave in Script Properties `CLAUDE_API_KEY` |
| Chiavi localStorage | `mystatistics_matches_v2` (storico), `mystatistics_sheets_url` (URL backend), `mystatistics_atlete` (copia dell'elenco tesserate) |
| Cartella distinte su Drive | `My Drive / From Dropbox / CI Fiamma monza prima squadra / Distinte` (letta dal backend, ID in Script Property `DISTINTE_FOLDER_ID`) |

## Stato attuale: v3.28 — Solo le nostre calciatrici anche in trasferta (26/09/2026)

### Novità v3.28 (26/09/2026)

**Segnalazione di Max**: nel Report, "Minuti giocati" mostrava anche le
calciatrici della squadra avversaria.

- **Causa**: la nostra squadra (`detectOurTeam`) si riconosceva dal nome
  scritto *esattamente* uguale in tutte le partite, e `ourSideOf` in caso di
  dubbio sceglieva la squadra di casa. Con i nomi letti dalle distinte
  ("A.S.D. FIAMMA MONZA 1970" / "FIAMMA MONZA") una trasferta prendeva la
  rosa avversaria: le sue calciatrici finivano in Minuti giocati, Tutte le
  calciatrici, classifiche e Analisi gol subiti.
- **Correzione**: `teamWords` / `teamOverlap` confrontano le parole
  significative del nome (senza sigle come A.S.D., SSD, POL, CALCIO e senza
  numeri); `detectOurTeam` raggruppa le grafie simili; `ourSideOf` sceglie il
  lato con più parole in comune e, a parità, quello con più calciatrici del
  foglio ATLETE (`sameAthlete`); solo se ancora indeciso resta "casa".
- Vale per tutta la Dashboard e per il Report, non solo per i minuti.
- **Provato** (browser): trasferta "A.S.D. REAL TREZZANO – A.S.D. FIAMMA
  MONZA 1970" con la stagione salvata come "FIAMMA MONZA" → lato riconosciuto
  "away", 0 avversarie in minuti e tabelle (prima: tutta la rosa avversaria).
- Solo frontend.

## Versione precedente: v3.27 — Report grafico a sezioni (Mail / WhatsApp) (26/09/2026)

### Novità v3.27 (26/09/2026)

**Richiesta di Max**: il referto PDF (`exportMatchPdf`, solo testo) era "molto
al di sotto delle aspettative". Il pulsante **Report** deve offrire più
opzioni con la **grafica originale della dashboard**, e il PDF deve potersi
inviare via mail o WhatsApp.

- **Nuovo Report** (`openReportModal`): 1) *Cosa analizzare*: "Tutta la
  stagione" oppure una partita conclusa; 2) *Sezioni* combinabili:
  1 Vista totale (seleziona tutto) · 2 Blocco iniziale · 3 Sezione analisi
  gol subiti (intestazione, Cosa emerge, indicatori) · 4 Quando subiamo (per
  la stagione anche "1° tempo vs 2° tempo"; per la partita "Minuto per
  minuto") · 5 Episodi ravvicinati (solo stagione) · 6 Chi era in campo
  quando subiamo (stagione: **tutte e 3 le schede**; partita: gol per gol e
  tratto per tratto) · 7 Minuti giocati · 8 Tutte le calciatrici. La Vista
  totale aggiunge Marcatrici, Assist e Rigori parati.
- **Come funziona** (`buildGraphicReport`): la dashboard della vista scelta
  viene disegnata **fuori schermo** (classe `.report-capture`: 1000 px,
  colonna unica, niente icone ⤢), i "Mostra gli altri N gol" vengono aperti,
  e ogni riquadro viene "fotografato" con **html2canvas** (scala 2) e
  impaginato in un A4 con fondo scuro come l'app (`REPORT_BG`). Un riquadro
  che sta in una pagina non si spezza; quelli più lunghi di una pagina sì.
  Alla fine vista, scheda e menu della dashboard tornano come prima.
- **html2canvas 1.4.1** da cdnjs, caricata **solo al primo report**
  (`loadHtml2canvas`): senza internet il report grafico dà un errore chiaro.
  Nuova dipendenza approvata da Max (26/09/2026), regola aggiornata in CLAUDE.md.
- **Invio**: "📤 Condividi (Mail / WhatsApp)" → pannello di sistema
  (`sharePdfDoc`; dove non c'è, download); "⬇️ Scarica"; resta l'invio email
  dal backend (`sendReport`, ora con il PDF grafico) in un riquadro
  richiudibile. **Altri formati** per la singola partita: Excel dati e
  referto testuale (download, come prima).
- Il pulsante "📤 Esporta PDF" in fondo alla Dashboard (v3.26) ora produce lo
  stesso report grafico in Vista totale per la vista scelta nel menu;
  rimosso l'export testuale della v3.26 (`dashboardPdfDoc`, `pdfText`).
- Il Report elenca solo le partite **concluse** (come la dashboard).
- **Provato** (browser, 2 partite di prova con formazione, cambio, rigore
  parato): stagione in Vista totale 4 pagine (~1,1 MB, ~10 s), singola
  partita con 4 sezioni 2 pagine; testi, grafici e ovali con i nomi
  identici all'app; nessun errore in console. Da provare sull'iPad la
  condivisione reale e i tempi con molte partite.
- Solo frontend.

## Versione precedente: v3.26 — Dashboard esportabile in PDF (Mail / WhatsApp) (26/09/2026)

### Novità v3.26 (26/09/2026)

**Richiesta di Max**: il risultato della dashboard deve poter essere
esportato in PDF e inviato via mail o WhatsApp, con un pulsante in fondo alla
schermata (come nella dashboard dell'app Convocazioni).

- Nuovo pulsante **"📤 Esporta PDF (Mail / WhatsApp)"** in fondo a
  `#dashboard-screen` (`exportDashboardPdf`).
- Il PDF riguarda la **vista scelta nel menu** (tutta la stagione o una
  singola partita): intestazione come il referto, riquadri KPI (letti da
  quanto è a schermo), per la stagione le frasi di "Cosa emerge" (solo quelle
  della finestra 3'/5'/10' selezionata), classifiche Marcatrici, Assist,
  Minuti giocati (stesso abbinamento al foglio ATLETE, `dashMinutesRows`) e
  Rigori parati, poi la tabella "Tutte le calciatrici". Grafici SVG e
  "Chi era in campo" non sono inclusi.
- `pdfText()` toglie emoji e simboli fuori dal set WinAnsi dell'Helvetica di
  jsPDF (′ › → ecc.), che altrimenti uscirebbero come caratteri spuri.
- Condivisione con la Web Share API (pannello di sistema: Mail, WhatsApp…);
  dove la condivisione di file non è supportata il PDF viene scaricato;
  se l'utente annulla il pannello non succede nulla. Nome file
  `dashboard_stagione_AAAA-MM-GG.pdf` oppure
  `dashboard_<casa>_vs_<ospite>_<data>.pdf`.
- **Provato** (browser, 2 partite di prova): PDF di 2 pagine generato senza
  errori con tutte le sezioni. Da provare sull'iPad la condivisione reale.
- Solo frontend.

## Versione precedente: v3.25 — "Cosa emerge" espandibile a tutto schermo (23/09/2026)

### Novità v3.25 (23/09/2026)

**Richiesta di Max**: anche il riquadro "💡 Cosa emerge" di "Analisi gol
subiti" deve potersi aprire a tutto schermo, per leggerne meglio il testo.

- `.gs-insights` non è una `.dash-card`, quindi lo zoom della v3.22 non lo
  prendeva: `initCardZoom` ora apre al tocco sia `.dash-card` sia
  `.gs-insights` (stessa `openCardZoom`, che lo racchiude nel `.gs-sec` clone
  così le frasi dei gol ravvicinati seguono la finestra 5'/10' scelta).
- Icona ⤢ in alto a destra anche su "Cosa emerge"; a tutto schermo il testo
  passa da 15 a **24 px** (avviso "Solo N partite" da 13 a 19 px, titolo 17 px).
- **Provato** (browser 1180×820, 2 partite di prova): apertura al tocco, solo
  la frase della finestra attiva visibile, chiusura con Esc, gli altri
  riquadri si aprono come prima, nessun errore in console.
- Solo frontend (CSS + gestore del tocco).

## Versione precedente: v3.24 — Minuti giocati: nomi abbinati al foglio ATLETE (23/09/2026)

### Novità v3.24 (23/09/2026)

Il primo `testAtlete()` sul foglio vero (22 tesserate) ha mostrato che 4
atlete sono scritte diversamente tra distinta e foglio ATLETE: FANTOZZI MARIA
CHIARA / MARIACHIARA, GRITTI ALICE AMBRA / ALICE, BARDELLA CHIARA RITA /
CHIARA, CERRI LIUBA MARIA / LJUBA MARIA SOLE. Con l'abbinamento esatto della
v3.23 sarebbero comparse due volte (con i minuti e a 0').

- **`sameAthlete(a, b)`** sostituisce `athleteKey`: stessa atleta se i nomi
  scritti attaccati coincidono (anche con parole in ordine diverso), oppure se
  ogni parola del nome più corto (almeno 2 parole) si ritrova nel più lungo,
  con 1 lettera di tolleranza nelle parole di almeno 4 lettere (`wordsAlike`).
- **Grafico "Minuti giocati"**: una riga per ogni tesserata con il **nome del
  foglio ATLETE**; i minuti delle calciatrici della distinta abbinate si
  sommano sulla tesserata (anche se in partite diverse l'OCR l'ha scritta in
  modi diversi). Chi non è nel foglio resta con il nome della distinta.
- **Provato** (Node) con i 22 nomi del foglio e i 18 della dashboard dell'iPad:
  22 righe, nessun doppione, le 4 atlete sopra abbinate, DAUSTRIA, GUIDI,
  MONGUZZI e ROSSINI a 0'; nessun falso abbinamento tra atlete con lo stesso
  nome proprio (MAGNI/BIGNOTTI CHIARA, GUIDI/ARNESE SOFIA...).
- Solo frontend; backend invariato (v5.5).

## Versione precedente: v3.23 + backend v5.5 — Minuti giocati: tutte le tesserate, anche a 0' (23/09/2026)

### Novità v3.23 + backend v5.5 (23/09/2026)

**Richiesta di Max**: nel riquadro "⏱️ Minuti giocati" della Dashboard devono
comparire tutte le atlete, anche quelle con 0 minuti (infortunate o convocate
ma mai schierate). L'elenco delle calciatrici tesserate è il nuovo foglio
**ATLETE** dello spreadsheet My Statistics.

- **Backend v5.5 — action `atlete`** (`handleAtlete`): legge il foglio `ATLETE`
  (`SHEET_ATLETE`) e restituisce `{ ok, atlete: [{ name }] }` (nomi in
  maiuscolo, senza duplicati). Le colonne si riconoscono dall'intestazione:
  "Cognome" + "Nome" separati, oppure una colonna unica ("Cognome e nome",
  "Atleta", "Nome"…); senza intestazione si usa la prima colonna con testo.
  **Il numero a lato delle atlete è solo un progressivo e viene ignorato**
  (non è il numero di maglia). Funzione di prova `testAtlete()` nell'editor.
  Nessun nuovo scope: lo script è già legato allo spreadsheet.
- **Frontend**: all'apertura della Dashboard `refreshAtlete()` scarica la lista
  in background e la salva in localStorage (`mystatistics_atlete`); se è
  cambiata, la dashboard si ridisegna. Offline o con backend vecchio resta
  l'ultima copia salvata (all'inizio vuota: il grafico si comporta come prima).
- **Grafico "Minuti giocati"** = calciatrici delle distinte delle partite
  considerate + tesserate del foglio ATLETE non presenti, a 0'. Vale sia per
  "Tutta la stagione" sia per la singola partita. Chi ha giocato ma non è nel
  foglio ATLETE resta comunque (non si perde nessun minuto).
- **Stessa atleta tra distinta e foglio** (`athleteKey`, sostituita in v3.24 da `sameAthlete`): maiuscole, senza
  accenti né apostrofi, parole in ordine alfabetico — "Di Gabriele Giulia" =
  "GIULIA DI GABRIELE", "D'Angelo" = "DANGELO". Se l'OCR ha scritto un nome
  diversamente (lettera sbagliata), l'atleta compare due volte: una con i
  minuti, una a 0'. Si corregge sistemando il nome nella partita.
- **`barChartHtml(rows, unit, limit, includeZero)`**: nuovo parametro
  `includeZero`; le righe a 0 hanno la barra vuota e mostrano `0'`. A parità di
  valore l'ordine è alfabetico. Solo "Minuti giocati" lo usa; Marcatrici,
  Assist e Rigori parati invariati.
- **`BACKEND_MIN_VERSION` = 5.5**: finché i deployment non sono aggiornati,
  Verifica versioni lo segnala; il resto dell'app funziona come prima.
- La tabella "Tutte le calciatrici" non cambia (solo atlete delle distinte).
- **Provato** (Node, fuori dal browser): lettura del foglio con intestazione
  Cognome/Nome separati, con colonna unica e senza intestazione (progressivo
  in colonna A ignorato); abbinamento nomi; grafico con righe a 0'. **Non
  provato** sul foglio ATLETE reale (il connettore Drive non ha i permessi):
  dopo il deploy eseguire `testAtlete()` nell'editor e controllare i nomi nel log.
  → Eseguito da Max il 23/09/2026: 22 tesserate lette correttamente.

## Versione precedente: v3.22 — Riquadri Dashboard espandibili a tutto schermo (23/09/2026)

### Novità v3.22 (23/09/2026)

**Richiesta di Max**: poter toccare i riquadri della Dashboard (grafici, KPI di
"Analisi gol subiti", tabella calciatrici) per ingrandirli a tutto schermo e
leggerli meglio, in particolare sull'iPad.

- **Ogni `.dash-card`** (tutti i riquadri con titolo, sia nella griglia
  principale — Marcatrici, Assist, Rigori parati, Minuti giocati, Tutte le
  calciatrici — sia dentro "Analisi gol subiti" — Quando subiamo partita per
  partita, 1° tempo vs 2° tempo, Episodi ravvicinati, Chi era in campo quando
  subiamo, Minuto per minuto, Gol per gol, Chi era in campo tratto per tratto —
  è ora **cliccabile** (icona ⤢ in alto a destra) e apre una copia ingrandita
  a tutto schermo (`openCardZoom`/`closeCardZoom`), chiudibile con il pulsante
  "✕ Chiudi", toccando fuori dal riquadro o con Esc.
- **Si clona il riquadro** invece di spostarlo, così la dashboard sotto resta
  intatta e riutilizzabile subito dopo la chiusura. I riquadri interni a
  "Analisi gol subiti" dipendono dagli attributi `data-w`/`data-tab`
  dell'antenato `.gs-sec` (mostrano/nascondono figli via CSS): la copia viene
  quindi racchiusa in un `.gs-sec` clone con gli stessi attributi, altrimenti
  risulterebbe vuota.
- **`setGsWindow`/`setGsTab`** ora aggiornano *tutti* i `.gs-sec`/`.gs-chip`/
  `.gs-tab` del documento (non più solo quelli dentro `#dash-conceded`): se il
  riquadro "Chi era in campo quando subiamo" è aperto a tutto schermo, i suoi
  pulsanti tab funzionano e restano sincronizzati con la pagina sotto.
- Clic su pulsanti, tendine, link o `<details>` dentro un riquadro non apre lo
  zoom (altrimenti i controlli esistenti — tab, soglia gol ravvicinati,
  "Come vengono calcolati i numeri" — smetterebbero di funzionare).
- Solo frontend, nessuna modifica a dati, backend o export.
- **Provato** (browser, con partite di prova): zoom su tutti i tipi di
  riquadro elencati sopra, chiusura con pulsante/click fuori/Esc, cambio tab e
  soglia gol ravvicinati funzionante sia a schermo intero sia tornando alla
  dashboard normale; nessun riquadro vuoto, nessun errore in console.

## Versione precedente: v3.21 — Gol su rigore in Dashboard (23/09/2026)

### Novità v3.21 (23/09/2026)

**Richiesta di Max**: nella Dashboard, un riquadro sotto "Gol fatti" con quanti
di questi sono arrivati su rigore, e uno sotto "Gol subiti" con lo stesso per i
gol incassati — la causale "rigore" esisteva già per l'evento gol, mancava solo
di essere riepilogata.

- **`buildDashboardStats`**: due nuovi contatori `team.gfPen` / `team.gaPen`,
  calcolati scorrendo `m.events` di ogni partita e contando i gol con
  `goalType === 'rigore'` fatti dalla nostra squadra o dall'avversaria
  (l'autogol resta un tipo a parte, non si sovrappone al rigore).
- **`kpiStackHtml(topHtml, bottomHtml)`**: impila due tessere KPI nella stessa
  cella della griglia (`.kpi-stack`, flex a colonna) invece di aggiungerle come
  voci separate — cosi "Gol fatti su rigore"/"Gol subiti su rigore" restano
  **sempre visivamente sotto** la tessera principale, qualunque sia il numero
  di colonne che il layout responsive sceglie per riquadro.
- Vale sia per la vista "Tutta la stagione" sia per la singola partita. Nessuna
  modifica al modello dati, al backend o agli export: i rigori si leggono già
  dagli eventi esistenti (`goalType`, presente dalla v3.x che introduce i tipi
  di gol).
- **Provato** (browser): con partite di prova che includono gol "rigore" per
  entrambe le squadre, le due nuove tessere mostrano i conteggi corretti sotto
  "Gol fatti" e "Gol subiti" in entrambe le viste; con zero rigori mostrano 0
  invece di sparire (coerente con le altre tessere KPI, sempre visibili).

## Versione precedente: v3.20 — "Chi era in campo" con i nomi (21/09/2026)

### Novità v3.20 (21/09/2026)

**Richiesta di Max**: nella sezione "Chi era in campo quando subiamo" della Dashboard,
niente più "Formazione base", nomi barrati di chi è uscita, nomi di chi è entrata e
"Molto diversa dalla base": al loro posto un ovale con il nome di ogni calciatrice
presente.

- **`gsPlayersHtml(keys, names)`** disegna un ovale per ogni calciatrice in campo,
  in ordine alfabetico (stesso ordine in ogni riga, per confrontare a colpo d'occhio).
  Sostituisce `gsDeltaHtml` e `gsElevenHtml`.
- **Vale ovunque nella sezione**: "Gol per gol" (stagione e singola partita),
  "Formazioni", "Episodi ravvicinati" (formazione all'ultimo gol) e i tratti S1, S2…
  della vista singola partita. Nelle righe "Formazioni" ho tolto il dettaglio
  apribile "Chi era in campo (11)", ora ridondante.
- **Rimossi**: il concetto di formazione "base" (`gsBaseXI`, `st.base`) e il relativo
  CSS (`.gs-d*`, `.gs-pc.new/.gone`). Le note esplicative sono state riscritte.
- Solo frontend, nessun cambio a calcoli, dati, export o backend.
- **Provato** (browser, 8 partite di prova): 11 ovali per ogni gol, formazione e
  tratto, nessun nome barrato né ▲/▼/"Base"; nessun errore in console.

## Versione precedente: v3.19 + backend v5.4 — Rigori parati (21/09/2026)

### Novità v3.19 + backend v5.4 (21/09/2026)

**Richiesta di Max**: un pulsante "Rigore parato" tra Sostituz. e Atleta, per
registrare squadra, atleta e minuto, con il dato che compare nelle statistiche.

- **Pulsante** "🧤 Rigore parato" (verde acqua) tra Sostituz. e Atleta; la griglia
  dei pulsanti passa da 5 a 6 colonne elastiche (`minmax(0, 1fr)`), quindi i pulsanti
  si restringono invece di sconfinare sotto la colonna degli eventi.
- **Modale** come gli altri eventi: Squadra, Minuto + Tempo (1° T / 2° T) e
  "Atleta che ha parato". Modificabile con ✏️ ed eliminabile come ogni evento.
- **Modello dati**: nuovo evento `{ type: 'penaltysave', team, player: {num, name},
  period, periodMinute, minute }`. `team` = squadra dell'atleta che ha parato (come per
  gli altri eventi); usa `player`, quindi `relinkPlayerRefs` la segue se si corregge
  nome o numero. Non tocca il punteggio.
- **Statistiche**: `computePlayerStats` conta `saves` per atleta.
  - *Riepilogo partita*: colonna 🧤 nelle tabelle delle due squadre, visibile solo se
    in partita c'è stato almeno un rigore parato.
  - *Dashboard*: tessera "Rigori parati" (della nostra squadra, in entrambe le viste),
    grafico "🧤 Rigori parati" (solo se ce n'è almeno uno) e colonna "🧤 Parati" nella
    tabella "Tutte le calciatrici".
  - *Excel*: riga "Rigori parati" nel Riepilogo (entrambe le squadre), colonna
    "Rigori parati" in fondo al foglio Statistiche (le altre colonne non si spostano),
    tipo "Rigore parato" nel foglio Eventi.
  - *PDF*: colonna "PAR" tra R e MIN e riga "RIGORE PARATO" nella cronologia.
- **Backend v5.4** (solo `Code.gs`, nessun nuovo scope): il foglio Eventi di Sheets
  scrive tipo "Rigore parato" per questi eventi (con un backend precedente la riga
  avrebbe il tipo vuoto). Il foglio **Statistiche resta a 12 colonne**: i rigori
  parati per atleta non ci sono, si leggono dal foglio Eventi.
  `BACKEND_MIN_VERSION` = 5.4: finché i 3 deployment non sono alla v5.4,
  "Verifica versioni" mostra l'avviso.
- **Da fare per Max**: incollare `backend/Code.gs` nell'editor Apps Script, salvare e
  pubblicare una nuova versione su TUTTI e 3 i deployment (nessuna ri-autorizzazione).
- **Provato** (browser): modale per entrambe le squadre e per entrambi i tempi,
  cronologia, riepilogo, dashboard, Excel (fogli Riepilogo, Statistiche, Eventi) e PDF;
  i 6 pulsanti restano quadrati e uguali a 1024 px. **Da provare sull'iPad** in partita.

## Versione precedente: v3.18 — Dashboard: analisi gol subiti (21/09/2026)

### Novità v3.18 (21/09/2026)

**Richiesta**: analizzare i pattern dei gol subiti (minuti che si ripetono, gol
ravvicinati, split 1°/2° tempo) e capire quale formazione in campo ne prende di
più. Mockup approvato da Max (soglia ravvicinati 5', sezione sotto i KPI e prima
dei grafici a barre).

- **Nuova sezione "🥅 Analisi gol subiti"** nella Dashboard, tra la riga di KPI e i
  grafici a barre (`<div id="dash-conceded">`, `renderConceded()` chiamata da
  `renderDashboard()`). Solo frontend: nessuna modifica a backend, Sheets, modello
  dati o export.
- **Vista "Tutta la stagione"**: box "Cosa emerge" (frasi generate), 4 KPI (porta
  inviolata, % nel tempo peggiore, gol ravvicinati, fascia critica), grafico "una
  riga per partita" con i minuti dei gol + istogramma per fasce da 15' allineato,
  scheda 1° vs 2° tempo, elenco degli episodi ravvicinati, e una scheda a tre tab:
  **Gol per gol** (per ogni gol subito, la formazione in campo in quel momento),
  **Formazioni** (gruppi di 11 per tempo, gol ogni 90') e **Singole calciatrici**
  (gol subiti mentre è in campo, ogni 90').
- **Vista singola partita** (stesso menu a tendina): KPI, linea 0–90' con gol, cambi
  numerati e tratti di formazione (S1, S2…), "Gol per gol" e una scheda per ogni
  tratto con i nomi e chi è entrata/uscita.
- **Formazione in campo** = titolari (`lineup`) + cambi e rossi della nostra
  squadra in ordine (`gsAnalyzeMatch`). Mostrata come **Base − chi esce + chi entra**;
  "Base" = i titolari più ricorrenti nelle partite analizzate (`gsBaseXI`). Un gol
  nello stesso minuto di un cambio conta dopo il cambio. Le calciatrici si
  riconoscono per nome (i numeri di maglia cambiano da una partita all'altra).
- **Tempo e minuti**: il tempo si legge da `period` (un recupero del 1° tempo resta
  nel 1° tempo); i minuti mostrati sono assoluti (51', non 6' del 2° tempo). Si
  analizzano solo i tempi regolamentari; i gol dei supplementari sono contati a
  parte e non entrano nei grafici. Autogol nostri = gol subiti.
- **Gol ravvicinati**: due o più gol subiti nella stessa partita entro N minuti,
  anche a cavallo dell'intervallo. Soglia 3'/5'/10' con i pulsanti in testata
  (predefinita 5'); cambiare soglia o tab non ridisegna la sezione (attributo
  `data-w`/`data-tab`), quindi i dettagli aperti restano aperti.
- **Limiti dichiarati a video**: sotto 30' in campo una formazione non si confronta,
  sotto 60' (formazioni) / 180' (calciatrici) compare "campione piccolo"; con meno
  di 5 partite un avviso ricorda che i pattern sono indicativi. Il ruolo non è
  registrato, quindi niente schema tattico. Se manca la formazione iniziale di una
  partita, quella partita resta nei conteggi dei gol ma non nelle formazioni.
- **Colori**: blu `#4a8fe0` = 1° tempo, ambra `#d17a26` = 2° tempo (validati per
  protanopia/deuteranopia/tritanopia con ΔE > 24); il colore non è mai l'unico
  segnale (numeri, etichette, legenda).
- **Grafico "Minuti giocati" allungato**: mostra tutte le calciatrici con almeno
  1 minuto invece delle prime 8 (`barChartHtml` ha ora un parametro `limit`;
  marcatrici e assist restano alle prime 8). Chi ha 0 minuti resta solo nella
  tabella "Tutte le calciatrici" (superato in v3.23: ora compaiono anche le
  atlete a 0').
- **Costanti** (`index.html`, blocco Dashboard): `GS_WINDOWS`, `GS_MIN_FORM`,
  `GS_SMALL_FORM`, `GS_MIN_PLAYER`, `GS_SMALL_PLAYER`, `GS_RATE_MAX`,
  `GS_GOALS_SHOWN`.

**Provato** (browser, 8 partite di prova salvate in localStorage): totali, fasce e
episodi coincidono col mockup (15 gol, 67% nel 2° tempo, picco 45–60', 2 episodi a
5'); vista stagione e partita; cambio soglia e tab; casi limite (rosso, autogol
nostro, gol nel recupero del 1° tempo, gol nei supplementari, cambio nello stesso
minuto di un gol, evento senza `period`, partita senza formazione, nessun gol
subito). **Da provare con partite vere**: finora c'è una sola partita reale.

## Versione precedente: v3.17 — Messaggi d'errore OCR leggibili (20/09/2026)

### Novità v3.17 (20/09/2026)

**Contesto**: con "📷 Scatta foto" il caricamento della mattina falliva con un
errore dal backend, mentre da "Libreria foto" funzionava. In serata "Scatta
foto" ha funzionato (app v3.13 + backend v5.3), quindi l'errore non si è
ripetuto e **la sua causa non è confermata**.

- **Messaggi d'errore** (`humanOcrError`): risposta AI non valida ("La distinta
  non è stata letta… riprova con la pagina dritta e che riempie l'inquadratura
  oppure usa Libreria foto") e "L'AI ha rifiutato la richiesta", entrambi con il
  **dettaglio tecnico** in piccolo; gli errori dell'OCR restano visibili **30
  secondi** invece di 6. Se l'errore ricapita, copiare il messaggio esatto.
- **Ipotesi scartata (non pubblicata)**: la fotocamera dell'iPad scatta foto
  orizzontali (4032×3024) con la distinta verticale al centro; il codice
  taglia le foto orizzontali in strisce a piena larghezza, quindi la pagina
  occupa ~40% di ogni striscia e il testo arriva ~2× più piccolo (simulato: da
  ~1200 px a 1568×388). Era stato scritto un ritaglio della pagina
  (`findPageBox`: soglia di Otsu su miniatura + protezioni di dimensione e di
  contrasto), ma non era dimostrato necessario e non è mai stato provato con una
  foto reale: rischio di tagliare la colonna dei numeri per un vantaggio
  ignoto. **Rimosso prima della pubblicazione**; resta nella cronologia git
  (commit `6852a35`) e si può riprendere se "Scatta foto" ridà l'errore.

## Versione precedente: v3.16 + backend v5.3 — Numeri di maglia scritti a mano (20/09/2026)

### Novità v3.16 + backend v5.3 (20/09/2026)

**Problema emerso alla prima partita reale**: caricata la distinta, tutti i
numeri di maglia risultavano vuoti e sono stati inseriti a mano dalla foto.
**Causa**: sulle distinte della Fiamma Monza i numeri di maglia non sono
stampati: si scrivono **a mano con il pennarello** nella cella "N° del Ruolo"
poco prima della chiamata dell'arbitro (cifre grandi, che sconfinano verso il
margine). Il prompt del backend (v4.2, scritto per un PDF digitale con celle
vuote) diceva che quella cella è "MOLTO SPESSO VUOTA" e imponeva `null` se i
numeri sembravano il contatore di riga: il modello scartava i numeri veri.
Sulla foto ci sono due tipi di numeri a sinistra: il **contatore di riga**
stampato piccolo *fuori* dalla tabella (1, 2, 3…) e i **numeri di maglia** a
mano *dentro* la tabella.

- **Backend v5.3 (solo prompt, nessun nuovo scope)**: descrive i due tipi di
  numeri e dice di leggere sempre quello a mano nella cella. Il numero di maglia
  è **solo** la colonna con il titolo "N° del Ruolo" (regola già della v4.2),
  con un punto di riferimento fisso: è la cella subito a sinistra della data di
  nascita; la colonnina senza titolo più a sinistra non è mai il numero, anche
  se una cifra a penna la sfiora (nella foto il "13" tocca il contatore). `null` solo se la
  cella è vuota (distinta digitale non compilata) o la cifra è davvero
  ambigua ("meglio vuoto che sbagliato"); numeri di una squadra tutti diversi,
  se ne legge due uguali ricontrolla. Resta la protezione contro il contatore:
  se le uniche cifre viste sono quelle stampate nel margine e sono esattamente
  1, 2, 3… → `null` (caso del PDF digitale su cui era nata la v4.2).
- **Frontend v3.16** (`applyOcrResult`): (1) una nuova scansione che non
  legge il numero **non cancella** più quello già presente, es. inserito a
  mano; (2) se la nuova lettura cambia un numero, formazione ed eventi seguono
  (`relinkPlayerRefs`, v3.14); (3) il numero letto è sempre un intero valido
  o vuoto, mai `NaN`. **`BACKEND_MIN_VERSION` = 5.3**: finché un deployment non
  è alla v5.3, "Verifica versioni" mostra l'avviso.
- **Verificato sull'iPad (20/09/2026, sera)**: con il backend v5.3 su "Senza
  titolo" i numeri di maglia scritti a mano arrivano correttamente sia da
  "Scatta foto" sia da "Libreria foto" (stessa distinta, prima tutti vuoti).
  Il prompt non si poteva eseguire dall'ambiente di sviluppo (la chiave è nelle
  Script Properties): provati lì solo la costruzione del prompt e la fusione
  frontend con risposte simulate.

## Versione precedente: v3.15 — Niente più tag ruolo (GK) a video (20/09/2026)

### Novità v3.15 (20/09/2026)

Alla prima partita reale il tag **GK** compariva ancora accanto ad alcune
atlete (quelle che l'OCR aveva marcato come portiere con "(P)"). Il ruolo non è
un dato utile per chi usa l'app, e in v3.9 era stato tolto solo dalla
formazione. Ora non compare più **in nessuna schermata**:
- menu di scelta dell'atleta (goal, assist, cartellini, cambi): tolto `[GK]`
- riepilogo: tabella marcatrici e pannelli statistiche per squadra: tolto il badge
- modale "➕ Atleta": tolto il selettore del ruolo (ora le atlete aggiunte a mano
  hanno sempre `role: ''`); rimossi anche `ROLES`, `ROLE_LABELS` e il CSS
  `.player-role-badge*`, non più usati
- Il campo `role` **resta nel modello dati**: lo imposta l'OCR per i "(P)", ordina
  la formazione (portiere in cima) e alimenta la colonna Ruolo degli export
  (Excel, PDF, Sheets, schema a 12 colonne invariato). Per toglierla anche
  dagli export basta dirlo.

**Provato** (browser): menu goal, riepilogo e modale senza `[GK]`/badge/selettore;
con il cronometro in marcia, aprire "➕ Atleta", correggere un'atleta e salvare
non interrompe il tempo (stesso timer, il conto continua a modale aperta e dopo).

## Versione precedente: v3.14 — Correzione atlete che segue eventi e formazione (20/09/2026)

### Novità v3.14 (20/09/2026)

**Problema emerso alla prima partita reale**: il nome importato dall'OCR era
sbagliato (SOLINZI invece di SGUINZI). In partita l'unico strumento sulla rosa
era "➕ Atleta", che serve solo ad aggiungere; correggere un nome era possibile
solo nella schermata rose, prima del fischio. In più, un'atleta è identificata
ovunque dalla coppia **numero + nome** (formazione, eventi, statistiche) e gli
eventi ne memorizzano una copia: cambiando nome o numero dopo un goal, il goal
restava legato al nome vecchio e spariva da statistiche e marcatrici, e le
titolari perdevano lo stato "titolare" (quindi i minuti).

- **`relinkPlayerRefs(side, oldP, newP)`**: quando si cambia nome o numero di
  un'atleta, formazione ed eventi (marcatrice, assist, cartellino, cambi) della
  **stessa squadra** vengono aggiornati. Una squadra avversaria con un nome
  uguale non viene toccata. Usata da `confirmRosterRow` (schermata rose, ✓) e
  dalla nuova modale sotto. Nessun cambio al modello dati né agli export.
- **Correzione in partita**: la modale "➕ Atleta" (ora "Aggiungi o correggi
  calciatrice") ha un menu **"Correggi una calciatrice già in rosa"**. Scelta
  un'atleta, i campi si precompilano e il pulsante diventa **"Salva
  correzione"**; senza scelta resta "Aggiungi" come prima. Anche l'aggiunta
  ora crea `birthDate: ''` come le altre righe.
- **Partita già giocata con il problema**: da riepilogo → ✏️ Modifica → ✏️
  sull'evento → riselezionare l'atleta giusta; oppure correggere l'atleta con la
  nuova modale. Farlo prima di "Sincronizza su Sheets".

**Provato** (browser): rinomina + numero dalla rosa e dalla modale; goal,
assist, giallo, cambio e formazione seguono; goal della squadra avversaria con
lo stesso nome intatto; statistiche (goal, assist, titolare) corrette; nuova
atleta ancora aggiungibile e salvata.

## Versione precedente: v3.13 — Verifica versioni app/backend (20/09/2026)

### Novità v3.13 + backend v5.2 (20/09/2026)

**Problema**: sull'iPad non c'era modo di sapere se l'app e il backend fossero
l'ultima versione. Il frontend è servito da GitHub Pages con `max-age=600` e la
web app da Home Screen può tenerne una copia vecchia; il backend ha 3 deployment
e il ping GET rispondeva con lo stesso testo ("v5") per le versioni 13 e 14.

- **`APP_VERSION`** (frontend) e **`BACKEND_VERSION`** (`backend/Code.gs`) sono
  due costanti da **aggiornare ad ogni modifica** del rispettivo file.
  `BACKEND_MIN_VERSION` in `index.html` è la versione minima di backend che quel
  frontend richiede.
- La versione dell'app compare in **Home** (accanto al sottotitolo) e in
  **Impostazioni**.
- **⚙️ Impostazioni → "🔍 Verifica versioni (app + backend)"**:
  - *App*: rilegge `index.html` dal server senza cache e confronta `APP_VERSION`.
    Se online c'è una versione più nuova compare **"Ricarica ora"**.
  - *Backend*: chiama il ping GET dell'URL salvato (o scritto nel campo) e legge
    `version`. Distingue: ok · versione non dichiarata (backend precedente alla
    5.2) · troppo vecchio · errore di rete · URL non impostato. Ogni riga ha
    icona + testo. Il controllo riguarda **il deployment raggiunto da quell'URL**:
    è quello che l'iPad usa davvero.
- Backend v5.2: il ping GET restituisce `version`. **Nessun nuovo scope**: non
  serve ri-autorizzare, basta pubblicare la nuova versione sui **3** deployment.
- **Limite**: l'app che gira sull'iPad prima di ricevere la v3.13 non ha il
  pulsante. La prima volta serve chiudere/riaprire l'app (o rimuovere e
  riaggiungere l'icona) finché in Home non compare "v3.13".
- Nessuna modifica alla logica di partita.

**Provato** (browser, risposte del backend simulate): tutto ok, backend senza
versione, backend 5.1, backend 5.10 (confronto numerico, non testuale), errore
di rete, URL vuoto, app indietro rispetto al server, file online senza versione.

## Versione precedente: v3.12 — Schermo sempre acceso + cronometro ripristinabile (20/09/2026)

### Novità v3.12 (20/09/2026)

**Problema**: l'app non faceva nulla per impedire all'iPad di andare in pausa
durante la partita (nessun Wake Lock), e se iPadOS scartava la pagina mentre
l'iPad era bloccato il cronometro tornava indietro all'ultimo evento/pausa.

**1) Screen Wake Lock** (blocco `Navigazione`, `showScreen`)
- Lo schermo resta acceso su **Setup, Formazione e Partita** (`WAKE_SCREENS`),
  cioè da "Nuova partita"/riapertura fino a "Termina partita". Su Home,
  Riepilogo e Dashboard il blocco viene rilasciato: l'iPad può riposare.
  Anche la modalità "✏️ Modifica" di una partita conclusa lo riacquisisce.
- Il browser rilascia il lock da solo quando la pagina non è visibile (app in
  background, iPad bloccato): `visibilitychange` lo richiede di nuovo al rientro.
- Nella schermata partita, accanto al periodo, un badge mostra lo stato:
  **🔆 Schermo sempre acceso** (verde) oppure **⚠️ Schermo non protetto**
  (giallo: API non disponibile, iPadOS troppo vecchio, o pagina non visibile).
  Icona e testo sempre presenti, il colore non è mai l'unico segnale.
- **Limite noto**: il Wake Lock NON impedisce lo spegnimento causato dalla
  **chiusura della cover** (sensore magnetico hardware). Va disattivato nelle
  Impostazioni di iPadOS (vedi "Da verificare").

**2) Cronometro ripristinabile dopo la riapertura**
- La partita salva ora `timer.runningSince` (istante dell'ultimo avvio, `null`
  in pausa) e `timer.elapsedMs` come **base** fino a quell'avvio (prima era il
  tempo "vivo" al momento del salvataggio). `startTimer()` ora salva subito.
- Riaprendo dallo storico una partita non conclusa con `runningSince`
  valorizzato (`restoreRunningTimer`), il tempo trascorso nel frattempo si somma
  alla base e il cronometro **riparte in marcia**, con un avviso.
- Oltre `TIMER_RECOVERY_MAX_MS` (2 ore) il salvataggio è considerato abbandonato
  (partita dimenticata aperta): cronometro **in pausa** alla base salvata, con
  avviso a controllare il tempo.
- Nessun impatto sulle partite vecchie (senza `runningSince`) né sull'export:
  per le partite concluse `elapsedMs` coincide con il tempo finale come prima.

**Provato** (browser, `navigator.wakeLock` simulato): richiesta su Setup/Match,
nessuna richiesta doppia, rilascio da hidden e nuova richiesta al ritorno,
rilascio a fine partita e su Home, riacquisizione in modifica; cronometro:
ripristino a 06:00 con base 1:00 + 5 min, caso oltre 2 ore in pausa, `runningSince`
azzerato su pausa/prossimo periodo. Da provare sul campo con l'iPad reale.

## Versione precedente: v3.11 — Partite concluse modificabili (14/09/2026)

### Novità v3.11 (14/09/2026)

**Correzione dati dopo la fine della partita.** Finora una partita marcata
"Completata" si apriva solo sul riepilogo di sola lettura: per correggere un
errore (un goal segnato dalla giocatrice sbagliata, un cartellino attribuito
al tempo sbagliato, ecc.) non c'era alternativa a cancellare la partita e
rifarla da capo. Ora:

- Sul riepilogo, un nuovo pulsante **"✏️ Modifica"** (accanto a Home) chiede
  conferma esplicita ("le correzioni restano solo su questo dispositivo
  finché non premi di nuovo Sincronizza") e riapre la partita nella
  schermata di gara normale, ma con il cronometro e i suoi controlli
  nascosti (sostituiti da un banner "Modalità modifica") — non deve poter
  ripartire un tempo su una gara già finita. Da lì rosa, formazione ed
  eventi sono modificabili con gli strumenti già esistenti; un pulsante
  "↩️ Torna al riepilogo" chiude la modifica.
- **Modifica diretta di un evento**: ogni evento in cronologia ha ora,
  oltre alla ×, anche una ✏️ che riapre il modal precompilato con marcatrice,
  assist, tipo, minuto/tempo ecc. già impostati — non serve più cancellare e
  reinserire un evento per correggerlo. Il punteggio resta coerente anche
  se si cambia squadra o tipo di un goal (autogol ↔ regolare): l'effetto
  del goal originale viene prima annullato, poi riapplicato con i nuovi dati.
  Nel riepilogo la cronologia resta invece di sola lettura (le azioni di
  modifica/elimina compaiono solo nella match-screen), per evitare tocchi
  accidentali su dati già consolidati fuori dal percorso guidato sopra.
- La partita registra ora anche **`editedAt`** (quando si chiude la
  modifica): il riepilogo mostra "✏️ Ultima modifica: ..." sotto la data, e
  il pulsante "☁️ Sincronizza su Sheets" lampeggia quando ci sono modifiche
  non ancora inviate (mai sincronizzata, oppure modificata dopo l'ultimo
  invio) — per non dimenticarsi di rimandare la correzione online. Nessuna
  modifica al backend: la sincronizzazione già sostituiva le righe esistenti
  per `match.id` invece di accodarle, quindi correggere e ri-sincronizzare
  non crea doppioni su Sheets.

### Novità v3.10 — Minuto ed evento diviso in "tempo" (13/09/2026)

Nella schermata di inserimento evento (goal, ammonizione, espulsione,
sostituzione), la riga "Minuto" ora è divisa in due metà:
- **a sinistra**: campo minuto, editabile, che rappresenta il minuto **nel
  tempo scelto** (es. "5" e non più "50");
- **a destra**: due pulsanti **1° T** / **2° T** per scegliere a quale tempo
  appartiene l'evento (comportamento identico alla selezione squadra/tipo già
  presente nello stesso modal).

Il minuto assoluto di partita (usato per l'ordinamento cronologico degli
eventi e per le esportazioni, es. "50'") si calcola sommando il minuto
digitato all'offset del tempo selezionato (1° T = +0, 2° T = +45). All'apertura
del modal il tempo è precompilato in base al cronometro in corso, ma resta
liberamente modificabile per correggere un evento inserito in ritardo, senza
dover fare il calcolo a mente. Se l'evento cade in un eventuale supplementare
(1°/2° supplementare, gestiti dal cronometro ma non esposti come pulsanti
qui) il tempo pre-impostato viene comunque rispettato finché non si tocca uno
dei due pulsanti 1° T / 2° T.

Corretto anche un piccolo difetto preesistente nello stesso modal: cambiare
squadra o tipo goal dopo aver digitato il minuto ne azzerava il valore al
successivo ridisegno del pannello (ora il valore digitato viene sempre
salvato prima di ridisegnare).

### Novità v3.9 (13/09/2026)

Rimosso il badge di ruolo (GK/DEF/MID/FWD/LM, o "—" se assente) dalle righe
della schermata "Formazione iniziale", per entrambe le squadre: confermato
in precedenza che il ruolo non è un campo utile per chi usa l'app (era stato
tolto già come colonna dalla rosa). Il campo `role` resta comunque nel
modello dati — lo imposta l'OCR per i portieri "(P)" — perché continua ad
alimentare l'ordinamento della lista (portieri in cima) e la colonna Ruolo
negli export; è stato tolto solo dalla visualizzazione di questa schermata.

### Novità v3.8 (13/09/2026)

**1) Pulsante "svuota tutta la rosa" per squadra**

Nella schermata "Rose calciatrici", accanto al contatore "X atlete" di ogni
pannello (Casa/Ospiti), un pulsante 🗑️ chiede conferma e cancella l'intero
elenco di quella squadra in un tocco — prima si poteva eliminare solo una
riga alla volta con la ✕.

**2) Pulsante "deseleziona tutte" nella formazione iniziale**

Segnalato un contatore "1/11" già valorizzato all'ingresso nella schermata
"Formazione iniziale" pur senza alcuna titolare selezionata a video. Il
contatore riflette fedelmente `lineup[side].length`: uno stato del genere può
comparire riprendendo una partita già salvata in precedenza (es. una prova
fatta prima della gara) con una selezione parziale rimasta in memoria, oppure
tornando indietro e avanti nel flusso di setup dopo aver già toccato una
titolare (comportamento voluto, per non perdere le scelte già fatte se si
torna a correggere la rosa). In entrambi i casi ora c'è un pulsante 🗑️
accanto al contatore di ciascuna squadra per azzerare la selezione con un
tocco, invece di dover deselezionare una per una.

**3) Corretto: la lettura OCR duplicava le atlete invece di correggerle**

Segnalato che, passando da "Rose calciatrici" a "Formazione iniziale", il
numero di maglia di alcune atlete della squadra ospite risultava diverso
(es. "9" diventato "90"). Causa individuata in `applyOcrResult`: ogni
scansione della distinta veniva **accodata** alla rosa esistente senza
controllare se un'atleta con lo stesso nome fosse già presente — un secondo
scatto/scansione (es. dopo una foto sfocata, o rifacendo l'inquadratura)
aggiungeva una riga in più invece di correggere quella già letta, lasciando
in rosa sia il numero vecchio sia quello nuovo per la stessa persona. Il
commento nel codice dichiarava già questa intenzione ("il nome letto ha la
precedenza, corregge una lettura precedente") ma non era mai stata
implementata per le singole atlete, solo per il nome squadra.

Corretto: la nuova lettura ora viene confrontata per nome (stessa
normalizzazione usata per scartare le righe duplicate tra le strisce
sovrapposte) con le atlete già in rosa — se il nome coincide, il numero di
maglia/data di nascita/ruolo vengono aggiornati sulla riga esistente invece
di crearne una nuova; solo un nome mai visto genera una riga aggiuntiva. Il
messaggio di esito ora distingue "N nuove" da "M corrette". Vale per tutte
e tre le vie di caricamento (fotocamera, libreria foto, Drive/PDF), che
condividono la stessa funzione di merge.

### Novità v3.7 (13/09/2026)

**Caricamento distinta: tre sorgenti esplicite, non più due**

Prima la riga sopra ogni rosa (Casa/Ospiti) mostrava solo due pulsanti,
"Scatta foto" (apre subito la fotocamera) e "Carica file" (sfoglia la
cartella Drive "Distinte"); la possibilità di scegliere una foto già
presente in libreria/rullino esisteva già, ma solo come link secondario
"Sfoglia dal dispositivo" nel footer della modale Drive — poco visibile.

- Aggiunto un terzo pulsante di pari livello, **"🖼️ Libreria foto"**, tra
  "Scatta foto" e "Carica file": apre un normale selettore file
  (`<input type="file">` senza `capture`, quindi il sistema operativo
  propone la libreria foto/rullino insieme alle altre opzioni), per foto o
  PDF già salvati sul dispositivo — non solo dalla cartella Drive fissa.
- La riga dei tre pulsanti (`.ocr-upload-row`) è passata da 2 a 3 colonne;
  ridotti leggermente padding/font per restare leggibile in orizzontale su
  iPad.
- Nessuna nuova logica di invio: la gestione file (immagine → ritaglio a
  strisce ad alta risoluzione; PDF → invio diretto in base64) è stata
  estratta dalla vecchia `handleLocalPick` in una funzione condivisa
  `handleFilePick(input, side)`, richiamata sia dal nuovo pulsante sia dal
  vecchio "Sfoglia dal dispositivo" nella modale Drive (che resta, come
  ripiego, se la cartella Drive non si apre).

### Novità v3.2 (12/09/2026)

**1) Sezione "Rose calciatrici": 4 colonne**

| Colonna | Contenuto |
|---------|-----------|
| N° | numero di maglia (ex "N. ruolo" della distinta) |
| COGNOME E NOME | testo libero |
| DATA NASCITA | testo libero (`GG/MM/AAAA`), già estratta dall'OCR |
| AZIONI | ✕ rossa · M gialla · ✓ verde |

- La riga è in **sola lettura** per default (niente modifiche accidentali a bordo
  campo): mostra ✕ (elimina la riga) e **M** gialla (apre i 3 campi in modifica).
- In modifica i 3 campi sono `input` a **testo libero**; i pulsanti diventano
  ✕ (elimina) e **✓** verde (conferma inserimento manuale o modifica).
- "+ Aggiungi calciatrice" crea la riga già in modifica.
- ✕ chiede conferma solo se la riga ha contenuto.
- La colonna **Ruolo** (menù a tendina GK/DEF/MID/FWD/LM) **non esiste più**: la
  distinta FIGC non lo riporta. Il campo `role` **resta nel modello dati** — lo
  imposta l'OCR per i portieri "(P)" e la modale "Atleta" durante la partita — e
  continua ad alimentare l'ordinamento della formazione e la colonna Ruolo negli
  export (Excel, PDF, Sheets: **schema a 12 colonne invariato**).
- Nuovo campo `birthDate` sul giocatore, solo lato rosa/localStorage: le partite
  già salvate vengono migrate all'apertura (`birthDate: ''`).
- Stato di modifica in `state.rosterEdit[side]` (bozze per indice riga): niente
  scrittura sul modello finché non si preme ✓.

**2) "Carica file" apre la cartella Distinte su Google Drive**

Un'app web **non può** aprire una cartella locale (`G:\My Drive\...` non esiste
neppure sull'iPad): il browser non consente di impostare la cartella di partenza
del selettore file. La cartella viene quindi letta **dal backend Apps Script**,
che gira con l'account Google di Max:

| Azione backend | Effetto |
|----------------|---------|
| `driveList` | elenco dei file di "Distinte" dal più recente (nome, data, KB, tipo) |
| `driveOcr` + `fileId` | **PDF** → letto e interpretato dal backend (blocco `document` Anthropic, nessuna perdita di risoluzione); **immagine** → restituita al client in base64, che applica la solita pipeline a strisce |

- Il pulsante "Carica file" apre una modale con l'elenco delle distinte; un tocco
  avvia l'OCR. I campi estratti sono gli stessi 3 di "Scatta foto".
- Ripiego sempre disponibile: "Sfoglia dal dispositivo" (foto in galleria o PDF),
  anche con `action:'ocr'` + `pdfBase64`.
- La cartella è risolta per percorso (My Drive → From Dropbox → CI Fiamma monza
  prima squadra → Distinte) e l'ID viene messo in cache in `DISTINTE_FOLDER_ID`.

**Autorizzazione Drive — FATTA il 12/09/2026 alle 22:13** (`testDriveDistinte`
eseguita da Max, consenso `drive.readonly` concesso; log: `Cartella trovata:
Distinte (id 1FNK8xUBjx8RyjX5vBkW9e1eG9KLA8Ue0)`). Lo scope è dichiarato
esplicitamente in `appsscript.json`, quindi va tenuto lì: senza quella riga
`DriveApp` fallisce anche con il consenso concesso.

**Deployment**: versione 11 sui **3** deployment attivi il 12/09/2026 alle 22:16;
versione **12 (v4.1)** alle 23:12; versione **13 (v4.2)** alle 23:25.

### Correzione v4.1 — `teamName` dall'intestazione (12/09/2026, 23:12)
Nel campo squadra arrivava `A.S.D. FIAMMA MONZA 1970 - C.S.D. UESSE SARNICO 1908
(A)`: il modello leggeva la riga "Distinta dei/delle giocatori/trici partecipanti
alla gara", che contiene **due** squadre. Il prompt ora dice dove guardare:
- il nome squadra sta **in cima**, sotto "F.I.G.C. - LEGA NAZIONALE DILETTANTI",
  preceduto dalla matricola (`953833 A.S.D. FIAMMA MONZA 1970`) → si toglie la
  matricola
- la riga della gara è vietata, con un **controllo finale**: due nomi separati da
  trattino, o `(A)`/`(C)` in fondo, significano riga sbagliata

### Correzione v4.2 — `num` = cella "N° del Ruolo" (13/09/2026, 23:25)
Sulla rosa comparivano numeri di maglia **1, 2, 3, …** progressivi mentre sulla
distinta quelle celle sono vuote. Ingrandendo la distinta si vede che il "1" e il
"2" sono stampati **nel margine, FUORI dal bordo sinistro della tabella**: è il
contatore di riga, non il numero di maglia. Il prompt ora:
- descrive la colonnina del margine come elemento da ignorare
- definisce `num` come il contenuto della cella intestata **"N° del Ruolo"**, la
  prima **dentro** la tabella, "molto spesso vuota" → `null`
- impone una **verifica finale**: se i numeri risultanti sono esattamente
  1, 2, 3, … nell'ordine delle righe, è il contatore → `num = null` su tutte

Test dopo le due correzioni, stesso PDF: `teamName` = `A.S.D. FIAMMA MONZA 1970`
(una sola squadra), tutti e 20 i `num` = `null`, 20 nomi e 20 date di nascita
corretti.

### v3.6 / backend v5 — Dashboard statistiche e Report via email (13/09/2026)

**Dashboard** (pulsante `📊 Dashboard` in home, accanto a Impostazioni).
Un solo schermo con un menu a tendina in testa: **"Tutta la stagione"** oppure
una **singola partita**. La squadra di riferimento non si configura: è dedotta
come il nome che ricorre più spesso nello storico (`detectOurTeam`), quindi ogni
partita sa da sola se eravamo in casa o in trasferta.

| Vista | Indicatori |
|-------|-----------|
| Stagione | partite, bilancio V–N–P, punti e media, gol fatti/subiti e media, differenza reti |
| Partita | risultato, esito, gol fatti/subiti, cartellini |

Sotto, tre grafici a barre orizzontali (⚽ marcatrici, 🅰️ assist, ⏱️ minuti
giocati, primi 8) e la tabella completa delle calciatrici con presenze, minuti,
gol, assist, gialli, rossi.

*Scelte di visualizzazione*: ogni grafico rappresenta **una sola grandezza**,
quindi usa **un solo colore** (blu `#5598e7`) — il colore non codifica identità,
la posizione in classifica sì; niente palette categoriche da validare. I colori
di stato (giallo/rosso) restano solo in tabella e viaggiano **sempre con icona ed
etichetta**, mai da soli. Valori scritti in chiaro a fine barra.

**Report** (pulsante `📄 Report` in home, accanto a Dashboard). Tre passi:
1. scegli la partita dall'elenco (con data e risultato)
2. scegli il formato: **PDF** (referto) o **Excel** (dati)
3. destinatari + oggetto, poi **📧 Invia** — oppure **⬇️ Scarica** sul dispositivo

**Perché l'email passa dal backend**: un'app web non può allegare un file a una
mail (`mailto:` non supporta allegati). Il report viene generato sull'iPad,
inviato al backend in base64 e spedito da `MailApp`, che gira con l'account
Google proprietario dello script: **il mittente è la casella Gmail di Max**.
Nuova action `sendReport`, nuovo scope `script.send_mail`, quota Gmail gratuita
100 destinatari/giorno (la risposta riporta quante ne restano).

**Refactoring abilitante**: `computePlayerStats(side, match)`, `exportMatchPdf`
e `exportMatchXlsx` accettano ora una partita qualsiasi e, con `asBase64`,
restituiscono `{filename, mimeType, dataBase64}` invece di scaricare il file.

**Autorizzazione — passo a carico di Max, PRIMA di pubblicare**: nell'editor
Apps Script eseguire una volta `testInvioEmail()` e concedere il permesso di
inviare email; solo dopo pubblicare la nuova versione sui 3 deployment. Il
codice v5 è già salvato nell'editor, i deployment sono ancora alla versione 13.

24 test automatici sull'aggregazione (squadra dedotta, casa/trasferta, bilancio,
gol nostri vs avversari, assist, presenze, minuti, ordinamento, stati vuoti,
escape HTML): tutti verdi.

### v3.5 — Messaggi d'errore leggibili a bordo campo (13/09/2026)
L'OCR mostrava il JSON grezzo dell'API. `humanOcrError()` traduce ora i casi
noti in una frase con la contromossa: credito API esaurito, rate limit, chiave
rifiutata o mancante, cartella Drive non trovata, rete assente, URL backend non
impostato. Quando l'OCR non è disponibile il messaggio ricorda che si può
compilare la rosa a mano con "+ Aggiungi calciatrice".

**Nota operativa (13/09/2026)**: il credito dell'account API Anthropic collegato
a `CLAUDE_API_KEY` si è esaurito → `invalid_request_error: Your credit balance is
too low`. È un fatto di fatturazione, non un difetto dell'app: si ricarica su
console.anthropic.com → Plans & Billing (account **API**, diverso
dall'abbonamento Claude). Costo indicativo: ~$0,04 per distinta da foto,
sensibilmente meno da PDF.

### v3.4 — Cronometro: bug del blocco, conto alla rovescia, recupero (13/09/2026)

**Bug risolto: il tempo si fermava dopo ogni evento.** `renderMatchScreen()` è
la funzione di INGRESSO nella schermata partita: ricarica il cronometro dalla
partita salvata e lo mette in pausa (`running = false`). Veniva però richiamata
anche dopo ogni goal, ammonizione, espulsione, sostituzione e cancellazione
evento: il cronometro si fermava, l'intervallo restava appeso e i secondi
trascorsi dall'ultimo salvataggio andavano persi. Ora:
- `renderMatchInfo()` aggiorna punteggio, nomi e cronologia **senza toccare il
  cronometro** ed è ciò che viene chiamato dopo gli eventi
- `renderMatchScreen()` resta solo per l'ingresso nella schermata e ora pulisce
  anche l'intervallo e riallinea il pulsante
- `persistCurrent()` salva il tempo **vivo** (`currentElapsedMs()`), non più
  solo quello congelato all'ultima pausa, con una guardia `timer.matchId` che
  impedisce di scrivere il cronometro di una partita dentro un'altra

Il tempo ora avanza fino a Pausa o Termina partita, qualunque cosa si registri.

**Conto alla rovescia.** A destra del tempo trascorso c'è un secondo cronometro
che mostra quanto manca alla fine del periodo: `PERIOD_DURATIONS = [45, 45, 15,
15]` minuti. Superato lo zero conta in avanti con il segno `+` in rosso
("Oltre il tempo").

**Minuti di recupero.** Casella numerica + **spunta verde** a lato dei due
cronometri. Alla conferma il valore:
- allunga il periodo, quindi entra nel conto alla rovescia (45' + 3' → mancano
  3 minuti in più)
- compare nell'etichetta del periodo come `1° tempo +3`, così il cronometro
  crescente si legge sapendo dov'è la fine
Il recupero è memorizzato **per periodo** (`timer.stoppage[]`), salvato con la
partita e riproposto nella casella quando si cambia periodo. Valori ammessi
0–30; input non numerico ripulito.

18 test automatici sulla logica (formattazione, countdown, recupero, cambio
periodo, supplementari, clamp, tempo vivo): tutti verdi.

### Correzione frontend v3.3 — barra Home dell'iPad (13/09/2026)
Sull'iPad in standalone l'**indicatore Home** (la barra bianca in fondo allo
schermo) sta SOPRA la pagina e copriva il pulsante "Termina partita". Il meta
`viewport-fit=cover` c'era già, ma nessuna regola CSS usava
`env(safe-area-inset-*)`. Ora il margine di sicurezza inferiore è applicato a:
`.events-sidebar` (che contiene "Termina partita"), `.match-main`,
`#home-screen`, `#setup-screen`, `#lineup-screen`, `#summary-screen`.
Su desktop e Android `env()` vale 0, quindi il layout non cambia.

### Correzione frontend v3.3 — nome squadra sovrascritto dall'OCR (13/09/2026)
Il campo squadra veniva riempito solo se **vuoto**, quindi una lettura sbagliata
salvata in precedenza restava lì per sempre. Ora il nome letto dalla distinta ha
sempre la precedenza e aggiorna anche `state.currentMatch[side].name`.

**Test end-to-end (12/09/2026, 22:20)** — `driveList` + `driveOcr` sul PDF
"fiamma monza uesse sarnico.pdf" della cartella Drive: cartella elencata
correttamente, `pdfReceived: true`, `rowsCounted: 20`, **20/20 calciatrici** con
cognome/nome e data di nascita corretti, `teamName` =
"A.S.D. FIAMMA MONZA 1970". Nota: sulla distinta digitale il portiere non è
marcato "(P)", quindi `role` torna vuoto per tutte — si imposta a partita in
corso dalla modale Atleta.

Nota storica (procedura da ripetere a ogni nuovo scope):
il backend v4 aggiunge lo scope `drive.readonly`. Nell'editor Apps Script
eseguire una volta `testDriveDistinte()` e accettare la richiesta di accesso a
Drive; solo dopo pubblicare la nuova versione sui 3 deployment attivi. (Se si
pubblica prima, la web app può chiedere la ri-autorizzazione e OCR/sync si
fermano.)

## Versione precedente: v3.1 — OCR multi-immagine (12/09/2026)

### Funzionalità (riepilogo)
- Home: storico partite, Nuova partita, Backup JSON, Importa, Impostazioni (URL backend)
- Setup partita: nomi squadre, rose casa/ospiti (OCR da foto o file, editing inline, aggiunta manuale)
- Formazione iniziale: selezione 11 titolari per squadra
- Match live: cronometro multi-periodo, eventi (goal/assist, gialli, rossi, sostituzioni), sidebar cronologia
- Summary: statistiche per calciatrice (G/A/Y/R/MIN), marcatrici, cronologia
- Export: JSON backup, Excel 4 fogli, PDF referto, Sincronizzazione Google Sheets (idempotente)

### Novità v3.1 — OCR distinte robusto (12/09/2026)
**Problema**: da foto iPad di una distinta cartacea l'OCR restituiva nomi di
fantasia (es. "BIGNESE SOFIAN RAFA" per ARNESE SOFIA). Causa: l'API Anthropic
riduce ogni immagine a ~1568 px sul lato lungo (~1,15 MP); una pagina A4 intera
arriva al modello con caratteri di ~10 px e i nomi vengono "indovinati".

**Soluzione** (frontend `index.html`, blocco "OCR via Claude API"):
- `prepareOcrImages(file)`: dalla foto genera 5 immagini →
  1 pagina intera a bassa risoluzione (contesto, nome squadra, conteggio righe)
  + 4 strisce sovrapposte (8%) della parte sinistra della distinta (62% della
  larghezza: N. ruolo, data di nascita, cognome e nome), ciascuna entro i limiti
  API (≤1568 px, ≤1,15 MP) → il testo arriva ~2× più grande per lato
- `enhanceContrast`: scala di grigi + stretch dei livelli 2°/98° percentile
  (carta grigia/riflessi → bianco, testo → nero)
- Foto orizzontali (W>H): niente ritaglio colonne, solo strisce a piena larghezza
- Dedup client-side dei nomi (le strisce si sovrappongono)
- Messaggio finale con conteggio "da verificare" (nomi con `?` o ILLEGGIBILE) e costo
- Costo stimato aggiornato ai prezzi Sonnet 4.5 ($3/M in, $15/M out): ~$0.04 per distinta

**Backend `Code.gs` v3** (deployato il 12/09/2026 come versione 10 su tutti e 3 i
deployment attivi):
- `handleOcrRequest` accetta `images[]` (nuovo) oppure `imageBase64` (compatibilità)
- Prompt con istruzioni per lettura a strisce, dedup per data di nascita + cognome,
  controllo del numero di righe; output con `birthDate` e `rowsCounted`
- Risposta con `imagesReceived` per diagnostica

**Test eseguito** (12/09/2026, dal browser sul sito in produzione, distinta sintetica
3024×4032 con 20 nomi reali): 20/20 nomi corretti, nome squadra corretto,
rowsCounted 20, 5 immagini ricevute, ~15 s, 8.7k token input.

### Opzioni e costanti (`index.html`, blocco OCR)
| Costante | Valore | Significato |
|----------|--------|-------------|
| `OCR_MAX_EDGE` | 1568 | lato lungo massimo di ogni immagine inviata |
| `OCR_MAX_PIXELS` | 1150000 | area massima (~1,15 MP) per evitare la riduzione lato API |
| `OCR_STRIPS` | 4 | numero di strisce orizzontali |
| `OCR_STRIP_OVERLAP` | 0.08 | sovrapposizione tra strisce (frazione dell'altezza) |
| `OCR_LEFT_CROP` | 0.62 | frazione di larghezza tenuta per le strisce (foto verticali) |
| `OCR_JPEG_QUALITY` | 0.9 | qualità JPEG delle immagini inviate |
| `APP_VERSION` | 3.20 | versione del frontend, da aggiornare ad ogni modifica di `index.html` |
| `GS_WINDOWS` | 3, 5, 10 | soglie (minuti) dei "gol ravvicinati" nella dashboard; predefinita 5 (`gsWindow`) |
| `GS_MIN_FORM` / `GS_SMALL_FORM` | 30 / 60 | minuti minimi per confrontare una formazione / sotto i quali compare "campione piccolo" |
| `GS_MIN_PLAYER` / `GS_SMALL_PLAYER` | 60 / 180 | come sopra, per le singole calciatrici |
| `GS_RATE_MAX` | 5 | fondo scala delle barre "gol ogni 90'" |
| `GS_GOALS_SHOWN` | 12 | righe di "Gol per gol" visibili prima di "Mostra gli altri" |
| `BACKEND_MIN_VERSION` | 5.4 | versione minima di backend richiesta dal frontend (Verifica versioni) |
| `BACKEND_VERSION` (`Code.gs`) | 5.4 | versione del backend, restituita dal ping GET |
| `WAKE_SCREENS` | setup, lineup, match | schermate su cui lo schermo resta acceso (Wake Lock) |
| `TIMER_RECOVERY_MAX_MS` | 2 h | oltre questo intervallo un cronometro "in marcia" salvato non viene ripristinato |

## Changelog
| Data | Modifica |
|------|----------|
| 23–26/05/2026 | Versioni 1–9 del backend: OCR Claude, permessi external request, deploy "v3 con OCR ok" (vedi documentazione PDF) |
| 25/05/2026 | Documentazione completa (manuale utente + tecnica) |
| 12/09/2026 | Diagnosi OCR da foto cartacea (nomi inventati) → causa: riduzione immagine lato API |
| 12/09/2026 | Backend v3 (versione 10) su tutti i deployment attivi; `backend/Code.gs` aggiunto al repo |
| 12/09/2026 | Frontend: pre-elaborazione immagine (pagina intera + 4 strisce ad alta risoluzione, contrasto), dedup, costo aggiornato |
| 12/09/2026 | Test end-to-end con distinta sintetica: 20/20 |
| 12/09/2026 | Creati PROGRESS.md e CLAUDE.md |
| 12/09/2026 | v3.2 frontend: rose a 4 colonne (N° · Cognome e nome · Data nascita · ✕/M/✓), riga in sola lettura con modifica esplicita; colonna Ruolo rimossa dalla UI (campo mantenuto nel modello) |
| 12/09/2026 | v3.2: "Carica file" apre l'elenco della cartella Drive "Distinte" (backend `driveList`/`driveOcr`), PDF letti direttamente dal backend; ripiego "Sfoglia dal dispositivo" |
| 13/09/2026 | Backend v4.1 (versione 12): `teamName` dall'intestazione, non dalla riga della gara |
| 13/09/2026 | Backend v4.2 (versione 13): `num` dalla cella "N° del Ruolo", mai il contatore di riga stampato nel margine |
| 13/09/2026 | Frontend v3.3: il nome squadra letto dall'OCR sovrascrive sempre il campo |
| 13/09/2026 | Frontend v3.3: safe-area iOS — l'indicatore Home non copre più "Termina partita" |
| 13/09/2026 | Frontend v3.4: risolto il blocco del cronometro dopo ogni evento; aggiunti conto alla rovescia e minuti di recupero |
| 13/09/2026 | Frontend v3.5: messaggi d'errore OCR leggibili (credito esaurito, rate limit, chiave, rete) |
| 13/09/2026 | Frontend v3.6: dashboard statistiche (stagione + singola partita) e report via email |
| 13/09/2026 | Backend v5: action `sendReport`, scope `script.send_mail` (da autorizzare prima di pubblicare) |
| 26/09/2026 | Frontend v3.28: riconoscimento della nostra squadra tollerante alle diverse grafie del nome (parole significative + foglio ATLETE): in trasferta non si prendono più le calciatrici avversarie in minuti, tabelle e analisi. Solo frontend |
| 26/09/2026 | Frontend v3.27: Report grafico a sezioni (stagione o partita; 8 opzioni combinabili) con la grafica della dashboard (html2canvas, caricata al primo uso), condivisione Mail/WhatsApp; Esporta PDF della Dashboard usa lo stesso motore. Solo frontend |
| 26/09/2026 | Frontend v3.26: pulsante "Esporta PDF (Mail / WhatsApp)" in fondo alla Dashboard (vista scelta: KPI, Cosa emerge, classifiche, tabella calciatrici) con condivisione di sistema. Solo frontend |
| 23/09/2026 | Frontend v3.25: riquadro "Cosa emerge" (Analisi gol subiti) espandibile a tutto schermo con testo a 24 px. Solo frontend |
| 23/09/2026 | Frontend v3.24: "Minuti giocati" abbina le calciatrici della distinta al foglio ATLETE anche con nomi scritti diversamente (`sameAthlete`), usa il nome del foglio e somma i minuti. Solo frontend |
| 23/09/2026 | Frontend v3.23 + backend v5.5: grafico Dashboard "Minuti giocati" mostra tutte le tesserate del foglio ATLETE, anche a 0' (action `atlete`, cache `mystatistics_atlete`, `barChartHtml` con `includeZero`); `BACKEND_MIN_VERSION` = 5.5. Da pubblicare sui 3 deployment |
| 21/09/2026 | Frontend v3.20: dashboard "Chi era in campo quando subiamo" mostra un ovale con il nome di ogni calciatrice presente (tolti "Base", nomi barrati, entrate/uscite). Solo frontend |
| 21/09/2026 | Frontend v3.19 + backend v5.4: pulsante "Rigore parato" (squadra, atleta, minuto/tempo) con statistiche in riepilogo, dashboard, Excel e PDF; Sheets scrive il tipo "Rigore parato" nel foglio Eventi. **Backend da pubblicare sui 3 deployment** |
| 21/09/2026 | Frontend v3.18: dashboard, nuova sezione "Analisi gol subiti" (split 1°/2° tempo, fasce da 15', gol ravvicinati, formazione in campo a ogni gol dedotta dai cambi; vista stagione e singola partita). Solo frontend |
| 20/09/2026 | Frontend v3.17: messaggi d'errore OCR più chiari con dettaglio tecnico, visibili 30 s (il ritaglio della pagina per "Scatta foto" è stato scritto e poi rimosso: non dimostrato necessario) |
| 20/09/2026 | Backend v5.3: OCR legge i numeri di maglia scritti a mano nella cella "N° del Ruolo" (prima scartati come cella vuota/contatore di riga); resta ignorato il contatore stampato nel margine. Da pubblicare sui 3 deployment |
| 20/09/2026 | Frontend v3.16: una nuova scansione OCR senza numero non cancella quello già presente; il numero letto è sempre intero o vuoto; `BACKEND_MIN_VERSION` = 5.3 |
| 20/09/2026 | Frontend v3.15: tag ruolo (GK) rimosso da menu atleta, riepilogo e modale "➕ Atleta" (campo `role` mantenuto nel modello e negli export) |
| 20/09/2026 | Frontend v3.14: correggere nome/numero di un'atleta aggiorna formazione ed eventi (`relinkPlayerRefs`); nuova correzione di un'atleta in rosa dalla modale "➕ Atleta" a partita in corso |
| 20/09/2026 | Frontend v3.13: `APP_VERSION`, versione in Home e Impostazioni, pulsante "Verifica versioni" (app online vs in esecuzione + versione del backend) |
| 20/09/2026 | Backend v5.2: `BACKEND_VERSION`, il ping GET restituisce `version` (nessun nuovo scope). Pubblicato come versione 16 sul deployment "Senza titolo", verificato dall'iPad; gli altri 2 deployment ancora da allineare (vedi "Da verificare") |
| 20/09/2026 | Frontend v3.12: Screen Wake Lock (schermo sempre acceso da setup a fine partita) + badge di stato; cronometro ripristinato alla riapertura (`timer.runningSince`) |
| 12/09/2026 | Backend v4 deployato (versione 11) sui 3 deployment attivi; scope `drive.readonly` aggiunto a `appsscript.json`; test end-to-end su PDF Drive: 20/20 |
| 12/09/2026 | Mockup restyling UX pubblicato (5 artboard, 2 direzioni per il match live); palette di stato validata per daltonismo → colore sempre con icona + etichetta |

## Restyling UX — in corso (12/09/2026)
Max ha chiesto "migliorie ovunque nel look & feel". Mockup pubblicato come canvas
Claude ("My Statistics Restyling") con 5 artboard 1180×820 (iPad landscape):
- **Match live**, in DUE direzioni alternative da scegliere:
  - A "Notturno da bordo campo": blu notte #0B1730, rosso Fiamma Monza #E0202F
    come unico accento di comando, tipografia condensata (Barlow Condensed),
    5 pulsanti azione a superficie piena colorata
  - B "Referto di carta": fondo avorio #F4F1EA, struttura da documento federale,
    colore solo come codifica sul bordo inferiore dei pulsanti
- **Home**: card rossa con la prossima gara, 4 KPI di stagione, storico con
  stato di sincronizzazione visibile per partita
- **Setup**: indicatore di passo 1-2-3, "Scatta foto" con precedenza visiva,
  nomi OCR incerti bordati di giallo con etichetta DA VERIFICARE
- **Referto**: tabella statistiche con tabular-nums, marcatrici, cronologia,
  4 export con gerarchia (Sincronizza Sheets come azione primaria)

Palette di stato (gol/ammonizione/espulsione/cambio): verde #2ED573,
giallo #FFD23F, rosso #FF4757, azzurro #4DA3FF. Verificata con il validatore
colore: sotto protanopia verde e giallo hanno ΔE 7.1 (sotto la soglia 8), quindi
**ogni colore deve sempre viaggiare con icona + etichetta testuale** — mai colore
da solo. Nei mockup è già così.

Nessuna modifica al codice finché Max non scegle la direzione.

## Roadmap / backlog
- [ ] **Analisi gol subiti (v3.18)**: verificare sull'iPad con le partite vere man mano che si accumulano; valutare il confronto con i gol segnati (es. gol subiti subito dopo aver segnato)
- [ ] **Restyling UX**: scelta direzione A o B da parte di Max, poi implementazione in `index.html` (solo CSS + markup, nessuna modifica alla logica)
- [ ] Dalla documentazione (2.10): statistiche stagionali aggregate, check-list pre-partita, confronto formazioni, sharing veloce PDF via WhatsApp/email dal Summary, multi-stagione, modalità coach
- [ ] Valutare: selezione automatica del ritaglio colonne anche per foto orizzontali; anteprima delle strisce prima dell'invio

## Da verificare
- [ ] Sull'iPad (app v3.27): Home → 📄 Report → Tutta la stagione / una partita → sezioni → "📤 Condividi" via Mail e via WhatsApp; controllare impaginazione, tempi di generazione e peso del PDF con tutte le partite vere; provare anche "📤 Esporta PDF" in fondo alla Dashboard
- [ ] **A carico di Max**: pubblicare il backend v5.5 (fatto il 23/09/2026: codice incollato nell'editor, `testAtlete()` legge 22 nomi corretti; manca: nuova versione su TUTTI e 3 i deployment); sull'iPad Verifica versioni → "Backend: v5.5" e in Dashboard (con app v3.24) → Minuti giocati devono comparire anche le tesserate a 0'
- [ ] **A carico di Max**: pubblicare il backend v5.4 (incollare `backend/Code.gs` nell'editor, salvare, nuova versione su TUTTI e 3 i deployment); poi Impostazioni → Verifica versioni → "Backend: v5.4" e, dopo una partita con un rigore parato, Sincronizza su Sheets e controllare la riga "Rigore parato" nel foglio Eventi
- [x] Backend v5.3 pubblicato (20/09/2026) come nuovo deployment "v5.3 - OCR numeri di maglia a mano"; sull'iPad Impostazioni → Verifica versioni → "App v3.17 · Backend v5.3" e i numeri di maglia arrivano da Scatta foto e da Libreria foto
- [x] Prova OCR reale (20/09/2026, sera, iPad con app **v3.13** e backend v5.3 su "Senza titolo"): i numeri di maglia scritti a mano arrivano correttamente sia da **"Scatta foto"** sia da **"Libreria foto"**. Prima della v5.3 la stessa distinta arrivava con 18 nomi e date corrette ma tutti i numeri vuoti (10062 token, ~$0,04)
- [ ] "📷 Scatta foto" ora funziona con app v3.13, senza alcun ritaglio della pagina: l'errore della mattina non è stato riprodotto e la sua causa resta non confermata (il ritaglio scritto per la v3.17 è stato scartato, vedi sezione v3.17). Se ricapita, copiare il messaggio esatto (dalla v3.17 resta 30 s a video)
- [x] Backend v5.2 pubblicato come **versione 16** (20/09/2026 13:16). Prima di incollare, la copia dell'editor è stata confrontata con `backend/Code.gs` v5.1: codice identico (416 righe senza commenti), differenze solo nei commenti
- [x] iPad (20/09/2026): Impostazioni → Verifica versioni → "✅ App: v3.13 (ultima pubblicata)" e "✅ Backend: v5.2" per l'URL salvato sull'iPad
- [x] I due deployment "v5 (13/09/2026)…" portati da Max alla versione 17 (v5.3) la sera del 20/09/2026 (dichiarato da Max, non verificato da qui: per controllare, aprire l'URL di ciascun deployment nel browser e leggere `"version":"5.3"`). Ora i 3 deployment attivi dovrebbero rispondere v5.3
- [ ] **A carico di Max, sull'iPad (prima della partita)**: Impostazioni → Schermo e luminosità → **Blocco automatico = Mai** (rete di sicurezza se il Wake Lock non è supportato) e disattivare **Blocco/Sblocco cover** (nome esatto da confermare sul dispositivo): senza, chiudere la Smart Folio spegne lo schermo comunque. Ricordarsi di ripristinare a fine uso.
- [ ] Prova sul campo v3.12: aprire una partita, controllare che il badge in match-screen dica "🔆 Schermo sempre acceso" (se dice "⚠️ Schermo non protetto" la versione di iPadOS non supporta il Wake Lock nelle web app da Home Screen — credo serva iPadOS 18.4+, da confermare); avviare il cronometro, bloccare l'iPad 1-2 min, sbloccare e verificare che il tempo sia corretto
- [x] Backend v4 nell'editor, salvato (12/09/2026 22:10)
- [x] `testDriveDistinte()` eseguita e accesso a Drive autorizzato (22:13)
- [x] Versione 11 pubblicata sui 3 deployment attivi (22:16)
- [x] Test end-to-end `driveList` + `driveOcr` su PDF reale: 20/20 (22:20)
- [x] Frontend v3.2 pushato e online (rose a 4 colonne + pulsante Drive)
- [x] Backend v4.1 (versione 12) e v4.2 (versione 13) sui 3 deployment, testate
- [x] Frontend v3.6 pushato e online (dashboard statistiche + report, verificato via fetch sul sito live 13/09/2026 mattina)
- [x] `testInvioEmail()` eseguita: errore "Specified permissions are not sufficient... userinfo.email" — causa: `Session.getEffectiveUser()` richiede uno scope non dichiarato in `appsscript.json`. Fix v5.1: la funzione ora invia a un indirizzo fisso (`massimo.vassalli643@gmail.com`) invece di leggere l'utente effettivo — non serve più quello scope (13/09/2026 07:42)
- [x] `testInvioEmail()` rieseguita dopo il fix: email inviata correttamente, nessuna nuova autorizzazione richiesta (il permesso `script.send_mail` era già concesso) — quota residua 99/giorno (13/09/2026 07:42)
- [x] Backend v5.1 (versione 14) pubblicato su tutti e 3 i deployment attivi (13/09/2026 07:43-07:47)
- [ ] **A carico di Max**: ricaricare il credito API su console.anthropic.com → Settings → Billing (l'OCR è fermo finché non lo fai)
- [ ] Test reale: dalla Dashboard aprire Report per una partita, scegliere PDF o Excel, inviare a se stessi via email e verificare l'allegato ricevuto
- [ ] Prova sul campo: far girare il cronometro, registrare un goal, verificare che il tempo non si fermi; inserire 3' di recupero e controllare il conto alla rovescia
- [ ] Test reale sull'iPad con la distinta cartacea: confrontare i nomi con la distinta
- [ ] Se un nome esce con `?`: è voluto (carattere ambiguo) — correggere inline, non è un errore dell'app
