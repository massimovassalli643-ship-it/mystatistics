// ============================================
// MY STATISTICS - Apps Script Backend
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

const SHEET_PARTITE = 'Partite';
const SHEET_STATISTICHE = 'Statistiche';
const SHEET_EVENTI = 'Eventi';
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
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'ocr') {
      return handleOcrRequest(payload);
    }
    if (payload.action === 'driveList') {
      return handleDriveList();
    }
    if (payload.action === 'driveOcr') {
      return handleDriveOcr(payload);
    }
    return handleSyncRequest(payload);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

// ============================================
// ENDPOINT GET (ping)
// ============================================
function doGet() {
  return jsonResponse({
    ok: true,
    message: 'My Statistics endpoint attivo (v4: OCR multi-immagine + distinte da Drive)',
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
  prompt += 'Tabella con colonne (da sinistra a destra): N del Ruolo (numero maglia, spesso vuoto), Data di nascita, Cognome e nome, Capitano/V.Cap (lettera C o V se presente), N. Matricola FIGC, Tipo documento, Numero documento, Rilasciato da.\n';
  prompt += 'Sotto la colonna "Cognome e nome" puo apparire "(P)" = Portiere.\n\n';
  prompt += 'OUTPUT - SOLO QUESTO JSON, niente altro:\n';
  prompt += '{\n';
  prompt += '  "teamName": "<una sola squadra, dall intestazione in alto, senza matricola e senza avversaria>",\n';
  prompt += '  "rowsCounted": <numero di righe con cognome contate nella pagina intera>,\n';
  prompt += '  "players": [\n';
  prompt += '    {"num": <numero maglia colonna N del Ruolo, oppure null se vuoto>, "birthDate": "<GG/MM/AAAA come scritto>", "name": "<COGNOME NOME esatto>", "role": "<GK se (P), altrimenti stringa vuota>"}\n';
  prompt += '  ]\n';
  prompt += '}\n\n';
  prompt += 'NOTE:\n';
  prompt += '- num = il valore scritto nella PRIMA colonna a sinistra, intestata "N del Ruolo": e il numero di maglia della calciatrice. Copialo esattamente come e scritto sulla sua riga. Se la cella e davvero vuota, null; non inventare una numerazione progressiva tua.\n';
  prompt += '- Includi SOLO righe con un cognome scritto, nell\'ordine della distinta. Salta righe completamente vuote.\n';
  prompt += '- Salta righe Assistente, Dirigente, Allenatore, Massaggiatore, Medico in fondo.\n';
  prompt += '- Non aggiungere ruoli DEF/MID/FWD/LM da te: la distinta FIGC non li indica, quindi role="" per chi non ha (P).\n';
  prompt += '- teamName: UNA sola squadra, dalla riga con la matricola in cima alla pagina, es. "A.S.D. FIAMMA MONZA 1970" o "CITTA DI BRUGHERIO". Mai due nomi, mai con il trattino.\n\n';
  prompt += 'Restituisci SOLO il JSON valido, senza commenti, senza markdown, senza backtick.';

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
    max_tokens: 3000,
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
    var claudeText = claudeResponse.content[0].text.trim();
    var jsonText = claudeText;
    var jsonMatch = claudeText.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonText = jsonMatch[0];
    var result = JSON.parse(jsonText);
    return jsonResponse({
      ok: true,
      teamName: result.teamName || '',
      rowsCounted: result.rowsCounted || null,
      players: result.players || [],
      usage: claudeResponse.usage,
      imagesReceived: images.length,
      pdfReceived: pdfBase64 ? true : false
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Errore chiamata Claude: ' + err.toString() });
  }
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
