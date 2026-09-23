function isoTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(String(value || '').trim());
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function postPayment_(payload) {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = properties.getProperty('MRHS_PAYMENT_ENDPOINT');
  const secret = properties.getProperty('MRHS_WEBHOOK_SECRET');
  if (!endpoint) throw new Error('Add MRHS_PAYMENT_ENDPOINT in Apps Script project settings.');
  if (!secret) throw new Error('Add MRHS_WEBHOOK_SECRET in Apps Script project settings.');
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Dashboard update failed: ' + response.getContentText());
  }
}

function paymentPayload_(source, sheet, rowNumber, values) {
  const first = (heading) => String(values[heading] || '').trim();
  return {
    sourceKey: [source.getId(), sheet.getSheetId(), rowNumber].join(':'),
    sourceRow: rowNumber,
    timestamp: isoTimestamp(values.Timestamp),
    studentName: first('Student Name'),
    paymentFor: first('Payment For?'),
    paymentType: first('Payment Type'),
    receiptUrl: first('Upload Receipt (Google Drive Link)'),
    lateReason: first('Why was your payment late? (Optional)'),
    tournamentName: first('Tournament Name (put n/a for none)'),
  };
}

function onFormSubmit(e) {
  const values = {};
  Object.keys(e.namedValues).forEach((heading) => {
    values[heading] = String((e.namedValues[heading] || [''])[0] || '').trim();
  });
  values.Timestamp = e.range.getCell(1, 1).getValue();
  postPayment_(paymentPayload_(e.source, e.range.getSheet(), e.range.getRow(), values));
}

function syncAllPaymentRows() {
  const source = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = source.getSheetByName('Form Responses 1');
  if (!sheet) throw new Error('Could not find Form Responses 1.');
  const data = sheet.getDataRange().getValues();
  const headings = data[0];
  const failures = [];
  for (let rowIndex = 1; rowIndex < data.length; rowIndex += 1) {
    const values = {};
    headings.forEach((heading, columnIndex) => { values[String(heading).trim()] = data[rowIndex][columnIndex]; });
    try {
      postPayment_(paymentPayload_(source, sheet, rowIndex + 1, values));
    } catch (error) {
      failures.push('row ' + (rowIndex + 1) + ': ' + error.message);
    }
  }
  if (failures.length) throw new Error('Synced with ' + failures.length + ' review item(s): ' + failures.slice(0, 10).join(' | '));
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
