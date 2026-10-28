import { describe, expect, it } from 'vitest';
import { generateGateway, gatewayTotals, products, type GatewayConfig } from '@/lib/gateway';
const g: GatewayConfig = { company: 'Minha Empresa', month: 8, year: 2026, initial: 0, sales: 4800000, withdrawals: 4000000, salesCount: 40, withdrawalCount: 6, profile: 'consultoria' };
describe('Extrato de gateway', () => {
  it('tem apenas vendas e saques Pix', () => { expect(generateGateway(g).every(r => r.kind === 'sale' || r.title === 'Saque via Pix')).toBe(true); });
  it('fecha totais em centavos', () => { const t = gatewayTotals(g, generateGateway(g)); expect(t.sales).toBe(4800000); expect(t.withdrawals).toBe(4000000); expect(t.final).toBe(800000); });
  it('nunca fica com saldo negativo', () => { for (let i = 0; i < 30; i++) expect(generateGateway(g).every(r => r.balance >= 0)).toBe(true); });
  it('vendas usam produtos de consultoria financeira e tributária', () => { const list = products('consultoria'); expect(generateGateway(g).filter(r => r.kind === 'sale').every(r => list.includes(r.title))).toBe(true); });
});
