function isoTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  var parsed = new Date(String(value || '').trim());
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function membershipPayload_(source, sheet, rowNumber, values) {
  var first = function (heading) { return String(values[heading] || '').trim(); };
  return {
    sourceKey: [source.getId(), sheet.getSheetId(), rowNumber].join(':'),
    timestamp: isoTimestamp(values.Timestamp),
    firstName: first('First Name'),
    lastName: first('Last Name'),
    graduationYear: first('Graduating Year'),
    schoolEmail: first('School Email'),
    personalEmail: first('Personal Email'),
    phoneNumber: first('Phone Number'),
    parent1Name: first('Parent 1 Name'),
    parent1Email: first('Parent 1 Email'),
    parent1Phone: first('Parent 1 Phone Number'),
    parent2Name: first('Parent 2 Name'),
    parent2Email: first('Parent 2 Email'),
    parent2Phone: first('Parent 2 Phone Number'),
    priorExperience: first('Prior Experience With Speech & Debate?'),
    priorEvents: first('If yes to prior experience, what event?'),
    shirtSize: first('Shirt Size?')
  };
}

function postMembership_(payload) {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = properties.getProperty('MRHS_MEMBERSHIP_ENDPOINT');
  var secret = properties.getProperty('MRHS_WEBHOOK_SECRET');
  if (!endpoint) throw new Error('Add MRHS_MEMBERSHIP_ENDPOINT in Apps Script project settings.');
  if (!secret) throw new Error('Add MRHS_WEBHOOK_SECRET in Apps Script project settings.');
  var response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('Dashboard update failed: ' + response.getContentText());
}

function onFormSubmit(e) {
  var flat = {};
  Object.keys(e.namedValues).forEach(function (heading) {
    flat[heading] = String((e.namedValues[heading] || [''])[0] || '').trim();
  });
  flat.Timestamp = e.range.getCell(1, 1).getValue();
  postMembership_(membershipPayload_(e.source, e.range.getSheet(), e.range.getRow(), flat));
}

function syncAllMembershipRows() {
  var source = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = source.getSheetByName('Form Responses 1');
  if (!sheet) throw new Error('Could not find Form Responses 1.');
  var data = sheet.getDataRange().getValues();
  var headings = data[0];
  var failures = [];
  for (var rowIndex = 1; rowIndex < data.length; rowIndex++) {
    var values = {};
    headings.forEach(function (heading, columnIndex) { values[String(heading).trim()] = data[rowIndex][columnIndex]; });
    try {
      postMembership_(membershipPayload_(source, sheet, rowIndex + 1, values));
    } catch (error) {
      failures.push('row ' + (rowIndex + 1) + ': ' + error.message);
    }
  }
  if (failures.length) throw new Error('Synced with ' + failures.length + ' review item(s): ' + failures.slice(0, 10).join(' | '));
}

function installMembershipTrigger() {
  var installed = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'onFormSubmit' && trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
  });
  if (!installed) ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onFormSubmit().create();
}
