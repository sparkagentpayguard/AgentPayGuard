/**
 * Retry mechanism with exponential backoff
 * 
 * 提供重试机制，支持指数退避、最大重试次数、可重试错误判断
 */

export interface RetryOptions {
  maxRetries?: number;      // 最大重试次数（默认：3）
  initialDelayMs?: number;  // 初始延迟（默认：1000ms）
  maxDelayMs?: number;      // 最大延迟（默认：30000ms）
  backoffMultiplier?: number; // 退避倍数（默认：2）
  retryableErrors?: Array<string | RegExp>; // 可重试的错误模式
  onRetry?: (attempt: number, error: Error) => void; // 重试回调
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly attempt: number
  ) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class NonRetryableError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: Error, retryablePatterns?: Array<string | RegExp>): boolean {
  // 如果没有指定模式，默认所有错误都可重试
  if (!retryablePatterns || retryablePatterns.length === 0) {
    return true;
  }

  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();
  const errorString = `${errorName}: ${errorMessage}`;

  // 检查是否匹配可重试模式
  for (const pattern of retryablePatterns) {
    if (typeof pattern === 'string') {
      if (errorString.includes(pattern.toLowerCase())) {
        return true;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(errorString)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 计算延迟时间（指数退避）
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 执行带重试的函数
 * 
 * @param fn 要执行的异步函数
 * @param options 重试选项
 * @returns 函数执行结果
 * @throws RetryableError 如果所有重试都失败
 * @throws NonRetryableError 如果错误不可重试
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    retryableErrors,
    onRetry
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否可重试
      if (!isRetryableError(lastError, retryableErrors)) {
        throw new NonRetryableError(
          `Error is not retryable: ${lastError.message}`,
          lastError
        );
      }

      // 如果是最后一次尝试，不再等待
      if (attempt >= maxRetries) {
        break;
      }

      // 计算延迟时间
      const delay = calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier);

      // 调用重试回调
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      console.warn(
        `[Retry] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );

      // 等待后重试
      await sleep(delay);
    }
  }

  // 所有重试都失败
  throw new RetryableError(
    `Failed after ${maxRetries} attempts: ${lastError?.message}`,
    lastError!,
    maxRetries
  );
}

/**
 * AI API 专用的重试配置
 */
export const AI_API_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    /timeout/i,
    /network/i,
    /econnreset/i,
    /etimedout/i,
    /rate limit/i,
    /429/i,
    /500/i,
    /502/i,
    /503/i,
    /504/i,
  ],
  onRetry: (attempt, error) => {
    console.warn(`[AI API] Retry attempt ${attempt}: ${error.message}`);
  }
};

/**
 * 链上 RPC 专用的重试配置
 */
export const CHAIN_RPC_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 1.5,
  retryableErrors: [
    /timeout/i,
    /network/i,
    /econnreset/i,
    /etimedout/i,
    /rate limit/i,
    /429/i,
    /500/i,
    /502/i,
    /503/i,
    /504/i,
    /network.*error/i,
    /rpc.*error/i,
  ],
  onRetry: (attempt, error) => {
    console.warn(`[Chain RPC] Retry attempt ${attempt}: ${error.message}`);
  }
};
