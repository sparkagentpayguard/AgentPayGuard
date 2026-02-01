/**
 * Performance Metrics & Monitoring
 * 
 * 性能指标收集和监控模块
 * - 记录 API 调用延迟
 * - 跟踪支付成功率
 * - AI 调用性能统计
 * - 策略决策统计
 */

export interface PerformanceMetrics {
  // API 调用统计
  api: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number; // ms
    p50ResponseTime: number; // ms
    p95ResponseTime: number; // ms
    p99ResponseTime: number; // ms
  };
  
  // AI 调用统计
  ai: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageLatency: number; // ms
    cacheHitRate: number; // 0-1
    providerBreakdown: Record<string, {
      calls: number;
      averageLatency: number;
      errors: number;
    }>;
  };
  
  // 支付统计
  payments: {
    totalAttempts: number;
    successfulPayments: number;
    rejectedPayments: number;
    averageProcessingTime: number; // ms
    rejectionReasons: Record<string, number>;
  };
  
  // 风险评估统计
  risk: {
    totalAssessments: number;
    averageScore: number;
    scoreDistribution: {
      low: number;    // 0-33
      medium: number; // 34-66
      high: number;   // 67-100
    };
  };
  
  // 策略决策统计
  policy: {
    totalChecks: number;
    allowed: number;
    rejected: number;
    rejectionReasons: Record<string, number>;
  };
  
  // 系统信息
  system: {
    uptime: number; // seconds
    memoryUsage: NodeJS.MemoryUsage;
    nodeVersion: string;
  };
}

interface TimingData {
  startTime: number;
  endTime?: number;
  duration?: number;
}

class MetricsCollector {
  private startTime: number;
  private apiTimings: number[] = [];
  private aiTimings: Map<string, number[]> = new Map(); // provider -> timings
  private aiCacheHits: number = 0;
  private aiCacheMisses: number = 0;
  private paymentTimings: number[] = [];
  private riskScores: number[] = [];
  
  // 计数器
  private apiRequests: { total: number; success: number; failed: number } = { total: 0, success: 0, failed: 0 };
  private aiCalls: { total: number; success: number; failed: number } = { total: 0, success: 0, failed: 0 };
  private payments: { attempts: number; success: number; rejected: number } = { attempts: 0, success: 0, rejected: 0 };
  private policyDecisions: { total: number; allowed: number; rejected: number } = { total: 0, allowed: 0, rejected: 0 };
  
  // 拒绝原因统计
  private paymentRejectionReasons: Map<string, number> = new Map();
  private policyRejectionReasons: Map<string, number> = new Map();
  
  constructor() {
    this.startTime = Date.now();
  }
  
  /**
   * 记录 API 请求
   */
  recordAPIRequest(success: boolean, duration: number): void {
    this.apiRequests.total++;
    if (success) {
      this.apiRequests.success++;
    } else {
      this.apiRequests.failed++;
    }
    this.apiTimings.push(duration);
    // 保持最近 1000 条记录
    if (this.apiTimings.length > 1000) {
      this.apiTimings.shift();
    }
  }
  
  /**
   * 记录 AI 调用
   */
  recordAICall(provider: string, success: boolean, duration: number, cacheHit: boolean = false): void {
    this.aiCalls.total++;
    if (success) {
      this.aiCalls.success++;
    } else {
      this.aiCalls.failed++;
    }
    
    if (cacheHit) {
      this.aiCacheHits++;
    } else {
      this.aiCacheMisses++;
    }
    
    if (!this.aiTimings.has(provider)) {
      this.aiTimings.set(provider, []);
    }
    this.aiTimings.get(provider)!.push(duration);
    
    // 保持最近 500 条记录
    const timings = this.aiTimings.get(provider)!;
    if (timings.length > 500) {
      timings.shift();
    }
  }
  
  /**
   * 记录支付处理
   */
  recordPayment(success: boolean, duration: number, rejectionReason?: string): void {
    this.payments.attempts++;
    if (success) {
      this.payments.success++;
    } else {
      this.payments.rejected++;
      if (rejectionReason) {
        const count = this.paymentRejectionReasons.get(rejectionReason) || 0;
        this.paymentRejectionReasons.set(rejectionReason, count + 1);
      }
    }
    this.paymentTimings.push(duration);
    if (this.paymentTimings.length > 500) {
      this.paymentTimings.shift();
    }
  }
  
  /**
   * 记录风险评估
   */
  recordRiskAssessment(score: number): void {
    this.riskScores.push(score);
    if (this.riskScores.length > 1000) {
      this.riskScores.shift();
    }
  }
  
  /**
   * 记录策略决策
   */
  recordPolicyDecision(allowed: boolean, rejectionReason?: string): void {
    this.policyDecisions.total++;
    if (allowed) {
      this.policyDecisions.allowed++;
    } else {
      this.policyDecisions.rejected++;
      if (rejectionReason) {
        const count = this.policyRejectionReasons.get(rejectionReason) || 0;
        this.policyRejectionReasons.set(rejectionReason, count + 1);
      }
    }
  }
  
