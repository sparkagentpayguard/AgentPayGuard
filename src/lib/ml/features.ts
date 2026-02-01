/**
 * Feature Engineering - 特征工程服务
 * 从5维基础特征扩展到50+维结构化特征
 */
import { PaymentIntent } from '../ai-intent.js';
import { FeatureVector } from './data-collector.js';

export interface HistoricalData {
  transactions: Array<{
    recipient: string;
    amount: number;
    timestamp: Date;
    purpose?: string;
  }>;
}

export interface RiskContext {
  walletBalance?: number;
  spentToday?: number;
  walletAddress?: string;
}

export class FeatureService {
  private cache: Map<string, { features: FeatureVector; timestamp: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 计算完整特征向量
   */
  async computeFeatures(
    intent: PaymentIntent,
    context: RiskContext,
    historicalData?: HistoricalData
  ): Promise<FeatureVector> {
    const cacheKey = this.getCacheKey(intent, context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.features;
    }

    const features: FeatureVector = {
      // 基础特征（兼容现有）
      walletBalance: context.walletBalance,
      spentToday: context.spentToday,
      amountNumber: intent.amountNumber,
    };

    // 时间特征
    const now = new Date();
    features.isWeekend = now.getDay() === 0 || now.getDay() === 6;
    features.hourOfDay = now.getHours();
    features.dayOfWeek = now.getDay();
    
    // 时间分布特征扩展（新增）
    features.isNightTime = features.hourOfDay >= 22 || features.hourOfDay < 6;
    features.isBusinessHours = features.hourOfDay >= 9 && features.hourOfDay < 18;
    features.hourOfDayNormalized = features.hourOfDay / 24; // 归一化到0-1

    // 历史数据特征
    if (historicalData && historicalData.transactions.length > 0) {
      this.computeTimeWindowFeatures(features, historicalData, now);
      this.computeBehaviorSequenceFeatures(features, historicalData, intent);
      this.computeAddressAssociationFeatures(features, historicalData, intent.recipient, intent, now);
    } else {
      // 无历史数据时的默认值
      this.setDefaultFeatures(features);
    }

    // 用户画像特征（基于历史）
    if (historicalData) {
      this.computeUserProfileFeatures(features, historicalData, context.walletAddress);
      
      // 统计特征（新增）
      this.computeStatisticalFeatures(features, historicalData, intent, context);
    }

    // 缓存结果
    this.cache.set(cacheKey, {
      features,
      timestamp: Date.now()
    });

    return features;
  }

  /**
   * 计算时间窗口特征
   */
  private computeTimeWindowFeatures(
    features: FeatureVector,
    historicalData: HistoricalData,
    now: Date
  ): void {
    const transactions = historicalData.transactions;
    
    // 1小时窗口
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const tx1h = transactions.filter(tx => new Date(tx.timestamp) >= oneHourAgo);
    features.txCount1h = tx1h.length;
    features.txAmount1h = tx1h.reduce((sum, tx) => sum + tx.amount, 0);
    features.avgAmount1h = tx1h.length > 0 ? features.txAmount1h / tx1h.length : 0;

    // 24小时窗口
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const tx24h = transactions.filter(tx => new Date(tx.timestamp) >= oneDayAgo);
    features.txCount24h = tx24h.length;
    features.txAmount24h = tx24h.reduce((sum, tx) => sum + tx.amount, 0);
    features.avgAmount24h = tx24h.length > 0 ? features.txAmount24h / tx24h.length : 0;

    // 7天窗口
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const tx7d = transactions.filter(tx => new Date(tx.timestamp) >= sevenDaysAgo);
    features.txCount7d = tx7d.length;
    features.txAmount7d = tx7d.reduce((sum, tx) => sum + tx.amount, 0);
    features.avgAmount7d = tx7d.length > 0 ? features.txAmount7d / tx7d.length : 0;

    // 30天窗口（新增）
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const tx30d = transactions.filter(tx => new Date(tx.timestamp) >= thirtyDaysAgo);
    features.txCount30d = tx30d.length;
    features.txAmount30d = tx30d.reduce((sum, tx) => sum + tx.amount, 0);
    features.avgAmount30d = tx30d.length > 0 ? features.txAmount30d / tx30d.length : 0;

    // 交易间隔特征（新增）
    if (transactions.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < transactions.length; i++) {
        const prevTime = new Date(transactions[i - 1].timestamp).getTime();
        const currTime = new Date(transactions[i].timestamp).getTime();
        const intervalHours = (currTime - prevTime) / (1000 * 60 * 60);
        intervals.push(intervalHours);
      }
      if (intervals.length > 0) {
        features.avgTxIntervalHours = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        features.minTxIntervalHours = Math.min(...intervals);
        features.maxTxIntervalHours = Math.max(...intervals);
      }
    }
  }

