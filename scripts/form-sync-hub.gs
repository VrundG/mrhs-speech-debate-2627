const MRHS_DASHBOARD_BASE = 'https://mrhs-speech-debate-2627.vrundgurjar.workers.dev';
const MRHS_SHEETS = {
  payment: '1Bf5d0bSvPOAEfYB_ENPNiiIRbCXS_XAjhMCIurttCSg',
  membership: '1ncybdNpZ_11tDP02CaSYaQlAZlRYJ1dJuWcsWqrBjxI',
  setup: '1OegszqyzIeL0U_SeM2wEovTceEUqITSo4Zo2gq0l9OU'
};

function isoTimestamp(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(String(value || '').trim());
  return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function firstValue(values, headings) {
  for (let index = 0; index < headings.length; index += 1) {
    const value = values[headings[index]];
    if (value !== undefined) return String(Array.isArray(value) ? value[0] : value).trim();
  }
  return '';
}

function rowEvent_(source, sheet, rowNumber, headings, row) {
  const namedValues = {};
  headings.forEach(function (heading, columnIndex) {
    namedValues[String(heading).trim()] = [row[columnIndex]];
  });
  return { source: source, range: sheet.getRange(rowNumber, 1), namedValues: namedValues };
}

function sourceKey_(e) {
  return [e.source.getId(), e.range.getSheet().getSheetId(), e.range.getRow()].join(':');
}

function paymentPayload_(e) {
  const values = e.namedValues;
  return {
    sourceKey: sourceKey_(e),
    sourceRow: e.range.getRow(),
    timestamp: isoTimestamp(firstValue(values, ['Timestamp'])),
    studentName: firstValue(values, ['Student Name', 'Name']),
    paymentFor: firstValue(values, ['Payment For?', 'Payment For']),
    paymentType: firstValue(values, ['Payment Type']),
    tournamentName: firstValue(values, ['Tournament Name (put n/a for none)', 'Tournament Name', 'Tournament']),
    receiptUrl: firstValue(values, ['Upload Receipt (Google Drive Link)', 'Receipt URL', 'Receipt Link']),
    lateReason: firstValue(values, ['Why was your payment late? (Optional)', 'Late Reason'])
  };
}

function membershipPayload_(e) {
  const values = e.namedValues;
  return {
    sourceKey: sourceKey_(e),
    timestamp: isoTimestamp(firstValue(values, ['Timestamp'])),
    firstName: firstValue(values, ['First Name']),
    lastName: firstValue(values, ['Last Name']),
    graduationYear: firstValue(values, ['Graduating Year']),
    schoolEmail: firstValue(values, ['School Email']),
    personalEmail: firstValue(values, ['Personal Email']),
    phoneNumber: firstValue(values, ['Phone Number']),
    parent1Name: firstValue(values, ['Parent 1 Name']),
    parent1Email: firstValue(values, ['Parent 1 Email']),
    parent1Phone: firstValue(values, ['Parent 1 Phone Number']),
    parent2Name: firstValue(values, ['Parent 2 Name']),
    parent2Email: firstValue(values, ['Parent 2 Email']),
    parent2Phone: firstValue(values, ['Parent 2 Phone Number']),
    priorExperience: firstValue(values, ['Prior Experience With Speech & Debate?']),
    priorEvents: firstValue(values, ['If yes to prior experience, what event?']),
    shirtSize: firstValue(values, ['Shirt Size?'])
  };
}

function setupPayload_(e) {
  const values = e.namedValues;
  return {
    sourceKey: sourceKey_(e),
    timestamp: isoTimestamp(firstValue(values, ['Timestamp'])),
    firstName: firstValue(values, ['First Name']),
    lastName: firstValue(values, ['Last Name']),
    tabroomAccountCreated: firstValue(values, ['Tabroom Account Created']),
    tabroomEmail: firstValue(values, ['Tabroom Email:']),
    nsdaAccountCreated: firstValue(values, ['NSDA Account Created']),
    nsdaEmail: firstValue(values, ['NSDA Email:']),
    jbJwLinked: firstValue(values, ['JB/JW Linked']),
    priorDues2025: firstValue(values, ['Which Dues Paid for 2025-26?'])
  };
}

function post_(path, payload) {
  const secret = PropertiesService.getScriptProperties().getProperty('MRHS_WEBHOOK_SECRET');
  if (!secret) throw new Error('MRHS_WEBHOOK_SECRET is missing from project settings.');
  const response = UrlFetchApp.fetch(MRHS_DASHBOARD_BASE + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) throw new Error('Dashboard update failed: ' + response.getContentText());
}

function onFormSubmit(e) {
  const sourceId = e.source.getId();
  if (sourceId === MRHS_SHEETS.payment) return post_('/api/payment-submission', paymentPayload_(e));
  if (sourceId === MRHS_SHEETS.membership) return post_('/api/membership-submission', membershipPayload_(e));
  if (sourceId === MRHS_SHEETS.setup) return post_('/api/member-setup-submission', setupPayload_(e));
  throw new Error('This spreadsheet is not configured for the MRHS dashboard.');
}

function syncSheet_(sheetId, path, payloadBuilder) {
  const source = SpreadsheetApp.openById(sheetId);
  const sheet = source.getSheetByName('Form Responses 1');
  if (!sheet) throw new Error('Could not find Form Responses 1 in ' + source.getName());
  const data = sheet.getDataRange().getValues();
  const headings = data[0];
  const failures = [];
  for (let rowIndex = 1; rowIndex < data.length; rowIndex += 1) {
    try {
      post_(path, payloadBuilder(rowEvent_(source, sheet, rowIndex + 1, headings, data[rowIndex])));
    } catch (error) {
      failures.push('row ' + (rowIndex + 1) + ': ' + error.message);
    }
  }
  return failures;
}

function syncAllMembershipRows() {
  const failures = syncSheet_(MRHS_SHEETS.membership, '/api/membership-submission', membershipPayload_);
  if (failures.length) throw new Error('Membership sync has ' + failures.length + ' review item(s): ' + failures.slice(0, 10).join(' | '));
}

function syncAllSetupRows() {
  const failures = syncSheet_(MRHS_SHEETS.setup, '/api/member-setup-submission', setupPayload_);
  if (failures.length) throw new Error('Account setup sync has ' + failures.length + ' review item(s): ' + failures.slice(0, 10).join(' | '));
}

function syncAllPaymentRows() {
  const failures = syncSheet_(MRHS_SHEETS.payment, '/api/payment-submission', paymentPayload_);
  if (failures.length) throw new Error('Payment sync has ' + failures.length + ' review item(s): ' + failures.slice(0, 10).join(' | '));
}

function syncAllDashboardData() {
  const reviews = [];
  [syncAllMembershipRows, syncAllSetupRows, syncAllPaymentRows].forEach(function (syncFunction) {
    try {
      syncFunction();
    } catch (error) {
      reviews.push(error.message);
    }
  });
  if (reviews.length) throw new Error(reviews.join(' | '));
}

function installAllFormTriggers() {
  const existing = ScriptApp.getProjectTriggers();
  Object.keys(MRHS_SHEETS).forEach(function (key) {
    const sheetId = MRHS_SHEETS[key];
    const installed = existing.some(function (trigger) {
      return trigger.getHandlerFunction() === 'onFormSubmit' &&
        trigger.getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT &&
        trigger.getTriggerSourceId() === sheetId;
    });
    if (!installed) ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(SpreadsheetApp.openById(sheetId)).onFormSubmit().create();
  });
}