  /**
   * 计算百分位数
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  /**
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics {
    const apiAvg = this.calculateAverage(this.apiTimings);
    const paymentAvg = this.calculateAverage(this.paymentTimings);
    
    // AI 提供商统计
    const providerBreakdown: Record<string, { calls: number; averageLatency: number; errors: number }> = {};
    let totalAILatency = 0;
    let totalAICalls = 0;
    
    for (const [provider, timings] of this.aiTimings.entries()) {
      const avgLatency = this.calculateAverage(timings);
      providerBreakdown[provider] = {
        calls: timings.length,
        averageLatency: avgLatency,
        errors: 0 // TODO: 跟踪每个提供商的错误数
      };
      totalAILatency += avgLatency * timings.length;
      totalAICalls += timings.length;
    }
    
    const aiAvgLatency = totalAICalls > 0 ? totalAILatency / totalAICalls : 0;
    const cacheHitRate = (this.aiCacheHits + this.aiCacheMisses) > 0
      ? this.aiCacheHits / (this.aiCacheHits + this.aiCacheMisses)
      : 0;
    
    // 风险评分分布
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0
    };
    for (const score of this.riskScores) {
      if (score <= 33) riskDistribution.low++;
      else if (score <= 66) riskDistribution.medium++;
      else riskDistribution.high++;
    }
    
    const avgRiskScore = this.calculateAverage(this.riskScores);
    
    return {
      api: {
        totalRequests: this.apiRequests.total,
        successfulRequests: this.apiRequests.success,
        failedRequests: this.apiRequests.failed,
        averageResponseTime: apiAvg,
        p50ResponseTime: this.calculatePercentile(this.apiTimings, 50),
        p95ResponseTime: this.calculatePercentile(this.apiTimings, 95),
        p99ResponseTime: this.calculatePercentile(this.apiTimings, 99),
      },
      ai: {
        totalCalls: this.aiCalls.total,
        successfulCalls: this.aiCalls.success,
        failedCalls: this.aiCalls.failed,
        averageLatency: aiAvgLatency,
        cacheHitRate,
        providerBreakdown,
      },
      payments: {
        totalAttempts: this.payments.attempts,
        successfulPayments: this.payments.success,
        rejectedPayments: this.payments.rejected,
        averageProcessingTime: paymentAvg,
        rejectionReasons: Object.fromEntries(this.paymentRejectionReasons),
      },
      risk: {
        totalAssessments: this.riskScores.length,
        averageScore: avgRiskScore,
        scoreDistribution: riskDistribution,
      },
      policy: {
        totalChecks: this.policyDecisions.total,
        allowed: this.policyDecisions.allowed,
        rejected: this.policyDecisions.rejected,
        rejectionReasons: Object.fromEntries(this.policyRejectionReasons),
      },
      system: {
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }
  
  /**
   * 重置指标（可选，用于测试）
   */
  reset(): void {
    this.apiTimings = [];
    this.aiTimings.clear();
    this.paymentTimings = [];
    this.riskScores = [];
    this.apiRequests = { total: 0, success: 0, failed: 0 };
    this.aiCalls = { total: 0, success: 0, failed: 0 };
    this.payments = { attempts: 0, success: 0, rejected: 0 };
    this.policyDecisions = { total: 0, allowed: 0, rejected: 0 };
    this.paymentRejectionReasons.clear();
    this.policyRejectionReasons.clear();
    this.aiCacheHits = 0;
    this.aiCacheMisses = 0;
    this.startTime = Date.now();
  }
}

// 单例模式
let metricsInstance: MetricsCollector | null = null;

export function getMetrics(): MetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new MetricsCollector();
  }
  return metricsInstance;
}

/**
 * 性能监控装饰器（用于自动记录函数执行时间）
 */
export function trackPerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  category: 'api' | 'ai' | 'payment' | 'policy',
  metadata?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    const startTime = Date.now();
    const metrics = getMetrics();
    let success = false;
    
    try {
      const result = await fn(...args);
      success = true;
      return result;
    } finally {
      const duration = Date.now() - startTime;
      
      switch (category) {
        case 'api':
          metrics.recordAPIRequest(success, duration);
          break;
        case 'ai':
          const provider = metadata?.provider || 'unknown';
          const cacheHit = metadata?.cacheHit || false;
          metrics.recordAICall(provider, success, duration, cacheHit);
          break;
        case 'payment':
          const rejectionReason = metadata?.rejectionReason;
          metrics.recordPayment(success, duration, rejectionReason);
          break;
        case 'policy':
          metrics.recordPolicyDecision(success, metadata?.rejectionReason);
          break;
      }
    }
  }) as T;
}
