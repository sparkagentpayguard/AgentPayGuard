/**
 * Anomaly Detection - 异常检测服务
 * 使用孤立森林（Isolation Forest）进行无监督异常检测
 * 
 * 冷启动策略：不需要标注数据，只需要正常交易的特征即可训练
 */
import { FeatureVector } from './data-collector.js';
import { FeatureService } from './features.js';

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyScore: number; // -1到1，越接近-1越异常
  confidence: number; // 0-1，置信度
  reasons?: string[];
}

export class AnomalyDetector {
  private featureService: FeatureService;
  private isTrained: boolean = false;
  private contamination: number = 0.1; // 假设10%是异常
  private threshold: number = -0.5; // 异常阈值
  private normalFeatureStats: {
    mean: number[];
    std: number[];
  } | null = null;

  constructor(featureService: FeatureService) {
    this.featureService = featureService;
  }

  /**
   * 训练异常检测模型（使用正常交易）
   * 冷启动：使用规则引擎标记的"正常"交易训练
   */
  async trainWithNormalTransactions(features: FeatureVector[]): Promise<void> {
    if (features.length < 10) {
      console.warn('[AnomalyDetector] 样本数量不足（需要至少10个），使用默认阈值');
      this.isTrained = false;
      return;
    }

    // 转换为特征数组
    const featureMatrix = features.map(f => this.featureService.featureVectorToArray(f));
    
    // 计算统计信息（均值和标准差）
    const featureCount = featureMatrix[0].length;
    const mean: number[] = [];
    const std: number[] = [];

    for (let i = 0; i < featureCount; i++) {
      const values = featureMatrix.map(row => row[i]);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
      
      mean.push(avg);
      std.push(Math.sqrt(variance) || 1); // 避免除零
    }

    this.normalFeatureStats = { mean, std };
    this.isTrained = true;
    
    console.log(`[AnomalyDetector] 训练完成，样本数: ${features.length}, 特征数: ${featureCount}`);
  }

  /**
   * 检测异常
   */
  async detect(features: FeatureVector): Promise<AnomalyDetectionResult> {
    if (!this.isTrained || !this.normalFeatureStats) {
      // 冷启动阶段：使用简单规则
      return this.fallbackDetection(features);
    }

    // 使用统计方法检测异常（简化版孤立森林）
    const featureArray = this.featureService.featureVectorToArray(features);
    const anomalyScore = this.calculateAnomalyScore(featureArray);
    const isAnomaly = anomalyScore < this.threshold;

    const reasons: string[] = [];
    if (isAnomaly) {
      // 找出异常的特征
      const abnormalFeatures = this.identifyAbnormalFeatures(featureArray);
      reasons.push(...abnormalFeatures);
    }

    return {
      isAnomaly,
      anomalyScore,
      confidence: Math.abs(anomalyScore),
      reasons: reasons.length > 0 ? reasons : undefined
    };
  }

  /**
   * 计算异常分数（基于Z-score的简化方法）
   * 实际生产环境应使用真正的孤立森林算法（需要Python或专门的库）
   */
  private calculateAnomalyScore(featureArray: number[]): number {
    if (!this.normalFeatureStats) return 0;

    const { mean, std } = this.normalFeatureStats;
    let totalDeviation = 0;
    let count = 0;

    for (let i = 0; i < featureArray.length && i < mean.length; i++) {
      const zScore = Math.abs((featureArray[i] - mean[i]) / std[i]);
      totalDeviation += zScore;
      count++;
    }

    const avgDeviation = count > 0 ? totalDeviation / count : 0;
    
    // 转换为-1到1的分数（-1表示最异常）
    // 使用sigmoid函数映射
    const normalizedScore = -1 + 2 / (1 + Math.exp(-avgDeviation));
    
    return normalizedScore;
  }

  /**
   * 识别异常的特征
   */
  private identifyAbnormalFeatures(featureArray: number[]): string[] {
    if (!this.normalFeatureStats) return [];

    const { mean, std } = this.normalFeatureStats;
    const featureNames = [
      'txCount1h', 'txAmount1h', 'avgAmount1h',
      'txCount24h', 'txAmount24h', 'avgAmount24h',
      'txCount7d', 'txAmount7d', 'avgAmount7d',
      'isWeekend', 'hourOfDay', 'dayOfWeek',
      'amountNumber', 'recipientChangeRate', 'purposeDiversity',
      'amountTrend', 'addressTxCount', 'addressTotalAmount',
      'addressAvgAmount', 'addressFirstSeenDays', 'addressRiskScore',
      'addressAssociationCount', 'userTotalTxCount', 'userTotalAmount',
      'userAvgAmount', 'userRejectCount', 'walletBalance', 'spentToday'
    ];

    const reasons: string[] = [];

    for (let i = 0; i < featureArray.length && i < mean.length; i++) {
      const zScore = Math.abs((featureArray[i] - mean[i]) / std[i]);
      if (zScore > 2) { // 超过2个标准差
        const featureName = featureNames[i] || `feature_${i}`;
        reasons.push(`${featureName}异常 (Z-score: ${zScore.toFixed(2)})`);
      }
    }

    return reasons;
  }

  /**
   * 回退检测方法（冷启动阶段）
   */
  private fallbackDetection(features: FeatureVector): AnomalyDetectionResult {
    let score = 0;
    const reasons: string[] = [];

    // 简单规则：大额、新地址、异常时间
    if (features.amountNumber && features.amountNumber > 1000) {
      score -= 0.3;
      reasons.push('大额交易');
    }

    if (features.addressFirstSeenDays !== undefined && features.addressFirstSeenDays < 7) {
      score -= 0.2;
      reasons.push('新收款地址');
    }

    if (features.hourOfDay !== undefined && (features.hourOfDay < 6 || features.hourOfDay > 22)) {
      score -= 0.2;
      reasons.push('异常交易时间');
    }

    if (features.recipientChangeRate !== undefined && features.recipientChangeRate > 0.8) {
      score -= 0.15;
      reasons.push('收款地址变化频繁');
    }

    if (features.userRejectCount !== undefined && features.userRejectCount > 0) {
      score -= 0.1 * Math.min(features.userRejectCount, 5);
      reasons.push('用户有拒绝历史');
    }

    return {
      isAnomaly: score < -0.3,
      anomalyScore: score,
      confidence: 0.5, // 冷启动阶段置信度较低
      reasons: reasons.length > 0 ? reasons : undefined
    };
  }

  /**
   * 获取训练状态
   */
  getTrainingStatus(): { isTrained: boolean; sampleCount?: number } {
    return {
      isTrained: this.isTrained,
      sampleCount: this.normalFeatureStats ? undefined : undefined
    };
  }

  /**
   * 设置异常阈值
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  /**
   * 设置污染率（异常样本比例）
   */
  setContamination(contamination: number): void {
    this.contamination = Math.max(0, Math.min(1, contamination));
  }
}
