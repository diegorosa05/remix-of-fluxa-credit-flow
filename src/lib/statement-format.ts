import { dateLabel, money } from './simulation';

// Presentation only: all amounts and balances come from the cents-integer simulation.
export const statementMoney = (cents: number) => money(cents).replace(/^R\$\s*/, '');
export const statementDate = (date: string) => dateLabel(date).slice(0, 5);

// Bank-style wording is presentation only; original fictional transaction data remains intact.
export function statementDescription(description: string): string {
  const operation = description.replace(/   $/i, '').split(' — ')[0] ?? description;
  const normalized = operation.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const compact = normalized.replace('PECAS DE COMPUTADOR', 'PECAS PC').replace('MANUTENCAO DE COMPUTADORES', 'MANUTENCAO PC').replace('COMPUTADORES', 'PC').replace(/ DE /g, ' ').replace('SALARIO FUNCIONARIO', 'FOLHA FUNCIONARIO').replace('SERVICOS CONTABEIS', 'CONTABILIDADE').replace('INTERNET EMPRESARIAL', 'INTERNET EMPRESA').replace('ENERGIA ELETRICA', 'ENERGIA').replace('IMPOSTOS DA EMPRESA', 'IMPOSTOS EMPRESA');
  if (compact.startsWith('COMPRA NO CARTAO ')) return `COMPRA CARTAO ${compact.slice(17)}`;
  if (compact.startsWith('COMPRA PIX ')) return `PIX ENVIADO ${compact.slice(11)}`;
  if (compact.startsWith('PAGAMENTO BOLETO ')) return `PAG BOLETO ${compact.slice(17)}`;
  if (compact.startsWith('PAGAMENTO SALARIO')) return 'SISPAG SALARIOS';
  if (compact.startsWith('TARIFA')) return compact;
  const prefix = /^(ENERGIA|INTERNET|IMPOSTOS|ALUGUEL|VALE)/.test(compact) ? 'DEB AUT' : /^(SALARIO|FOLHA)/.test(compact) ? 'TED' : 'PIX';
  return `${prefix} ${compact}`;
}

// Orig. presents a stable 4-digit numeric channel code per transaction (bank-style presentation only).
export function statementOrigin(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(hash, 2654435761) + id.charCodeAt(i)) >>> 0;
  hash ^= hash >>> 15; hash = Math.imul(hash, 2246822519); hash ^= hash >>> 13; hash = Math.imul(hash, 3266489917); hash ^= hash >>> 16;
  return String(1 + ((hash >>> 0) % 9000)).padStart(4, '0');
}