  /**
   * 计算行为序列特征
   */
  private computeBehaviorSequenceFeatures(
    features: FeatureVector,
    historicalData: HistoricalData,
    intent: PaymentIntent
  ): void {
    const transactions = historicalData.transactions;
    const recent10 = transactions.slice(-10);

    // 最近5笔金额序列
    const recentAmounts = recent10.slice(-5).map(tx => tx.amount);
    
    // 金额变化趋势
    if (recentAmounts.length >= 2) {
      const increasing = recentAmounts.every((val, i) => i === 0 || val >= recentAmounts[i - 1]);
      const decreasing = recentAmounts.every((val, i) => i === 0 || val <= recentAmounts[i - 1]);
      
      if (increasing) {
        features.amountTrend = 'increasing';
      } else if (decreasing) {
        features.amountTrend = 'decreasing';
      } else {
        const variance = this.calculateVariance(recentAmounts);
        features.amountTrend = variance > 0.5 ? 'volatile' : 'stable';
      }
    }

    // 金额序列统计特征（新增）
    if (recentAmounts.length > 0) {
      const mean = recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length;
      const variance = this.calculateVariance(recentAmounts);
      const std = Math.sqrt(variance);
      
      features.recentAmountMean = mean;
      features.recentAmountStd = std;
      features.recentAmountMax = Math.max(...recentAmounts);
      features.recentAmountMin = Math.min(...recentAmounts);
      
      // 当前金额相对于历史平均的比例
      if (intent.amountNumber > 0 && mean > 0) {
        features.amountRatioToAvg = intent.amountNumber / mean;
      } else {
        features.amountRatioToAvg = 1.0;
      }
    }

    // 收款地址变化率
    const recipients = recent10.map(tx => tx.recipient);
    const uniqueRecipients = new Set(recipients);
    features.recipientChangeRate = uniqueRecipients.size / Math.max(recipients.length, 1);
    features.recentRecipientCount = uniqueRecipients.size;
    
    // 收款地址重复率（新增）
    const recipientCounts = new Map<string, number>();
    recipients.forEach(addr => {
      recipientCounts.set(addr, (recipientCounts.get(addr) || 0) + 1);
    });
    const repeatCount = Array.from(recipientCounts.values()).filter(count => count > 1).length;
    features.recipientRepeatRate = recipients.length > 0 ? repeatCount / recipients.length : 0;

    // 支付目的多样性
    const purposes = recent10.map(tx => tx.purpose || '').filter(p => p);
    const uniquePurposes = new Set(purposes);
    features.purposeDiversity = uniquePurposes.size;
  }

