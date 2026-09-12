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

## Stato attuale: v3.1 — OCR multi-immagine (12/09/2026)

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
- [ ] **A carico di Max**: `git push origin main` (GitHub Pages ridistribuisce in 1–2 minuti), poi sull'iPad chiudere e riaprire l'app
- [ ] Test reale sull'iPad con la distinta cartacea del 13/09/2026 (foto in verticale, foglio che riempie il frame): confrontare i nomi con la distinta
- [ ] Se un nome esce con `?`: è voluto (carattere ambiguo) — correggere inline, non è un errore dell'app
