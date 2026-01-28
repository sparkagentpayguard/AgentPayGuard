import 'dotenv/config';
import { z } from 'zod';

function boolFromEnv(defaultValue: boolean) {
  return z.string().optional().transform((v) => {
    if (v === undefined) return defaultValue;
    return v === '1' || v.toLowerCase() === 'true';
  });
}

export const EnvSchema = z.object({
  RPC_URL: z.string().default('https://rpc-testnet.gokite.ai/'),
  CHAIN_ID: z.coerce.number().int().positive().default(2368),

  // For demos we use an EOA key to sign and/or fund operations.
  PRIVATE_KEY: z
    .string()
    .optional()
    .refine((v) => v === undefined || (v.startsWith('0x') && v.length >= 66), 'PRIVATE_KEY must be a 0x-prefixed hex key'),

  SETTLEMENT_TOKEN_ADDRESS: z.string().min(1),
  RECIPIENT: z.string().min(1),

  AMOUNT: z.string().default('0.01'),
  TOKEN_DECIMALS: z.coerce.number().int().min(0).max(255).optional(),

  // Policy (human-readable units, will be parsed to token units)
  ALLOWLIST: z.string().optional().default(''),
  MAX_AMOUNT: z.string().optional(),
  DAILY_LIMIT: z.string().optional(),

  // Safety
  EXECUTE_ONCHAIN: boolFromEnv(false),

  // Local state
  STATE_PATH: z.string().default('.agentpayguard/state.json'),

  // Optional AA path
  PAYMENT_MODE: z.enum(['eoa', 'aa']).default('eoa'),
  BUNDLER_URL: z.string().optional(),
  PAYMASTER_ADDRESS: z.string().optional(),

  // Debug
  PROBE_KITE_AA: boolFromEnv(false)
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Keep output readable for hackathon judges
    const msg = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`环境变量错误：\n${msg}`);
  }
  return parsed.data;
}

