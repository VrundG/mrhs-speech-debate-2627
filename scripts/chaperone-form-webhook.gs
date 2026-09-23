const CHAPERONE_RESPONSE_SHEET = 'Judges 25-26';

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function findValue(values, headings) {
  const normalized = {};
  Object.keys(values).forEach(function (key) {
    normalized[normalizeHeader(key)] = values[key];
  });
  for (let i = 0; i < headings.length; i += 1) {
    const hit = normalized[normalizeHeader(headings[i])];
    if (hit !== undefined) return Array.isArray(hit) ? hit : [hit];
  }
  return [''];
}

function firstValue(values, headings) {
  return String(findValue(values, headings)[0] || '').trim();
}

function splitTournaments(value) {
  return String(value || '').split(/,|;|\n/).map(function (item) {
    return item.trim();
  }).filter(Boolean);
}

function confirmedTournaments(value, planned) {
  if (value === true) return planned;
  const normalized = String(value || '').trim().toLowerCase();
  if (['yes', 'true', 'confirmed', 'complete', 'completed'].indexOf(normalized) >= 0) return planned;
  if (['no', 'false', ''].indexOf(normalized) >= 0) return [];
  return splitTournaments(value);
}

function isoTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(String(value || '').trim());
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function buildChaperonePayload(values, sourceId, sheetId, rowNumber) {
  const firstName = firstValue(values, ['First Name', 'Parent First']);
  const lastName = firstValue(values, ['Last Name', 'Parent Last']);
  const timestampRaw = findValue(values, ['Timestamp'])[0];
  const timestamp = isoTimestamp(timestampRaw);
  const tournamentNames = splitTournaments(firstValue(values, ['Tournament to Attend', 'Tournament']));
  const attendanceValue = findValue(values, ['Confirmed Tournaments', 'Attendance Confirmed', 'Chaperone Attendance Confirmed'])[0];
  return {
    sourceKey: [sourceId, sheetId, rowNumber].join(':'),
    sourceRow: rowNumber,
    timestamp: timestamp,
    parentName: [firstName, lastName].filter(Boolean).join(' '),
    studentName: firstValue(values, ['Child Name', 'Child']),
    tournamentNames: tournamentNames,
    confirmedTournamentNames: confirmedTournaments(attendanceValue, tournamentNames),
    approvedVolunteer: firstValue(values, [
      'Approved UCPS Volunteer? This is required to ride bus as a chaperone (If not, please do begin the process to be approved / See above)',
      'Approved UCPS',
    ]),
  };
}

function postChaperones(submissions) {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = properties.getProperty('MRHS_CHAPERONE_ENDPOINT');
  const secret = properties.getProperty('MRHS_WEBHOOK_SECRET');
  if (!endpoint) throw new Error('Add MRHS_CHAPERONE_ENDPOINT in Apps Script project settings.');
  if (!secret) throw new Error('Add MRHS_WEBHOOK_SECRET in Apps Script project settings.');

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify({ submissions: submissions }),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Dashboard update failed: ' + response.getContentText());
  }
}

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  postChaperones([buildChaperonePayload(e.namedValues, e.source.getId(), sheet.getSheetId(), e.range.getRow())]);
}

function onChaperoneEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== CHAPERONE_RESPONSE_SHEET || e.range.getRow() < 2) return;
  const heading = normalizeHeader(sheet.getRange(1, e.range.getColumn()).getValue());
  if (['confirmed tournaments', 'attendance confirmed', 'chaperone attendance confirmed'].indexOf(heading) < 0) return;
  const headings = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(e.range.getRow(), 1, 1, headings.length).getValues()[0];
  const values = {};
  headings.forEach(function (columnHeading, column) {
    values[columnHeading] = [row[column]];
  });
  postChaperones([buildChaperonePayload(values, e.source.getId(), sheet.getSheetId(), e.range.getRow())]);
}

function installChaperoneTriggers() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (['onFormSubmit', 'onChaperoneEdit'].indexOf(trigger.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(spreadsheet).onFormSubmit().create();
  ScriptApp.newTrigger('onChaperoneEdit').forSpreadsheet(spreadsheet).onEdit().create();
}

function syncExistingChaperones() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CHAPERONE_RESPONSE_SHEET);
  if (!sheet) throw new Error('Could not find the chaperone response sheet.');
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return;
  const headings = rows[0];
  const submissions = [];
  for (let index = 1; index < rows.length; index += 1) {
    const values = {};
    headings.forEach(function (heading, column) {
      values[heading] = [rows[index][column]];
    });
    const payload = buildChaperonePayload(values, spreadsheet.getId(), sheet.getSheetId(), index + 1);
    if (payload.timestamp && payload.parentName && payload.studentName) submissions.push(payload);
  }
  for (let offset = 0; offset < submissions.length; offset += 100) {
    postChaperones(submissions.slice(offset, offset + 100));
  }
}
