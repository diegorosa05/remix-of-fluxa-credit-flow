import { z } from "zod";
import { NICHE_IDS, nicheActivity } from "./business-niches";

// Rodapé discreto de emissão, exibido na tela e em todas as páginas do PDF.
export const NOTICE = " ";

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const cents = z.number().int().safe().min(0).max(100_000_000_000);
const signedCents = z.number().int().safe().min(-100_000_000_000).max(100_000_000_000);
export const configSchema = z
  .object({
    company: z.string().trim().min(2, "Informe o nome da empresa.").max(80),
    startMonth: z.number().int().min(0).max(11),
    endMonth: z.number().int().min(0).max(11),
    year: z.number().int().min(1900).max(2100),
    initial: signedCents,
    mode: z.enum(["balance", "flows", "volume"]),
    target: signedCents,
    income: cents,
    expenses: cents,
    volume: cents,
    assumedExpenses: cents,
    count: z.number().int().min(1).max(500),
    profile: z.enum([...NICHE_IDS], { errorMap: () => ({ message: "Escolha o nicho da empresa." }) }),
    allowNegative: z.boolean(),
  })
  .superRefine((c, ctx) => {
    if (c.endMonth < c.startMonth)
      ctx.addIssue({
        code: "custom",
        path: ["endMonth"],
        message: "O mês final deve ser igual ou posterior ao inicial.",
      });
    if (!c.allowNegative && c.initial < 0)
      ctx.addIssue({
        code: "custom",
        path: ["initial"],
        message: "Corrija o saldo inicial ou permita saldo negativo.",
      });
  });
