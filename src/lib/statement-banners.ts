import fluxaTop from '@/assets/statement-top.png.asset.json';
import cleanTop from '@/assets/statement-bottom.png.asset.json';

export type BannerOption = { id: string; label: string; url: string };

export const BANNERS = [
  { id: 'fluxa', label: 'Estampa com marca Fluxa', url: fluxaTop.url },
  { id: 'clean', label: 'Estampa limpa', url: cleanTop.url },
] as const satisfies readonly BannerOption[];
export type BannerId = (typeof BANNERS)[number]['id'];
export const BANNER_KEY = 'fluxa-statement-banner';
export const CUSTOM_KEY = 'fluxa-statement-banners-custom';

export function customBanners(): BannerOption[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(b => b && typeof b.id === 'string' && typeof b.url === 'string') : [];
  } catch { return []; }
}

export function saveCustomBanners(list: BannerOption[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export function allBanners(): BannerOption[] {
  return [...BANNERS, ...customBanners()];
}

export function bannerUrl(id: string) {
  return allBanners().find(b => b.id === id)?.url ?? BANNERS[0].url;
}
