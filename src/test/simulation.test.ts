import { describe, expect, it } from 'vitest';
import { accountDetails, assumptions, configSchema, editedTransaction, generate, parseMoney, summarize, verify, type Config } from '@/lib/simulation';
import { pdfFileName } from '@/lib/simulation-pdf';
import { NICHE_IDS } from '@/lib/business-niches';
const config: Config = { company: 'Empresa Exemplo', startMonth: 0, endMonth: 2, year: 2026, initial: 1000000, mode: 'balance', target: 1500000, income: 3000000, expenses: 2000000, volume: 5000000, assumedExpenses: 2000000, count: 24, profile: 'servicos', allowNegative: false };
function at<T>(items: T[], index: number): T { const item = items[index]; if (item === undefined) throw new Error('Item de teste ausente'); return item; }
describe('Regras financeiras', () => {
  it('fecha saldo até o centavo', () => { for (const m of summarize(config, generate(config))) { expect(m.final).toBe(1500000); expect(m.initial + m.income - m.expenses).toBe(m.final); } });
  it('mantém continuidade entre meses', () => { const months = summarize(config, generate(config)); expect(at(months, 1).initial).toBe(at(months, 0).final); expect(at(months, 2).initial).toBe(at(months, 1).final); });
  it('não permite saldo negativo em nenhuma movimentação', () => { for (let i = 0; i < 30; i++) expect(summarize(config, generate(config)).flatMap(m => m.rows).every(r => r.balance >= 0)).toBe(true); });
  it('gera exatamente a quantidade definida', () => { expect(generate(config)).toHaveLength(72); });
  it('usa datas válidas em fevereiro e ordem cronológica', () => { const rows = generate({ ...config, startMonth: 1, endMonth: 1 }); expect(rows.every(r => Number(r.date.slice(8)) <= 28)).toBe(true); expect(rows.map(r => r.date)).toEqual(rows.map(r => r.date).sort()); });
  it('distingue volume de saldo final', () => { const p = at(assumptions({ ...config, mode: 'volume', endMonth: 0 }), 0); expect(p.income).toBe(2750000); expect(p.expenses).toBe(2250000); expect(p.final).toBe(1500000); });
  it('rejeita volume incompatível em centavos', () => { expect(() => assumptions({ ...config, mode: 'volume', volume: 5000001 })).toThrow('centavos'); });
  it('respeita entradas e saídas explícitas', () => { const m = at(summarize({ ...config, mode: 'flows' }, generate({ ...config, mode: 'flows' })), 0); expect(m.income).toBe(3000000); expect(m.expenses).toBe(2000000); });
  it('avisa sobre meta alterada sem mudar outras linhas', () => { const rows = generate(config); const original = JSON.stringify(at(rows, 1)); const first = at(rows, 0); const modified = editedTransaction(config, first, { date: first.date, description: 'Cliente editado', category: 'Serviços', type: first.income ? 'income' : 'expense', value: (first.income || first.expense) + 100 }); const changed = [modified, ...rows.slice(1)]; expect(verify(config, changed).length).toBeGreaterThan(0); expect(JSON.stringify(at(changed, 1))).toBe(original); });
  it('rejeita data inexistente após edição', () => { const rows = generate(config); expect(() => editedTransaction(config, at(rows, 0), { date: '2026-02-30', description: 'Cliente', category: 'Serviços', type: 'income', value: 100 })).toThrow('data'); });
  it('converte moeda sem perder centavos', () => { expect(parseMoney('1.234,56')).toBe(123456); expect(() => parseMoney('1,999')).toThrow(); });
  it('identifica todos os lançamentos como  s', () => { expect(generate(config).every(r => r.description.endsWith('  '))).toBe(true); });
  it('exige escolha válida de nicho antes da geração', () => { expect(configSchema.safeParse({ ...config, profile: '' }).success).toBe(false); expect(() => generate({ ...config, profile: '' } as unknown as Config)).toThrow(); });
  it('TI de equipamentos gera compra e venda de computadores e peças e gastos com funcionário', () => {
    const rows = generate({ ...config, profile: 'informatica', endMonth: 0 }, () => 0.5);
    expect(rows.some(r => r.income > 0 && r.category === 'Computadores')).toBe(true);
    expect(rows.some(r => r.income > 0 && r.category === 'Peças')).toBe(true);
    expect(rows.some(r => r.expense > 0 && r.category === 'Computadores')).toBe(true);
    expect(rows.some(r => r.expense > 0 && r.category === 'Peças')).toBe(true);
    expect(rows.some(r => r.expense > 0 && r.category === 'Funcionários')).toBe(true);
    expect(rows.some(r => r.expense > 0 && r.category === 'Energia')).toBe(true);
    expect(rows.some(r => r.income > 0 && r.category === 'Licenciamento')).toBe(false);
  });
  it('aplica a atividade de cada nicho sem alterar metas, valores ou quantidade', () => {
    const base = generate(config, () => 0.5).map(({ income, expense, date }) => ({ income, expense, date }));
    for (const profile of NICHE_IDS) {
      const c = { ...config, profile }; const rows = generate(c, () => 0.5);
      expect(rows.map(({ income, expense, date }) => ({ income, expense, date }))).toEqual(base);
      expect(verify(c, rows)).toEqual([]);
    }
    expect(generate({ ...config, profile: 'alimentacao' }).filter(r => r.income > 0).every(r => ['Refeições', 'Delivery', 'Buffet'].includes(r.category))).toBe(true);
  });
  it('nomeia o PDF como Extrato_MES_ANO_EMPRESA sem acentos ou caracteres inválidos', () => {
    expect(pdfFileName({ ...config, startMonth: 6, company: 'Empresa Exemplo' })).toBe('Extrato_JULHO_2026_Empresa_Exemplo.pdf');
    expect(pdfFileName({ ...config, company: 'Ação & Cia Ltda.' })).toBe('Extrato_JANEIRO_2026_Acao_Cia_Ltda.pdf');
  });
});
it('gera agência e conta fictícias estáveis para a mesma empresa e ano', () => {
  const a = accountDetails({ company: 'Padaria Exemplo', year: 2026 });
  const b = accountDetails({ company: 'Padaria Exemplo', year: 2026 });
  expect(a).toEqual(b);
  expect(a.agency).toMatch(/^\d{4}$/);
  expect(a.account).toMatch(/^\d{5}-\d$/);
});
