/**
 * Prompt injection detection and input sanitization
 * 
 * 提示注入检测和输入清理
 */

import { InputValidationError, ErrorCode } from './errors.js';

/**
 * 提示注入攻击模式
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; description: string; severity: 'high' | 'medium' | 'low' }> = [
  // 高严重性：直接覆盖系统提示
  {
    pattern: /ignore\s+(previous|all|above)\s+(instructions?|prompts?|rules?)/i,
    description: 'Ignore previous instructions',
    severity: 'high'
  },
  {
    pattern: /forget\s+(previous|all|above)\s+(instructions?|prompts?|rules?)/i,
    description: 'Forget previous instructions',
    severity: 'high'
  },
  {
    pattern: /system\s*:\s*you\s+are/i,
    description: 'System role injection',
    severity: 'high'
  },
  {
    pattern: /<\|im_start\|>/i,
    description: 'ChatML format injection',
    severity: 'high'
  },
  {
    pattern: /<\|im_end\|>/i,
    description: 'ChatML format injection',
    severity: 'high'
  },
  {
    pattern: /\[INST\]/i,
    description: 'Llama format injection',
    severity: 'high'
  },
  {
    pattern: /\[\/INST\]/i,
    description: 'Llama format injection',
    severity: 'high'
  },
  
  // 中严重性：尝试修改行为
  {
    pattern: /you\s+must\s+(always|never|only)/i,
    description: 'Behavior modification attempt',
    severity: 'medium'
  },
  {
    pattern: /override\s+(the\s+)?(system|previous|original)/i,
    description: 'Override attempt',
    severity: 'medium'
  },
  {
    pattern: /disregard\s+(the\s+)?(system|previous|original)/i,
    description: 'Disregard instruction',
    severity: 'medium'
  },
  
  // 低严重性：可疑模式
  {
    pattern: /(execute|run|eval)\s+(code|command|script)/i,
    description: 'Code execution attempt',
    severity: 'low'
  },
  {
    pattern: /(reveal|show|output)\s+(your|the)\s+(prompt|system|instructions)/i,
    description: 'Prompt extraction attempt',
    severity: 'low'
  },
];

/**
 * 检测结果
 */
export interface InjectionDetectionResult {
  detected: boolean;
  severity: 'high' | 'medium' | 'low' | null;
  patterns: Array<{ pattern: string; description: string; severity: string }>;
  sanitized: string;
}

/**
 * 检测提示注入攻击
 */
export function detectPromptInjection(input: string): InjectionDetectionResult {
  const detectedPatterns: Array<{ pattern: string; description: string; severity: string }> = [];
  let maxSeverity: 'high' | 'medium' | 'low' | null = null;
  
  for (const { pattern, description, severity } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push({ pattern: pattern.source, description, severity });
      
      // 更新最高严重性
      if (maxSeverity === null) {
        maxSeverity = severity;
      } else if (
        (severity === 'high' && maxSeverity !== 'high') ||
        (severity === 'medium' && maxSeverity === 'low')
      ) {
        maxSeverity = severity;
      }
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    severity: maxSeverity,
    patterns: detectedPatterns,
    sanitized: sanitizeInput(input, detectedPatterns.length > 0)
  };
}

/**
 * 清理输入，移除可疑模式
 */
function sanitizeInput(input: string, hasInjection: boolean): string {
  if (!hasInjection) {
    return input;
  }
  
  let sanitized = input;
  
  // 移除高严重性模式
  for (const { pattern } of INJECTION_PATTERNS.filter(p => p.severity === 'high')) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // 移除中严重性模式
  for (const { pattern } of INJECTION_PATTERNS.filter(p => p.severity === 'medium')) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // 清理多余空白
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

/**
 * 验证输入长度
 */
export function validateInputLength(input: string, maxLength: number = 1000): void {
  if (input.length > maxLength) {
    throw new InputValidationError(
      ErrorCode.INPUT_TOO_LONG,
      `Input too long: ${input.length} characters (max: ${maxLength})`,
      'input',
      input.length
    );
  }
}

/**
 * 验证输入格式
 */
export function validateInputFormat(input: string): void {
  if (!input || typeof input !== 'string') {
    throw new InputValidationError(
      ErrorCode.INVALID_INPUT,
      'Input must be a non-empty string',
      'input',
      input
    );
  }
  
  if (input.trim().length === 0) {
    throw new InputValidationError(
      ErrorCode.INVALID_INPUT,
      'Input cannot be empty',
      'input',
      input
    );
  }
}

/**
 * 验证并清理输入（完整流程）
 */
export function validateAndSanitizeInput(
  input: string,
  options: {
    maxLength?: number;
    allowInjection?: boolean; // 是否允许注入（仅记录警告）
  } = {}
): string {
  const { maxLength = 1000, allowInjection = false } = options;
  
  // 1. 验证格式
  validateInputFormat(input);
  
  // 2. 验证长度
  validateInputLength(input, maxLength);
  
  // 3. 检测注入
  const detection = detectPromptInjection(input);
  
  if (detection.detected) {
    if (allowInjection) {
      console.warn(
        `[PromptInjection] Detected ${detection.severity} severity injection:`,
        detection.patterns.map(p => p.description).join(', ')
      );
      return detection.sanitized;
    } else {
      throw new InputValidationError(
        ErrorCode.PROMPT_INJECTION_DETECTED,
        `Prompt injection detected: ${detection.patterns.map(p => p.description).join(', ')}`,
        'input',
        input,
        {
          severity: detection.severity,
          patterns: detection.patterns
        }
      );
    }
  }
  
  return detection.sanitized;
}
