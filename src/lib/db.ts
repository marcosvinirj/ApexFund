import { createClient, type Client, type Row } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { hashPassword } from "./hash";
import type {
  EmailTokenType,
  GrowthPlan,
  JournalBias,
  JournalEntry,
  Milestone,
  Operation,
  OperationResult,
  PerformanceStats,
  User,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Client singleton (survives dev HMR via globalThis)                 */
/* ------------------------------------------------------------------ */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "app.db");

const g = globalThis as unknown as {
  __libsql?: Client;
  __libsqlReady?: Promise<void>;
};

function client(): Client {
  if (!g.__libsql) {
    // Production: point DATABASE_URL at a remote libsql/Turso database
    // (e.g. libsql://your-db.turso.io) with DATABASE_AUTH_TOKEN.
    // Dev / no config: fall back to a local SQLite file.
    const url = process.env.DATABASE_URL?.trim();
    if (url) {
      g.__libsql = createClient({
        url,
        authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
      });
    } else {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      g.__libsql = createClient({ url: `file:${DB_FILE.replace(/\\/g, "/")}` });
    }
  }
  return g.__libsql;
}

export function ready(): Promise<void> {
  if (!g.__libsqlReady) g.__libsqlReady = init();
  return g.__libsqlReady;
}

const DEMO_EMAIL = "demo@apexfund.app";
const DEMO_PASSWORD = "demo1234";

