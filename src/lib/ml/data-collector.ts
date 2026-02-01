/**
 * Data Collector - 数据收集服务
 * 在生产环境中自动收集交易数据，用于后续模型训练
 * 
 * 冷启动策略：边用边收集，逐步积累训练样本
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PaymentIntent, RiskAssessment } from '../ai-intent.js';
import { PolicyDecision } from '../policy.js';

export interface FeatureVector {
  // 时间窗口特征
  txCount1h?: number;
  txAmount1h?: number;
  avgAmount1h?: number;
  txCount24h?: number;
  txAmount24h?: number;
  avgAmount24h?: number;
  txCount7d?: number;
  txAmount7d?: number;
  avgAmount7d?: number;
  
  // 时间分布特征
  isWeekend?: boolean;
  hourOfDay?: number;
  dayOfWeek?: number;
  
  // 行为序列特征
  amountNumber?: number;
  recipientChangeRate?: number;
  purposeDiversity?: number;
  amountTrend?: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  
  // 地址关联特征
  addressTxCount?: number;
  addressTotalAmount?: number;
  addressAvgAmount?: number;
  addressFirstSeenDays?: number;
  addressRiskScore?: number;
  addressAssociationCount?: number;
  
  // 用户画像特征
  userTotalTxCount?: number;
  userTotalAmount?: number;
  userAvgAmount?: number;
  userRejectCount?: number;
  
  // 链上特征（Web3特有）
  onchainTxCount?: number;
  onchainTotalVolume?: number;
  
  // 基础特征（兼容现有）
  walletBalance?: number;
  spentToday?: number;
}

export interface TransactionRecord {
  id: string;
  timestamp: string;
  features: FeatureVector;
  intent: PaymentIntent;
  aiAssessment: RiskAssessment;
  policyDecision: PolicyDecision;
  context?: {
    walletBalance?: number;
    spentToday?: number;
  };
  // 自动标注
  autoLabel: 'normal' | 'risk' | 'unknown';
  // 后续人工标注
  manualLabel?: 'normal' | 'risk' | 'fraud' | null;
  // 实际结果（后续更新）
  actualOutcome?: 'approved' | 'rejected' | 'fraud' | null;
}

export class DataCollector {
  private storagePath: string;
  private batchSize: number = 100;
  private batch: TransactionRecord[] = [];
  private batchFlushInterval: NodeJS.Timeout | null = null;

  constructor(storagePath: string = './data/training') {
    this.storagePath = storagePath;
    // 定期刷新批次（每5分钟或达到batchSize时）
    this.startBatchFlushInterval();
  }

  private startBatchFlushInterval() {
    if (this.batchFlushInterval) {
      clearInterval(this.batchFlushInterval);
    }
    this.batchFlushInterval = setInterval(() => {
      if (this.batch.length > 0) {
        this.flushBatch().catch(err => {
          console.error('[DataCollector] Failed to flush batch:', err);
        });
      }
    }, 5 * 60 * 1000); // 5分钟
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 收集单笔交易（每次支付调用）
   */
  async collectTransaction(
    features: FeatureVector,
    intent: PaymentIntent,
    aiAssessment: RiskAssessment,
    policyDecision: PolicyDecision,
    context?: {
      walletBalance?: number;
      spentToday?: number;
    }
  ): Promise<void> {
    const record: TransactionRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      features,
      intent,
      aiAssessment,
      policyDecision,
      context,
      autoLabel: this.autoLabel(policyDecision, aiAssessment),
      manualLabel: null,
      actualOutcome: null
    };

    this.batch.push(record);

    // 批量写入
    if (this.batch.length >= this.batchSize) {
      await this.flushBatch();
    }
  }

  /**
   * 自动标注规则
   */
  private autoLabel(
    policyDecision: PolicyDecision,
    aiAssessment: RiskAssessment
  ): 'normal' | 'risk' | 'unknown' {
    // 被规则引擎拒绝 → 风险
    if (!policyDecision.ok) {
      return 'risk';
    }

    // AI高分风险 → 风险
    if (aiAssessment.score > 80) {
      return 'risk';
    }

    // AI低分 → 正常
    if (aiAssessment.score < 30) {
      return 'normal';
    }

    // 中间分数 → 未知，需要人工标注
    return 'unknown';
  }

  /**
   * 刷新批次到文件
   */
  private async flushBatch(): Promise<void> {
    if (this.batch.length === 0) return;

    const batchToFlush = [...this.batch];
    this.batch = [];

    try {
      await this.appendToFile('transactions.jsonl', batchToFlush);
      console.log(`[DataCollector] Flushed ${batchToFlush.length} records`);
    } catch (error) {
      console.error('[DataCollector] Failed to flush batch:', error);
      // 失败时重新加入批次
      this.batch.unshift(...batchToFlush);
    }
  }

  /**
   * 追加记录到文件
   */
  private async appendToFile(filename: string, records: TransactionRecord[]): Promise<void> {
    const filePath = path.join(this.storagePath, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    await fs.appendFile(filePath, lines, 'utf8');
  }

  /**
   * 读取所有记录
   */
  private async readRecords(filename: string): Promise<TransactionRecord[]> {
    const filePath = path.join(this.storagePath, filename);
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  /**
   * 获取"正常"交易用于训练（规则引擎通过的交易）
   */
  async getNormalTransactions(limit: number = 1000): Promise<FeatureVector[]> {
    const records = await this.readRecords('transactions.jsonl');
    return records
      .filter(r => r.autoLabel === 'normal' || r.manualLabel === 'normal')
      .slice(0, limit)
      .map(r => r.features);
  }

  /**
   * 获取已标注数据（用于训练）
   */
  async getLabeledData(): Promise<{
    normal: FeatureVector[];
    risk: FeatureVector[];
  }> {
    const records = await this.readRecords('transactions.jsonl');

    return {
      normal: records
        .filter(r => r.autoLabel === 'normal' || r.manualLabel === 'normal')
        .map(r => r.features),
      risk: records
        .filter(r => r.autoLabel === 'risk' || r.manualLabel === 'risk' || r.manualLabel === 'fraud')
        .map(r => r.features)
    };
  }

  /**
   * 获取统计信息
   */
  async getStats(): Promise<{
    total: number;
    normal: number;
    risk: number;
    unknown: number;
  }> {
    const records = await this.readRecords('transactions.jsonl');
    
    return {
      total: records.length,
      normal: records.filter(r => r.autoLabel === 'normal' || r.manualLabel === 'normal').length,
      risk: records.filter(r => r.autoLabel === 'risk' || r.manualLabel === 'risk' || r.manualLabel === 'fraud').length,
      unknown: records.filter(r => r.autoLabel === 'unknown' && !r.manualLabel).length
    };
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.batchFlushInterval) {
      clearInterval(this.batchFlushInterval);
      this.batchFlushInterval = null;
    }
    // 刷新剩余批次
    if (this.batch.length > 0) {
      await this.flushBatch();
    }
  }
}
