import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Download, Wallet, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MONTHS, dateLabel, money, parseMoney } from '@/lib/simulation';
import { NICHE_IDS, NICHES } from '@/lib/business-niches';
import { GATEWAY_NOTICE, gatewaySchema, gatewayTotals, generateGateway, type GatewayConfig, type GatewayRow } from '@/lib/gateway';

export const Route = createFileRoute('/gateway')({
  head: () => ({ meta: [
    { title: 'Extrato de Gateway — Demonstração de layout' },
    { name: 'description', content: 'Protótipo de layout de extrato de gateway de pagamento com vendas por produto e saques via Pix, marcado como demonstração.' },
    { property: 'og:title', content: 'Extrato de Gateway — Demonstração de layout' },
    { property: 'og:description', content: 'Protótipo moderno de extrato de gateway com dados de demonstração.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: Gateway,
});

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block min-w-0"><span className="field-label">{label}</span>{children}</label>; }

function Gateway() {
  const [company, setCompany] = useState(''), [profile, setProfile] = useState<GatewayConfig['profile'] | ''>('consultoria');
  const [month, setMonth] = useState(8), [year, setYear] = useState(2026);
  const [initial, setInitial] = useState('0,00'), [sales, setSales] = useState('48.000,00'), [withdrawals, setWithdrawals] = useState('40.000,00');
  const [salesCount, setSalesCount] = useState(40), [withdrawalCount, setWithdrawalCount] = useState(6);
  const [error, setError] = useState(''), [active, setActive] = useState<GatewayConfig | null>(null), [rows, setRows] = useState<GatewayRow[]>([]);
  const [exporting, setExporting] = useState(false);
  const [brand, setBrand] = useState('#5b46e6'), [logo, setLogo] = useState('');
  useEffect(() => { const b = localStorage.getItem('gw-brand-color'); if (b) setBrand(b); const l = localStorage.getItem('gw-brand-logo'); if (l) setLogo(l); }, []);
  const saveBrand = (v: string) => { setBrand(v); localStorage.setItem('gw-brand-color', v); };
  const saveLogo = (file?: File) => {
    if (!file) return; if (file.size > 1_500_000) { setError('A logo deve ter até 1,5 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => { const v = String(reader.result); setLogo(v); try { localStorage.setItem('gw-brand-logo', v); } catch { setError('Não foi possível salvar a logo.'); } }; reader.readAsDataURL(file);
  };
  const clearLogo = () => { setLogo(''); localStorage.removeItem('gw-brand-logo'); };
  const run = () => {
    try {
      setError('');
      const r = gatewaySchema.safeParse({ company, profile, month, year, initial: parseMoney(initial), sales: parseMoney(sales), withdrawals: parseMoney(withdrawals), salesCount, withdrawalCount });
      if (!r.success) throw new Error(r.error.issues.map(i => i.message).join(' '));
      setRows(generateGateway(r.data)); setActive(r.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Confira os dados.'); }
  };
  const exportPDF = async () => {
    if (!active) return; setExporting(true);
    try { const { makeGatewayPDF, gatewayFileName } = await import('@/lib/gateway-pdf'); (await makeGatewayPDF(active, rows, { color: brand, logo })).save(gatewayFileName(active)); } catch { setError('Não foi possível exportar o PDF.'); } finally { setExporting(false); }
  };
  const t = active ? gatewayTotals(active, rows) : null;
  return <main className="page-width pb-10 pt-7">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link to="/"><Button variant="ghost" size="sm"><ArrowLeft />Extrato bancário</Button></Link><h1 className="text-2xl font-bold">Extrato de gateway<span className="text-primary">.</span></h1></div>
    <div className="workspace">
      <form className="configuration p-6 space-y-4" onSubmit={e => { e.preventDefault(); run(); }}>
        <Field label="Nome da empresa"><input className="form-field" value={company} maxLength={80} onChange={e => setCompany(e.target.value)} placeholder="Sua empresa" /></Field>
        <Field label="Nicho"><select className="form-field" value={profile} onChange={e => setProfile(NICHE_IDS.find(id => id === e.target.value) ?? '')}>{NICHE_IDS.map(id => <option key={id} value={id}>{NICHES[id].label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Mês"><select className="form-field" value={month} onChange={e => setMonth(Number(e.target.value))}>{MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select></Field><Field label="Ano"><input className="form-field" type="number" value={year} onChange={e => setYear(Number(e.target.value))} /></Field></div>
        <Field label="Saldo inicial (R$)"><input className="form-field" value={initial} onChange={e => setInitial(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Total de vendas (R$)"><input className="form-field" value={sales} onChange={e => setSales(e.target.value)} /></Field><Field label="Nº de vendas"><input className="form-field" type="number" value={salesCount} onChange={e => setSalesCount(Number(e.target.value))} /></Field></div>
        <div className="grid grid-cols-2 gap-2"><Field label="Total de saques Pix (R$)"><input className="form-field" value={withdrawals} onChange={e => setWithdrawals(e.target.value)} /></Field><Field label="Nº de saques"><input className="form-field" type="number" value={withdrawalCount} onChange={e => setWithdrawalCount(Number(e.target.value))} /></Field></div>
        <div className="border-t border-border pt-4"><span className="field-label">Marca (salva neste computador)</span>
          <div className="flex items-center gap-3"><input type="color" aria-label="Cor principal" className="h-10 w-14 cursor-pointer rounded-md border border-border bg-card" value={brand} onChange={e => saveBrand(e.target.value)} /><span className="text-xs text-muted-foreground">Cor principal</span></div>
          <div className="mt-3 flex items-center gap-3">{logo && <img src={logo} alt="Logo" className="h-10 w-10 rounded-md border border-border object-contain" />}<label className="cursor-pointer text-xs font-semibold underline">{logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => saveLogo(e.target.files?.[0])} /></label>{logo && <button type="button" className="text-xs text-muted-foreground underline" onClick={clearLogo}>Remover</button>}</div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" className="w-full"><Zap />Gerar extrato</Button>
        {active && <Button type="button" variant="outline" className="w-full" disabled={exporting} onClick={exportPDF}><Download />{exporting ? 'Exportando…' : 'Baixar PDF'}</Button>}
      </form>
      <div className="statement-viewport">{active && t ? <div className="gw-doc" style={{ ["--gw-brand" as string]: brand }}>
        <div className="gw-watermark" aria-hidden>{["a","b","c"].map(k => <span key={k}>DEMONSTRAÇÃO — NÃO É REAL</span>)}</div>
        <div className="gw-hero"><div>{logo && <img src={logo} alt="" className="gw-logo" />}<span className="gw-chip"><Wallet size={12} />Extrato de recebimentos</span><h2>{active.company}</h2><p>{MONTHS[active.month]} de {active.year} · {NICHES[active.profile].label}</p></div><div className="text-right"><small>Saldo disponível</small><strong>{money(t.final)}</strong></div></div>
        <div className="gw-cards"><div><small>Saldo inicial</small><b>{money(active.initial)}</b></div><div><small>Vendas ({t.count})</small><b className="gw-in">+ {money(t.sales)}</b></div><div><small>Saques Pix</small><b className="gw-out">− {money(t.withdrawals)}</b></div></div>
        <ul className="gw-list">{rows.map(r => <li key={r.id}><span className={`gw-icon ${r.kind === 'sale' ? 'gw-icon-in' : 'gw-icon-out'}`}>{r.kind === 'sale' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</span><div className="min-w-0 flex-1"><b>{r.title}</b><small>{r.detail}</small></div><div className="text-right"><b className={r.kind === 'sale' ? 'gw-in' : 'gw-out'}>{r.kind === 'sale' ? '+ ' : '− '}{money(r.amount)}</b><small>{dateLabel(r.date)} {r.time} · saldo {money(r.balance)}</small></div></li>)}</ul>
        <div className="gw-corner">{GATEWAY_NOTICE}</div>
      </div> : <div className="configuration grid min-h-[400px] place-items-center text-sm text-muted-foreground">Preencha os dados e gere o extrato.</div>}</div>
    </div>
  </main>;
}