async function init() {
  const db = client();
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS email_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used_at TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS growth_plan (
        user_id TEXT PRIMARY KEY,
        initial_capital REAL NOT NULL,
        target_capital REAL NOT NULL,
        monthly_goal REAL NOT NULL DEFAULT 0,
        risk_per_trade REAL NOT NULL,
        risk_reward REAL NOT NULL,
        win_rate REAL NOT NULL,
        trades_per_week REAL NOT NULL,
        trades_per_month REAL NOT NULL,
        start_date TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        pair TEXT NOT NULL,
        direction TEXT NOT NULL,
        result TEXT NOT NULL,
        risk_percent REAL NOT NULL,
        r_multiple REAL NOT NULL,
        pnl REAL NOT NULL,
        balance_after REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        label TEXT NOT NULL,
        value REAL NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        pair TEXT,
        bias TEXT NOT NULL,
        tags TEXT NOT NULL,
        notes TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ops_user ON operations(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ms_user ON milestones(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_journal_user ON journal_entries(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_email_tokens_user ON email_tokens(user_id)`,
    ],
    "write",
  );

  // Migrate existing growth_plan rows that predate the monthly_goal column.
  const planCols = await db.execute("PRAGMA table_info(growth_plan)");
  if (!planCols.rows.some((r) => r.name === "monthly_goal")) {
    await db.execute(
      "ALTER TABLE growth_plan ADD COLUMN monthly_goal REAL NOT NULL DEFAULT 0",
    );
  }

  // Migrate users that predate the email_verified column. Existing accounts
  // are grandfathered in as verified so they aren't suddenly nagged.
  const userCols = await db.execute("PRAGMA table_info(users)");
  if (!userCols.rows.some((r) => r.name === "email_verified")) {
    await db.execute(
      "ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0",
    );
    await db.execute("UPDATE users SET email_verified = 1");
  }

  const userCount = await db.execute("SELECT COUNT(*) c FROM users");
  if (Number(userCount.rows[0].c) === 0) {
    // Seed a ready-to-explore demo account with a real track record.
    const demoId = randomUUID();
    await db.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, 1, ?)`,
      args: [
        demoId,
        DEMO_EMAIL,
        "Trader Demo",
        hashPassword(DEMO_PASSWORD),
        new Date().toISOString(),
      ],
    });
    await seedUserDefaults(db, demoId, true);
  }
}

/* ------------------------------------------------------------------ */
/*  Per-user seeding                                                   */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PAIRS = ["EUR/USD", "GBP/USD", "XAU/USD", "US30", "NAS100", "BTC/USD"];
const DEFAULT_MILESTONES = [1000, 2500, 5000, 10000, 25000, 50000, 100000];

/** Creates a growth plan + default milestones (and optionally a demo history). */
async function seedUserDefaults(
  db: Client,
  userId: string,
  withHistory: boolean,
) {
  const now = new Date();
  const start = withHistory
    ? new Date(now.getTime() - 77 * 86_400_000) // 11 weeks ago
    : now;
  const startISO = start.toISOString().slice(0, 10);

  await db.execute({
    sql: `INSERT INTO growth_plan
      (user_id, initial_capital, target_capital, monthly_goal, risk_per_trade, risk_reward, win_rate, trades_per_week, trades_per_month, start_date, updated_at)
      VALUES (?, 1000, 10000, 200, 1, 3, 50, 5, 20, ?, ?)`,
    args: [userId, startISO, now.toISOString()],
  });

  for (const v of DEFAULT_MILESTONES) {
    await db.execute({
      sql: `INSERT INTO milestones (id, user_id, label, value, is_default) VALUES (?, ?, ?, ?, 1)`,
      args: [randomUUID(), userId, formatMilestoneLabel(v), v],
    });
  }

  if (!withHistory) return;

  const rand = mulberry32(20260707);
  let balance = 1000;
  for (let week = 0; week < 11; week++) {
    const trades = 4 + Math.floor(rand() * 3);
    for (let t = 0; t < trades; t++) {
      const day = new Date(
        start.getTime() + week * 7 * 86_400_000 + t * 86_400_000,
      );
      if (day > now) continue;
      const isWin = rand() < 0.54;
      const isBE = !isWin && rand() < 0.12;
      const result: OperationResult = isWin ? "win" : isBE ? "breakeven" : "loss";
      const rMultiple = isWin ? 2.6 + rand() * 0.9 : isBE ? 0 : -1;
      const balanceBefore = balance;
      const pnl = round2((rMultiple * 1 * balanceBefore) / 100)!;
      balance = round2(balanceBefore + pnl)!;
      await db.execute({
        sql: `INSERT INTO operations
          (id, user_id, date, pair, direction, result, risk_percent, r_multiple, pnl, balance_after, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(),
          userId,
          day.toISOString().slice(0, 10),
          PAIRS[Math.floor(rand() * PAIRS.length)],
          rand() < 0.5 ? "long" : "short",
          result,
          1,
          round2(rMultiple)!,
          pnl,
          balance,
          null,
          day.toISOString(),
        ],
      });
    }
  }
}

function formatMilestoneLabel(v: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

/* ------------------------------------------------------------------ */
/*  Users & sessions                                                   */
/* ------------------------------------------------------------------ */

function toUser(r: Row): User {
  return {
    id: r.id as string,
    email: r.email as string,
    name: r.name as string,
    emailVerified: Number(r.email_verified) === 1,
    createdAt: r.created_at as string,
  };
}

export async function createUser(
  email: string,
  name: string,
  passwordHash: string,
): Promise<User> {
  await ready();
  const id = randomUUID();
  const now = new Date().toISOString();
  await client().execute({
    sql: `INSERT INTO users (id, email, name, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, 0, ?)`,
    args: [id, email.toLowerCase(), name, passwordHash, now],
  });
  await seedUserDefaults(client(), id, false);
  return { id, email: email.toLowerCase(), name, emailVerified: false, createdAt: now };
}

export async function getUserByEmail(
  email: string,
): Promise<(User & { passwordHash: string }) | null> {
  await ready();
  const res = await client().execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email.toLowerCase()],
  });
  if (!res.rows.length) return null;
  return { ...toUser(res.rows[0]), passwordHash: res.rows[0].password_hash as string };
}

/* ------------------------------------------------------------------ */
/*  Email verification & password-reset tokens                         */
/* ------------------------------------------------------------------ */

/**
 * Stores a one-time email token (only its SHA-256 hash is persisted, so a
 * database leak never yields a usable link) and returns the raw token to
 * embed in the email URL.
 */
export async function createEmailToken(
  userId: string,
  type: EmailTokenType,
  rawToken: string,
  ttlMs: number,
): Promise<void> {
  await ready();
  const now = new Date();
  // Invalidate any outstanding tokens of the same type for this user.
  await client().execute({
    sql: "DELETE FROM email_tokens WHERE user_id = ? AND type = ?",
    args: [userId, type],
  });
  await client().execute({
    sql: `INSERT INTO email_tokens (token_hash, user_id, type, expires_at, used_at, created_at)
          VALUES (?, ?, ?, ?, NULL, ?)`,
    args: [
      sha256(rawToken),
      userId,
      type,
      new Date(now.getTime() + ttlMs).toISOString(),
      now.toISOString(),
    ],
  });
}

/** Validates + consumes a token, returning the owning user id, or null. */
export async function consumeEmailToken(
  rawToken: string,
  type: EmailTokenType,
): Promise<string | null> {
  await ready();
  const hash = sha256(rawToken);
  const res = await client().execute({
    sql: "SELECT * FROM email_tokens WHERE token_hash = ? AND type = ?",
    args: [hash, type],
  });
  const row = res.rows[0];
  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at as string).getTime() < Date.now()) return null;
  await client().execute({
    sql: "UPDATE email_tokens SET used_at = ? WHERE token_hash = ?",
    args: [new Date().toISOString(), hash],
  });
  return row.user_id as string;
}

export async function markEmailVerified(userId: string): Promise<void> {
  await ready();
  await client().execute({
    sql: "UPDATE users SET email_verified = 1 WHERE id = ?",
    args: [userId],
  });
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await ready();
  await client().execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [passwordHash, userId],
  });
}

/** Revokes every session for a user (used after a password reset). */
export async function deleteUserSessions(userId: string): Promise<void> {
  await ready();
  await client().execute({
    sql: "DELETE FROM sessions WHERE user_id = ?",
    args: [userId],
  });
}

export async function getUserById(id: string): Promise<User | null> {
  await ready();
  const res = await client().execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });
  return res.rows.length ? toUser(res.rows[0]) : null;
}

export async function createSession(
  token: string,
  userId: string,
  expiresAt: string,
): Promise<void> {
  await ready();
  await client().execute({
    sql: `INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
    args: [token, userId, expiresAt, new Date().toISOString()],
  });
}

export async function getSessionUser(token: string): Promise<User | null> {
  await ready();
  const res = await client().execute({
    sql: `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ? AND s.expires_at > ?`,
    args: [token, new Date().toISOString()],
  });
  return res.rows.length ? toUser(res.rows[0]) : null;
}

export async function deleteSession(token: string): Promise<void> {
  await ready();
  await client().execute({ sql: "DELETE FROM sessions WHERE id = ?", args: [token] });
}

/* ------------------------------------------------------------------ */
/*  Row mappers                                                        */
/* ------------------------------------------------------------------ */

function toOperation(r: Row): Operation {
  return {
    id: r.id as string,
    date: r.date as string,
    pair: r.pair as string,
    direction: r.direction as "long" | "short",
    result: r.result as OperationResult,
    riskPercent: Number(r.risk_percent),
    rMultiple: Number(r.r_multiple),
    pnl: Number(r.pnl),
    balanceAfter: Number(r.balance_after),
    notes: (r.notes as string | null) ?? undefined,
    createdAt: r.created_at as string,
  };
}

function toPlan(r: Row): GrowthPlan {
  return {
    id: r.user_id as string,
    initialCapital: Number(r.initial_capital),
    targetCapital: Number(r.target_capital),
    monthlyGoal: Number(r.monthly_goal),
    riskPerTrade: Number(r.risk_per_trade),
    riskReward: Number(r.risk_reward),
    winRate: Number(r.win_rate),
    tradesPerWeek: Number(r.trades_per_week),
    tradesPerMonth: Number(r.trades_per_month),
    startDate: r.start_date as string,
    updatedAt: r.updated_at as string,
  };
}

/* ------------------------------------------------------------------ */
/*  Per-user queries                                                   */
/* ------------------------------------------------------------------ */

export async function getPlan(userId: string): Promise<GrowthPlan> {
  await ready();
  const res = await client().execute({
    sql: "SELECT * FROM growth_plan WHERE user_id = ?",
    args: [userId],
  });
  return toPlan(res.rows[0]);
}

export async function updatePlan(
  userId: string,
  patch: Partial<Omit<GrowthPlan, "id" | "updatedAt">>,
): Promise<GrowthPlan> {
  await ready();
  const current = await getPlan(userId);
  const next = { ...current, ...patch };
  await client().execute({
    sql: `UPDATE growth_plan SET
      initial_capital = ?, target_capital = ?, monthly_goal = ?, risk_per_trade = ?, risk_reward = ?,
      win_rate = ?, trades_per_week = ?, trades_per_month = ?, start_date = ?, updated_at = ?
      WHERE user_id = ?`,
    args: [
      next.initialCapital,
      next.targetCapital,
      next.monthlyGoal,
      next.riskPerTrade,
      next.riskReward,
      next.winRate,
      next.tradesPerWeek,
      next.tradesPerMonth,
      next.startDate,
      new Date().toISOString(),
      userId,
    ],
  });
  return getPlan(userId);
}

export async function listOperations(userId: string): Promise<Operation[]> {
  await ready();
  const res = await client().execute({
    sql: "SELECT * FROM operations WHERE user_id = ? ORDER BY date ASC, created_at ASC",
    args: [userId],
  });
  return res.rows.map(toOperation);
}

export interface NewOperationInput {
  date?: string;
  pair: string;
  direction: "long" | "short";
  result: OperationResult;
  riskPercent: number;
  rMultiple: number;
  notes?: string;
}

export async function createOperation(
  userId: string,
  input: NewOperationInput,
): Promise<Operation> {
  await ready();
  const ops = await listOperations(userId);
  const plan = await getPlan(userId);
  const lastBalance = ops.length
    ? ops[ops.length - 1].balanceAfter
    : plan.initialCapital;

  const pnl = round2((input.rMultiple * input.riskPercent * lastBalance) / 100)!;
  const balanceAfter = round2(lastBalance + pnl)!;
  const now = new Date();
  const op: Operation = {
    id: randomUUID(),
    date: input.date ?? now.toISOString().slice(0, 10),
    pair: input.pair,
    direction: input.direction,
    result: input.result,
    riskPercent: input.riskPercent,
    rMultiple: input.rMultiple,
    pnl,
    balanceAfter,
    notes: input.notes,
    createdAt: now.toISOString(),
  };
  await client().execute({
    sql: `INSERT INTO operations
      (id, user_id, date, pair, direction, result, risk_percent, r_multiple, pnl, balance_after, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      op.id,
      userId,
      op.date,
      op.pair,
      op.direction,
      op.result,
      op.riskPercent,
      op.rMultiple,
      op.pnl,
      op.balanceAfter,
      op.notes ?? null,
      op.createdAt,
    ],
  });
  return op;
}

export async function deleteOperation(userId: string, id: string): Promise<void> {
  await ready();
  await client().execute({
    sql: "DELETE FROM operations WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

export interface UpdateOperationInput {
  date: string;
  pair: string;
  direction: "long" | "short";
  result: OperationResult;
  riskPercent: number;
  rMultiple: number;
  notes?: string;
}

/**
 * Edit an existing operation. The editable fields are written first, then the
 * whole balance chain is re-derived so pnl / balanceAfter stay consistent
 * (including when a date change reorders the operation).
 */
export async function updateOperation(
  userId: string,
  id: string,
  input: UpdateOperationInput,
): Promise<Operation | null> {
  await ready();
  const res = await client().execute({
    sql: `UPDATE operations SET
      date = ?, pair = ?, direction = ?, result = ?, risk_percent = ?, r_multiple = ?, notes = ?
      WHERE id = ? AND user_id = ?`,
    args: [
      input.date,
      input.pair,
      input.direction,
      input.result,
      input.riskPercent,
      input.rMultiple,
      input.notes ?? null,
      id,
      userId,
    ],
  });
  if (!res.rowsAffected) return null;
  await recomputeBalances(userId);
  const ops = await listOperations(userId);
  return ops.find((o) => o.id === id) ?? null;
}

/**
 * Recompute pnl + balanceAfter for every operation in chronological order,
 * compounding from the plan's initial capital. Only rows that actually change
 * are written back.
 */
async function recomputeBalances(userId: string): Promise<void> {
  const [ops, plan] = await Promise.all([
    listOperations(userId),
    getPlan(userId),
  ]);
  const updates: { sql: string; args: (string | number)[] }[] = [];
  let balance = plan.initialCapital;
  for (const op of ops) {
    const pnl = round2((op.rMultiple * op.riskPercent * balance) / 100)!;
    const balanceAfter = round2(balance + pnl)!;
    if (pnl !== op.pnl || balanceAfter !== op.balanceAfter) {
      updates.push({
        sql: "UPDATE operations SET pnl = ?, balance_after = ? WHERE id = ?",
        args: [pnl, balanceAfter, op.id],
      });
    }
    balance = balanceAfter;
  }
  if (updates.length) await client().batch(updates, "write");
}

export async function listMilestones(userId: string): Promise<Milestone[]> {
  await ready();
  const res = await client().execute({
    sql: "SELECT * FROM milestones WHERE user_id = ? ORDER BY value ASC",
    args: [userId],
  });
  return res.rows.map((r) => ({
    id: r.id as string,
    label: r.label as string,
    value: Number(r.value),
    isDefault: Number(r.is_default) === 1,
  }));
}

export async function createMilestone(
  userId: string,
  label: string,
  value: number,
): Promise<Milestone> {
  await ready();
  const m: Milestone = { id: randomUUID(), label, value, isDefault: false };
  await client().execute({
    sql: `INSERT INTO milestones (id, user_id, label, value, is_default) VALUES (?, ?, ?, ?, 0)`,
    args: [m.id, userId, m.label, m.value],
  });
  return m;
}

export async function deleteMilestone(userId: string, id: string): Promise<void> {
  await ready();
  await client().execute({
    sql: "DELETE FROM milestones WHERE id = ? AND user_id = ? AND is_default = 0",
    args: [id, userId],
  });
}

export async function computeStats(userId: string): Promise<PerformanceStats> {
  const [ops, plan] = await Promise.all([
    listOperations(userId),
    getPlan(userId),
  ]);
  const currentCapital = ops.length
    ? ops[ops.length - 1].balanceAfter
    : plan.initialCapital;

  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const within = (iso: string, days: number) =>
    now - new Date(iso).getTime() <= days * 86_400_000;

  let wins = 0,
    losses = 0,
    grossProfit = 0,
    grossLoss = 0,
    dailyPnl = 0,
    weeklyPnl = 0,
    monthlyPnl = 0,
    best = 0,
    worst = 0,
    sumWin = 0,
    sumLoss = 0;

  for (const op of ops) {
    if (op.result === "win") wins++;
    if (op.result === "loss") losses++;
    if (op.pnl > 0) {
      grossProfit += op.pnl;
      sumWin += op.pnl;
    }
    if (op.pnl < 0) {
      grossLoss += Math.abs(op.pnl);
      sumLoss += op.pnl;
    }
    if (op.date === today) dailyPnl += op.pnl;
    if (within(op.date, 7)) weeklyPnl += op.pnl;
    if (within(op.date, 30)) monthlyPnl += op.pnl;
    best = Math.max(best, op.pnl);
    worst = Math.min(worst, op.pnl);
  }

  const decided = wins + losses;
  const totalPnl = currentCapital - plan.initialCapital;
  const winCount = ops.filter((o) => o.pnl > 0).length;
  const lossCount = ops.filter((o) => o.pnl < 0).length;

  return {
    initialCapital: plan.initialCapital,
    currentCapital,
    totalPnl,
    totalReturnPct: plan.initialCapital
      ? (totalPnl / plan.initialCapital) * 100
      : 0,
    dailyPnl,
    weeklyPnl,
    monthlyPnl,
    winRate: decided ? (wins / decided) * 100 : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0,
    totalTrades: ops.length,
    wins,
    losses,
    avgWin: winCount ? sumWin / winCount : 0,
    avgLoss: lossCount ? sumLoss / lossCount : 0,
    bestTrade: best,
    worstTrade: worst,
  };
}

/* ------------------------------------------------------------------ */
/*  Journal (Diário SMC)                                               */
/* ------------------------------------------------------------------ */

function toJournal(r: Row): JournalEntry {
  let tags: string[] = [];
  try {
    tags = JSON.parse((r.tags as string) || "[]");
  } catch {
    tags = [];
  }
  return {
    id: r.id as string,
    date: r.date as string,
    title: r.title as string,
    pair: (r.pair as string | null) ?? undefined,
    bias: r.bias as JournalBias,
    tags,
    notes: r.notes as string,
    rating: Number(r.rating),
    createdAt: r.created_at as string,
  };
}

export interface JournalInput {
  date?: string;
  title: string;
  pair?: string;
  bias: JournalBias;
  tags: string[];
  notes: string;
  rating: number;
}

export async function listJournal(userId: string): Promise<JournalEntry[]> {
  await ready();
  const res = await client().execute({
    sql: "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC, created_at DESC",
    args: [userId],
  });
  return res.rows.map(toJournal);
}

export async function createJournal(
  userId: string,
  input: JournalInput,
): Promise<JournalEntry> {
  await ready();
  const now = new Date();
  const entry: JournalEntry = {
    id: randomUUID(),
    date: input.date ?? now.toISOString().slice(0, 10),
    title: input.title,
    pair: input.pair,
    bias: input.bias,
    tags: input.tags,
    notes: input.notes,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    createdAt: now.toISOString(),
  };
  await client().execute({
    sql: `INSERT INTO journal_entries
      (id, user_id, date, title, pair, bias, tags, notes, rating, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.id,
      userId,
      entry.date,
      entry.title,
      entry.pair ?? null,
      entry.bias,
      JSON.stringify(entry.tags),
      entry.notes,
      entry.rating,
      entry.createdAt,
    ],
  });
  return entry;
}

export async function updateJournal(
  userId: string,
  id: string,
  input: JournalInput,
): Promise<void> {
  await ready();
  await client().execute({
    sql: `UPDATE journal_entries SET date = ?, title = ?, pair = ?, bias = ?, tags = ?, notes = ?, rating = ?
          WHERE id = ? AND user_id = ?`,
    args: [
      input.date ?? new Date().toISOString().slice(0, 10),
      input.title,
      input.pair ?? null,
      input.bias,
      JSON.stringify(input.tags),
      input.notes,
      Math.max(1, Math.min(5, Math.round(input.rating))),
      id,
      userId,
    ],
  });
}

export async function deleteJournal(userId: string, id: string): Promise<void> {
  await ready();
  await client().execute({
    sql: "DELETE FROM journal_entries WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

/* ------------------------------------------------------------------ */
/*  Account management                                                 */
/* ------------------------------------------------------------------ */

export async function updateUserName(
  userId: string,
  name: string,
): Promise<User | null> {
  await ready();
  await client().execute({
    sql: "UPDATE users SET name = ? WHERE id = ?",
    args: [name, userId],
  });
  return getUserById(userId);
}

/** Wipes the user's trading data and re-seeds a clean starter account. */
export async function resetUserData(userId: string): Promise<void> {
  await ready();
  const db = client();
  await db.batch(
    [
      { sql: "DELETE FROM operations WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM milestones WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM journal_entries WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM growth_plan WHERE user_id = ?", args: [userId] },
    ],
    "write",
  );
  await seedUserDefaults(db, userId, false);
}

export async function deleteUser(userId: string): Promise<void> {
  await ready();
  await client().batch(
    [
      { sql: "DELETE FROM operations WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM milestones WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM journal_entries WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM growth_plan WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM sessions WHERE user_id = ?", args: [userId] },
      { sql: "DELETE FROM users WHERE id = ?", args: [userId] },
    ],
    "write",
  );
}

function round2(v: number | null): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  return Math.round(v * 100) / 100;
}

function sha256(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}
