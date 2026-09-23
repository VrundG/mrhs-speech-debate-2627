function isoTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  var parsed = new Date(String(value || '').trim());
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function setupPayload_(source, sheet, rowNumber, values) {
  var first = function (heading) { return String(values[heading] || '').trim(); };
  return {
    sourceKey: [source.getId(), sheet.getSheetId(), rowNumber].join(':'),
    timestamp: isoTimestamp(values.Timestamp),
    firstName: first('First Name'),
    lastName: first('Last Name'),
    tabroomAccountCreated: first('Tabroom Account Created'),
    tabroomEmail: first('Tabroom Email:'),
    nsdaAccountCreated: first('NSDA Account Created'),
    nsdaEmail: first('NSDA Email:'),
    jbJwLinked: first('JB/JW Linked'),
    priorDues2025: first('Which Dues Paid for 2025-26?')
  };
}

function postSetup_(payload) {
  var properties = PropertiesService.getScriptProperties();
  var endpoint = properties.getProperty('MRHS_SETUP_ENDPOINT');
  var secret = properties.getProperty('MRHS_WEBHOOK_SECRET');
  if (!endpoint) throw new Error('Add MRHS_SETUP_ENDPOINT in Apps Script project settings.');
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
  postSetup_(setupPayload_(e.source, e.range.getSheet(), e.range.getRow(), flat));
}

function syncAllSetupRows() {
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
      postSetup_(setupPayload_(source, sheet, rowIndex + 1, values));
    } catch (error) {
      failures.push('row ' + (rowIndex + 1) + ': ' + error.message);
    }
  }
  if (failures.length) throw new Error('Synced with ' + failures.length + ' review item(s): ' + failures.slice(0, 10).join(' | '));
}

function installSetupTrigger() {
  var installed = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'onFormSubmit' && trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
  });
  if (!installed) ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onFormSubmit().create();
}