export type Config = z.infer<typeof configSchema>;
export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  income: number;
  expense: number;
};
export type BalancedTransaction = Transaction & { balance: number };
export type MonthSummary = {
  month: number;
  initial: number;
  income: number;
  expenses: number;
  volume: number;
  final: number;
  rows: BalancedTransaction[];
};
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
export const dateLabel = (date: string) => date.split("-").reverse().join("/");
// Agência e conta fictícias, derivadas da empresa e do ano para ficarem estáveis entre tela e PDF.
export function accountDetails(c: Pick<Config, "company" | "year">): { agency: string; account: string } {
  let hash = 0;
  for (const ch of `${c.company}|${c.year}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const agency = String(1000 + (hash % 9000));
  const base = String(10000 + (Math.floor(hash / 7) % 90000));
  const digit = String((hash * 13) % 10);
  return { agency, account: `${base}-${digit}` };
}
export function parseMoney(text: string): number {
  const cleaned = text
    .trim()
    .replace(/R\$\s?/, "")
    .replace(/\s/g, "");
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleaned))
    throw new Error("Use valores como 1.500,00, com no máximo duas casas decimais.");
  const negative = cleaned.startsWith("-");
  const [whole, fraction = ""] = cleaned.replace("-", "").replace(/\./g, "").split(",");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || Math.abs(result) > 100_000_000_000)
    throw new Error("Valor fora do limite permitido.");
  return negative ? -result : result;
}
export function monthlyTotals(c: Config, opening: number): { income: number; expenses: number; final: number } {
  let income = c.income,
    expenses = c.expenses;
  if (c.mode === "balance") {
    expenses = c.assumedExpenses;
    income = c.target - opening + expenses;
  }
  if (c.mode === "volume") {
    const delta = c.target - opening;
    if (Math.abs(delta) > c.volume)
      throw new Error(
        "O volume movimentado deve ser maior ou igual à diferença entre o saldo inicial e o saldo final. Corrija o volume ou o saldo final.",
      );
    if ((c.volume + delta) % 2 !== 0)
      throw new Error(
        "Volume e diferença de saldo são incompatíveis em centavos. Ajuste o volume ou o saldo final em R$ 0,01.",
      );
    income = (c.volume + delta) / 2;
    expenses = (c.volume - delta) / 2;
  }
  if (income < 0)
    throw new Error(
      "As saídas previstas são insuficientes para atingir o saldo final. Aumente a premissa de saídas ou corrija o saldo final.",
    );
  const final = opening + income - expenses;
  if (!c.allowNegative && final < 0)
    throw new Error("A meta produz saldo negativo. Corrija as entradas, as saídas ou permita saldo negativo.");
  const sides = Number(income > 0) + Number(expenses > 0);
  if (c.count < sides) throw new Error("Entradas e saídas exigem pelo menos 2 movimentações. Aumente a quantidade.");
  if (income + expenses < c.count)
    throw new Error(
      "O volume é insuficiente para a quantidade de movimentações. Cada lançamento precisa de pelo menos R$ 0,01.",
    );
  return { income, expenses, final };
}
export function assumptions(
  c: Config,
): { month: number; initial: number; income: number; expenses: number; final: number }[] {
  configSchema.parse(c);
  let opening = c.initial;
  return Array.from({ length: c.endMonth - c.startMonth + 1 }, (_, i) => {
    const totals = monthlyTotals(c, opening);
    const row = { month: c.startMonth + i, initial: opening, ...totals };
    opening = totals.final;
    return row;
  });
}
function partition(total: number, count: number, random: () => number): number[] {
  if (count === 0) return [];
  const weights = Array.from({ length: count }, () => 0.3 + random());
  const sum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((w) => 1 + Math.floor(((total - count) * w) / sum));
  let remainder = total - values.reduce((a, b) => a + b, 0);
  for (let i = 0; remainder > 0; i++, remainder--) {
    const index = i % count;
    values[index] = (values[index] ?? 0) + 1;
  }
  return values;
}
export function generate(c: Config, random: () => number = Math.random): Transaction[] {
  const plans = assumptions(c);
  return plans.flatMap((plan) => {
    const total = plan.income + plan.expenses;
    let incomingCount =
      plan.income === 0
        ? 0
        : plan.expenses === 0
          ? c.count
          : Math.max(1, Math.min(c.count - 1, Math.round((c.count * plan.income) / total)));
    incomingCount = Math.min(incomingCount, plan.income);
    incomingCount = Math.max(incomingCount, c.count - plan.expenses);
    const credits = partition(plan.income, incomingCount, random).map((value, i) => ({
      income: value,
      expense: 0,
      ...nicheActivity(c.profile, "income", i),
    }));
    const debits = partition(plan.expenses, c.count - incomingCount, random).map((value, i) => ({
      income: 0,
      expense: value,
      ...nicheActivity(c.profile, "expenses", i),
    }));
    const pending = [...credits, ...debits]
      .map((row) => ({ row, priority: random() }))
      .sort((a, b) => a.priority - b.priority)
      .map((x) => x.row);
    const ordered: typeof pending = [];
    let balance = plan.initial;
    while (pending.length) {
      const index = c.allowNegative ? 0 : pending.findIndex((row) => balance + row.income - row.expense >= 0);
      if (index < 0) throw new Error("Não foi possível distribuir as movimentações sem saldo negativo.");
      const [row] = pending.splice(index, 1);
      if (!row) throw new Error("Lançamento indisponível.");
      ordered.push(row);
      balance += row.income - row.expense;
    }
    const daysInMonth = new Date(c.year, plan.month + 1, 0).getDate();
    const days = ordered.map(() => 1 + Math.floor(random() * daysInMonth)).sort((a, b) => a - b);
    return ordered.map((row, i) => ({
      ...row,
      id: `${plan.month}-${i}`,
      date: `${c.year}-${String(plan.month + 1).padStart(2, "0")}-${String(days[i]).padStart(2, "0")}`,
    }));
  });
}
export function summarize(c: Config, transactions: Transaction[]): MonthSummary[] {
  let balance = c.initial;
  return Array.from({ length: c.endMonth - c.startMonth + 1 }, (_, i) => {
    const month = c.startMonth + i,
      initial = balance;
    const rows = transactions
      .filter((t) => Number(t.date.slice(5, 7)) === month + 1)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => {
        balance += t.income - t.expense;
        return { ...t, balance };
      });
    const income = rows.reduce((s, t) => s + t.income, 0),
      expenses = rows.reduce((s, t) => s + t.expense, 0);
    return { month, initial, rows, income, expenses, volume: income + expenses, final: balance };
  });
}
export function verify(c: Config, transactions: Transaction[]): string[] {
  const issues: string[] = [];
  for (const m of summarize(c, transactions)) {
    const matched =
      c.mode === "balance"
        ? m.final === c.target
        : c.mode === "flows"
          ? m.income === c.income && m.expenses === c.expenses
          : m.volume === c.volume && m.final === c.target;
    if (!matched) issues.push(`${MONTHS[m.month]}: a meta deixou de ser atendida.`);
    if (!c.allowNegative && m.rows.some((t) => t.balance < 0))
      issues.push(`${MONTHS[m.month]}: existe saldo negativo; corrija o lançamento.`);
  }
  return issues;
}
export const editSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().trim().min(2).max(90),
  category: z.string().trim().min(2).max(30),
  value: cents.refine((v) => v > 0, "O valor deve ser positivo."),
  type: z.enum(["income", "expense"]),
});
export function editedTransaction(c: Config, original: Transaction, input: z.infer<typeof editSchema>): Transaction {
  const edit = editSchema.parse(input);
  const year = Number(edit.date.slice(0, 4)),
    month = Number(edit.date.slice(5, 7)),
    day = Number(edit.date.slice(8, 10));
  const valid = new Date(year, month, 0).getDate();
  if (year !== c.year || month < c.startMonth + 1 || month > c.endMonth + 1 || day < 1 || day > valid) throw new Error('A data precisa ser válida e pertencer ao período  .');
  return { id: original.id, date: edit.date, description: `${edit.description.replace(/\s*  $/, '')}   `, category: edit.category, income: edit.type === 'income' ? edit.value : 0, expense: edit.type === 'expense' ? edit.value : 0 };
}
