export const NICHE_IDS = ['servicos', 'comercio', 'tecnologia', 'informatica', 'alimentacao', 'construcao', 'saude', 'automotivo'] as const;
export type NicheId = typeof NICHE_IDS[number];
type Activity = { operation: string; category: string; party: string };
type Niche = { label: string; income: Activity[]; expenses: Activity[] };
const sale = (operation: string, category: string): Activity => ({ operation, category, party: 'Cliente Exemplo' });
const purchase = (operation: string, category: string): Activity => ({ operation, category, party: 'Fornecedor Exemplo' });
const operating: Activity[] = [
  { operation: 'Salário de funcionário', category: 'Funcionários', party: 'Funcionário Exemplo' },
  purchase('Aluguel comercial', 'Aluguel'), purchase('Energia elétrica', 'Energia'),
  purchase('Internet empresarial', 'Internet'), purchase('Serviços contábeis', 'Contabilidade'), purchase('Impostos da empresa', 'Impostos'),
  { operation: 'Pagamento de salário', category: 'Funcionários', party: 'Folha' },
  purchase('Compra no cartão posto combustível', 'Combustível'), purchase('Compra Pix supermercado', 'Suprimentos'),
  purchase('Compra no cartão papelaria', 'Materiais'), purchase('Pagamento de boleto fornecedor', 'Fornecedores'),
  purchase('Compra Pix restaurante', 'Alimentação'), purchase('Tarifa bancária pacote', 'Tarifas'),
  purchase('Compra no cartão farmácia', 'Suprimentos'), purchase('Vale-transporte funcionários', 'Funcionários'),
];
const expenses = (...activities: Activity[]) => [...activities, ...operating];
export const NICHES: Record<NicheId, Niche> = {
  servicos: { label: 'Serviços e consultoria', income: [sale('Consultoria empresarial', 'Consultoria'), sale('Prestação de serviços', 'Serviços'), sale('Contrato de assessoria', 'Assessoria')], expenses: expenses(purchase('Serviço terceirizado', 'Terceirização'), purchase('Material de escritório', 'Materiais')) },
  comercio: { label: 'Comércio varejista', income: [sale('Venda de mercadorias', 'Vendas'), sale('Venda por encomenda', 'Encomendas'), sale('Venda pela loja virtual', 'E-commerce')], expenses: expenses(purchase('Compra de mercadorias', 'Estoque'), purchase('Frete de mercadorias', 'Frete'), purchase('Embalagens para vendas', 'Embalagens')) },
  tecnologia: { label: 'TI — software e serviços', income: [sale('Desenvolvimento de sistema', 'Desenvolvimento'), sale('Licença de software', 'Licenciamento'), sale('Contrato de suporte técnico', 'Suporte')], expenses: expenses(purchase('Hospedagem em nuvem', 'Infraestrutura'), purchase('Licença de ferramenta de TI', 'Software'), purchase('Desenvolvimento terceirizado', 'Terceirização')) },
  informatica: { label: 'TI — computadores e peças', income: [sale('Venda de computadores', 'Computadores'), sale('Venda de peças de computador', 'Peças'), sale('Manutenção de computadores', 'Manutenção')], expenses: expenses(purchase('Compra de computadores', 'Computadores'), purchase('Compra de peças de computador', 'Peças'), purchase('Frete de equipamentos de TI', 'Frete')) },
  alimentacao: { label: 'Alimentação e restaurantes', income: [sale('Venda de refeições', 'Refeições'), sale('Pedido de delivery', 'Delivery'), sale('Serviço de buffet', 'Buffet')], expenses: expenses(purchase('Compra de ingredientes', 'Ingredientes'), purchase('Embalagens de delivery', 'Embalagens'), purchase('Gás de cozinha', 'Gás')) },
  construcao: { label: 'Construção e reformas', income: [sale('Serviço de reforma', 'Reformas'), sale('Etapa de obra', 'Obras'), sale('Projeto de construção', 'Projetos')], expenses: expenses(purchase('Compra de materiais de obra', 'Materiais'), purchase('Locação de equipamentos', 'Equipamentos'), purchase('Mão de obra terceirizada', 'Terceirização')) },
  saude: { label: 'Saúde e clínicas', income: [sale('Consulta clínica', 'Consultas'), sale('Procedimento clínico', 'Procedimentos'), sale('Exame clínico', 'Exames')], expenses: expenses(purchase('Compra de insumos clínicos', 'Insumos'), purchase('Manutenção de equipamento', 'Manutenção'), purchase('Coleta de resíduos clínicos', 'Resíduos')) },
  automotivo: { label: 'Oficina e autopeças', income: [sale('Reparo de veículo', 'Reparos'), sale('Venda de autopeças', 'Autopeças'), sale('Revisão de veículo', 'Revisões')], expenses: expenses(purchase('Compra de autopeças', 'Autopeças'), purchase('Compra de lubrificantes', 'Lubrificantes'), purchase('Manutenção de ferramentas', 'Ferramentas')) },
};

export function nicheActivity(profile: NicheId, side: 'income' | 'expenses', index: number) {
  const activities = NICHES[profile][side];
  const activity = activities[index % activities.length];
  if (!activity) throw new Error('Atividade do nicho indisponível.');
  return { description: `${activity.operation} — ${activity.party} ${String(index + 1).padStart(2, '0')}  `, category: activity.category };
}