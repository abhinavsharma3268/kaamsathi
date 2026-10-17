export type EarningsInput = {
  date: string; // YYYY-MM-DD
  gross: number;
  incentives: number;
  hours: number;
  fuel: number;
  maintenance: number;
  otherExpenses: number;
  notes?: string;
};

export type EarningsEntry = EarningsInput & {
  id: string;
  net: number;
  perHour: number;
  createdAt: string;
};

export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeEarnings(input: EarningsInput): {
  net: number;
  perHour: number;
} {
  const gross = Number(input.gross) || 0;
  const incentives = Number(input.incentives) || 0;
  const hours = Number(input.hours) || 0;
  const fuel = Number(input.fuel) || 0;
  const maintenance = Number(input.maintenance) || 0;
  const otherExpenses = Number(input.otherExpenses) || 0;

  const net = roundMoney(gross + incentives - fuel - maintenance - otherExpenses);
  const perHour = hours > 0 ? roundMoney(net / hours) : 0;
  return { net, perHour };
}

export function createEntry(input: EarningsInput): EarningsEntry {
  const { net, perHour } = computeEarnings(input);
  return {
    ...input,
    gross: Number(input.gross) || 0,
    incentives: Number(input.incentives) || 0,
    hours: Number(input.hours) || 0,
    fuel: Number(input.fuel) || 0,
    maintenance: Number(input.maintenance) || 0,
    otherExpenses: Number(input.otherExpenses) || 0,
    notes: input.notes?.trim() || "",
    id: crypto.randomUUID(),
    net,
    perHour,
    createdAt: new Date().toISOString(),
  };
}

export function summarize(entries: EarningsEntry[], now = new Date()) {
  const today = toDateKey(now);
  const weekStart = startOfWeek(now);

  const todayEntries = entries.filter((e) => e.date === today);
  const weekEntries = entries.filter((e) => e.date >= weekStart && e.date <= today);

  const sumNet = (list: EarningsEntry[]) =>
    roundMoney(list.reduce((acc, e) => acc + e.net, 0));
  const sumHours = (list: EarningsEntry[]) =>
    roundMoney(list.reduce((acc, e) => acc + e.hours, 0));

  const todayNet = sumNet(todayEntries);
  const weekNet = sumNet(weekEntries);
  const todayHours = sumHours(todayEntries);
  const weekHours = sumHours(weekEntries);

  return {
    todayNet,
    weekNet,
    todayHours,
    weekHours,
    todayPerHour: todayHours > 0 ? roundMoney(todayNet / todayHours) : 0,
    weekPerHour: weekHours > 0 ? roundMoney(weekNet / weekHours) : 0,
    todayCount: todayEntries.length,
    weekCount: weekEntries.length,
  };
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday as start of week (ISO-ish, local time). */
export function startOfWeek(d: Date): string {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  return toDateKey(copy);
}

export function validateEarningsInput(input: Partial<EarningsInput>): string | null {
  if (!input.date) return "Please select a date.";
  const nums = [
    input.gross,
    input.incentives,
    input.hours,
    input.fuel,
    input.maintenance,
    input.otherExpenses,
  ];
  if (nums.some((n) => n === undefined || Number.isNaN(Number(n)))) {
    return "Please enter valid numbers in all fields.";
  }
  if (Number(input.hours) < 0 || Number(input.gross) < 0) {
    return "Hours worked and gross earnings cannot be negative.";
  }
  if (
    Number(input.incentives) < 0 ||
    Number(input.fuel) < 0 ||
    Number(input.maintenance) < 0 ||
    Number(input.otherExpenses) < 0
  ) {
    return "Expense amounts cannot be negative.";
  }
  return null;
}
