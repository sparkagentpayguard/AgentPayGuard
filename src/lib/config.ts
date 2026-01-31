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
  // 私钥可为 64 位十六进制，带或不带 0x 均可（ethers 都接受）
  PRIVATE_KEY: z
    .string()
    .optional()
    .refine((v) => v === undefined || v === '' || /^(0x)?[a-fA-F0-9]{64}$/.test(v), 'PRIVATE_KEY must be 64 hex chars, with or without 0x prefix'),

  SETTLEMENT_TOKEN_ADDRESS: z.string().min(1),
  RECIPIENT: z.string().min(1),

  AMOUNT: z.string().default('0.001'),
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
  PROBE_KITE_AA: boolFromEnv(false),

  // AI Agent Integration (optional) - 支持多种免费API提供商
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),      // DeepSeek免费额度
  GEMINI_API_KEY: z.string().optional(),        // Google Gemini免费额度
  CLAUDE_API_KEY: z.string().optional(),        // Claude API
  OLLAMA_URL: z.string().optional(),            // 本地Ollama服务
  LMSTUDIO_URL: z.string().optional(),          // 本地LM Studio服务
  LOCAL_AI_URL: z.string().optional(),          // 通用本地AI服务
  AI_MODEL: z.string().default('gpt-4o-mini'),
  ENABLE_AI_INTENT: boolFromEnv(false)
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Keep output readable for hackathon judges
    const msg = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`环境变量错误：\n${msg}`);
  }
  if (parsed.data.EXECUTE_ONCHAIN || parsed.data.PAYMENT_MODE === 'aa') {
    if (!parsed.data.PRIVATE_KEY) {
      // 允许不填，让后续逻辑报错
    } else if (!/^(0x)?[a-fA-F0-9]{64}$/.test(parsed.data.PRIVATE_KEY)) {
      // 仅当填了内容时才校验格式（64 位十六进制，0x 可选）
    }
  }

  return parsed.data;
}