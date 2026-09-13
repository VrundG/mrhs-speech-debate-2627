function isoTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(String(value || '').trim());
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function onFormSubmit(e) {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = properties.getProperty('MRHS_PAYMENT_ENDPOINT');
  const secret = properties.getProperty('MRHS_WEBHOOK_SECRET');
  const bypassToken = properties.getProperty('MRHS_SITES_BYPASS_TOKEN');
  if (!endpoint) throw new Error('Add MRHS_PAYMENT_ENDPOINT in Apps Script project settings.');
  if (!secret) throw new Error('Add MRHS_WEBHOOK_SECRET in Apps Script project settings.');
  const headers = { Authorization: 'Bearer ' + secret };
  if (bypassToken) headers['OAI-Sites-Authorization'] = 'Bearer ' + bypassToken;

  const values = e.namedValues;
  const sheet = e.range.getSheet();
  const first = (heading) => String((values[heading] || [''])[0] || '').trim();
  const submittedAt = e.range.getCell(1, 1).getValue();
  const payload = {
    sourceKey: [e.source.getId(), sheet.getSheetId(), e.range.getRow()].join(':'),
    sourceRow: e.range.getRow(),
    timestamp: isoTimestamp(submittedAt),
    studentName: first('Student Name'),
    paymentFor: first('Payment For?'),
    paymentType: first('Payment Type'),
    receiptUrl: first('Upload Receipt (Google Drive Link)'),
    lateReason: first('Why was your payment late? (Optional)'),
    tournamentName: first('Tournament Name (put n/a for none)'),
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Dashboard update failed: ' + response.getContentText());
  }
}

function installPaymentTrigger() {
  const alreadyInstalled = ScriptApp.getProjectTriggers().some(function (trigger) {
    return trigger.getHandlerFunction() === 'onFormSubmit' &&
      trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT;
  });
  if (!alreadyInstalled) {
    ScriptApp.newTrigger('onFormSubmit')
      .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
      .onFormSubmit()
      .create();
  }
}
