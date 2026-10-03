// ============================================
// MY STATISTICS - Apps Script Backend
// v5.9 (03/10/2026): doPost tollerante per la scorciatoia del Watch: "voice"
//   con spazi/maiuscole accettato, chiavi ripulite da spazi invisibili, corpo
//   anche come modulo. Una richiesta senza action riconosciuta e senza partita
//   risponde "Richiesta non riconosciuta. Ricevuto: chiavi [...]" (mai il
//   token) invece del fuorviante "Payload mancante". Nessun nuovo scope.
// v5.8 (03/10/2026): COMANDI VOCALI da Apple Watch. Nuove action:
//   'voice'     (dal Watch, scorciatoia Comandi) - frase dettata -> parser ->
//               riga nel foglio "Comandi" (creato da solo se manca). Non tocca
//               MAI i dati di partita: li applica l'iPad.
//   'voicePoll' (dall'iPad ogni 4 s) - comandi con stato "nuovo"; quelli piu'
//               vecchi di VOICE_MAX_AGE_MS passano a "errore" (scaduto).
//   'voiceAck'  (dall'iPad) - stato finale: applicato / errore / annullato.
//   Tutte e tre richiedono `token` = Script Property VOICE_TOKEN (da creare a
//   mano: Impostazioni progetto > Proprieta' script). Nessun nuovo scope
//   (Sheets gia' autorizzato, LockService non ne chiede): pubblicare su TUTTI
//   e 3 i deployment. Test dall'editor: testParserComandi(), testComandoVocale().
// v5.7 (27/09/2026): OCR - ogni riga riporta anche `row`, il numero di riga
//   PRESTAMPATO nel margine sinistro (contatore 1, 2, 3...). `num` resta SOLO
//   la cella "N del Ruolo". Serve alle distinte senza numeri a mano (es.
//   Desenzano): il frontend, su conferma dell'utente, usa `row` come numero di
//   maglia dove la cella e' vuota. Nessun nuovo scope: pubblicare su TUTTI e 3
//   i deployment.
// v5.6 (27/09/2026): OCR - righe BARRATE (nome/dati tirati via con una riga,
//   anche sottolineati e barrati) = atleta tolta dalla distinta: esclusa da
//   players e riportata in `excluded`. Ogni riga ha il flag obbligatorio
//   `struck` (true/false): l'AI deve decidere riga per riga, e il backend sposta
//   le struck:true in `excluded`. Righe AGGIUNTE A PENNA (stampatello o
//   corsivo) lette come le altre. Parsing della risposta tollerante (testo
//   attorno al JSON, commenti, virgole finali, risposta troncata; max_tokens
//   4000): una riga anomala non blocca piu' il caricamento. Nessun nuovo scope:
//   pubblicare su TUTTI e 3 i deployment.
// v5.5 (23/09/2026): action `atlete` - legge il foglio ATLETE (tutte le calciatrici
//   tesserate) dello spreadsheet collegato e restituisce { atlete:[{name}] } (il numero
//   progressivo a lato delle atlete e' ignorato).
//   La Dashboard lo usa per mostrare nei "Minuti giocati" anche chi ha 0'.
//   Nessun nuovo scope (lo script e' gia' legato allo spreadsheet): basta
//   pubblicare la nuova versione su TUTTI e 3 i deployment.
// v5.4 (21/09/2026): sync su Sheets - gli eventi "Rigore parato" (type penaltysave)
//   compaiono nel foglio Eventi con tipo "Rigore parato" (prima avrebbero il tipo
//   vuoto). Nessun nuovo scope, schema fogli invariato (Statistiche resta a 12
//   colonne). Pubblicare su TUTTI e 3 i deployment.
// v5.3 (20/09/2026): OCR - i numeri di maglia scritti A MANO nella cella "N del
//   Ruolo" vengono letti (prima il prompt li scartava come "cella vuota" o
//   contatore di riga). Il contatore di riga stampato nel margine resta ignorato.
//   Solo prompt: nessun nuovo scope, pubblicare su TUTTI e 3 i deployment.
// v5.2 (20/09/2026): il ping GET restituisce `version` (BACKEND_VERSION), cosi' il
//   frontend (Impostazioni > Verifica versioni) sa quale codice gira su ogni
//   deployment. Nessun nuovo scope: non serve ri-autorizzare, basta pubblicare
//   la nuova versione su TUTTI e 3 i deployment.
// v5.1 (13/09/2026): fix testInvioEmail (Session.getEffectiveUser richiedeva uno
//   scope non dichiarato: 'Specified permissions are not sufficient') - ora
//   invia a un indirizzo fisso. DEPLOYATO su tutti e 3 i deployment (versione 14)
// v5 (13/09/2026): action sendReport — invia il report per email con allegato
// v4.2 (13/09/2026): num = cella "N del Ruolo", mai il contatore di riga nel margine
// v4.1 (12/09/2026): teamName letto dall'intestazione (non dalla riga della gara)
// v4 (12/09/2026): distinte dalla cartella Google Drive + OCR di PDF
// v3 (12/09/2026): OCR multi-immagine (pagina intera + strisce ad alta risoluzione)
// ============================================
//
// COPIA DI RIFERIMENTO del codice deployato su script.google.com
// (progetto "MyStatisticsBackend"). Il file che conta e' quello nell'editor
// Apps Script: dopo ogni modifica, Deploy > Gestisci deployment > Modifica >
// Nuova versione > Implementa (per OGNI deployment attivo).
//
// ATTENZIONE v4: questa versione legge Google Drive, quindi richiede un nuovo
// consenso. PRIMA di pubblicare i deployment, eseguire una volta nell'editor la
// funzione testDriveDistinte() e accettare la richiesta di accesso a Drive.
// Se si pubblica senza aver autorizzato, la web app puo' chiedere la
// ri-autorizzazione e OCR/sincronizzazione si fermano.

// Aggiornare ad OGNI modifica di questo file; il frontend la confronta con
// BACKEND_MIN_VERSION di index.html.
const BACKEND_VERSION = '5.9';

const SHEET_PARTITE = 'Partite';
const SHEET_STATISTICHE = 'Statistiche';
const SHEET_EVENTI = 'Eventi';
const SHEET_ATLETE = 'ATLETE';
const SHEET_COMANDI = 'Comandi';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5';

// Cartella delle distinte su Google Drive di Max:
//   My Drive / From Dropbox / CI Fiamma monza prima squadra / Distinte
// (sul PC e' G:\My Drive\From Dropbox\CI Fiamma monza prima squadra\Distinte)
const DISTINTE_PATH = ['From Dropbox', 'CI Fiamma monza prima squadra', 'Distinte'];
const DISTINTE_MAX_FILES = 60;

// ============================================
// ENDPOINT POST
// ============================================
function doPost(e) {
  try {
    const payload = readPostPayload(e);
    if (payload.action === 'ocr') {
      return handleOcrRequest(payload);
    }
    if (payload.action === 'driveList') {
      return handleDriveList();
    }
    if (payload.action === 'driveOcr') {
      return handleDriveOcr(payload);
    }
    if (payload.action === 'sendReport') {
      return handleSendReport(payload);
    }
    if (payload.action === 'atlete') {
      return handleAtlete();
    }
    if (payload.action === 'voice' || payload.action === 'voicePoll' || payload.action === 'voiceAck') {
      return handleVoiceRequest(payload);
    }
    // v5.9: la scorciatoia del Watch puo' scrivere "voice" con spazi o maiuscole
    // (suggerimenti della tastiera iOS)
    if (cleanKey(payload.action).toLowerCase() === 'voice') {
      payload.action = 'voice';
      return handleVoiceRequest(payload);
    }
    if (!payload.match) {
      return jsonResponse({ ok: false, error: 'Richiesta non riconosciuta', message: '❌ Richiesta non riconosciuta. Ricevuto: ' + describePayload(e, payload) });
    }
    return handleSyncRequest(payload);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), message: '❌ ' + String(err) });
  }
}

// v5.9: corpo JSON (app, scorciatoia) oppure modulo (e.parameter); chiavi
// ripulite da spazi e caratteri invisibili ("action " -> "action")
function readPostPayload(e) {
  var raw = e && e.postData ? e.postData.contents : '';
  var payload = null;
  try { payload = JSON.parse(raw); } catch (err) { payload = null; }
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (err) { /* resta stringa */ }
  }
  if (!payload || typeof payload !== 'object') payload = (e && e.parameter) || {};
  var out = {};
  Object.keys(payload).forEach(function (k) { out[cleanKey(k)] = payload[k]; });
  return out;
}

