// ============================================
// MY STATISTICS - Apps Script Backend
// v3 (12/09/2026): OCR multi-immagine (pagina intera + strisce ad alta risoluzione)
// ============================================
//
// COPIA DI RIFERIMENTO del codice deployato su script.google.com
// (progetto "MyStatisticsBackend"). Il file che conta e' quello nell'editor
// Apps Script: dopo ogni modifica, Deploy > Gestisci deployment > Modifica >
// Nuova versione > Implementa (per OGNI deployment attivo).

const SHEET_PARTITE = 'Partite';
const SHEET_STATISTICHE = 'Statistiche';
const SHEET_EVENTI = 'Eventi';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-5';

// ============================================
// ENDPOINT POST
// ============================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.action === 'ocr') {
      return handleOcrRequest(payload);
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
    message: 'My Statistics endpoint attivo (v3 con OCR Claude multi-immagine)',
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
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    images = payload.images;
  } else if (payload.imageBase64) {
    images = [{ data: payload.imageBase64, mediaType: payload.mediaType || 'image/jpeg', kind: 'overview' }];
  }
  if (images.length === 0) {
    return jsonResponse({ ok: false, error: 'Immagine mancante' });
  }
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
  prompt += 'STRUTTURA DISTINTA FIGC:\n';
  prompt += 'Tabella con colonne (da sinistra a destra): N del Ruolo (numero maglia, spesso vuoto), Data di nascita, Cognome e nome, Capitano/V.Cap (lettera C o V se presente), N. Matricola FIGC, Tipo documento, Numero documento, Rilasciato da.\n';
  prompt += 'Sotto la colonna "Cognome e nome" puo apparire "(P)" = Portiere.\n\n';
  prompt += 'OUTPUT - SOLO QUESTO JSON, niente altro:\n';
  prompt += '{\n';
  prompt += '  "teamName": "NOME SQUADRA ESATTO dal titolo della distinta",\n';
  prompt += '  "rowsCounted": <numero di righe con cognome contate nella pagina intera>,\n';
  prompt += '  "players": [\n';
  prompt += '    {"num": <numero maglia colonna N del Ruolo, oppure null se vuoto>, "birthDate": "<GG/MM/AAAA come scritto>", "name": "<COGNOME NOME esatto>", "role": "<GK se (P), altrimenti stringa vuota>"}\n';
  prompt += '  ]\n';
  prompt += '}\n\n';
  prompt += 'NOTE:\n';
  prompt += '- num = numero maglia (colonna "N del Ruolo"), NON il numero di riga; se la cella e vuota, null.\n';
  prompt += '- Includi SOLO righe con un cognome scritto, nell\'ordine della distinta. Salta righe completamente vuote.\n';
  prompt += '- Salta righe Assistente, Dirigente, Allenatore, Massaggiatore, Medico in fondo.\n';
  prompt += '- Non aggiungere ruoli DEF/MID/FWD/LM da te: la distinta FIGC non li indica, quindi role="" per chi non ha (P).\n';
  prompt += '- teamName: prendi dal titolo in alto della distinta, es. "CITTA DI BRUGHERIO" o "A.S.D. FIAMMA MONZA 1970".\n\n';
  prompt += 'Restituisci SOLO il JSON valido, senza commenti, senza markdown, senza backtick.';

  var content = [];
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
      imagesReceived: images.length
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Errore chiamata Claude: ' + err.toString() });
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
