import { MONTHS, dateLabel, money } from './simulation';
import { NICHES } from './business-niches';
import { GATEWAY_NOTICE, gatewayTotals, type GatewayConfig, type GatewayRow } from './gateway';

// PDF palette mirrors the gateway screen tokens (PDF cannot read CSS variables).
const c = { ink: [24, 24, 32], muted: [120, 120, 135], brand: [88, 70, 230], soft: [244, 243, 252], in: [22, 150, 95], out: [210, 60, 70], mark: [215, 40, 40] } as const;

export const gatewayFileName = (g: GatewayConfig) => `Gateway_DEMO_${MONTHS[g.month]?.toUpperCase()}_${g.year}_${g.company.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}.pdf`;

export async function makeGatewayPDF(g: GatewayConfig, rows: GatewayRow[], brandOpt: { color?: string; logo?: string } = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const t = gatewayTotals(g, rows);
  doc.setProperties({ title: `Demonstração — ${g.company}`, subject: GATEWAY_NOTICE });
  const hex = /^#[0-9a-f]{6}$/i.test(brandOpt.color ?? '') ? brandOpt.color as string : '#5846e6';
  const brand = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  doc.setFillColor(...brand); doc.roundedRect(10, 10, 190, 34, 5, 5, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(g.company, 16, brandOpt.logo ? 30 : 22);
  if (brandOpt.logo) { try { const p = doc.getImageProperties(brandOpt.logo); const h = 8, w = Math.min(40, (p.width / p.height) * h); doc.setFillColor(255, 255, 255); doc.roundedRect(15, 12.5, w + 2, h + 2, 1.5, 1.5, 'F'); doc.addImage(brandOpt.logo, 16, 13.5, w, h); } catch { /* logo inválida é ignorada */ } }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`Extrato de recebimentos · ${MONTHS[g.month]} de ${g.year} · ${NICHES[g.profile].label}`, 16, brandOpt.logo ? 37 : 29);
  doc.setFontSize(8); doc.text('Saldo disponível', 194, 20, { align: 'right' }); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(money(t.final), 194, 28, { align: 'right' });
  const cards: [string, string, readonly number[]][] = [['Saldo inicial', money(g.initial), c.ink], [`Vendas (${t.count})`, `+ ${money(t.sales)}`, c.in], ['Saques Pix', `- ${money(t.withdrawals)}`, c.out]];
  cards.forEach(([l, v, col], i) => { const x = 10 + i * 64; doc.setFillColor(...c.soft); doc.roundedRect(x, 49, 62, 17, 3, 3, 'F'); doc.setTextColor(...c.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(l, x + 5, 56); doc.setTextColor(col[0] ?? 0, col[1] ?? 0, col[2] ?? 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(v, x + 5, 62.5); });
  autoTable(doc, {
    startY: 72, margin: { left: 10, right: 10, bottom: 18, top: 16 },
    head: [['Data', 'Descrição', 'Detalhe', 'Valor', 'Saldo']],
    body: rows.map(r => [`${dateLabel(r.date)} ${r.time}`, r.title, r.detail, `${r.kind === 'sale' ? '+' : '-'} ${money(r.amount)}`, money(r.balance)]),
    theme: 'plain', styles: { fontSize: 8, cellPadding: 2.2, textColor: [...c.ink] },
    headStyles: { fillColor: [...c.soft], textColor: [...c.muted], fontStyle: 'bold' }, alternateRowStyles: { fillColor: [250, 250, 253] },
    columnStyles: { 0: { cellWidth: 27 }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' } },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 3) d.cell.styles.textColor = d.cell.text[0]?.startsWith('+') ? [...c.in] : [...c.out]; },
  });
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setTextColor(...c.mark); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(GATEWAY_NOTICE, 10, 288);
    doc.setTextColor(...c.muted); doc.setFont('helvetica', 'normal'); doc.text(`Página ${p} de ${n}`, 200, 288, { align: 'right' });
  }
  return doc;
}
