const DASHBOARD_ENDPOINT = 'https://mrhs-speech-debate-2627.lebronbron99.chatgpt.site/api/payment-submission';

function onFormSubmit(e) {
  const secret = PropertiesService.getScriptProperties().getProperty('MRHS_WEBHOOK_SECRET');
  const bypassToken = PropertiesService.getScriptProperties().getProperty('MRHS_SITES_BYPASS_TOKEN');
  if (!secret) throw new Error('Add MRHS_WEBHOOK_SECRET in Apps Script project settings.');
  if (!bypassToken) throw new Error('Add MRHS_SITES_BYPASS_TOKEN in Apps Script project settings.');

  const values = e.namedValues;
  const sheet = e.range.getSheet();
  const first = (heading) => String((values[heading] || [''])[0] || '').trim();
  const submittedAt = e.range.getCell(1, 1).getValue();
  const payload = {
    sourceKey: [e.source.getId(), sheet.getSheetId(), e.range.getRow(), first('Timestamp')].join(':'),
    sourceRow: e.range.getRow(),
    timestamp: submittedAt instanceof Date ? submittedAt.toISOString() : first('Timestamp'),
    studentName: first('Student Name'),
    paymentFor: first('Payment For?'),
    paymentType: first('Payment Type'),
    receiptUrl: first('Upload Receipt (Google Drive Link)'),
    lateReason: first('Why was your payment late? (Optional)'),
    tournamentName: first('Tournament Name (put n/a for none)'),
  };

  const response = UrlFetchApp.fetch(DASHBOARD_ENDPOINT, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + secret,
      'OAI-Sites-Authorization': 'Bearer ' + bypassToken,
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('Dashboard update failed: ' + response.getContentText());
  }
}
