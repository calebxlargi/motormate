// Bind this script to the lead spreadsheet and enable the Advanced Sheets service.
function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty('MOTORMATE_SHEETS_SECRET');
  const spreadsheetId = props.getProperty('MOTORMATE_SHEETS_ID');
  let authenticated = false;

  try {
    const { payload, signature } = JSON.parse(e.postData.contents);
    if (!secret || !spreadsheetId || typeof payload !== 'string' || payload.length > 16000) {
      return reply({ error: 'Invalid request.' });
    }
    const expected = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(payload, secret)).replace(/=+$/, '');
    if (!matches(signature, expected)) return reply({ error: 'Invalid request.' });
    authenticated = true;

    const { sentAt, id, rows } = JSON.parse(payload);
    if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > 300000 ||
      !/^[a-f0-9-]{36}$/.test(id) || !rows || Object.keys(rows).join('|') !== 'Sheet1|Lead Details') {
      return reply({ error: 'Invalid request.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      return reply({ no: saveLead(spreadsheetId, id, rows) });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error.message);
    return reply({
      error: 'Google Sheets could not save the lead.',
      diagnostic: authenticated ? error.message : undefined,
    });
  }
}

function matches(actual, expected) {
  if (typeof actual !== 'string' || actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}

function reply(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function saveLead(spreadsheetId, id, rows) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const metadataKey = 'motormate_submission';
  const previous = spreadsheet.createDeveloperMetadataFinder().withKey(metadataKey).withValue(id).find()[0];
  if (previous) return previous.getLocation().getRow().getCell(1, 1).getValue();

  const tabs = Object.entries(rows).map(([title, row]) => {
    const sheet = spreadsheet.getSheetByName(title);
    const headers = Object.keys(row);
    const lastRow = sheet ? sheet.getLastRow() : 0;
    if (lastRow > 0 && sheet.getRange(1, 1, 1, headers.length).getValues()[0].join('|') !== headers.join('|')) {
      throw new Error('Unexpected headers in ' + title);
    }
    return { title, sheet, headers, lastRow, row };
  });

  let no = 0;
  for (const { sheet, lastRow } of tabs) {
    if (lastRow < 2) continue;
    for (const [value] of sheet.getRange(2, 1, lastRow - 1, 1).getValues()) {
      const candidate = Number(value);
      if (Number.isSafeInteger(candidate) && candidate > no) no = candidate;
    }
  }
  no += 1;

  const requests = [];
  const usedIds = new Set(spreadsheet.getSheets().map(sheet => sheet.getSheetId()));
  for (const { title, sheet, headers, lastRow, row } of tabs) {
    let sheetId = sheet ? sheet.getSheetId() : 1;
    if (!sheet) {
      while (usedIds.has(sheetId)) sheetId++;
      usedIds.add(sheetId);
      requests.push({ addSheet: { properties: { sheetId, title } } });
    }
    const lead = Object.values({ ...row, No: no });
    const values = lastRow ? [lead] : [headers, lead];
    const startRowIndex = lastRow || 1;
    const maxRows = sheet ? sheet.getMaxRows() : 1000;
    if (startRowIndex >= maxRows) {
      requests.push({ appendDimension: { sheetId, dimension: 'ROWS', length: 1 } });
    }
    requests.push({ updateCells: {
      start: { sheetId, rowIndex: lastRow, columnIndex: 0 },
      rows: values.map(cells => ({ values: cells.map(value => {
        if (value === '' || value == null) return {};
        return { userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: String(value) } };
      }) })),
      fields: 'userEnteredValue',
    } });
    if (title === 'Sheet1') {
      requests.push({ createDeveloperMetadata: { developerMetadata: {
        metadataKey, metadataValue: id, visibility: 'DOCUMENT',
        location: { dimensionRange: { sheetId, dimension: 'ROWS', startIndex: startRowIndex, endIndex: startRowIndex + 1 } },
      } } });
    }
  }
  Sheets.Spreadsheets.batchUpdate({ requests }, spreadsheetId);
  return no;
}
