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
| Deployment attivi | 3 web app ("Senza titolo", "v3 fresh deploy", "v3 con permessi external request") — tutti allineati alla stessa versione |
| Database | Google Sheets "My Statistics - Fiamma Monza 2026 2027" (tab Partite, Statistiche, Eventi, Marcatrici) |
| OCR | API Anthropic, modello `claude-sonnet-4-5`, chiave in Script Properties `CLAUDE_API_KEY` |
| Chiavi localStorage | `mystatistics_matches_v2` (storico), `mystatistics_sheets_url` (URL backend) |
| Cartella distinte su Drive | `My Drive / From Dropbox / CI Fiamma monza prima squadra / Distinte` (letta dal backend, ID in Script Property `DISTINTE_FOLDER_ID`) |

## Stato attuale: v3.8 — Svuota rosa/formazione, niente più duplicati OCR (13/09/2026)

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
- [ ] **Restyling UX**: scelta direzione A o B da parte di Max, poi implementazione in `index.html` (solo CSS + markup, nessuna modifica alla logica)
- [ ] Dalla documentazione (2.10): statistiche stagionali aggregate, check-list pre-partita, confronto formazioni, sharing veloce PDF via WhatsApp/email dal Summary, multi-stagione, modalità coach
- [ ] Valutare: selezione automatica del ritaglio colonne anche per foto orizzontali; anteprima delle strisce prima dell'invio

## Da verificare
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
