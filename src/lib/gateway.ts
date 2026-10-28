import { z } from 'zod';
import { NICHE_IDS, NICHES, type NicheId } from './business-niches';

// Fixed, non-configurable notice: every gateway statement is a layout demonstration.
export const GATEWAY_NOTICE = 'DOCUMENTO DE DEMONSTRAÇÃO — NÃO É REAL';

const cents = z.number().int().safe().min(0).max(100_000_000_000);
export const gatewaySchema = z.object({
  company: z.string().trim().min(2, 'Informe o nome da empresa.').max(80),
  month: z.number().int().min(0).max(11),
  year: z.number().int().min(1900).max(2100),
  initial: cents,
  sales: cents.refine(v => v > 0, 'Informe o total de vendas.'),
  withdrawals: cents,
  salesCount: z.number().int().min(1).max(100_000),
  withdrawalCount: z.number().int().min(0).max(60),
  profile: z.enum([...NICHE_IDS], { errorMap: () => ({ message: 'Escolha o nicho da empresa.' }) }),
}).superRefine((c, ctx) => {
  if (c.withdrawals > c.initial + c.sales) ctx.addIssue({ code: 'custom', path: ['withdrawals'], message: 'Os saques não podem superar o saldo disponível.' });
  if (c.sales < c.salesCount) ctx.addIssue({ code: 'custom', path: ['sales'], message: 'Cada venda precisa de pelo menos R$ 0,01.' });
  if (c.withdrawalCount === 0 && c.withdrawals > 0) ctx.addIssue({ code: 'custom', path: ['withdrawalCount'], message: 'Informe a quantidade de saques.' });
  if (c.withdrawalCount > 0 && c.withdrawals < c.withdrawalCount) ctx.addIssue({ code: 'custom', path: ['withdrawals'], message: 'Cada saque precisa de pelo menos R$ 0,01.' });
});
export type GatewayConfig = z.infer<typeof gatewaySchema>;
export type GatewayRow = { id: string; date: string; time: string; kind: 'sale' | 'pix'; title: string; detail: string; amount: number; balance: number };

const PRODUCTS: Partial<Record<NicheId, string[]>> = {
  consultoria: ['Consultoria tributária', 'Planejamento financeiro', 'Revisão fiscal', 'Recuperação de créditos tributários', 'Mentoria financeira', 'Diagnóstico tributário', 'Planejamento sucessório', 'Assessoria contábil mensal'],
};
const METHODS = ['Pix', 'Cartão de crédito', 'Cartão de crédito', 'Boleto'];
export const products = (profile: NicheId) => PRODUCTS[profile] ?? NICHES[profile].income.map(a => a.operation);

function split(total: number, count: number, random: () => number) {
  if (count === 0) return [];
  const w = Array.from({ length: count }, () => 0.3 + random()), sum = w.reduce((a, b) => a + b, 0);
  const v = w.map(x => 1 + Math.floor(((total - count) * x) / sum));
  let rest = total - v.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0; i++, rest--) v[i % count] = (v[i % count] ?? 0) + 1;
  return v;
}

export function generateGateway(input: GatewayConfig, random: () => number = Math.random): GatewayRow[] {
  const c = gatewaySchema.parse(input);
  const list = products(c.profile);
  const sales = split(c.sales, c.salesCount, random).map((amount, i) => ({ kind: 'sale' as const, amount, title: list[Math.floor(random() * list.length)] ?? 'Venda', detail: `${METHODS[Math.floor(random() * METHODS.length)]} · Pedido #${String(10000 + Math.floor(random() * 89999))}` }));
  const pix = split(c.withdrawals, c.withdrawalCount, random).map(amount => ({ kind: 'pix' as const, amount, title: 'Saque via Pix', detail: `Conta de titularidade · ${c.company}` }));
  const days = new Date(c.year, c.month + 1, 0).getDate();
  const items = [...sales, ...pix].map(r => ({ r, t: Math.floor(random() * days * 1440) })).sort((a, b) => a.t - b.t);
  // Withdrawals that would overdraw are moved later until the balance covers them.
  const ordered: typeof items = []; const waiting: typeof items = []; let bal = c.initial;
  for (const it of items) {
    if (it.r.kind === 'pix' && bal < it.r.amount) { waiting.push(it); continue; }
    ordered.push(it); bal += it.r.kind === 'sale' ? it.r.amount : -it.r.amount;
    for (let w = waiting[0]; w && bal >= w.r.amount; w = waiting[0]) { waiting.shift(); ordered.push({ ...w, t: it.t + 1 }); bal -= w.r.amount; }
  }
  for (const w of waiting) { ordered.push({ ...w, t: days * 1440 - 1 }); bal -= w.r.amount; }
  let balance = c.initial;
  return ordered.map(({ r, t }, i) => {
    balance += r.kind === 'sale' ? r.amount : -r.amount;
    const day = Math.min(days, 1 + Math.floor(t / 1440)), min = t % 1440;
    return { id: `g-${i}`, ...r, balance, date: `${c.year}-${String(c.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, time: `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}` };
  });
}

export function gatewayTotals(c: GatewayConfig, rows: GatewayRow[]) {
  const sales = rows.filter(r => r.kind === 'sale').reduce((s, r) => s + r.amount, 0);
  const withdrawals = rows.filter(r => r.kind === 'pix').reduce((s, r) => s + r.amount, 0);
  return { sales, withdrawals, final: c.initial + sales - withdrawals, count: rows.filter(r => r.kind === 'sale').length };
}
