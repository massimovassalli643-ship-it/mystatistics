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

## Stato attuale: v3.2 — Rose a 4 colonne + distinte da Google Drive (12/09/2026)

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

**Autorizzazione Drive — passo a carico di Max, da fare PRIMA di pubblicare**:
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
- [ ] **A carico di Max, nell'ordine**: 1) incollare `backend/Code.gs` v4 nell'editor Apps Script e salvare; 2) eseguire `testDriveDistinte()` e autorizzare l'accesso a Drive; 3) pubblicare la nuova versione sui **3** deployment attivi; 4) `git push origin main`
- [ ] Test: "Carica file" → deve elencare le distinte della cartella Drive; scegliere un PDF e verificare i 3 campi estratti
- [ ] **A carico di Max**: `git push origin main` (GitHub Pages ridistribuisce in 1–2 minuti), poi sull'iPad chiudere e riaprire l'app
- [ ] Test reale sull'iPad con la distinta cartacea del 13/09/2026 (foto in verticale, foglio che riempie il frame): confrontare i nomi con la distinta
- [ ] Se un nome esce con `?`: è voluto (carattere ambiguo) — correggere inline, non è un errore dell'app
