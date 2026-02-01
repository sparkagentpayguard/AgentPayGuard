/**
 * ML Service - 机器学习服务管理器
 * 统一管理数据收集、特征工程、异常检测等服务
 */
import { DataCollector, FeatureVector } from './data-collector.js';
import { FeatureService, HistoricalData, RiskContext } from './features.js';
import { AnomalyDetector, AnomalyDetectionResult } from './anomaly-detection.js';
import { PaymentIntent, RiskAssessment } from '../ai-intent.js';
import { PolicyDecision } from '../policy.js';
import { loadEnv } from '../config.js';

export class MLService {
  private dataCollector: DataCollector | null = null;
  private featureService: FeatureService;
  private anomalyDetector: AnomalyDetector;
  private enabled: boolean = false;

  constructor() {
    const env = loadEnv();
    this.enabled = env.ENABLE_ML_FEATURES === true;
    
    this.featureService = new FeatureService();
    this.anomalyDetector = new AnomalyDetector(this.featureService);
    
    if (this.enabled) {
      const storagePath = env.ML_DATA_PATH || './data/training';
      this.dataCollector = new DataCollector(storagePath);
      console.log('[MLService] ML features enabled, data storage:', storagePath);
    } else {
      console.log('[MLService] ML features disabled (set ENABLE_ML_FEATURES=1 to enable)');
    }
  }

  /**
   * 检查ML功能是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 计算特征向量
   */
  async computeFeatures(
    intent: PaymentIntent,
    context: RiskContext,
    historicalData?: HistoricalData
  ): Promise<FeatureVector> {
    return await this.featureService.computeFeatures(intent, context, historicalData);
  }

  /**
   * 检测异常
   */
  async detectAnomaly(features: FeatureVector): Promise<AnomalyDetectionResult> {
    return await this.anomalyDetector.detect(features);
  }

  /**
   * 收集交易数据
   */
  async collectTransaction(
    features: FeatureVector,
    intent: PaymentIntent,
    aiAssessment: RiskAssessment,
    policyDecision: PolicyDecision,
    context?: RiskContext
  ): Promise<void> {
    if (this.dataCollector) {
      await this.dataCollector.collectTransaction(
        features,
        intent,
        aiAssessment,
        policyDecision,
        context
      );
    }
  }

  /**
   * 训练异常检测模型
   */
  async trainAnomalyDetector(): Promise<boolean> {
    if (!this.dataCollector) {
      console.warn('[MLService] Data collector not available');
      return false;
    }

    try {
      const normalTransactions = await this.dataCollector.getNormalTransactions(1000);
      
      if (normalTransactions.length < 10) {
        console.log(`[MLService] Not enough data for training (need at least 10, have ${normalTransactions.length})`);
        return false;
      }

      await this.anomalyDetector.trainWithNormalTransactions(normalTransactions);
      console.log(`[MLService] Anomaly detector trained with ${normalTransactions.length} samples`);
      return true;
    } catch (error) {
      console.error('[MLService] Failed to train anomaly detector:', error);
      return false;
    }
  }

  /**
   * 获取数据统计
   */
  async getDataStats() {
    if (!this.dataCollector) {
      return null;
    }
    return await this.dataCollector.getStats();
  }

  /**
   * 获取异常检测器训练状态
   */
  getAnomalyDetectorStatus() {
    return this.anomalyDetector.getTrainingStatus();
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.dataCollector) {
      await this.dataCollector.cleanup();
    }
  }
}

// 全局单例
let mlServiceInstance: MLService | null = null;

export function getMLService(): MLService {
  if (!mlServiceInstance) {
    mlServiceInstance = new MLService();
  }
  return mlServiceInstance;
}
