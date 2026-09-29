import type { Tournament } from '../data/tournaments';

type TripDetails = {
  destination: string;
  date: string;
  mileage: string;
  departure: string;
  returnTime: string;
  transportation: string;
  transportationCost: string;
  admissionCost: string;
};

const encoder = new TextEncoder();

const mileageByTournament: Record<string, number> = {
  'myers-park-tutorial': 24,
  'north-meck': 35,
  'fall-scrimmage': 0,
  'laird-lewis': 24,
  'blue-key': 440,
  corona: 24,
  carrollton: 260,
  riverside: 90,
  asheville: 130,
  'marvin-ridge': 0,
  'world-schools-open': 24,
  'south-carolina-tba': 90,
  cavalier: 155,
  emory: 255,
  ballantyne: 17,
  'harvard-national': 845,
  cuthbertson: 4,
  'ardrey-kell': 16,
  'reagan-richmond': 300,
  'tfl-state': 155,
  'reagan-vanderbilt': 415,
  'uk-toc': 455,
  'spring-scrimmage': 0,
  banquet: 4,
  ncfl: 1_160,
  'nsda-nationals': 2_150,
  'reagan-nationals': 2_440,
  yale: 700,
};

function ascii(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfText(value: string) {
  return ascii(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function shortDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${Number(month)}/${Number(day)}/${year.slice(2)}`;
}

function departureForMiles(miles: number) {
  if (miles <= 15) return '6:50 AM';
  if (miles <= 40) return '6:30 AM';
  if (miles <= 100) return '5:30 AM';
  if (miles <= 180) return '4:45 AM';
  return '4:00 AM';
}

function returnForTrip(tournament: Tournament, miles: number) {
  if (tournament.endDate && tournament.endDate !== tournament.startDate)
    return miles > 180 ? '11:00 PM' : '9:30 PM';
  if (miles <= 40) return '7:30 PM';
  if (miles <= 100) return '9:00 PM';
  return '11:00 PM';
}

export function permissionFormDetails(tournament: Tournament): TripDetails {
  const online =
    tournament.format === 'Online' ||
    /^(online|zoom)$/i.test(tournament.location.trim());
  const miles = mileageByTournament[tournament.id];
  const date =
    tournament.endDate && tournament.endDate !== tournament.startDate
      ? `${shortDate(tournament.startDate)} - ${shortDate(tournament.endDate)}`
      : shortDate(tournament.startDate);
  if (online) {
    return {
      destination: `${tournament.name} - Online`,
      date,
      mileage: 'N/A',
      departure: 'N/A',
      returnTime: 'N/A',
      transportation: 'N/A',
      transportationCost: '',
      admissionCost: '',
    };
  }
  const knownMiles =
    miles ??
    (/Charlotte/i.test(tournament.location)
      ? 24
      : /Waxhaw|Marvin Ridge/i.test(tournament.location)
        ? 4
        : 0);
  const unknownTravel =
    tournament.format === 'TBA' ||
    tournament.format === 'Hybrid' ||
    /TBA/i.test(tournament.location);
  return {
    destination: `${tournament.location} - ${tournament.name}`,
    date,
    mileage: unknownTravel ? 'TBD' : `${knownMiles} mi`,
    departure: unknownTravel ? 'TBD' : departureForMiles(knownMiles),
    returnTime: unknownTravel ? 'TBD' : returnForTrip(tournament, knownMiles),
    transportation: unknownTravel ? 'TBD' : 'Activity Bus',
    transportationCost: unknownTravel ? '' : '4.00',
    admissionCost: tournament.id === 'north-meck' ? '15.00' : '',
  };
}

function fieldText(
  value: string,
  x: number,
  y: number,
  width: number,
  preferredSize = 9.5,
) {
  const normalized = ascii(value);
  const fitted = Math.max(
    6.6,
    Math.min(preferredSize, width / Math.max(normalized.length * 0.51, 1)),
  );
  return `BT /F1 ${fitted.toFixed(2)} Tf 0 0 0 rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(normalized)}) Tj ET\n`;
}

function labelText(value: string, x: number, y: number, size = 9, horizontalScale = 92) {
  return `BT /F1 ${size.toFixed(2)} Tf ${horizontalScale} Tz 0 0 0 rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(value)}) Tj ET\n`;
}

function whiteout(
  x: number,
  y: number,
  width: number,
  height: number,
  lineY?: number,
) {
  let command = `1 1 1 rg ${x} ${y} ${width} ${height} re f\n`;
  if (lineY !== undefined)
    command += `0 0 0 RG 0.45 w ${x} ${lineY} m ${x + width} ${lineY} l S\n`;
  return command;
}

function overlayCommands(details: TripDetails) {
  let commands = 'q 612 0 0 792 0 0 cm /Im0 Do Q\n';

  // Rebuild the variable trip block so handwritten values never bleed into a new form.
  commands += whiteout(12, 637, 550, 102);
  commands += labelText('Destination/Purpose of Trip:', 14, 716, 9.1, 88);
  commands += whiteout(132, 708, 411, 14, 714);
  commands += fieldText(details.destination, 136, 716, 402, 10.5);
  commands += labelText('Date of Trip:', 14, 692, 9.1, 90);
  commands += whiteout(68, 688, 103, 20, 690);
  commands += fieldText(details.date, 72, 692, 95, 9.5);
  commands += labelText('Mileage:', 174, 692, 9.1, 90);
  commands += whiteout(210, 688, 51, 20, 690);
  commands += fieldText(details.mileage, 212, 692, 45, 9.2);
  commands += labelText('Departure Time:', 263, 692, 9.1, 88);
  commands += whiteout(329, 688, 59, 20, 690);
  commands += fieldText(details.departure, 331, 692, 55, 8.3);
  commands += labelText('Return Time:', 399, 692, 9.1, 88);
  commands += whiteout(455, 688, 80, 20, 690);
  commands += fieldText(details.returnTime, 457, 692, 76, 8.3);
  commands += labelText('Mode of Transportation:', 14, 673, 9.1, 86);
  commands += whiteout(118, 668, 82, 16, 670);
  commands += fieldText(details.transportation, 120, 673, 78, 8.2);
  commands += labelText('Transportation Cost to Student: $', 203, 673, 8.2, 60);
  commands += whiteout(286, 668, 66, 16, 670);
  commands += fieldText(details.transportationCost, 289, 673, 60, 8.8);
  commands += labelText('Admission Cost to Student: $', 355, 673, 8.2, 69);
  commands += whiteout(455, 668, 66, 16, 670);
  commands += fieldText(details.admissionCost, 458, 673, 60, 8.8);
  commands += labelText('Other Costs (Itemized): $', 14, 653, 8.7, 78);
  commands += whiteout(113, 650, 103, 14, 652);
  commands += labelText('Total Cost to Student: $', 218, 653, 8.7, 53);
  commands += whiteout(273, 650, 79, 14, 652);
  commands += labelText('Additional Information:', 14, 640, 8.8, 86);
  commands += whiteout(109, 637, 436, 9, 639);

  // Tear-off copy: destination and trip date only. Teacher, grade and signatures stay original.
  commands += whiteout(14, 493, 531, 31);
  commands += labelText('Destination:', 14, 501, 9.1, 90);
  commands += whiteout(67, 493, 478, 14, 499);
  commands += fieldText(details.destination, 71, 501, 469, 10.2);
  commands += whiteout(165, 486, 16, 9);
  commands += whiteout(69, 470, 85, 28, 476);
  commands += fieldText(details.date, 72, 478, 79, 9.2);
  return commands;
}

function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function buildPermissionFormPdf(
  templateJpeg: Uint8Array,
  tournament: Tournament,
) {
  const details = permissionFormDetails(tournament);
  const stream = encoder.encode(overlayCommands(details));
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteLength = 0;
  const push = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value;
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const object = (id: number, body: string | Uint8Array, suffix = '') => {
    offsets[id] = byteLength;
    push(`${id} 0 obj\n`);
    push(body);
    push(`${suffix}\nendobj\n`);
  };

  push(
    new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xff, 0xff,
      0xff, 0xff, 0x0a,
    ]),
  );
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [5 0 R] /Count 1 >>');
  object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  offsets[4] = byteLength;
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1275 /Height 1650 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${templateJpeg.length} >>\nstream\n`,
  );
  push(templateJpeg);
  push('\nendstream\nendobj\n');
  object(
    5,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> /XObject << /Im0 4 0 R >> >> /Contents 6 0 R >>',
  );
  object(6, `<< /Length ${stream.length} >>\nstream\n`, '\nendstream');
  // Insert the content stream before object 6's endstream marker.
  chunks.splice(chunks.length - 1, 0, stream);
  byteLength += stream.length;

  const xrefOffset = byteLength;
  push('xref\n0 7\n0000000000 65535 f \n');
  for (let id = 1; id <= 6; id += 1)
    push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return { bytes: concat(chunks), details };
}
