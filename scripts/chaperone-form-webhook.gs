const CHAPERONE_ENDPOINT = 'https://mrhs-speech-debate-2627.lebronbron99.chatgpt.site/api/chaperone-submission';
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

function buildChaperonePayload(values, sourceId, sheetId, rowNumber) {
  const firstName = firstValue(values, ['First Name', 'Parent First']);
  const lastName = firstValue(values, ['Last Name', 'Parent Last']);
  const timestamp = firstValue(values, ['Timestamp']);
  return {
    sourceKey: [sourceId, sheetId, rowNumber, timestamp].join(':'),
    sourceRow: rowNumber,
    timestamp: timestamp,
    parentName: [firstName, lastName].filter(Boolean).join(' '),
    studentName: firstValue(values, ['Child Name', 'Child']),
    tournamentNames: splitTournaments(firstValue(values, ['Tournament to Attend', 'Tournament'])),
    approvedVolunteer: firstValue(values, [
      'Approved UCPS Volunteer? This is required to ride bus as a chaperone (If not, please do begin the process to be approved / See above)',
      'Approved UCPS',
    ]),
  };
}

function postChaperones(submissions) {
  const properties = PropertiesService.getScriptProperties();
  const secret = properties.getProperty('MRHS_WEBHOOK_SECRET');
  const bypassToken = properties.getProperty('MRHS_SITES_BYPASS_TOKEN');
  if (!secret) throw new Error('Add MRHS_WEBHOOK_SECRET in Apps Script project settings.');
  if (!bypassToken) throw new Error('Add MRHS_SITES_BYPASS_TOKEN in Apps Script project settings.');

  const response = UrlFetchApp.fetch(CHAPERONE_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + secret,
      'OAI-Sites-Authorization': 'Bearer ' + bypassToken,
    },
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

function syncExistingChaperones() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(CHAPERONE_RESPONSE_SHEET);
  if (!sheet) throw new Error('Could not find the chaperone response sheet.');
  const rows = sheet.getDataRange().getDisplayValues();
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
