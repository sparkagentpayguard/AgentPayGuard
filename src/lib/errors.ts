/**
 * Error codes and error handling utilities
 * 
 * 统一的错误码定义和错误处理工具
 */

/**
 * 错误码枚举
 */
export enum ErrorCode {
  // AI API 错误
  AI_API_TIMEOUT = 'AI_API_TIMEOUT',
  AI_API_RATE_LIMIT = 'AI_API_RATE_LIMIT',
  AI_API_INVALID_RESPONSE = 'AI_API_INVALID_RESPONSE',
  AI_API_AUTHENTICATION_FAILED = 'AI_API_AUTHENTICATION_FAILED',
  AI_API_QUOTA_EXCEEDED = 'AI_API_QUOTA_EXCEEDED',
  AI_API_SERVICE_UNAVAILABLE = 'AI_API_SERVICE_UNAVAILABLE',
  
  // 链上 RPC 错误
  CHAIN_RPC_ERROR = 'CHAIN_RPC_ERROR',
  CHAIN_RPC_TIMEOUT = 'CHAIN_RPC_TIMEOUT',
  CHAIN_TX_FAILED = 'CHAIN_TX_FAILED',
  CHAIN_TX_REVERTED = 'CHAIN_TX_REVERTED',
  CHAIN_INSUFFICIENT_FUNDS = 'CHAIN_INSUFFICIENT_FUNDS',
  CHAIN_NONCE_TOO_LOW = 'CHAIN_NONCE_TOO_LOW',
  
  // 策略错误
  NOT_IN_ALLOWLIST = 'NOT_IN_ALLOWLIST',
  AMOUNT_EXCEEDS_MAX = 'AMOUNT_EXCEEDS_MAX',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  RECIPIENT_FROZEN = 'RECIPIENT_FROZEN',
  AI_RISK_TOO_HIGH = 'AI_RISK_TOO_HIGH',
  AI_ASSESSMENT_FAILED = 'AI_ASSESSMENT_FAILED',
  
  // 输入验证错误
  INVALID_INPUT = 'INVALID_INPUT',
  INPUT_TOO_LONG = 'INPUT_TOO_LONG',
  PROMPT_INJECTION_DETECTED = 'PROMPT_INJECTION_DETECTED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  
  // 配置错误
  MISSING_PRIVATE_KEY = 'MISSING_PRIVATE_KEY',
  MISSING_RPC_URL = 'MISSING_RPC_URL',
  MISSING_TOKEN_ADDRESS = 'MISSING_TOKEN_ADDRESS',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // 其他错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
}

/**
 * 应用错误基类
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON(): { code: string; message: string; context?: Record<string, any> } {
    return {
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }
}

/**
 * AI API 错误
 */
export class AIAPIError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    public readonly provider?: string,
    public readonly model?: string,
    context?: Record<string, any>
  ) {
    super(code, message, { ...context, provider, model });
    this.name = 'AIAPIError';
  }
}

/**
 * 链上 RPC 错误
 */
export class ChainRPCError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    public readonly rpcUrl?: string,
    public readonly chainId?: number,
    context?: Record<string, any>
  ) {
    super(code, message, { ...context, rpcUrl, chainId });
    this.name = 'ChainRPCError';
  }
}

/**
 * 输入验证错误
 */
export class InputValidationError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    public readonly field?: string,
    public readonly value?: any,
    context?: Record<string, any>
  ) {
    super(code, message, { ...context, field, value });
    this.name = 'InputValidationError';
  }
}

/**
 * 从错误对象提取错误码
 */
