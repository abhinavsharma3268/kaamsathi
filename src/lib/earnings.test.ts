import {
  computeEarnings,
  createEntry,
  summarize,
  startOfWeek,
  toDateKey,
} from "./earnings";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function run() {
  const calc = computeEarnings({
    date: "2026-10-17",
    gross: 1000,
    incentives: 200,
    hours: 8,
    fuel: 150,
    maintenance: 50,
    otherExpenses: 0,
  });
  assert(calc.net === 1000, `net expected 1000 got ${calc.net}`);
  assert(calc.perHour === 125, `perHour expected 125 got ${calc.perHour}`);

  const entry = createEntry({
    date: toDateKey(new Date()),
    gross: 500,
    incentives: 0,
    hours: 5,
    fuel: 100,
    maintenance: 0,
    otherExpenses: 0,
  });
  assert(entry.net === 400, `entry net ${entry.net}`);
  assert(entry.perHour === 80, `entry perHour ${entry.perHour}`);

  const sum = summarize([entry]);
  assert(sum.todayNet === 400, `todayNet ${sum.todayNet}`);
  assert(typeof startOfWeek(new Date()) === "string", "week start");

  console.log("earnings.test.ts: OK");
}

run();