function cleanKey(v) {
  return String(v == null ? '' : v).replace(/[\s\u200B-\u200D\uFEFF]+/g, '');
}

// Diagnostica senza riportare il token: chiavi ricevute, valore di action, tipo di contenuto
function describePayload(e, payload) {
  return 'chiavi [' + Object.keys(payload).join(', ') + ']' +
    ', action=' + JSON.stringify(payload.action === undefined ? null : payload.action) +
    ', tipo=' + ((e && e.postData && e.postData.type) || 'nessun corpo') +
    ', lunghezza=' + ((e && e.postData && e.postData.contents) ? e.postData.contents.length : 0);
}

// ============================================
// ENDPOINT GET (ping)
// ============================================
function doGet() {
  return jsonResponse({
    ok: true,
    version: BACKEND_VERSION,
    message: 'My Statistics endpoint attivo (v' + BACKEND_VERSION + ': OCR, distinte da Drive, invio report via email, atlete, comandi vocali)',
    timestamp: new Date().toISOString()
  });
}

// ============================================
// OCR via Claude API
// ============================================
// Accetta due formati di richiesta:
//  - v2 (frontend dal 12/09/2026): { action:'ocr', images:[{ data, mediaType, kind:'overview'|'strip', index, total }] }
//      images[0] = pagina intera a bassa risoluzione; le altre = strisce ad alta
//      risoluzione della parte sinistra della distinta, dall'alto in basso, sovrapposte.
//  - v1 (compatibilità): { action:'ocr', imageBase64, mediaType }
function handleOcrRequest(payload) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) {
    return jsonResponse({ ok: false, error: 'API Key Claude non configurata' });
  }

  var images = [];
  var pdfBase64 = payload.pdfBase64 || null;
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    images = payload.images;
  } else if (payload.imageBase64) {
    images = [{ data: payload.imageBase64, mediaType: payload.mediaType || 'image/jpeg', kind: 'overview' }];
  }
  if (images.length === 0 && !pdfBase64) {
    return jsonResponse({ ok: false, error: 'Immagine o PDF mancante' });
  }
  // Un PDF (distinta digitale FIGC) viaggia come blocco 'document': Claude lo
  // legge alla risoluzione originale, quindi niente strisce e niente contrasto.
  var multi = images.length > 1;

  var prompt = 'Sei un OCR specializzato in distinte calcio FIGC (Federazione Italiana Gioco Calcio - Lega Nazionale Dilettanti). Devi ESTRARRE LETTERALMENTE i dati dalla distinta, senza interpretare, senza correggere, senza indovinare.\n\n';
  if (multi) {
    prompt += 'COME LEGGERE LE IMMAGINI:\n';
    prompt += '- La prima immagine e la pagina INTERA a bassa risoluzione: usala SOLO per il nome squadra nel titolo e per CONTARE quante righe della tabella hanno un cognome scritto.\n';
    prompt += '- Le immagini successive sono STRISCE ad alta risoluzione della parte sinistra della tabella (colonne: N del Ruolo, Data di nascita, Cognome e nome, Capitano), dall\'alto verso il basso. Leggi i nomi SOLO dalle strisce.\n';
    prompt += '- Le strisce si SOVRAPPONGONO: la stessa riga puo comparire in fondo a una striscia e in cima alla successiva. Riportala UNA volta sola (stessa data di nascita e stesso cognome).\n';
    prompt += '- Il numero di giocatrici nel JSON deve corrispondere alle righe compilate contate nella pagina intera. Se non torna, ricontrolla le zone di sovrapposizione.\n\n';
  }
  prompt += 'REGOLE FERREE:\n';
  prompt += '1. COPIA i caratteri ESATTAMENTE come li vedi. Se vedi "GREGGIO" scrivi "GREGGIO" non "GREGORIO". Se vedi "BIGNOTTI" scrivi "BIGNOTTI" non "ISGONETTI".\n';
  prompt += '2. Se un carattere e ambiguo o illeggibile, scrivi "?" al suo posto invece di indovinare.\n';
  prompt += '3. NON correggere errori di battitura presunti. La distinta dice cio che dice.\n';
  prompt += '4. NON inventare nomi. Se non leggi una riga, scrivi "ILLEGGIBILE" nel campo name. Un nome inventato e un errore grave; un "?" e accettabile.\n';
  prompt += '5. Mantieni MAIUSCOLO esattamente come nella distinta.\n\n';
  prompt += 'DOVE STA IL NOME DELLA SQUADRA (leggi con attenzione):\n';
  prompt += 'In alto, sotto la scritta "F.I.G.C. - LEGA NAZIONALE DILETTANTI", c\'e una riga in grassetto con il numero di matricola della societa seguito dal nome della squadra che presenta la distinta, per esempio: "953833 A.S.D. FIAMMA MONZA 1970".\n';
  prompt += 'teamName = SOLO quel nome, senza il numero di matricola iniziale, quindi "A.S.D. FIAMMA MONZA 1970".\n';
  prompt += 'PIU SOTTO c\'e la riga "Distinta dei/delle giocatori/trici partecipanti alla gara" seguita da DUE squadre separate da un trattino (es. "A.S.D. FIAMMA MONZA 1970 - C.S.D. UESSE SARNICO 1908 (A)"): quella riga indica la PARTITA, NON e il nome squadra. NON usarla MAI.\n';
  prompt += 'CONTROLLO FINALE: se in teamName ti ritrovi due nomi separati da un trattino, oppure "(A)" o "(C)" in fondo, hai letto la riga sbagliata: torna in cima alla pagina e prendi la riga con la matricola.\n\n';
  prompt += 'STRUTTURA DISTINTA FIGC:\n';
  prompt += 'Tabella con colonne (da sinistra a destra): N del Ruolo (numero di maglia), Data di nascita, Cognome e nome, Capitano/V.Cap (lettera C o V se presente), N. Matricola FIGC, Tipo documento, Numero documento, Rilasciato da.\n';
  prompt += 'FUORI dalla tabella, nel margine sinistro, c e una colonnina senza intestazione con la numerazione progressiva delle righe (1, 2, 3, ..., anche oltre l ultima riga compilata), stampata in piccolo in carattere tipografico: non fa parte della tabella e va ignorata.\n';
  prompt += 'IL NUMERO DI MAGLIA sta SOLO nella colonna che ha l intestazione "N del Ruolo" (la prima colonna DENTRO il bordo della tabella, subito a sinistra di "Data di nascita"). E di norma SCRITTO A MANO con penna o pennarello poco prima della gara: cifre grandi, di 1 o 2 cifre, che possono uscire dai bordi della cella e sconfinare verso il margine. Leggilo comunque: e uno dei dati piu importanti. Solo nelle distinte interamente digitali e non ancora compilate la cella puo essere vuota.\n';
  prompt += 'PUNTO DI RIFERIMENTO: il numero di maglia di una riga e sempre la cella immediatamente a SINISTRA della data di nascita della stessa riga. La colonnina SENZA intestazione ancora piu a sinistra, fuori dal bordo della tabella, NON e MAI il numero di maglia: non prendere il valore da li, nemmeno se una cifra a penna la sfiora o la tocca.\n';
  prompt += 'Sotto la colonna "Cognome e nome" puo apparire "(P)" = Portiere.\n\n';
  prompt += 'RIGHE BARRATE (atlete tolte dalla distinta):\n';
  prompt += 'Una riga il cui cognome e nome (e di solito anche data di nascita, matricola, tipo e numero documento, "LND") e ATTRAVERSATO da una linea tracciata SOPRA le lettere (anche sottile, a penna o a matita, anche leggermente storta), oppure SOTTOLINEATO E BARRATO, oppure cancellato con una X o uno scarabocchio, indica un atleta TOLTA dalla distinta.\n';
  prompt += 'Per OGNI riga controlla con attenzione, nelle strisce ad alta risoluzione E nella pagina intera, se una linea passa in mezzo alle lettere del nome o delle cifre della matricola / del documento: una linea orizzontale che taglia a meta l altezza dei caratteri e una barratura. Basta che il nome OPPURE la maggior parte dei dati della riga siano tirati via.\n';
  prompt += 'Una semplice sottolineatura SOTTO il nome, senza alcun tratto che passi sopra le lettere, e le linee della griglia della tabella NON sono barrature.\n';
  prompt += 'Riporta comunque OGNI riga con un cognome in players, con "struck": true se e barrata e "struck": false se non lo e. Le righe barrate NON si contano in rowsCounted. Dopo una riga barrata continua a leggere normalmente le righe successive.\n\n';
  prompt += 'RIGHE SCRITTE A MANO (atlete aggiunte a penna):\n';
  prompt += 'Sotto le righe stampate possono esserci righe compilate A PENNA: data di nascita, cognome e nome in STAMPATELLO MAIUSCOLO o in CORSIVO, a volte il documento (es. "CI" = carta d identita). Sono atlete valide a tutti gli effetti: includile in players come le altre, leggendo il nome lettera per lettera e scrivendolo in MAIUSCOLO. La scrittura a mano puo uscire dai bordi delle celle: assegna ogni dato alla riga in cui sta la maggior parte del tratto. Se una lettera scritta a mano e incerta usa "?" per quella lettera; se il nome intero e illeggibile scrivi "ILLEGGIBILE", ma NON saltare la riga e NON interrompere la lettura.\n\n';
  prompt += 'OUTPUT - SOLO QUESTO JSON, niente altro:\n';
  prompt += '{\n';
  prompt += '  "teamName": "<una sola squadra, dall intestazione in alto, senza matricola e senza avversaria>",\n';
  prompt += '  "rowsCounted": <numero di righe con cognome contate nella pagina intera>,\n';
  prompt += '  "players": [\n';
  prompt += '    {"num": <numero di maglia (intero) scritto nella cella "N del Ruolo" DENTRO la tabella; null se la cella e vuota o la cifra e illeggibile; mai il contatore di riga stampato nel margine>, "birthDate": "<GG/MM/AAAA come scritto>", "name": "<COGNOME NOME esatto>", "role": "<GK se (P), altrimenti stringa vuota>", "struck": <true se la riga e barrata, altrimenti false>, "row": <numero di riga PRESTAMPATO nel margine sinistro fuori dalla tabella (contatore 1, 2, 3, ...) sulla stessa riga; intero; null se non si legge>}\n';
  prompt += '  ],\n';
  prompt += '  "excluded": [ {"name": "<COGNOME NOME di ogni riga con struck true>", "reason": "barrata"} ]\n';
  prompt += '}\n';
  prompt += 'Se non ci sono righe barrate: "excluded": [].\n\n';
  prompt += 'NOTE:\n';
  prompt += '- NUMERI A SINISTRA: a sinistra ci sono DUE tipi di numeri, da non confondere. (a) Il CONTATORE DI RIGA: stampato in piccolo in carattere tipografico, FUORI dal bordo della tabella, progressivo 1, 2, 3, ... una per riga: NON e il numero di maglia, ignoralo. (b) Il NUMERO DI MAGLIA: DENTRO la tabella, nella cella "N del Ruolo", di solito scritto a mano con tratto di penna, cifre grandi e irregolari. num = SOLO (b), cioe il contenuto della colonna intitolata "N del Ruolo". Un numero scritto a mano nella cella e il numero di maglia anche se per caso coincide con il contatore della riga; una cifra a penna che sconfina oltre il bordo verso il margine appartiene comunque alla cella "N del Ruolo" della sua riga.\n';
  prompt += '- Se le celle (b) sono vuote su TUTTE le righe (distinta digitale non compilata), num = null per tutte. Se le uniche cifre che vedi sono quelle stampate nel margine e sono esattamente 1, 2, 3, ... nell ordine delle righe, hai letto il contatore: num = null su TUTTE le righe.\n';
  prompt += '- CAMPO row: e il CONTATORE DI RIGA (a) stampato nel margine, letto sulla stessa riga del nome. Va riportato SEMPRE, anche per le righe barrate e per quelle scritte a mano, e NON va mai copiato in num: num resta solo la cella "N del Ruolo" (null se vuota). Le righe consecutive hanno row consecutivi: se una riga e barrata o saltata, la successiva mantiene comunque il suo numero prestampato.\n';
  prompt += '- I numeri di maglia di una squadra sono TUTTI DIVERSI tra loro (da 1 a 99): se ne leggi due uguali, ricontrolla quelle righe. Se una cifra scritta a mano e davvero ambigua metti null: meglio vuoto che sbagliato.\n';
  prompt += '- Includi SOLO righe con un cognome scritto, nell\'ordine della distinta. Salta righe completamente vuote.\n';
  prompt += '- Salta righe Assistente, Dirigente, Allenatore, Massaggiatore, Medico in fondo.\n';
  prompt += '- Non aggiungere ruoli DEF/MID/FWD/LM da te: la distinta FIGC non li indica, quindi role="" per chi non ha (P).\n';
  prompt += '- teamName: UNA sola squadra, dalla riga con la matricola in cima alla pagina, es. "A.S.D. FIAMMA MONZA 1970" o "CITTA DI BRUGHERIO". Mai due nomi, mai con il trattino.\n\n';
  prompt += 'Restituisci SOLO il JSON valido, senza commenti, senza markdown, senza backtick. Niente note dentro il JSON: i dubbi si esprimono SOLO con "?" nei valori.';

  var content = [];
  if (pdfBase64) {
    content.push({ type: 'text', text: 'DOCUMENTO - distinta FIGC in PDF (leggi la tabella delle calciatrici)' });
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } });
  }
  images.forEach(function (im, i) {
    var label;
    if (im.kind === 'strip') {
      label = 'IMMAGINE ' + (i + 1) + ' - striscia ' + im.index + ' di ' + im.total + ' (parte sinistra della distinta, alta risoluzione, dall\'alto verso il basso)';
    } else {
      label = 'IMMAGINE ' + (i + 1) + ' - pagina intera (contesto: titolo, nome squadra, conteggio righe)';
    }
    content.push({ type: 'text', text: label });
    content.push({ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.data } });
  });
  content.push({ type: 'text', text: prompt });

  var requestBody = {
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    messages: [{ role: 'user', content: content }]
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(CLAUDE_API_URL, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    if (responseCode !== 200) {
      return jsonResponse({ ok: false, error: 'Claude API error ' + responseCode + ': ' + responseText.substring(0, 500) });
    }
    var claudeResponse = JSON.parse(responseText);
    var claudeText = (claudeResponse.content || [])
      .filter(function (c) { return c && c.type === 'text'; })
      .map(function (c) { return c.text; }).join('\n').trim();
    var result = parseOcrJson(claudeText);
    var excluded = (Array.isArray(result.excluded) ? result.excluded : []).slice();
    // Le righe con struck:true passano in excluded (se l'AI non l'ha gia' fatto)
    (Array.isArray(result.players) ? result.players : []).forEach(function (p) {
      if (!p || !isStruckRow(p) || typeof p.name !== 'string') return;
      var key = p.name.toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
      var dup = excluded.some(function (x) {
        return x && String(x.name || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim() === key;
      });
      if (!dup) excluded.push({ name: p.name, reason: 'barrata' });
    });
    return jsonResponse({
      ok: true,
      teamName: typeof result.teamName === 'string' ? result.teamName : '',
      rowsCounted: result.rowsCounted || null,
      players: sanitizeOcrPlayers(result.players),
      excluded: excluded.map(function (x) {
        return { name: String((x && x.name) || '').trim(), reason: String((x && x.reason) || 'barrata') };
      }),
      truncated: claudeResponse.stop_reason === 'max_tokens',
      usage: claudeResponse.usage,
      imagesReceived: images.length,
      pdfReceived: pdfBase64 ? true : false
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Errore chiamata Claude: ' + err.toString() });
  }
}

// v5.6: la risposta dell'AI puo' avere testo attorno al JSON, commenti
// (// riga barrata), virgole finali, oppure essere troncata a meta' di una
// riga: si ripulisce e, se serve, si tengono le righe complete gia' lette
// invece di far fallire l'intero caricamento della distinta.
function parseOcrJson(text) {
  var start = text.indexOf('{');
  if (start < 0) throw new Error('JSON assente nella risposta: ' + text.substring(0, 160));
  var end = text.lastIndexOf('}');
  var body = end > start ? text.substring(start, end + 1) : text.substring(start);
  var attempts = [body, cleanJson(body)];
  // Risposta troncata: chiude l'array players dopo l'ultimo oggetto completo
  var cut = body.lastIndexOf('}');
  while (cut > 0 && attempts.length < 40) {
    var head = cleanJson(body.substring(0, cut + 1));
    attempts.push(head + ']}');
    attempts.push(head + '}');
    cut = body.lastIndexOf('}', cut - 1);
  }
  for (var i = 0; i < attempts.length; i++) {
    try { return JSON.parse(attempts[i]); } catch (e) { /* tentativo successivo */ }
  }
  throw new Error('JSON non valido nella risposta: ' + text.substring(0, 160));
}

function cleanJson(s) {
  return s
    .replace(/```(json)?/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')                  // righe di commento
    .replace(/([,\[{}\]]\s*)\/\/[^\n"]*$/gm, '$1') // commento in coda a una riga JSON
    .replace(/,\s*([\]}])/g, '$1');                // virgole finali
}

function isStruckRow(p) {
  return p.struck === true || p.struck === 'true' || p.excluded === true
    || /barrat|cancellat/i.test(String(p.note || p.reason || ''));
}

// Solo righe con un nome testuale; scartate quelle che l'AI ha marcato barrate
function sanitizeOcrPlayers(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(function (p) {
    if (!p || typeof p !== 'object') return false;
    if (isStruckRow(p)) return false;
    return typeof p.name === 'string' && p.name.trim() !== '';
  }).map(function (p) {
    return {
      num: p.num == null ? null : p.num,
      birthDate: p.birthDate == null ? '' : String(p.birthDate),
      name: p.name.trim(),
      role: typeof p.role === 'string' ? p.role : '',
      row: p.row == null ? null : p.row
    };
  });
}

// ============================================
// DISTINTE SU GOOGLE DRIVE (v4)
// ============================================
// Il browser non puo' aprire una cartella specifica del disco o di Drive:
// la cartella viene letta qui, con l'account Google del proprietario dello script.
//
//   action 'driveList'            -> elenco dei file (piu' recenti prima)
//   action 'driveOcr' + fileId    -> PDF: letto e interpretato direttamente qui
//                                    immagine: restituita al client in base64,
//                                    che applica la pipeline a strisce e richiama 'ocr'

// Risolve My Drive > From Dropbox > CI Fiamma monza prima squadra > Distinte.
// L'ID viene messo in cache nella Script Property DISTINTE_FOLDER_ID.
function resolveDistinteFolder() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty('DISTINTE_FOLDER_ID');
  if (cached) {
    try {
      return DriveApp.getFolderById(cached);
    } catch (e) {
      props.deleteProperty('DISTINTE_FOLDER_ID');   // cartella spostata o rimossa
    }
  }
  var folder = DriveApp.getRootFolder();
  for (var i = 0; i < DISTINTE_PATH.length; i++) {
    var it = folder.getFoldersByName(DISTINTE_PATH[i]);
    if (!it.hasNext()) {
      folder = null;
      break;
    }
    folder = it.next();
  }
  // Ripiego: cartella "Distinte" ovunque nel Drive (es. se il percorso cambia)
  if (!folder) {
    var any = DriveApp.getFoldersByName(DISTINTE_PATH[DISTINTE_PATH.length - 1]);
    if (!any.hasNext()) {
      throw new Error('Cartella "' + DISTINTE_PATH.join(' / ') + '" non trovata su Drive');
    }
    folder = any.next();
  }
  props.setProperty('DISTINTE_FOLDER_ID', folder.getId());
  return folder;
}

function isDistintaFile(mime) {
  return mime === MimeType.PDF ||
         mime === MimeType.JPEG ||
         mime === MimeType.PNG ||
         mime === 'image/webp' ||
         mime === 'image/heic';
}

function handleDriveList() {
  try {
    var folder = resolveDistinteFolder();
    var it = folder.getFiles();
    var files = [];
    while (it.hasNext() && files.length < DISTINTE_MAX_FILES * 3) {
      var f = it.next();
      var mime = f.getMimeType();
      if (!isDistintaFile(mime)) continue;
      files.push({
        id: f.getId(),
        name: f.getName(),
        mimeType: mime,
        sizeKb: Math.round(f.getSize() / 1024),
        modifiedMs: f.getLastUpdated().getTime(),
        modified: formatDateTime(f.getLastUpdated())
      });
    }
    files.sort(function (a, b) { return b.modifiedMs - a.modifiedMs; });   // piu' recenti prima
    if (files.length > DISTINTE_MAX_FILES) files = files.slice(0, DISTINTE_MAX_FILES);
    return jsonResponse({
      ok: true,
      folderPath: 'My Drive / ' + DISTINTE_PATH.join(' / '),
      files: files
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

function handleDriveOcr(payload) {
  try {
    if (!payload.fileId) return jsonResponse({ ok: false, error: 'fileId mancante' });
    var file = DriveApp.getFileById(payload.fileId);
    var mime = file.getMimeType();
    var blob = file.getBlob();
    var b64 = Utilities.base64Encode(blob.getBytes());

    if (mime === MimeType.PDF) {
      // PDF: nessuna perdita di risoluzione, lo legge direttamente Claude
      return handleOcrRequest({ pdfBase64: b64 });
    }
    // Immagine: torna al client, che ritaglia in strisce e richiama 'ocr'
    return jsonResponse({
      ok: true,
      needsClient: true,
      dataBase64: b64,
      mediaType: mime,
      name: file.getName()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

// ============================================
// INVIO REPORT VIA EMAIL (v5)
// ============================================
// Un'app web non puo' allegare un file a un'email: mailto: non supporta allegati.
// Il report (PDF o Excel) viene quindi generato sul dispositivo, mandato qui in
// base64 e spedito da MailApp, che usa l'account Google proprietario dello script.
// Il mittente e' quindi la casella Gmail di Max.
//   action 'sendReport' + { to, subject, body, filename, mimeType, dataBase64 }
function handleSendReport(payload) {
  try {
    var to = String(payload.to || '').trim();
    if (!to) return jsonResponse({ ok: false, error: 'Destinatario mancante' });
    if (!payload.dataBase64) return jsonResponse({ ok: false, error: 'Allegato mancante' });
    var blob = Utilities.newBlob(
      Utilities.base64Decode(payload.dataBase64),
      payload.mimeType || 'application/octet-stream',
      payload.filename || 'report'
    );
    MailApp.sendEmail({
      to: to,
      subject: payload.subject || 'My Statistics - Report partita',
      body: payload.body || 'In allegato il report generato con My Statistics.',
      name: 'My Statistics',
      attachments: [blob]
    });
    return jsonResponse({
      ok: true,
      sentTo: to,
      filename: payload.filename || '',
      remainingQuota: MailApp.getRemainingDailyQuota()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err.message || err) });
  }
}

// ============================================
// ATLETE tesserate (foglio ATLETE)
// ============================================
// Si usa SOLO il nome: il numero a lato delle atlete e' un progressivo senza
// altro significato (non e' il numero di maglia) e viene ignorato.
// Le colonne si riconoscono dall'intestazione (prima riga, entro le prime 10,
// che contiene "cognome", "nome", "atleta", "calciatrice" o "nominativo"):
//  - "Cognome" + "Nome" separati -> "COGNOME NOME"
//  - una sola colonna ("Cognome e nome", "Atleta", "Nome"...) -> quella
// Senza intestazione riconoscibile: prima colonna che contiene testo (non numeri).
function handleAtlete() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ATLETE);
  if (!sheet) return jsonResponse({ ok: false, error: 'Foglio "' + SHEET_ATLETE + '" non trovato' });
  const rows = sheet.getDataRange().getDisplayValues();

  var headerRow = -1, colCognome = -1, colNome = -1, colFull = -1;
  for (var r = 0; r < Math.min(rows.length, 10) && headerRow < 0; r++) {
    rows[r].forEach(function (cell, c) {
      var h = String(cell).trim().toLowerCase();
      if (!h) return;
      if (/cognome/.test(h) && /nome/.test(h.replace('cognome', ''))) colFull = c;
      else if (/cognome/.test(h)) colCognome = c;
      else if (/^nome$/.test(h)) colNome = c;
      else if (/atleta|calciatric|giocatric|nominativo|^nome/.test(h)) colFull = c;
    });
    if (colFull >= 0 || colCognome >= 0 || colNome >= 0) headerRow = r;
  }
  if (colFull < 0 && colCognome < 0) colFull = colNome;
  if (colFull < 0 && colCognome < 0) {
    // nessuna intestazione: prima colonna in cui compare testo non numerico
    var width = rows.reduce(function (w, row) { return Math.max(w, row.length); }, 0);
    for (var c = 0; c < width && colFull < 0; c++) {
      if (rows.some(function (row) { var v = String(row[c] || '').trim(); return v && isNaN(Number(v)); })) colFull = c;
    }
    if (colFull < 0) return jsonResponse({ ok: true, atlete: [] });
  }

  const atlete = [];
  const seen = {};
  rows.slice(headerRow + 1).forEach(function (row) {
    var name = colFull >= 0
      ? String(row[colFull] || '')
      : String(row[colCognome] || '') + ' ' + (colNome >= 0 ? String(row[colNome] || '') : '');
    name = name.trim().replace(/\s+/g, ' ').toUpperCase();
    if (!name || !isNaN(Number(name)) || seen[name]) return;
    seen[name] = true;
    atlete.push({ name: name });
  });
  return jsonResponse({ ok: true, atlete: atlete });
}

function testAtlete() {
  Logger.log(handleAtlete().getContent());
}

// ============================================
// COMANDI VOCALI da Apple Watch (v5.8)
// ============================================
// Il Watch (scorciatoia Comandi: Detta testo -> Ottieni contenuti URL, POST)
// manda { action:'voice', token, text }. La frase viene interpretata qui e
// scritta come riga del foglio "Comandi": e' una CODA, i dati di partita non
// vengono mai toccati. L'iPad la legge con 'voicePoll', risolve numero di maglia
// o cognome sulla rosa della partita aperta (la rosa sta solo sull'iPad: cambia
// a ogni distinta), registra l'evento con la stessa logica dei pulsanti e
// conferma con 'voiceAck'.
//
// Foglio "Comandi" (creato al primo comando):
//   A ID | B Ricevuto | C Testo dettato | D Evento | E Squadra | F Maglia |
//   G Dettaglio | H Stato (nuovo/applicato/errore/annullato) | I Messaggio |
//   J Dati (JSON per l'app)
// Prova senza Watch: scrivere una frase in colonna C di una riga nuova e
// lasciare vuoto il resto; al giro successivo l'iPad la tratta come dettata ora.
const VOICE_MAX_AGE_MS = 2 * 60 * 1000;  // oltre: "scaduto", mai applicato in ritardo
const VOICE_DUP_MS = 15 * 1000;          // stessa frase entro 15 s = invio doppio
const VOICE_SCAN_ROWS = 300;             // righe recenti lette a ogni giro
const VOICE_HEADERS = ['ID', 'Ricevuto', 'Testo dettato', 'Evento', 'Squadra', 'Maglia', 'Dettaglio', 'Stato', 'Messaggio', 'Dati'];
const VOICE_COL = { id: 1, ts: 2, text: 3, evento: 4, squadra: 5, maglia: 6, dettaglio: 7, stato: 8, msg: 9, data: 10 };

function handleVoiceRequest(payload) {
  var expected = PropertiesService.getScriptProperties().getProperty('VOICE_TOKEN');
  if (!expected) {
    return jsonResponse({ ok: false, error: 'Comandi vocali non configurati: manca la Script Property VOICE_TOKEN', message: '❌ Token non configurato nel backend' });
  }
  if (String(payload.token || '') !== expected) {
    return jsonResponse({ ok: false, error: 'Token comandi vocali non valido', message: '❌ Token non valido' });
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Backend occupato, riprova', message: '❌ Backend occupato, riprova' });
  }
  try {
    var sheet = getComandiSheet();
    if (payload.action === 'voice') return handleVoiceCommand(sheet, payload);
    if (payload.action === 'voicePoll') return handleVoicePoll(sheet, payload);
    return handleVoiceAck(sheet, payload);
  } finally {
    lock.releaseLock();
  }
}

function getComandiSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_COMANDI);
  if (!sheet) sheet = ss.insertSheet(SHEET_COMANDI);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, VOICE_HEADERS.length).setValues([VOICE_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(VOICE_COL.text, 260);
    sheet.setColumnWidth(VOICE_COL.msg, 320);
  }
  return sheet;
}

// Dal Watch: interpreta e accoda. La risposta `message` e' quella che la
// scorciatoia mostra sul quadrante.
function handleVoiceCommand(sheet, payload) {
  var text = String(payload.text || '').replace(/\s+/g, ' ').trim().substring(0, 300);
  if (!text) return jsonResponse({ ok: false, error: 'Frase vuota', message: '❌ Nessuna frase ricevuta' });
  var now = new Date();
  var cmd = parseVoiceCommand(text);
  var stato = cmd.ok ? 'nuovo' : 'errore';
  var msg = cmd.ok ? '' : cmd.message;
  if (cmd.ok && isDuplicateVoice(sheet, text, now.getTime())) {
    stato = 'errore';
    msg = 'Doppione: stessa frase ricevuta meno di ' + Math.round(VOICE_DUP_MS / 1000) + ' s fa, ignorata';
  }
  var id = 'v' + now.getTime() + Math.random().toString(36).slice(2, 5);
  sheet.appendRow([
    id, now, /^[=+\-@]/.test(text) ? "'" + text : text,
    cmd.ok ? cmd.evento : '', cmd.ok ? cmd.squadra : '', cmd.ok ? cmd.maglia : '', cmd.ok ? cmd.dettaglio : '',
    stato, msg, cmd.ok ? JSON.stringify(cmd.data) : ''
  ]);
  return jsonResponse({
    ok: stato === 'nuovo',
    id: id,
    stato: stato,
    message: stato === 'nuovo' ? '✅ ' + cmd.label : '❌ ' + msg,
    command: cmd.ok ? cmd.data : null
  });
}

function isDuplicateVoice(sheet, text, nowMs) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var first = Math.max(2, last - 19);
  var key = voiceNormalize(text);
  var rows = sheet.getRange(first, 1, last - first + 1, VOICE_HEADERS.length).getValues();
  return rows.some(function (r) {
    var ts = r[VOICE_COL.ts - 1] instanceof Date ? r[VOICE_COL.ts - 1].getTime() : NaN;
    return nowMs - ts < VOICE_DUP_MS
      && String(r[VOICE_COL.stato - 1]).trim().toLowerCase() !== 'errore'
      && voiceNormalize(r[VOICE_COL.text - 1]) === key;
  });
}

// Dall'iPad: comandi "nuovo" (o righe scritte a mano senza stato). Con
// `peek` conta soltanto, senza modificare nulla (Impostazioni > Prova).
function handleVoicePoll(sheet, payload) {
  var nowMs = Date.now();
  var last = sheet.getLastRow();
  var commands = [], expired = 0, pending = 0;
  if (last >= 2) {
    var first = Math.max(2, last - VOICE_SCAN_ROWS + 1);
    var rows = sheet.getRange(first, 1, last - first + 1, VOICE_HEADERS.length).getValues();
    rows.forEach(function (r, i) {
      var rowNum = first + i;
      var text = String(r[VOICE_COL.text - 1] || '').trim();
      var stato = String(r[VOICE_COL.stato - 1] || '').trim().toLowerCase();
      if (!text || (stato && stato !== 'nuovo')) return;
      pending++;
      if (payload.peek) return;
      var cell = function (col) { return sheet.getRange(rowNum, col); };
      var id = String(r[VOICE_COL.id - 1] || '').trim();
      if (!id) {
        id = 'm' + nowMs + '_' + rowNum;
        cell(VOICE_COL.id).setValue(id);
      }
      var ts = r[VOICE_COL.ts - 1] instanceof Date ? r[VOICE_COL.ts - 1].getTime() : NaN;
      if (isNaN(ts)) {
        ts = nowMs;
        cell(VOICE_COL.ts).setValue(new Date(nowMs));
      }
      if (nowMs - ts > VOICE_MAX_AGE_MS) {
        sheet.getRange(rowNum, VOICE_COL.stato, 1, 2).setValues([['errore',
          'Scaduto: l\'iPad non l\'ha ricevuto entro ' + Math.round(VOICE_MAX_AGE_MS / 60000) + ' minuti (partita non aperta o iPad offline)']]);
        expired++;
        return;
      }
      var data = null, label = '';
      try { data = JSON.parse(String(r[VOICE_COL.data - 1] || '')); } catch (e) { data = null; }
      if (data && data.type) {
        label = describeVoiceCommand(data);
      } else {
        // riga scritta a mano: si interpreta adesso
        var cmd = parseVoiceCommand(text);
        if (!cmd.ok) {
          sheet.getRange(rowNum, VOICE_COL.stato, 1, 2).setValues([['errore', cmd.message]]);
          return;
        }
        data = cmd.data;
        label = cmd.label;
        sheet.getRange(rowNum, VOICE_COL.evento, 1, 4).setValues([[cmd.evento, cmd.squadra, cmd.maglia, cmd.dettaglio]]);
        cell(VOICE_COL.data).setValue(JSON.stringify(data));
      }
      if (!stato) cell(VOICE_COL.stato).setValue('nuovo');
      commands.push({ id: id, ts: ts, text: text, label: label, command: data });
    });
  }
  return jsonResponse({ ok: true, commands: commands, pending: pending, expired: expired, serverTime: nowMs });
}

// Dall'iPad: esito di ogni comando, { results:[{ id, stato, messaggio }] }
function handleVoiceAck(sheet, payload) {
  var results = Array.isArray(payload.results) ? payload.results : [];
  var last = sheet.getLastRow();
  var updated = 0;
  if (last >= 2 && results.length) {
    var first = Math.max(2, last - VOICE_SCAN_ROWS + 1);
    var ids = sheet.getRange(first, VOICE_COL.id, last - first + 1, 1).getValues();
    var rowOf = {};
    ids.forEach(function (r, i) { if (r[0]) rowOf[String(r[0])] = first + i; });
    results.forEach(function (res) {
      var row = res && rowOf[String(res.id)];
      if (!row) return;
      var st = ['applicato', 'errore', 'annullato'].indexOf(res.stato) >= 0 ? res.stato : 'errore';
      sheet.getRange(row, VOICE_COL.stato, 1, 2).setValues([[st, String(res.messaggio || '').substring(0, 300)]]);
      updated++;
    });
  }
  return jsonResponse({ ok: true, updated: updated });
}

// ---- Parser delle frasi dettate ----
// Matrice di Max (03/10/2026): evento + squadra + giocatrice + campi facoltativi
//   "goal fiamma Gargaro [assist Bignotti] [su azione|rigore|punizione|autogol]"
//   "goal Brugherio 7" / "goal avversario 7"     (avversarie: di norma il numero)
//   "giallo fiamma Gargaro", "rosso Brugherio 5", "rigore parato fiamma Porta"
//   "sostituzione fiamma esce Gargaro entra Bignotti [tattica|infortunio]"
//   "sostituzione Brugherio esce 7 entra 13", "annulla"
// Squadra: "fiamma" (o noi), "avversario" (o loro) oppure il NOME della squadra
// avversaria: il backend non lo conosce, quindi le prime parole non riconosciute
// arrivano all'iPad come `lead`, e l'iPad le confronta con i nomi delle due
// squadre (cio' che avanza e' il cognome). Squadra non detta: l'iPad la deduce
// dalla rosa in cui si trova la giocatrice; se e' ambigua, il comando e' rifiutato.
// Giocatrice: cognome oppure numero di maglia (cifre o parole: "nove"),
// risolti dall'iPad sulla rosa della partita.
// Restituisce { ok:false, message } oppure
// { ok:true, data:{ type, team, lead, player, assist, playerIn, goalType, subReason },
//   evento, squadra, maglia, dettaglio, label }  (player = { num } oppure { name };
//   team = 'fiamma' | 'avversario' | null).
var VOICE_NUMBERS = (function () {
  var units = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
  var teens = ['dieci', 'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
  var tens = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];
  var map = {};
  units.forEach(function (w, i) { map[w] = i; });
  teens.forEach(function (w, i) { map[w] = 10 + i; });
  for (var t = 2; t < 10; t++) {
    map[tens[t]] = t * 10;
    for (var u = 1; u < 10; u++) {
      // ventuno, ventotto: la vocale finale cade davanti a uno/otto
      map[(u === 1 || u === 8 ? tens[t].slice(0, -1) : tens[t]) + units[u]] = t * 10 + u;
    }
  }
  return map;
})();

var VOICE_WORDS = (function () {
  var groups = {
    undo: ['annulla', 'annullare', 'annullato', 'cancella', 'elimina'],
    save: ['parato', 'parata', 'para'],
    owngoal: ['autogol', 'autogoal', 'autorete'],
    goal: ['gol', 'goal', 'gool', 'goool', 'gold', 'rete'],
    yellow: ['ammonizione', 'ammonizioni', 'ammonita', 'ammonito', 'ammonite', 'ammonisce', 'giallo', 'gialla'],
    red: ['espulsione', 'espulsioni', 'espulsa', 'espulso', 'rosso', 'rossa'],
    sub: ['sostituzione', 'sostituzioni', 'sostituita', 'sostituito', 'sostituisce', 'cambio', 'cambia'],
    us: ['fiamma', 'monza', 'noi', 'nostra', 'nostro', 'nostre'],
    them: ['avversario', 'avversaria', 'avversari', 'avversarie', 'loro'],
    inMark: ['entra', 'entrata', 'entrano', 'dentro'],
    outMark: ['esce', 'uscita', 'escono', 'fuori'],
    assist: ['assist', 'assistenza'],
    filler: ['il', 'lo', 'la', 'i', 'gli', 'le', 'l', 'un', 'una', 'di', 'del', 'della', 'dello', 'dei', 'delle',
      'da', 'dal', 'dalla', 'su', 'sul', 'sulla', 'con', 'numero', 'num', 'n', 'nr', 'maglia', 'e', 'ed', 'a',
      'al', 'alla', 'in', 'ha', 'cartellino', 'giocatrice', 'calciatrice', 'squadra', 'tiro', 'calcio', 'd',
      'motivo', 'per', 'testa', 'destro', 'sinistro']
  };
  var map = {};
  Object.keys(groups).forEach(function (g) { groups[g].forEach(function (w) { map[w] = g; }); });
  return map;
})();

// Gli stessi tipi dei pulsanti dell'app (autogol e' gestito come evento a parte)
var VOICE_GOAL_TYPES = { azione: 'azione', rigore: 'rigore', punizione: 'punizione' };
var VOICE_SUB_REASONS = { tattica: 'tattica', tattico: 'tattica', infortunio: 'infortunio', infortunata: 'infortunio', infortunato: 'infortunio', altro: 'altro' };

function voiceNormalize(text) {
  return String(text == null ? '' : text).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseVoiceCommand(text) {
  var tokens = voiceNormalize(text).split(' ').filter(function (t) { return t; });
  if (!tokens.length) return { ok: false, message: 'Frase vuota' };
  var found = {};
  tokens.forEach(function (t) { var g = VOICE_WORDS[t]; if (g) found[g] = true; });

  if (found.undo) return voiceResult({ type: 'undo' }, 'Annulla', '', '', '');

  var type = null, goalType = null, subReason = null;
  if (found.save && (tokens.indexOf('rigore') >= 0 || !(found.goal || found.yellow || found.red || found.sub))) {
    type = 'penaltysave';
  } else {
    var kinds = ['owngoal', 'goal', 'yellow', 'red', 'sub'].filter(function (k) { return found[k]; });
    if (kinds.length === 2 && found.owngoal && found.goal) kinds = ['owngoal'];   // "goal ... su autogol"
    if (kinds.length === 0 && found.inMark && found.outMark) kinds = ['sub'];     // "esce 7 entra 13"
    if (kinds.length === 0) return { ok: false, message: 'Evento non riconosciuto (di\' goal, giallo, rosso, sostituzione, rigore parato o annulla)' };
    if (kinds.length > 1) return { ok: false, message: 'Piu\' eventi nella stessa frase: dettane uno alla volta' };
    type = kinds[0] === 'owngoal' ? 'goal' : kinds[0];
    if (kinds[0] === 'owngoal') goalType = 'autogol';
  }
  if (found.us && found.them) return { ok: false, message: 'Squadra ambigua: hai detto sia fiamma sia avversario' };
  var team = found.us ? 'fiamma' : found.them ? 'avversario' : null;

  // Segmenti separati dai marcatori (esce / entra / assist); in ogni segmento
  // le giocatrici: ogni numero e' una giocatrice, parole consecutive = un nome
  var segs = [{ mark: null, items: [] }];
  var cur = segs[0], words = [];
  var flush = function () {
    if (words.length) { cur.items.push({ name: words.join(' ').toUpperCase() }); words = []; }
  };
  var badNumber = null;
  tokens.forEach(function (t) {
    var g = VOICE_WORDS[t];
    if (g === 'inMark' || g === 'outMark' || g === 'assist') {
      flush();
      cur = { mark: g, items: [] };
      segs.push(cur);
      return;
    }
    if (g === 'filler') return;    // non spezza i nomi: "citta di Brugherio"
    if (g) { flush(); return; }    // evento, squadra
    if (type === 'goal' && VOICE_GOAL_TYPES[t]) { flush(); if (!goalType) goalType = VOICE_GOAL_TYPES[t]; return; }
    if (type === 'sub' && VOICE_SUB_REASONS[t]) { flush(); subReason = VOICE_SUB_REASONS[t]; return; }
    if (type === 'penaltysave' && t === 'rigore') { flush(); return; }
    var n = /^\d+$/.test(t) ? parseInt(t, 10) : (VOICE_NUMBERS.hasOwnProperty(t) ? VOICE_NUMBERS[t] : null);
    if (n != null) {
      flush();
      if (n < 1 || n > 99) badNumber = n;
      cur.items.push({ num: n });
      return;
    }
    if (t.length < 2) return;
    words.push(t);
  });
  flush();
  if (badNumber != null) return { ok: false, message: 'Numero di maglia non valido: ' + badNumber + ' (deve essere tra 1 e 99)' };

  var itemsOf = function (mark) {
    return segs.filter(function (s) { return s.mark === mark; })
      .reduce(function (all, s) { return all.concat(s.items); }, []);
  };
  var main = itemsOf(null);
  // Squadra non detta con una parola chiave: il primo nome puo' essere il nome
  // della squadra avversaria (o squadra + cognome): lo decide l'iPad
  var lead = null;
  if (!team && main.length && main[0].name) {
    lead = main[0].name;
    main = main.slice(1);
  }
  var data = { type: type, team: team, lead: lead };

  if (type === 'sub') {
    var hasIn = segs.some(function (s) { return s.mark === 'inMark'; });
    var hasOut = segs.some(function (s) { return s.mark === 'outMark'; });
    if (itemsOf('assist').length) return { ok: false, message: '"assist" vale solo per i goal' };
    var outItems = hasOut ? itemsOf('outMark') : main;
    var inItems = itemsOf('inMark');
    if (hasOut && main.length) return { ok: false, message: 'Sostituzione: parole in piu\' prima di "esce" (' + main.map(voiceRefText).join(', ') + ')' };
    if (!hasIn || outItems.length !== 1 || inItems.length !== 1) {
      return { ok: false, message: 'Sostituzione: di\' chi esce e chi entra (es. "sostituzione fiamma esce Gargaro entra Bignotti")' };
    }
    var out = outItems[0], pin = inItems[0];
    if (out.num != null && out.num === pin.num) return { ok: false, message: 'Sostituzione: esce ed entra la stessa maglia ' + out.num };
    data.player = out;
    data.playerIn = pin;
    data.subReason = subReason || 'tattica';
    return voiceResult(data, 'Sostituzione', voiceTeamCell(data), voiceRefCell(out), 'entra ' + voiceRefText(pin) + ' · ' + data.subReason);
  }

  if (itemsOf('inMark').length || itemsOf('outMark').length) {
    return { ok: false, message: '"entra"/"esce" vale solo per le sostituzioni' };
  }
  if (main.length > 1) {
    return { ok: false, message: 'Troppe giocatrici nella frase (' + main.map(voiceRefText).join(', ') + '): ne serve una' };
  }
  if (!main.length && !lead && team !== 'avversario') {
    var esempio = { goal: 'goal fiamma Gargaro', yellow: 'giallo fiamma Gargaro', red: 'rosso fiamma Gargaro', penaltysave: 'rigore parato fiamma Porta' }[type];
    return { ok: false, message: 'Manca la giocatrice (es. "' + esempio + '")' };
  }
  data.player = main[0] || null;   // avversaria non indicata: la registra l'iPad come "Non indicata"
  if (type === 'goal') {
    var assist = itemsOf('assist');
    if (assist.length > 1) return { ok: false, message: 'Assist: una sola giocatrice' };
    if (goalType === 'autogol' && assist.length) return { ok: false, message: 'Un autogol non ha assist' };
    data.goalType = goalType || 'azione';
    data.assist = assist[0] || null;
    var det = data.goalType + (data.assist ? ' · assist ' + voiceRefText(data.assist) : '');
    return voiceResult(data, data.goalType === 'autogol' ? 'Autogol' : 'Goal', voiceTeamCell(data), voiceRefCell(data.player), det);
  }
  var ev = { yellow: 'Giallo', red: 'Rosso', penaltysave: 'Rigore parato' }[type];
  return voiceResult(data, ev, voiceTeamCell(data), voiceRefCell(data.player), '');
}

function voiceResult(data, evento, squadra, maglia, dettaglio) {
  return { ok: true, data: data, evento: evento, squadra: squadra, maglia: maglia, dettaglio: dettaglio, label: describeVoiceCommand(data) };
}
function voiceTeamLabel(team) { return team === 'avversario' ? 'Avversario' : team === 'fiamma' ? 'Fiamma' : ''; }
// Colonna "Squadra": la parola chiave, oppure le parole da riconoscere sull'iPad
function voiceTeamCell(d) { return d.team ? voiceTeamLabel(d.team) : (d.lead ? d.lead + ' ?' : '?'); }
function voiceRefText(ref) {
  if (!ref) return '';
  return ref.num != null ? '#' + ref.num : String(ref.name || '');
}
// Colonna "Maglia": il numero, oppure il cognome dettato (lo risolve l'iPad)
function voiceRefCell(ref) {
  if (!ref) return '';
  return ref.num != null ? ref.num : String(ref.name || '');
}
function describeVoiceCommand(d) {
  if (!d || d.type === 'undo') return 'Annulla l\'ultimo comando vocale';
  var head = [voiceTeamLabel(d.team), d.lead].filter(function (x) { return x; }).join(' ');
  var who = (head ? ' ' + head : '') + (d.player ? ' ' + voiceRefText(d.player) : '');
  if (d.type === 'goal') {
    return (d.goalType === 'autogol' ? 'Autogol' : 'Goal') + who +
      (d.goalType && d.goalType !== 'autogol' ? ', ' + d.goalType : '') +
      (d.assist ? ', assist ' + voiceRefText(d.assist) : '');
  }
  if (d.type === 'sub') return 'Sostituzione' + (head ? ' ' + head : '') + ': esce ' + voiceRefText(d.player) + ', entra ' + voiceRefText(d.playerIn) + ' (' + d.subReason + ')';
  return ({ yellow: 'Giallo', red: 'Rosso', penaltysave: 'Rigore parato' }[d.type] || '') + who;
}

// TEST dall'editor (nessuna scrittura): frasi di esempio -> interpretazione
var VOICE_TEST_PHRASES = [
  ['goal fiamma Gargaro', 'Goal Fiamma GARGARO, azione'],
  ['goal fiamma Gargàro assist Bignotti su rigore', 'Goal Fiamma GARGARO, rigore, assist BIGNOTTI'],
  ['Goal fiamma Gargaro su punizione', 'Goal Fiamma GARGARO, punizione'],
  ['goal fiamma Gargaro su autogoal', 'Autogol Fiamma GARGARO'],
  ['goal Brugherio 7', 'Goal BRUGHERIO #7, azione'],
  ['goal città di Brugherio sette', 'Goal CITTA BRUGHERIO #7, azione'],
  ['goal avversario 7', 'Goal Avversario #7, azione'],
  ['goal avversario', 'Goal Avversario, azione'],
  ['goal Brugherio Rossi', 'Goal BRUGHERIO ROSSI, azione'],
  ['giallo fiamma Gargaro', 'Giallo Fiamma GARGARO'],
  ['ammonizione Brugherio 5', 'Giallo BRUGHERIO #5'],
  ['ammonita la numero tre avversario', 'Giallo Avversario #3'],
  ['rosso fiamma Bignotti', 'Rosso Fiamma BIGNOTTI'],
  ['espulsione avversario ventuno', 'Rosso Avversario #21'],
  ['rigore parato fiamma Porta', 'Rigore parato Fiamma PORTA'],
  ['sostituzione fiamma esce Gargaro entra Bignotti', 'Sostituzione Fiamma: esce GARGARO, entra BIGNOTTI (tattica)'],
  ['sostituzione fiamma esce Gargaro entra Bignotti infortunio', 'Sostituzione Fiamma: esce GARGARO, entra BIGNOTTI (infortunio)'],
  ['sostituzione Brugherio esce 7 entra 13', 'Sostituzione BRUGHERIO: esce #7, entra #13 (tattica)'],
  ['sostituzione esce Gargaro entra Bignotti', 'Sostituzione: esce GARGARO, entra BIGNOTTI (tattica)'],
  ['cambio avversario esce sette entra tredici', 'Sostituzione Avversario: esce #7, entra #13 (tattica)'],
  ['annulla', 'Annulla l\'ultimo comando vocale'],
  ['goal fiamma', null],
  ['ciao come stai', null],
  ['giallo fiamma Gargaro rosso fiamma Bignotti', null],
  ['sostituzione fiamma esce Gargaro', null],
  ['giallo avversario 3 5', null],
  ['goal avversario 120', null],
  ['goal fiamma avversario 9', null],
  ['goal fiamma Gargaro su autogol assist Bignotti', null]
];

function testParserComandi() {
  var fails = 0;
  VOICE_TEST_PHRASES.forEach(function (c) {
    var r = parseVoiceCommand(c[0]);
    var got = r.ok ? r.label : null;
    var pass = got === c[1];
    if (!pass) fails++;
    Logger.log((pass ? 'OK   ' : 'FAIL ') + '"' + c[0] + '" -> ' + (r.ok ? r.label : 'ERRORE: ' + r.message) +
      (pass ? '' : '   (atteso: ' + (c[1] || 'errore') + ')'));
  });
  Logger.log(fails === 0 ? 'Tutte le ' + VOICE_TEST_PHRASES.length + ' frasi OK' : fails + ' frasi NON OK');
  return fails;
}

// TEST dall'editor: simula il Watch e SCRIVE una riga nel foglio "Comandi"
// (con l'iPad in partita, il comando arriva davvero: provarlo a partita di prova)
function testComandoVocale() {
  var token = PropertiesService.getScriptProperties().getProperty('VOICE_TOKEN');
  Logger.log(handleVoiceRequest({ action: 'voice', token: token, text: 'giallo fiamma Gargaro' }).getContent());
  Logger.log(handleVoiceRequest({ action: 'voicePoll', token: token, peek: true }).getContent());
}

// ============================================
// SYNC partita su Google Sheets
// ============================================
function handleSyncRequest(payload) {
  const match = payload.match;
  if (!match) return jsonResponse({ ok: false, error: 'Payload mancante' });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataPartita = formatDate(new Date(match.endedAt || match.createdAt));
  const dataSalvataggio = formatDateTime(new Date());

  const sheetPartite = ss.getSheetByName(SHEET_PARTITE);
  deleteRowsById(sheetPartite, 'A', match.id);
  sheetPartite.appendRow([
    match.id, dataPartita, match.home.name, match.away.name,
    match.home.score, match.away.score,
    match.completed ? 'Completata' : 'In corso',
    payload.periodLabel || '', dataSalvataggio
  ]);

  const sheetStats = ss.getSheetByName(SHEET_STATISTICHE);
  deleteRowsById(sheetStats, 'A', match.id);
  const statsRows = [];
  ['home', 'away'].forEach(function(side) {
    const stats = payload.stats[side] || [];
    const teamName = match[side].name;
    stats.forEach(function(s) {
      statsRows.push([
        match.id, dataPartita, teamName, s.num, s.role, s.name,
        s.goals, s.assists, s.yellows, s.reds, s.minutesPlayed,
        s.starter ? 'Sì' : 'No'
      ]);
    });
  });
  if (statsRows.length > 0) {
    sheetStats.getRange(sheetStats.getLastRow() + 1, 1, statsRows.length, 12).setValues(statsRows);
  }

  const sheetEventi = ss.getSheetByName(SHEET_EVENTI);
  deleteRowsById(sheetEventi, 'A', match.id);
  const eventiRows = [];
  const sortedEvents = match.events.slice().sort(function(a, b) { return a.minute - b.minute; });
  sortedEvents.forEach(function(ev) {
    const teamName = match[ev.team].name;
    var tipo = '', calc = '', dettaglio = '', note = '';
    if (ev.type === 'goal') {
      tipo = ev.goalType === 'autogol' ? 'Autogol' : 'Goal';
      calc = (ev.scorer.num || '?') + ' ' + ev.scorer.name;
      if (ev.assist) dettaglio = 'Assist: ' + (ev.assist.num || '?') + ' ' + ev.assist.name;
      note = ev.goalType || 'azione';
    } else if (ev.type === 'yellow') {
      tipo = 'Ammonizione';
      calc = (ev.player.num || '?') + ' ' + ev.player.name;
    } else if (ev.type === 'red') {
      tipo = 'Espulsione';
      calc = (ev.player.num || '?') + ' ' + ev.player.name;
    } else if (ev.type === 'penaltysave') {
      tipo = 'Rigore parato';
      calc = (ev.player.num || '?') + ' ' + ev.player.name;
    } else if (ev.type === 'sub') {
      tipo = 'Sostituzione';
      calc = 'Esce: ' + (ev.playerOut.num || '?') + ' ' + ev.playerOut.name;
      dettaglio = 'Entra: ' + (ev.playerIn.num || '?') + ' ' + ev.playerIn.name;
      note = ev.subReason || '';
    }
    eventiRows.push([
      match.id, dataPartita, ev.minute,
      payload.periodNames ? (payload.periodNames[ev.period] || '') : '',
      tipo, teamName, calc, dettaglio, note
    ]);
  });
  if (eventiRows.length > 0) {
    sheetEventi.getRange(sheetEventi.getLastRow() + 1, 1, eventiRows.length, 9).setValues(eventiRows);
  }

  return jsonResponse({
    ok: true,
    matchId: match.id,
    home: match.home.name,
    away: match.away.name,
    score: match.home.score + '-' + match.away.score,
    statsRows: statsRows.length,
    eventiRows: eventiRows.length,
    savedAt: dataSalvataggio
  });
}

// ============================================
// HELPERS
// ============================================
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function formatDate(d) {
  var day = String(d.getDate()).padStart(2, '0');
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

function formatDateTime(d) {
  return formatDate(d) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function deleteRowsById(sheet, idColLetter, idValue) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var ids = sheet.getRange(idColLetter + '2:' + idColLetter + lastRow).getValues();
  for (var i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === idValue) {
      sheet.deleteRow(i + 2);
    }
  }
}

// Funzione di test per forzare autorizzazioni
function testAutorizzazioni() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('Sheets OK: ' + ss.getName());
  var key = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  Logger.log('API Key presente: ' + (key ? 'sì (' + key.substring(0, 10) + '...)' : 'NO!'));
  var response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Rispondi solo con: TEST OK' }]
    }),
    muteHttpExceptions: true
  });
  Logger.log('HTTP code: ' + response.getResponseCode());
  Logger.log('Risposta: ' + response.getContentText().substring(0, 200));
}

function testOcrDiretto() {
  var response = UrlFetchApp.fetch(CLAUDE_API_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY'),
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Rispondi solo con: OCR OK e il nome del modello che sei' }]
    }),
    muteHttpExceptions: true
  });
  Logger.log('HTTP: ' + response.getResponseCode());
  Logger.log('Risposta: ' + response.getContentText().substring(0, 300));
}

// ============================================
// TEST v4 - ESEGUIRE UNA VOLTA DALL'EDITOR
// ============================================
// Serve a concedere allo script l'accesso a Google Drive (scope drive.readonly)
// PRIMA di pubblicare i deployment. Nel log devono comparire le distinte.
function testDriveDistinte() {
  var folder = resolveDistinteFolder();
  Logger.log('Cartella trovata: ' + folder.getName() + ' (id ' + folder.getId() + ')');
  var it = folder.getFiles();
  var n = 0;
  while (it.hasNext() && n < 20) {
    var f = it.next();
    Logger.log((n + 1) + '. ' + f.getName() + '  [' + f.getMimeType() + ']  ' + formatDateTime(f.getLastUpdated()));
    n++;
  }
  if (n === 0) Logger.log('Nessun file nella cartella.');
  return n;
}

// ============================================
// TEST v5 - ESEGUIRE UNA VOLTA DALL'EDITOR
// ============================================
// Concede allo script il permesso di inviare email (scope script.send_mail)
// PRIMA di pubblicare i deployment. Invia una mail di prova a un indirizzo fisso
// (NON usare Session.getEffectiveUser(): richiede lo scope userinfo.email, non
// dichiarato in appsscript.json, e fallisce con "Specified permissions are not
// sufficient" - vedi PROGRESS.md 13/09/2026).
function testInvioEmail() {
  var to = 'massimo.vassalli643@gmail.com';
  MailApp.sendEmail({
    to: to,
    subject: 'My Statistics - test invio report',
    body: 'Se leggi questa email, il backend puo inviare i report come allegato.',
    name: 'My Statistics'
  });
  Logger.log('Email di prova inviata a ' + to);
  Logger.log('Email ancora inviabili oggi: ' + MailApp.getRemainingDailyQuota());
  return to;
}
