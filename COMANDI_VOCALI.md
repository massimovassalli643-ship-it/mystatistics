# Comandi vocali da Apple Watch — guida di configurazione e prova

App v3.32 + backend v5.8 (03/10/2026). Stato e storico in `PROGRESS.md`.

## Come funziona
1. Sul Watch la scorciatoia **Comandi** detta la frase e la manda (POST) al
   backend Apps Script con un **token segreto**.
2. Il backend interpreta la frase e la scrive come riga del foglio **"Comandi"**
   (stato `nuovo`, oppure `errore` con il motivo). Non tocca mai i dati di partita.
3. L'iPad, con la schermata partita aperta su una gara in corso, controlla il
   foglio ogni 4 secondi, riconosce la squadra, cerca la giocatrice nella rosa
   della partita e registra l'evento **come i pulsanti**. Il minuto è quello del
   cronometro. Il riquadro di conferma in basso resta 8 secondi con
   **↩️ Annulla**. Poi la riga diventa `applicato`, `errore` o `annullato`.

Squadra e giocatrice si risolvono sull'iPad perché solo lì ci sono i nomi delle
due squadre e le rose con i numeri: arrivano dalla distinta di ogni partita.

## Frasi (matrice di Max, 03/10/2026)
Ordine: **evento · squadra · giocatrice · campi facoltativi**.

| Evento | Fiamma | Avversarie |
|---|---|---|
| Goal | `goal fiamma Gargaro` + facoltativi `assist Bignotti` e `su azione` / `su rigore` / `su punizione` / `su autogol` | `goal Brugherio 7` · `goal avversario 7` · `goal avversario` (marcatrice "Non indicata") |
| Giallo | `giallo fiamma Gargaro` | `giallo Brugherio 5` |
| Rosso | `rosso fiamma Gargaro` | `rosso Brugherio 5` |
| Sostituzione | `sostituzione fiamma esce Gargaro entra Bignotti` + facoltativo `tattica` / `infortunio` | `sostituzione Brugherio esce 7 entra 13` |
| Rigore parato | `rigore parato fiamma Porta` | — |
| Annulla | `annulla`: toglie l'ultimo evento arrivato **da comando vocale** (quelli inseriti a mano non si toccano) | |

- **Squadra**: `fiamma` (o `noi`); per le avversarie il **nome della squadra**
  come nella distinta, anche solo una parola ("Brugherio", "città di Brugherio"),
  oppure `avversario` / `avversaria` / `loro`. In statistica, su Sheets e nei
  report compare sempre il nome della distinta, mai la parola detta.
- **Squadra non detta** ("giallo Gritti"): l'iPad cerca la giocatrice in tutte e
  due le rose. Se è in una sola, va bene. Se è in entrambe (es. "giallo 7" con una
  7 per parte), il comando viene rifiutato: ripeti dicendo la squadra.
- **Giocatrice**: per la Fiamma il cognome; per le avversarie il numero di maglia
  o il cognome. Con due cognomi uguali in rosa il comando viene rifiutato: usa il
  numero. Accetto comunque cognome o numero per entrambe le squadre.
- **Autogol** (`goal fiamma Gargaro su autogol`): autogol della nostra giocatrice,
  il punto va all'avversaria. Un autogol non ha assist.
- **Tipo di goal**: gli stessi 4 dei pulsanti (azione, rigore, punizione, autogol);
  senza tipo vale `azione`. Motivo della sostituzione: senza motivo vale `tattica`.
- Il rosso non ha motivo. Il minuto non si detta: lo prende il cronometro.
- I numeri vanno bene anche a parole ("sette", "ventuno"). Accenti e maiuscole non contano.
- Frase non interpretabile, giocatrice non in rosa, cognome ambiguo, squadra
  sconosciuta: il comando va in `errore` con il motivo e non viene registrato nulla.
- Una frase detta due volte entro 15 secondi è considerata un doppio invio: la
  seconda va in `errore` ("Doppione"). Per due eventi uguali, attendi 15 secondi.
- Un comando che l'iPad non riceve entro 2 minuti scade (`errore`, "Scaduto") e
  non viene mai registrato in ritardo.

## 1. Backend (una volta sola)
1. Editor Apps Script, progetto **MyStatisticsBackend**: incolla `backend/Code.gs`, salva.
2. **Impostazioni progetto → Proprietà script → Aggiungi proprietà**:
   nome `VOICE_TOKEN`, valore una stringa lunga inventata (es. 20 lettere e numeri a
   caso). È la "password" del Watch: non metterla in nessun file del repository.
3. Esegui `testParserComandi()`: nel log deve comparire "Tutte le 29 frasi OK".
4. Deploy → Gestisci deployment → per **ognuno dei 3** deployment: Modifica →
   Nuova versione → Implementa. Non ci sono nuovi permessi da autorizzare.
5. (Facoltativo) Esegui `testComandoVocale()`: crea il foglio "Comandi" e scrive
   un "giallo fiamma Gargaro" di prova. Se un iPad è in partita in quel momento, la registra davvero.

## 2. iPad
Impostazioni ⚙️ → **🎙️ Comandi vocali da Apple Watch**:
1. Incolla lo stesso token di `VOICE_TOKEN`.
2. Spunta **Ricevi i comandi durante la partita**.
3. **🎙️ Prova token comandi vocali** → "✅ Token valido…". Poi **Salva**.