  /**
   * 计算地址关联特征
   */
  private computeAddressAssociationFeatures(
    features: FeatureVector,
    historicalData: HistoricalData,
    recipient: string,
    intent: PaymentIntent,
    now: Date
  ): void {
    const transactions = historicalData.transactions;
    const recipientTxs = transactions.filter(tx => tx.recipient === recipient);

    features.addressTxCount = recipientTxs.length;
    features.addressTotalAmount = recipientTxs.reduce((sum, tx) => sum + tx.amount, 0);
    features.addressAvgAmount = recipientTxs.length > 0 
      ? features.addressTotalAmount / recipientTxs.length 
      : 0;

    // 首次出现时间
    if (recipientTxs.length > 0) {
      const firstTx = recipientTxs[0];
      const firstSeen = new Date(firstTx.timestamp);
      const daysSince = Math.floor((Date.now() - firstSeen.getTime()) / (24 * 60 * 60 * 1000));
      features.addressFirstSeenDays = daysSince;
    } else {
      features.addressFirstSeenDays = 0; // 新地址
    }

    // 地址风险评分（基于历史，简单实现）
    features.addressRiskScore = this.calculateAddressRiskScore(recipientTxs);
    
    // 地址关联度（关联的其他地址数量）
    const allRecipients = new Set(transactions.map(tx => tx.recipient));
    features.addressAssociationCount = allRecipients.size;
    
    // 相同收款地址频率（新增）
    const tx24h = transactions.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return now.getTime() - txTime <= 24 * 60 * 60 * 1000;
    });
    features.sameRecipientIn24h = tx24h.filter(tx => tx.recipient === intent.recipient).length;
    
    const tx7d = transactions.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      return now.getTime() - txTime <= 7 * 24 * 60 * 60 * 1000;
    });
    features.sameRecipientIn7d = tx7d.filter(tx => tx.recipient === intent.recipient).length;
    
    // 金额偏离度（新增）
    if (transactions.length > 0) {
      const amounts = transactions.map(tx => tx.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const sorted = [...amounts].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      features.amountDeviationFromMean = mean > 0 ? Math.abs(intent.amountNumber - mean) / mean : 0;
      features.amountDeviationFromMedian = median > 0 ? Math.abs(intent.amountNumber - median) / median : 0;
    }
    
    // 序列模式特征（新增）
    if (transactions.length > 0) {
      const recent = transactions.slice(-5);
      let consecutive = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i].recipient === intent.recipient) {
          consecutive++;
        } else {
          break;
        }
      }
      features.consecutiveSameRecipient = consecutive;
      
      // 金额变化率
      if (recent.length > 0 && recent[recent.length - 1].amount > 0) {
        features.amountChangeRate = (intent.amountNumber - recent[recent.length - 1].amount) / recent[recent.length - 1].amount;
      } else {
        features.amountChangeRate = 0;
      }
      
      // 距离上一笔交易的时间
      const lastTxTime = new Date(recent[recent.length - 1].timestamp).getTime();
      features.timeSinceLastTx = (now.getTime() - lastTxTime) / (1000 * 60 * 60); // 小时
    }
  }

  /**
   * 计算用户画像特征
   */
  private computeUserProfileFeatures(
    features: FeatureVector,
    historicalData: HistoricalData,
    walletAddress?: string
  ): void {
    const transactions = historicalData.transactions;

    features.userTotalTxCount = transactions.length;
    features.userTotalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    features.userAvgAmount = transactions.length > 0 
      ? features.userTotalAmount / transactions.length 
      : 0;

    // 用户拒绝次数（需要从外部传入，这里先设为0）
    features.userRejectCount = 0;
  }

  /**
   * 计算统计特征
   */
  private computeStatisticalFeatures(
    features: FeatureVector,
    historicalData: HistoricalData,
    intent: PaymentIntent,
    context: RiskContext
  ): void {
    const transactions = historicalData.transactions;
    
    if (transactions.length > 0) {
      const amounts = transactions.map(tx => tx.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = this.calculateVariance(amounts);
      const std = Math.sqrt(variance);
      
      // 金额变异系数（标准差/均值）
      features.amountCoefficientOfVariation = mean > 0 ? std / mean : 0;
      
      // 日均交易频率
      if (transactions.length > 0) {
        const firstTx = new Date(transactions[0].timestamp);
        const daysSince = Math.max(1, (Date.now() - firstTx.getTime()) / (24 * 60 * 60 * 1000));
        features.txFrequencyPerDay = transactions.length / daysSince;
      }
      
      // 当前金额/钱包余额比例
      if (context.walletBalance && context.walletBalance > 0) {
        features.balanceRatio = intent.amountNumber / context.walletBalance;
      } else {
        features.balanceRatio = 0;
      }
    }
    
    // 链上特征（占位，需要实际查询链上数据）
    features.recipientOnchainTxCount = 0;
    features.recipientOnchainVolume = 0;
    features.recipientContractInteractionCount = 0;
  }

  /**
   * 设置默认特征（无历史数据时）
   */
  private setDefaultFeatures(features: FeatureVector): void {
    features.txCount1h = 0;
    features.txAmount1h = 0;
    features.avgAmount1h = 0;
    features.txCount24h = 0;
    features.txAmount24h = 0;
    features.avgAmount24h = 0;
    features.txCount7d = 0;
    features.txAmount7d = 0;
    features.avgAmount7d = 0;
    features.txCount30d = 0;
    features.txAmount30d = 0;
    features.avgAmount30d = 0;
    features.avgTxIntervalHours = 0;
    features.minTxIntervalHours = 0;
    features.maxTxIntervalHours = 0;
    features.recentAmountMean = 0;
    features.recentAmountStd = 0;
    features.recentAmountMax = 0;
    features.recentAmountMin = 0;
    features.amountRatioToAvg = 1.0;
    features.recentRecipientCount = 0;
    features.recipientRepeatRate = 0;
    features.isNightTime = false;
    features.isBusinessHours = false;
    features.hourOfDayNormalized = 0;
    features.amountCoefficientOfVariation = 0;
    features.txFrequencyPerDay = 0;
    features.balanceRatio = 0;
    features.recipientOnchainTxCount = 0;
    features.recipientOnchainVolume = 0;
    features.recipientContractInteractionCount = 0;
    features.sameRecipientIn24h = 0;
    features.sameRecipientIn7d = 0;
    features.amountDeviationFromMean = 0;
    features.amountDeviationFromMedian = 0;
    features.consecutiveSameRecipient = 0;
    features.amountChangeRate = 0;
    features.timeSinceLastTx = 0;
    features.recipientChangeRate = 1.0; // 新用户，变化率高
    features.purposeDiversity = 1;
    features.amountTrend = 'stable';
    features.addressTxCount = 0;
    features.addressTotalAmount = 0;
    features.addressAvgAmount = 0;
    features.addressFirstSeenDays = 0;
    features.addressRiskScore = 50; // 默认中等风险
    features.addressAssociationCount = 0;
    features.userTotalTxCount = 0;
    features.userTotalAmount = 0;
    features.userAvgAmount = 0;
    features.userRejectCount = 0;
  }

  /**
   * 计算方差
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  /**
   * 计算地址风险评分
   */
  private calculateAddressRiskScore(transactions: Array<{ amount: number; timestamp: Date }>): number {
    if (transactions.length === 0) return 50; // 新地址，中等风险

    // 简单规则：基于交易频率和金额
    const avgAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;
    const riskScore = Math.min(100, Math.max(0, avgAmount / 10)); // 金额越大风险越高

    return riskScore;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(intent: PaymentIntent, context: RiskContext): string {
    return `${intent.recipient}-${intent.amountNumber}-${context.walletAddress || 'unknown'}`;
  }

  /**
   * 特征向量转数组（用于模型输入）
   * 当前维度：50+ 维
   */
  featureVectorToArray(features: FeatureVector): number[] {
    return [
      // 时间窗口特征（12维）
      features.txCount1h || 0,
      features.txAmount1h || 0,
      features.avgAmount1h || 0,
      features.txCount24h || 0,
      features.txAmount24h || 0,
      features.avgAmount24h || 0,
      features.txCount7d || 0,
      features.txAmount7d || 0,
      features.avgAmount7d || 0,
      features.txCount30d || 0,
      features.txAmount30d || 0,
      features.avgAmount30d || 0,
      
      // 交易间隔特征（3维）
      features.avgTxIntervalHours || 0,
      features.minTxIntervalHours || 0,
      features.maxTxIntervalHours || 0,
      
      // 时间分布特征（6维）
      features.isWeekend ? 1 : 0,
      features.hourOfDay || 0,
      features.dayOfWeek || 0,
      features.isNightTime ? 1 : 0,
      features.isBusinessHours ? 1 : 0,
      features.hourOfDayNormalized || 0,
      
      // 行为序列特征（10维）
      features.amountNumber || 0,
      features.recipientChangeRate || 0,
      features.purposeDiversity || 0,
      features.amountTrend === 'increasing' ? 1 : features.amountTrend === 'decreasing' ? -1 : 0,
      features.recentAmountMean || 0,
      features.recentAmountStd || 0,
      features.recentAmountMax || 0,
      features.recentAmountMin || 0,
      features.amountRatioToAvg || 1.0,
      features.recentRecipientCount || 0,
      features.recipientRepeatRate || 0,
      
      // 地址关联特征（7维）
      features.addressTxCount || 0,
      features.addressTotalAmount || 0,
      features.addressAvgAmount || 0,
      features.addressFirstSeenDays || 0,
      features.addressRiskScore || 50,
      features.addressAssociationCount || 0,
      
      // 用户画像特征（4维）
      features.userTotalTxCount || 0,
      features.userTotalAmount || 0,
      features.userAvgAmount || 0,
      features.userRejectCount || 0,
      
      // 统计特征（3维）
      features.amountCoefficientOfVariation || 0,
      features.txFrequencyPerDay || 0,
      features.balanceRatio || 0,
      
      // 链上特征（3维）
      features.recipientOnchainTxCount || 0,
      features.recipientOnchainVolume || 0,
      features.recipientContractInteractionCount || 0,
      
      // 交互特征（6维）
      features.sameRecipientIn24h || 0,
      features.sameRecipientIn7d || 0,
      features.amountDeviationFromMean || 0,
      features.amountDeviationFromMedian || 0,
      features.consecutiveSameRecipient || 0,
      features.amountChangeRate || 0,
      features.timeSinceLastTx || 0,
      
      // 基础特征（2维）
      features.walletBalance || 0,
      features.spentToday || 0,
    ];
  }
}
