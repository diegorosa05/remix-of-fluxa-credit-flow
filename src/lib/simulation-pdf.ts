import { MONTHS, NOTICE, accountDetails, summarize, type Config, type Transaction } from './simulation';
import { statementDate, statementDescription, statementMoney, statementOrigin } from './statement-format';
import top from '@/assets/statement-top.png.asset.json';
import bottom from '@/assets/statement-bottom.png.asset.json';

// Document palette is centralized here because PDF rendering does not consume CSS tokens.
const palette = { ink: [0, 0, 0], muted: [105, 105, 105], paper: [255, 255, 255], line: [216, 216, 216], stripe: [240, 240, 240], head: [240, 240, 240], debit: [255, 0, 0] } as const;

async function imageData(url: string): Promise<string> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Imagem do extrato indisponível.');
  context.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
}
// Nome do arquivo no formato Extrato_MES_ANO_EMPRESA, sem acentos ou caracteres inválidos.
export function pdfFileName(config: Config, month: number = config.startMonth): string {
  const company = config.company
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `Extrato_${MONTHS[month]?.toUpperCase()}_${config.year}_${company}.pdf`;
}

// Each selected month becomes its own PDF; a month may span several pages.
export async function makePDF(config: Config, rows: Transaction[], topUrl: string = top.url, onlyMonth?: number) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const months = summarize(config, rows).filter(m => onlyMonth === undefined || m.month === onlyMonth);
  const account = accountDetails(config);
  const [topImage, bottomImage] = await Promise.all([imageData(topUrl), imageData(bottom.url)]);
  doc.setProperties({ title: `  financeira — ${config.company}`, subject: NOTICE, author: 'Fluxa Crédito' });
  const header = (month: number) => {
    doc.addImage(topImage, 'PNG', 7.2, 8.4, 195.6, 12.1);
    doc.setTextColor(...palette.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
    doc.text(NOTICE, 192.7, 15.3, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.4);
    doc.text('Agência:', 9.7, 28.3); doc.text('Conta:', 38.1, 28.3); doc.text('Nome:', 75.2, 28.3);
    doc.text(account.agency, 9.7, 33.2); doc.text(account.account, 38.1, 33.2);
    const name = doc.splitTextToSize(config.company, 75);
    doc.text(name[0] ?? '', 75.2, 33.2);
    doc.text(`${MONTHS[month]?.toUpperCase()}/${config.year}`, 152.1, 33.2);
    doc.setFontSize(6); doc.text(' ', 200.3, 33.2, { align: 'right' });
  };
  for (const [index, month] of months.entries()) {
    if (index > 0) doc.addPage();
    autoTable(doc, {
      startY: 34.7, margin: { top: 34.7, left: 8.4, right: 7.7, bottom: 19 },
      head: [['Data', 'Lançamento', 'Orig.', 'Valor (R$)', 'Saldo (R$)']],
      body: [[`01/${String(month.month + 1).padStart(2, '0')}`, 'SALDO INICIAL ', '—', '', statementMoney(month.initial)], ...month.rows.map(r => [statementDate(r.date), statementDescription(r.description), statementOrigin(r.id), `${statementMoney(r.income || r.expense)}${r.expense ? '-' : ''}`, statementMoney(r.balance)])],
      theme: 'plain', showHead: 'everyPage', rowPageBreak: 'avoid',
      styles: { font: 'helvetica', fontStyle: 'normal', fontSize: 8.4, minCellHeight: 3.75, cellPadding: { top: 0.2, bottom: 0.2, left: 3, right: 3.7 }, overflow: 'ellipsize', textColor: [...palette.ink] },
      alternateRowStyles: { fillColor: [...palette.stripe] },
      headStyles: { minCellHeight: 7.4, valign: 'middle', fillColor: [...palette.head], textColor: [...palette.ink], fontStyle: 'normal', lineColor: [...palette.line], lineWidth: { top: 0.2, bottom: 0.2 } },
      columnStyles: { 0: { cellWidth: 30.9, cellPadding: { top: 0.2, bottom: 0.2, left: 7.9, right: 3.7 } }, 1: { cellWidth: 61.5 }, 2: { cellWidth: 19 }, 3: { cellWidth: 38.8, halign: 'right' }, 4: { cellWidth: 43.7, halign: 'right' } },
      willDrawPage: () => header(month.month),
      didParseCell: data => {
        if (data.column.index >= 3) data.cell.styles.halign = 'right';
        if (data.section === 'body' && data.row.index === 0) { data.cell.styles.minCellHeight = 5.9; data.cell.styles.cellPadding = { top: 2.1, bottom: 0.2, left: data.column.index === 0 ? 7.9 : 3, right: 3.7 }; }
        if (data.section === 'body' && ((data.column.index === 3 && data.cell.text[0]?.endsWith('-')) || (data.column.index === 4 && data.cell.text[0]?.startsWith('-')))) data.cell.styles.textColor = [...palette.debit];
      },
    });
  }
  const count = doc.getNumberOfPages();
  for (let p = 1; p <= count; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...palette.ink); doc.text(NOTICE, 10, 286);
    doc.setFont('helvetica', 'normal'); doc.text(`Página ${p} de ${count}`, 200, 286, { align: 'right' });
    doc.addImage(bottomImage, 'PNG', 7.2, 290, 195.6, 2.5);
  }
  return doc;
}