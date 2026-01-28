import fs from 'node:fs/promises';
import path from 'node:path';

type StateFile = {
  // YYYY-MM-DD -> spent (stringified bigint in token units)
  spentByDay: Record<string, string>;
};

function todayKey(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function ensureDirForFile(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readSpentToday(statePath: string, now = new Date()): Promise<bigint> {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw) as StateFile;
    const key = todayKey(now);
    const v = parsed.spentByDay?.[key];
    return v ? BigInt(v) : 0n;
  } catch {
    return 0n;
  }
}

export async function addSpentToday(statePath: string, delta: bigint, now = new Date()): Promise<void> {
  await ensureDirForFile(statePath);
  let state: StateFile = { spentByDay: {} };
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    state = JSON.parse(raw) as StateFile;
    if (!state.spentByDay) state.spentByDay = {};
  } catch {
    // ignore
  }

  const key = todayKey(now);
  const prev = state.spentByDay[key] ? BigInt(state.spentByDay[key]) : 0n;
  state.spentByDay[key] = (prev + delta).toString();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), 'utf8');
}