export function extractErrorCode(error: unknown): ErrorCode {
  if (error instanceof AppError) {
    return error.code;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // AI API 错误
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCode.AI_API_TIMEOUT;
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorCode.AI_API_RATE_LIMIT;
    }
    if (message.includes('authentication') || message.includes('401') || message.includes('403')) {
      return ErrorCode.AI_API_AUTHENTICATION_FAILED;
    }
    if (message.includes('quota') || message.includes('insufficient')) {
      return ErrorCode.AI_API_QUOTA_EXCEEDED;
    }
    if (message.includes('503') || message.includes('service unavailable')) {
      return ErrorCode.AI_API_SERVICE_UNAVAILABLE;
    }
    
    // 链上错误
    if (message.includes('insufficient funds')) {
      return ErrorCode.CHAIN_INSUFFICIENT_FUNDS;
    }
    if (message.includes('nonce too low')) {
      return ErrorCode.CHAIN_NONCE_TOO_LOW;
    }
    if (message.includes('revert') || message.includes('execution reverted')) {
      return ErrorCode.CHAIN_TX_REVERTED;
    }
  }
  
  return ErrorCode.UNKNOWN_ERROR;
}

/**
 * 创建友好的错误消息
 */
export function createFriendlyErrorMessage(error: unknown): string {
  const code = extractErrorCode(error);
  
  const friendlyMessages: Record<ErrorCode, string> = {
    [ErrorCode.AI_API_TIMEOUT]: 'AI 服务响应超时，请稍后重试',
    [ErrorCode.AI_API_RATE_LIMIT]: 'AI 服务请求过于频繁，请稍后重试',
    [ErrorCode.AI_API_INVALID_RESPONSE]: 'AI 服务返回了无效的响应',
    [ErrorCode.AI_API_AUTHENTICATION_FAILED]: 'AI 服务认证失败，请检查 API 密钥',
    [ErrorCode.AI_API_QUOTA_EXCEEDED]: 'AI 服务配额已用完',
    [ErrorCode.AI_API_SERVICE_UNAVAILABLE]: 'AI 服务暂时不可用，请稍后重试',
    
    [ErrorCode.CHAIN_RPC_ERROR]: '区块链 RPC 调用失败',
    [ErrorCode.CHAIN_RPC_TIMEOUT]: '区块链 RPC 响应超时',
    [ErrorCode.CHAIN_TX_FAILED]: '链上交易失败',
    [ErrorCode.CHAIN_TX_REVERTED]: '链上交易被回滚',
    [ErrorCode.CHAIN_INSUFFICIENT_FUNDS]: '账户余额不足',
    [ErrorCode.CHAIN_NONCE_TOO_LOW]: '交易 nonce 过低',
    
    [ErrorCode.NOT_IN_ALLOWLIST]: '收款地址不在白名单中',
    [ErrorCode.AMOUNT_EXCEEDS_MAX]: '支付金额超过单笔限额',
    [ErrorCode.DAILY_LIMIT_EXCEEDED]: '支付金额超过日限额',
    [ErrorCode.RECIPIENT_FROZEN]: '收款地址已被冻结',
    [ErrorCode.AI_RISK_TOO_HIGH]: 'AI 风险评估分数过高',
    [ErrorCode.AI_ASSESSMENT_FAILED]: 'AI 风险评估失败',
    
    [ErrorCode.INVALID_INPUT]: '输入无效',
    [ErrorCode.INPUT_TOO_LONG]: '输入内容过长',
    [ErrorCode.PROMPT_INJECTION_DETECTED]: '检测到提示注入攻击',
    [ErrorCode.INVALID_ADDRESS]: '无效的地址格式',
    [ErrorCode.INVALID_AMOUNT]: '无效的金额格式',
    
    [ErrorCode.MISSING_PRIVATE_KEY]: '缺少私钥配置',
    [ErrorCode.MISSING_RPC_URL]: '缺少 RPC URL 配置',
    [ErrorCode.MISSING_TOKEN_ADDRESS]: '缺少代币地址配置',
    [ErrorCode.INVALID_CONFIG]: '配置无效',
    
    [ErrorCode.UNKNOWN_ERROR]: '未知错误',
    [ErrorCode.OPERATION_FAILED]: '操作失败',
  };
  
  return friendlyMessages[code] || friendlyMessages[ErrorCode.UNKNOWN_ERROR];
}
