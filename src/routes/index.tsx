import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { BANNERS, BANNER_KEY, bannerUrl } from '@/lib/statement-banners';
import { ArrowRight, Building2, Check, CheckCheck, ChevronRight, CircleHelp, Download, FileText, Info, Pencil, RefreshCw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import logo from '@/assets/fluxa-logo.asset.json';
import { assumptions, configSchema, dateLabel, editedTransaction, generate, money, MONTHS, NOTICE, parseMoney, summarize, verify, type Config, type Transaction } from '@/lib/simulation';
import { makePDF, pdfFileName } from '@/lib/simulation-pdf';
import { Statement } from '@/components/statement';
import { NICHE_IDS, NICHES } from '@/lib/business-niches';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Gerador de Movimentações Financeiras' },
    { name: 'description', content: 'Simule entradas, saídas e saldos mensais com precisão em centavos. Planeje cenários e exporte relatórios   s em PDF com a Fluxa Crédito.' },
    { property: 'og:title', content: ' Gerador de Movimentações Financeiras | Fluxa Crédito' },
    { property: 'og:description', content: 'Planejamento financeiro com cenários  s, metas mensais e relatórios PDF   .' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: Index,
});

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block min-w-0"><span className="field-label">{label}</span>{children}</label>; }
function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <Field label={label}><div className="money-field"><span>R$</span><input aria-label={label} className="form-field" inputMode="decimal" maxLength={18} value={value} onChange={e => onChange(e.target.value)} /></div></Field>; }
function Notice() { return <span className="notice"><ShieldCheck size={12} />{NOTICE}</span>; }

