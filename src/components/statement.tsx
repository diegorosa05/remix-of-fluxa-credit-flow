import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import top from '@/assets/statement-top.png.asset.json';
import bottom from '@/assets/statement-bottom.png.asset.json';
import { MONTHS, NOTICE, accountDetails, type Config, type MonthSummary, type Transaction } from '@/lib/simulation';
import { statementDate, statementDescription, statementMoney, statementOrigin } from '@/lib/statement-format';

export function Statement({ config, month, editing, onEdit, topUrl = top.url }: { config: Config; month: MonthSummary; editing: boolean; onEdit: (row: Transaction) => void; topUrl?: string }) {
  const account = accountDetails(config);
  return <div className="statement-viewport"><div className="statement statement-document">
    <div className="statement-banner"><img className="statement-pattern" src={topUrl} alt="" /><span>{NOTICE}</span></div>
    <div className="statement-details"><div><span>Agência:</span><strong>{account.agency}</strong></div><div><span>Conta:</span><strong>{account.account}</strong></div><div className="statement-name"><span>Nome:</span><strong>{config.company}</strong></div><div className="statement-period"><strong>{MONTHS[month.month]?.toUpperCase()}/{config.year}</strong><small></small></div></div>
    <div className="result-scroll statement-scroll"><table className="ledger statement-ledger"><colgroup><col className="statement-date-col" /><col /><col className="statement-origin-col" /><col className="statement-amount-col" /><col className="statement-balance-col" />{editing && <col className="statement-edit-col" />}</colgroup><thead><tr><th>Data</th><th>Lançamento</th><th>Orig.</th><th className="numeric">Valor (R$)</th><th className="numeric">Saldo (R$)</th>{editing && <th className="no-print">Editar</th>}</tr></thead><tbody><tr className="statement-opening"><td>01/{String(month.month + 1).padStart(2, '0')}</td><td>SALDO INICIAL ·</td><td>—</td><td /><td className="numeric">{statementMoney(month.initial)}</td>{editing && <td />}</tr>{month.rows.map(row => <tr key={row.id}><td>{statementDate(row.date)}</td><td title={row.description}>{statementDescription(row.description)}</td><td>{statementOrigin(row.id)}</td><td className={`numeric ${row.expense ? 'statement-debit' : ''}`}>{statementMoney(row.income || row.expense)}{row.expense ? '-' : ''}</td><td className={`numeric ${row.balance < 0 ? 'statement-debit' : ''}`}>{statementMoney(row.balance)}</td>{editing && <td className="no-print"><Button variant="ghost" size="icon" aria-label={`Editar ${row.description}`} onClick={() => onEdit(row)}><Pencil /></Button></td>}</tr>)}</tbody></table></div>
    <div className="statement-disclaimer">{NOTICE}</div><img className="statement-bottom" src={bottom.url} alt="" />
  </div></div>;
}