Nella schermata partita, sopra l'elenco eventi, compare lo stato del collegamento:
- 🎙️ "Watch in ascolto · ultimo …"
- ⏸ "finestra aperta, comandi in attesa", finché resta aperta una finestra come la modale evento
- ⚠️ "Watch non collegato …" se il backend non risponde. L'app riprova da sola.

## 3. Scorciatoia sul Watch (app Comandi su iPhone)
1. App **Comandi** su iPhone → **+** → nome **Statistiche** (è anche la frase per Siri).
2. Aggiungi **Detta testo**: lingua Italiano, *Interrompi l'ascolto* = **Dopo una pausa**.
3. Aggiungi **Ottieni contenuti URL**:
   - URL: lo stesso URL `…/exec` salvato nelle Impostazioni dell'iPad
   - Metodo: **POST**
   - Corpo richiesta: **JSON**, con tre campi di tipo Testo:
     `action` = `voice` · `token` = il tuo token · `text` = variabile **Testo dettato**
4. Aggiungi **Ottieni valore dizionario**: chiave `message`, da *Contenuti dell'URL*.
5. Aggiungi **Mostra risultato** con il *Valore del dizionario*. Sul Watch vedrai
   "✅ Goal Fiamma GARGARO, azione" oppure "❌ …" con il motivo.
6. Dettagli della scorciatoia (ⓘ): attiva **Mostra su Apple Watch**.
7. Watch Ultra: Impostazioni → **Tasto Azione** → Comando rapido → *Statistiche*.
   Premi il tasto arancione, detta, e il comando parte. In alternativa: "Ehi Siri, Statistiche".

Il token resta dentro la scorciatoia: non condividere la scorciatoia con altri.

## 4. Checklist di prova
Esegui le prove con una **partita di prova**: un "annulla" o un comando arrivato
sulla partita sbagliata modificano davvero i dati.

**Fase 1, senza Watch (backend)**
- [ ] `testParserComandi()` → 29/29 OK
- [ ] Impostazioni iPad → Verifica versioni → "Backend: v5.8"
- [ ] Prova token sull'iPad → "✅ Token valido"

**Fase 2, frasi scritte a mano nel foglio**
- [ ] Partita di prova aperta sull'iPad, cronometro avviato
- [ ] Nel foglio "Comandi" scrivi `goal fiamma <cognome di una giocatrice in rosa>` in colonna C di una riga
  nuova e lascia vuoto il resto. Entro circa 5 s l'evento compare sull'iPad, insieme
  al riquadro con Annulla; la riga diventa `applicato`
- [ ] Prova "↩️ Annulla" sul riquadro: l'evento sparisce, il punteggio torna
  indietro, la riga diventa `annullato`
- [ ] Un cognome o una maglia che non è in rosa → riquadro rosso "Comando non registrato", riga `errore`
- [ ] `goal avversario 7` e `goal <nome avversaria> 7` → stesso evento, con il nome della squadra come da distinta
- [ ] Con la modale Goal aperta, il comando aspetta e arriva alla chiusura

**Fase 3, Watch reale (in allenamento)**
- [ ] Ogni frase della tabella sopra, una alla volta: Watch "✅", evento corretto sull'iPad
- [ ] `annulla` toglie l'ultimo evento vocale
- [ ] Frase incomprensibile ("ciao") → Watch "❌", niente sull'iPad, riga `errore`
- [ ] Doppio invio: stessa frase due volte di fila → la seconda è "Doppione"
- [ ] Rumore a bordo campo: 10 frasi con vento/voci intorno, annota quelle sbagliate
- [ ] Offline: iPad in modalità aereo, detta un comando, riattiva entro 2 minuti →
  il comando arriva una volta sola; oltre i 2 minuti → "Scaduto"
- [ ] Pulsanti manuali: Goal / Giallo / Rosso / Sostituz. / Rigore parato / cestino
  funzionano come prima

**Fase 4, affinamenti**
- [ ] Riguarda il foglio "Comandi" dopo una partita: le righe `errore` mostrano le
  trascrizioni sbagliate. Le nuove parole da riconoscere vanno in `VOICE_WORDS`
  (`backend/Code.gs`) e le frasi nuove in `VOICE_TEST_PHRASES`

## Problemi
| Sintomo | Causa probabile |
|---|---|
| Watch: "❌ Token non valido" | token della scorciatoia diverso da `VOICE_TOKEN` |
| Watch: "❌ Token non configurato nel backend" | manca la Script Property `VOICE_TOKEN` |
| Watch mostra una pagina HTML o un errore 401/403 | URL sbagliato o deployment non pubblicato per "Chiunque" |
| iPad: riquadro rosso "non in rosa" / "non trovata" | giocatrice non presente nella rosa di quella partita, o cognome trascritto male: correggi la rosa (➕ Atleta) o usa il numero |
| iPad: "Squadra … non riconosciuta" | il nome detto non somiglia a nessuna delle due squadre: di' `avversario` |
| iPad: "corrisponde a entrambe le squadre" | le due squadre hanno lo stesso nome (es. distinta di prova usata per entrambe): di' `fiamma` o `avversario` |
| Comando "Scaduto" | iPad bloccato, offline, o schermata partita non aperta per più di 2 minuti |
| Badge non visibile | Comandi vocali non attivi nelle Impostazioni dell'iPad, oppure token o URL mancanti |