function Index() {
  const [company, setCompany] = useState('');
  const [startMonth, setStartMonth] = useState(7), [endMonth, setEndMonth] = useState(9), [year, setYear] = useState(2026);
  const [initial, setInitial] = useState('10.000,00'), [target, setTarget] = useState('25.000,00');
  const [income, setIncome] = useState('40.000,00'), [expenses, setExpenses] = useState('25.000,00');
  const [volume, setVolume] = useState('65.000,00'), [assumed, setAssumed] = useState('25.000,00');
  const [banner, setBanner] = useState<string>(BANNERS[0].id);
  useEffect(() => { const saved = localStorage.getItem(BANNER_KEY); if (saved) setBanner(saved); }, []);
  const [count, setCount] = useState(60), [profile, setProfile] = useState<Config['profile'] | ''>('');
  const [mode, setMode] = useState<Config['mode']>('balance'), [allowNegative, setAllowNegative] = useState(false);
  const [error, setError] = useState(''), [review, setReview] = useState<Config | null>(null);
  const [active, setActive] = useState<Config | null>(null), [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(7), [editing, setEditing] = useState(false), [edit, setEdit] = useState<Transaction | null>(null);
  const [editDate, setEditDate] = useState(''), [editDescription, setEditDescription] = useState(''), [editCategory, setEditCategory] = useState('');
  const [editValue, setEditValue] = useState(''), [editType, setEditType] = useState<'income' | 'expense'>('income'), [editError, setEditError] = useState('');
  const [exporting, setExporting] = useState(false), [help, setHelp] = useState(false), [exportError, setExportError] = useState('');
  const months = active ? summarize(active, transactions) : [];
  const current = months.find(m => m.month === selectedMonth);
  const issues = active ? verify(active, transactions) : [];
  let plans: ReturnType<typeof assumptions> = [];
  if (review) plans = assumptions(review);
  const createReview = () => {
    try {
      setError('');
      const result = configSchema.safeParse({ company, startMonth, endMonth, year, initial: parseMoney(initial), target: mode === 'flows' ? 0 : parseMoney(target), income: mode === 'flows' ? parseMoney(income) : 0, expenses: mode === 'flows' ? parseMoney(expenses) : 0, volume: mode === 'volume' ? parseMoney(volume) : 0, assumedExpenses: mode === 'balance' ? parseMoney(assumed) : 0, count, profile, mode, allowNegative });
      if (!result.success) throw new Error(result.error.issues.map(i => i.message).join(' '));
      assumptions(result.data); setReview(result.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Confira os dados informados.'); }
  };
  const commit = (c: Config) => { try { const rows = generate(c); setTransactions(rows); setActive(c); setSelectedMonth(c.startMonth); setReview(null); setEditing(false); setExportError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar.'); setReview(null); } };
  const openEdit = (t: Transaction) => { setEdit(t); setEditDate(t.date); setEditDescription(t.description.replace(/   $/, '')); setEditCategory(t.category); setEditValue(((t.income || t.expense) / 100).toFixed(2).replace('.', ',')); setEditType(t.income ? 'income' : 'expense'); setEditError(''); };
  const saveEdit = () => {
    if (!active || !edit) return;
    try { const row = editedTransaction(active, edit, { date: editDate, description: editDescription, category: editCategory, value: parseMoney(editValue), type: editType }); setTransactions(old => old.map(t => t.id === edit.id ? row : t)); setEdit(null); } catch (e) { setEditError(e instanceof Error ? e.message : 'Confira o lançamento.'); }
  };
  const exportPDF = async () => {
    if (!active) return;
    setExporting(true); setExportError('');
    try { for (let m = active.startMonth; m <= active.endMonth; m++) { const doc = await makePDF(active, transactions, bannerUrl(banner), m); doc.save(pdfFileName(active, m)); await new Promise(r => setTimeout(r, 400)); } } catch { setExportError('Não foi possível exportar o PDF. Tente novamente.'); } finally { setExporting(false); }
  };
  return <>
    <header className="app-header no-print"><div className="page-width flex h-full items-center justify-between gap-4">
      <div className="flex items-center gap-7"><img src={logo.url} alt="Fluxa Crédito" className="brand-logo" /><span className="hidden border-l border-border pl-7 text-xs text-muted-foreground sm:block">Ferramentas financeiras</span></div>
      <div className="flex items-center gap-5"><span className="hidden items-center gap-2 text-[11px] text-muted-foreground md:flex"><span className="size-1.5 rounded-full bg-success" />Ambiente de  </span><Link to="/configuracoes"><Button variant="ghost" size="sm"><Settings2 />Configurações</Button></Link><Button variant="ghost" size="sm" onClick={() => setHelp(true)}><CircleHelp />Ajuda</Button></div>
    </div></header>
    <main className="page-width pb-10">
      <div className="no-print flex items-center gap-2 pt-7 text-[10px] text-muted-foreground"><span>Ferramentas</span><ChevronRight size={11} /><span className="text-foreground"> Gerador financeiro</span></div>
      <div className="no-print mb-8 mt-5 flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground"><span className="h-1 w-5 rounded-full bg-primary" />Planejamento & demonstração</div><h1 className="max-w-[650px] text-[28px] font-bold leading-[1.3] sm:text-[32px]"> Gerador de Movimentações<br className="hidden sm:block" /> Financeiras<span className="text-primary">.</span></h1><p className="mt-3 text-xs leading-6 text-muted-foreground">Explore cenários. Planeje o próximo passo com clareza.</p></div>
        <span className="mb-1 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[10px] font-medium"><ShieldCheck size={13} className="text-success" />Sistema Online</span>
      </div>
      <div className="workspace animate-enter">
        <form className="configuration no-print" onSubmit={e => { e.preventDefault(); createReview(); }}>
          <div className="flex items-center gap-2.5 border-b border-border px-[26px] py-5"><SlidersHorizontal size={16} /><h2 className="text-sm font-bold">Configure sua  </h2></div>
          <section className="config-section"><h3 className="section-label"><span className="step-number">01</span>Empresa e período</h3>
            <Field label="Nome da empresa"><input className="form-field" placeholder="Ex.: Empresa Exemplo Ltda." value={company} maxLength={80} onChange={e => setCompany(e.target.value)} required minLength={2} /></Field>
            <div className="mt-4"><Field label="Nicho da empresa"><select className="form-field" aria-label="Nicho da empresa" value={profile} required onChange={e => { const value = e.target.value; setProfile(NICHE_IDS.find(id => id === value) ?? ''); }}><option value="" disabled>Selecione o nicho</option>{NICHE_IDS.map(id => <option key={id} value={id}>{NICHES[id].label}</option>)}</select></Field></div>
            <div className="mt-4 grid grid-cols-3 gap-2"><Field label="Mês inicial"><select className="form-field" value={startMonth} onChange={e => setStartMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></Field><Field label="Mês final"><select className="form-field" value={endMonth} onChange={e => setEndMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></Field><Field label="Ano"><input className="form-field" type="number" min={1900} max={2100} value={year} onChange={e => setYear(Number(e.target.value))} required /></Field></div>
            <div className="mt-4"><MoneyField label="Saldo inicial" value={initial} onChange={setInitial} /></div>
          </section>
          <section className="config-section"><h3 className="section-label"><span className="step-number">02</span>Meta financeira mensal</h3>
            <div className="space-y-2">{([
              ['balance', 'Saldo final desejado', 'O valor que você deseja ter ao encerrar cada mês.'],
              ['flows', 'Total de entradas e saídas', 'Defina quanto entra e quanto sai a cada mês.'],
              ['volume', 'Volume movimentado + saldo final', 'Entradas + saídas, além do saldo ao fim do mês.'],
            ] as const).map(([value, title, description]) => <label className={`target-option ${mode === value ? 'selected' : ''}`} key={value}><input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} /><div><strong>{title}</strong><p>{description}</p></div></label>)}</div>
            <div className="mt-4 space-y-4">{mode !== 'flows' && <MoneyField label="Saldo final desejado por mês" value={target} onChange={setTarget} />}{mode === 'flows' && <><MoneyField label="Total de entradas por mês" value={income} onChange={setIncome} /><MoneyField label="Total de saídas por mês" value={expenses} onChange={setExpenses} /></>}{mode === 'volume' && <MoneyField label="Volume total movimentado por mês" value={volume} onChange={setVolume} />}{mode === 'balance' && <MoneyField label="Premissa: saídas previstas por mês" value={assumed} onChange={setAssumed} />}</div>
            <p className="mt-3 flex gap-1.5 text-[10px] leading-5 text-muted-foreground"><Info size={12} className="mt-1 shrink-0" />{mode === 'balance' ? 'As entradas serão calculadas a partir do saldo final e das saídas previstas.' : 'A mesma meta será aplicada a todos os meses selecionados.'}</p>
          </section>
          <section className="config-section"><h3 className="section-label"><span className="step-number">03</span>Perfil das movimentações</h3><Field label="Movimentações por mês"><input className="form-field" type="number" min={1} max={500} value={count} onChange={e => setCount(Number(e.target.value))} required /></Field><div className="mt-5 flex items-center justify-between gap-2"><label htmlFor="negative" className="text-[11px] font-medium">Permitir saldo negativo</label><Switch id="negative" checked={allowNegative} onCheckedChange={setAllowNegative} /></div></section>
          <div className="p-[26px]">{error && <p role="alert" className="mb-4 text-xs leading-5 text-destructive">{error}</p>}<Button type="submit" className="h-12 w-full rounded-xl font-semibold"><Sparkles />Gerar  <ArrowRight className="ml-auto" /></Button><p className="mt-3 text-center text-[9px] text-muted-foreground">Confira as premissas antes de gerar.</p></div>
        </form>
        <div className="min-w-0">
          <section className="preview-surface"><div className="preview-top"><h2 className="flex items-center gap-2 text-xs font-semibold"><FileText size={15} />{active ? 'Resultado da  ' : 'Prévia da  '}</h2><Notice /></div>
            {!active ? <div className="flex min-h-[590px] flex-col items-center justify-center px-6 py-14 text-center"><div className="document-art mb-11" role="img" aria-label="Ilustração de relatório financeiro"><div className="art-title" /><div className="art-line" /><div className="art-line" /><div className="art-line w-3/4" /><div className="art-bars"><span /><span /><span /><span /><span /></div><div className="document-check"><Check size={22} /></div></div><span className="mb-3 text-[9px] font-semibold uppercase text-muted-foreground">Seu próximo cenário começa aqui</span><h3 className="text-xl font-bold">Possibilidades no papel.<br />Decisões com mais confiança.</h3><p className="mt-4 max-w-[300px] text-xs leading-6 text-muted-foreground">Um novo olhar sobre o futuro financeiro<br className="hidden sm:block" /> da sua empresa.</p><div className="mt-9 flex flex-wrap justify-center gap-5 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><CheckCheck size={13} />Precisão em centavos</span><span className="flex items-center gap-1.5"><FileText size={13} />Relatório em PDF</span></div></div> : <>
              <div className="px-[26px] pb-4 pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="break-words text-lg font-bold">{active.company}</h3><p className="mt-1 text-[10px] text-muted-foreground">{MONTHS[active.startMonth]} a {MONTHS[active.endMonth]} de {active.year}  {transactions.length} movimentações simuladas  {NICHES[active.profile].label}</p></div><span className={`flex items-center gap-1.5 text-[9px] font-semibold ${issues.length ? 'text-destructive' : 'text-success'}`}><ShieldCheck size={13} />{issues.length ? 'Revisão necessária' : 'Valores verificados'}</span></div>
                <div className="no-print mt-6 flex flex-wrap items-center justify-between gap-3"><select aria-label="Mês do resultado" className="form-field max-w-[150px]" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>{months.map(m => <option key={m.month} value={m.month}>{MONTHS[m.month]} {active.year}</option>)}</select><div className="flex gap-1"><Button size="icon" variant="ghost" title="Gerar novamente" aria-label="Gerar novamente" onClick={() => setReview(active)}><RefreshCw /></Button><Button variant={editing ? 'secondary' : 'outline'} size="sm" onClick={() => setEditing(!editing)}>{editing ? <X /> : <Pencil />}{editing ? 'Concluir edição' : 'Editar'}</Button><Button size="sm" onClick={exportPDF} disabled={exporting}><Download />{exporting ? 'Exportando…' : 'Exportar PDF'}</Button></div></div>
                {issues.length > 0 && <div role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[10px] leading-5 text-destructive">{issues.map(issue => <p key={issue}>{issue}</p>)}<p className="mt-1">Os demais lançamentos não foram alterados.</p></div>}{exportError && <p role="alert" className="mt-3 text-xs text-destructive">{exportError}</p>}
              </div>
              {current && <Statement config={active} month={current} editing={editing} onEdit={openEdit} topUrl={bannerUrl(banner)} />}
            </>}
          </section>
          <div className="no-print mt-5 flex items-start gap-3 px-1"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-muted-foreground" /><div><h3 className="text-[11px] font-semibold">Planejamento sem confundir com realidade.</h3><p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">Todos os dados e lançamentos são   s. Este documento não é um extrato bancário<br className="hidden xl:block" /> e não pode ser utilizado como comprovante financeiro.</p></div></div>
        </div>
      </div>
      <footer className="no-print mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[9px] text-muted-foreground"><span>© 2026 Fluxa Crédito</span><span className="flex items-center gap-1.5"><ShieldCheck size={11} />Seus dados ficam apenas nesta sessão.</span><span>Clareza para ir além.</span></footer>
    </main>
    <Dialog open={review !== null} onOpenChange={open => { if (!open) setReview(null); }}><DialogContent className="max-h-[90vh] overflow-auto rounded-[20px]"><DialogTitle>Confira as premissas</DialogTitle><DialogDescription>{review?.mode === 'balance' ? 'As saídas previstas são uma premissa ajustável. As entradas abaixo são calculadas para atingir o saldo final.' : 'Confira os totais mensais antes de gerar lançamentos   s.'}</DialogDescription><Notice />{review && <p className="text-xs font-medium">Nicho: {NICHES[review.profile].label}</p>}{active && review === active && <p className="text-xs text-warning">Gerar novamente substituirá os lançamentos e as edições atuais.</p>}{review?.mode === 'balance' && <MoneyField label="Ajustar saídas previstas por mês" value={assumed} onChange={value => { setAssumed(value); try { const adjusted = { ...review, assumedExpenses: parseMoney(value) }; assumptions(adjusted); setReview(adjusted); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Confira o valor.'); } }} />}{error && <p className="text-xs text-destructive" role="alert">{error}</p>}<div className="overflow-auto"><table className="ledger"><thead><tr><th>Mês</th><th className="numeric">Entradas</th><th className="numeric">Saídas</th><th className="numeric">Saldo final</th></tr></thead><tbody>{plans.map(p => <tr key={p.month}><td>{MONTHS[p.month]}</td><td className="numeric">{money(p.income)}</td><td className="numeric">{money(p.expenses)}</td><td className="numeric">{money(p.final)}</td></tr>)}</tbody></table></div><p className="text-[10px] leading-5 text-muted-foreground">Saldo inicial do primeiro mês: {review && money(review.initial)}. O saldo final de cada mês será o inicial do seguinte. Datas e valores serão distribuídos aleatoriamente, sem lançamentos extras.</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReview(null)}>Voltar e ajustar</Button><Button disabled={!!error} onClick={() => { if (review) commit(review); }}><Sparkles />Confirmar e gerar</Button></div></DialogContent></Dialog>
    <Dialog open={edit !== null} onOpenChange={open => { if (!open) setEdit(null); }}><DialogContent className="rounded-[20px]"><DialogTitle>Editar lançamento  </DialogTitle><DialogDescription>Somente este lançamento será alterado. Os saldos serão recalculados.</DialogDescription><Field label="Data"><input className="form-field" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></Field><Field label="Descrição"><input className="form-field" value={editDescription} maxLength={90} onChange={e => setEditDescription(e.target.value)} /></Field><Field label="Categoria"><input className="form-field" value={editCategory} maxLength={30} onChange={e => setEditCategory(e.target.value)} /></Field><Field label="Tipo"><select className="form-field" value={editType} onChange={e => setEditType(e.target.value === 'income' ? 'income' : 'expense')}><option value="income">Entrada</option><option value="expense">Saída</option></select></Field><MoneyField label="Valor" value={editValue} onChange={setEditValue} />{editError && <p role="alert" className="text-xs text-destructive">{editError}</p>}<Button onClick={saveEdit}><Check />Salvar alteração</Button></DialogContent></Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="rounded-[20px]"><DialogTitle>Sobre a  </DialogTitle><DialogDescription>Planejamento financeiro    da Fluxa Crédito.</DialogDescription><div className="space-y-4 text-xs leading-6"><p><strong>Saldo final</strong> é o saldo inicial mais as entradas, menos as saídas. <strong>Volume movimentado</strong> é a soma das entradas e saídas — não é o saldo.</p><p>As metas são mensais. Você pode revisar as premissas antes da geração e editar cada lançamento depois. Edições não ajustam outros lançamentos para recuperar a meta.</p><p>O PDF contém todos os meses selecionados. Não há armazenamento permanente: ao sair ou atualizar a página, os dados são descartados.</p></div><Notice /></DialogContent></Dialog>
  </>;
}
