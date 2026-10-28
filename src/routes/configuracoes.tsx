import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, ImagePlus, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/fluxa-logo.asset.json';
import { BANNERS, BANNER_KEY, customBanners, saveCustomBanners, type BannerOption } from '@/lib/statement-banners';

export const Route = createFileRoute('/configuracoes')({
  head: () => ({ meta: [
    { title: 'Configurações do Extrato | Fluxa Crédito' },
    { name: 'description', content: 'Escolha ou adicione a imagem do topo do extrato e personalize a apresentação dos relatórios  s da Fluxa Crédito.' },
    { property: 'og:title', content: 'Configurações do Extrato | Fluxa Crédito' },
    { property: 'og:description', content: 'Personalize a imagem do topo dos extratos  s. A escolha fica salva neste dispositivo.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Configuracoes,
});

function readAsBanner(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('O arquivo não é uma imagem válida.'));
      img.onload = () => {
        const maxWidth = 1600;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Não foi possível processar a imagem.'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function Configuracoes() {
  const [banner, setBanner] = useState<string>(BANNERS[0].id);
  const [custom, setCustom] = useState<BannerOption[]>([]);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(BANNER_KEY);
    if (stored) setBanner(stored);
    setCustom(customBanners());
  }, []);

  const choose = (id: string) => { setBanner(id); localStorage.setItem(BANNER_KEY, id); setSaved(true); window.setTimeout(() => setSaved(false), 2000); };

  const addBanner = async (file: File) => {
    setUploadError('');
    try {
      const url = await readAsBanner(file);
      const option: BannerOption = { id: `custom-${Date.now()}`, label: file.name.replace(/\.[^.]+$/, '') || 'Topo personalizado', url };
      const next = [...custom, option];
      setCustom(next);
      saveCustomBanners(next);
      choose(option.id);
    } catch (e) { setUploadError(e instanceof Error ? e.message : 'Não foi possível adicionar a imagem.'); }
  };

  const removeBanner = (id: string) => {
    const next = custom.filter(b => b.id !== id);
    setCustom(next);
    saveCustomBanners(next);
    if (banner === id) choose(BANNERS[0].id);
  };

  const options = [...BANNERS, ...custom];
  const isCustom = (id: string) => id.startsWith('custom-');

  return <>
    <header className="app-header no-print"><div className="page-width flex h-full items-center justify-between gap-4">
      <div className="flex items-center gap-7"><img src={logo.url} alt="Fluxa Crédito" className="brand-logo" /><span className="hidden border-l border-border pl-7 text-xs text-muted-foreground sm:block">Ferramentas financeiras</span></div>
      <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft />Voltar ao  r</Button></Link>
    </div></header>
    <main className="page-width pb-10">
      <div className="mb-8 mt-7"><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground"><span className="h-1 w-5 rounded-full bg-primary" />Preferências</div>
        <h1 className="flex items-center gap-3 text-[28px] font-bold leading-[1.3]"><Settings2 size={26} className="text-primary" />Configurações do extrato<span className="text-primary">.</span></h1>
        <p className="mt-3 max-w-[520px] text-xs leading-6 text-muted-foreground">Escolha a imagem exibida no topo do extrato, na prévia e no PDF exportado. Você também pode adicionar suas próprias imagens. Tudo fica salvo neste dispositivo.</p>
      </div>
      <section className="max-w-[760px] rounded-2xl border border-border bg-card p-[26px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Imagem do topo do extrato</h2>
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><ImagePlus />Adicionar novo topo</Button>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Adicionar novo topo"
            onChange={e => { const file = e.target.files?.[0]; if (file) void addBanner(file); e.target.value = ''; }} />
        </div>
        {uploadError && <p role="alert" className="mt-3 text-xs text-destructive">{uploadError}</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {options.map(b => (
            <div key={b.id} className={`group relative overflow-hidden rounded-xl border-2 text-left transition-colors ${banner === b.id ? 'border-primary' : 'border-border hover:border-muted-foreground/40'}`}>
              <button type="button" onClick={() => choose(b.id)} aria-pressed={banner === b.id} className="block w-full">
                <img src={b.url} alt={b.label} className="block h-[72px] w-full object-cover object-left" />
                <span className="flex items-center justify-between px-4 py-3 text-xs font-medium"><span className="truncate">{b.label}</span>
                  {banner === b.id && <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={12} /></span>}
                </span>
              </button>
              {isCustom(b.id) && (
                <button type="button" onClick={() => removeBanner(b.id)} aria-label={`Remover ${b.label}`} title="Remover este topo"
                  className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm transition-colors hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {saved ? <><Check size={13} className="text-success" />Preferência salva.</> : <><ShieldCheck size={13} />A preferência é salva automaticamente ao escolher.</>}
        </p>
      </section>
      <footer className="no-print mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[9px] text-muted-foreground"><span>© 2026 Fluxa Crédito</span><span>Clareza para ir além.</span></footer>
    </main>
  </>;
}
