export type RosterPdfRow = {
  name: string;
  event: string;
  partner: string;
  coverage: string;
};

export type RosterPdfInput = {
  tournamentName: string;
  dateLabel: string;
  location: string;
  generatedAt: string;
  rows: RosterPdfRow[];
};

const encoder = new TextEncoder();

function ascii(value: string) {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
}

function pdfText(value: string) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(value: string, width: number, size: number) {
  const text = ascii(value) || '-';
  const maxChars = Math.max(8, Math.floor(width / (size * 0.53)));
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) current = next;
    else {
      if (current) lines.push(current);
      current = word.length > maxChars ? `${word.slice(0, maxChars - 1)}...` : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function text(value: string, x: number, y: number, size: number, font = 'F1', color = '0.12 0.11 0.09') {
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(value)}) Tj ET\n`;
}

function rect(x: number, y: number, width: number, height: number, color: string) {
  return `${color} rg ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f\n`;
}

function line(x1: number, y1: number, x2: number, y2: number, color = '0.82 0.78 0.71') {
  return `${color} RG 0.5 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

function buildPages(input: RosterPdfInput) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  const columns = [28, 145, 108, 130, 105];
  const headers = ['#', 'Student', 'Event', 'PF partner', 'Roster status'];
  const pages: string[] = [];
  let commands = '';
  let y = 0;
  let rowNumber = 0;

  const startPage = (pageNumber: number) => {
    commands = rect(0, 0, pageWidth, pageHeight, '0.97 0.94 0.89');
    commands += rect(0, pageHeight - 112, pageWidth, 112, '0.10 0.09 0.08');
    commands += rect(margin, pageHeight - 116, 72, 4, '0.95 0.43 0.10');
    commands += text('MRHS SPEECH & DEBATE', margin, pageHeight - 38, 8.5, 'F2', '0.95 0.43 0.10');
    commands += text(input.tournamentName, margin, pageHeight - 67, 20, 'F2', '1 1 1');
    commands += text(`${input.dateLabel} | ${input.location}`, margin, pageHeight - 89, 9, 'F1', '0.76 0.73 0.68');
    commands += text(`FINALIZED ROSTER  |  ${input.rows.length} STUDENTS`, margin, pageHeight - 137, 8, 'F2', '0.38 0.34 0.29');
    commands += text(`Page ${pageNumber}`, pageWidth - margin - 36, pageHeight - 137, 8, 'F1', '0.38 0.34 0.29');
    y = pageHeight - 162;
    commands += rect(margin, y - 25, contentWidth, 25, '0.15 0.13 0.11');
    let x = margin;
    headers.forEach((header, index) => {
      commands += text(header, x + 6, y - 16, 7.2, 'F2', '1 1 1');
      x += columns[index];
    });
    y -= 25;
  };

  const finishPage = () => {
    commands += line(margin, 42, pageWidth - margin, 42);
    commands += text(`Generated ${input.generatedAt}`, margin, 27, 7, 'F1', '0.44 0.40 0.35');
    commands += text('Management copy - student contact details are not included.', pageWidth - margin - 224, 27, 7, 'F1', '0.44 0.40 0.35');
    pages.push(commands);
  };

  startPage(1);
  for (const row of input.rows) {
    const values = [String(rowNumber + 1), row.name, row.event, row.partner || '-', row.coverage];
    const wrapped = values.map((value, index) => wrap(value, columns[index] - 12, index === 1 ? 8.6 : 7.8));
    const rowHeight = Math.max(34, Math.max(...wrapped.map(lines => lines.length)) * 10 + 14);
    if (y - rowHeight < 55) {
      finishPage();
      startPage(pages.length + 1);
    }
    commands += rect(margin, y - rowHeight, contentWidth, rowHeight, rowNumber % 2 ? '0.94 0.90 0.84' : '1 0.98 0.94');
    let x = margin;
    wrapped.forEach((lines, columnIndex) => {
      lines.forEach((value, lineIndex) => {
        commands += text(value, x + 6, y - 14 - lineIndex * 10, columnIndex === 1 ? 8.6 : 7.8, columnIndex === 1 ? 'F2' : 'F1');
      });
      x += columns[columnIndex];
    });
    commands += line(margin, y - rowHeight, margin + contentWidth, y - rowHeight);
    y -= rowHeight;
    rowNumber += 1;
  }
  if (!input.rows.length) {
    commands += text('No students are currently included in the finalized roster.', margin + 12, y - 32, 10, 'F1', '0.38 0.34 0.29');
  }
  finishPage();
  return pages;
}

export function buildRosterPdf(input: RosterPdfInput) {
  const pageStreams = buildPages(input);
  const objects: string[] = [];
  const pageIds = pageStreams.map((_, index) => 5 + index * 2);
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  pageStreams.forEach((stream, index) => {
    const pageId = 5 + index * 2;
    const contentId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`;
  });

  let output = '%PDF-1.4\n%MRHS\n';
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = encoder.encode(output).length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = encoder.encode(output).length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) output += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return encoder.encode(output);
}
