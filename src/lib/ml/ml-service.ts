/**
 * ML Service - 机器学习服务管理器
 * 统一管理数据收集、特征工程、异常检测等服务
 */
import { DataCollector, FeatureVector } from './data-collector.js';
import { FeatureService, HistoricalData, RiskContext } from './features.js';
import { AnomalyDetector, AnomalyDetectionResult } from './anomaly-detection.js';
import { XGBoostModel, XGBoostPrediction } from './xgboost-model.js';
import { PaymentIntent, RiskAssessment } from '../ai-intent.js';
import { PolicyDecision } from '../policy.js';
import { loadEnv } from '../config.js';
import { FeatureCacheService } from '../feature-cache.js';

export class MLService {
  private dataCollector: DataCollector | null = null;
  private featureService: FeatureService;
  private anomalyDetector: AnomalyDetector;
  private xgboostModel: XGBoostModel;
  private featureCache: FeatureCacheService;
  private enabled: boolean = false;

  constructor() {
    const env = loadEnv();
    this.enabled = env.ENABLE_ML_FEATURES === true;
    
    this.featureService = new FeatureService();
    this.anomalyDetector = new AnomalyDetector(this.featureService);
    this.xgboostModel = new XGBoostModel(this.featureService, {
      nEstimators: 100,
      maxDepth: 6,
      learningRate: 0.1
    });
    this.featureCache = new FeatureCacheService({
      recipientCacheTTL: 3600,  // 1 小时
      userCacheTTL: 1800,        // 30 分钟
      maxCommonRecipients: 100
    });
    
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
   * 计算特征向量（带缓存）
   */
  async computeFeatures(
    intent: PaymentIntent,
    context: RiskContext,
    historicalData?: HistoricalData
  ): Promise<FeatureVector> {
    // 尝试从缓存获取收款地址特征
    const cachedRecipientFeatures = this.featureCache.getRecipientFeatures(intent.recipient);
    
    // 计算特征
    const features = await this.featureService.computeFeatures(intent, context, historicalData);
    
    // 缓存收款地址特征
    if (intent.recipient && intent.recipient !== 'unknown') {
      this.featureCache.setRecipientFeatures(intent.recipient, features);
    }
    
    return features;
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
   * 使用 XGBoost 模型预测风险
   */
  async predictRiskWithXGBoost(features: FeatureVector): Promise<XGBoostPrediction> {
    return this.xgboostModel.predict(features);
  }

  /**
   * 训练 XGBoost 模型
   */
  async trainXGBoostModel(): Promise<boolean> {
    if (!this.dataCollector) {
      console.warn('[MLService] Data collector not available');
      return false;
    }

    try {
      // 获取训练数据
      const labeledData = await this.dataCollector.getLabeledData();
      const normalTransactions = labeledData.normal.slice(0, 1000);
      const riskTransactions = labeledData.risk.slice(0, 100);
      
      if (normalTransactions.length < 10 || riskTransactions.length < 5) {
        console.log(`[MLService] Not enough data for XGBoost training (need at least 10 normal and 5 risk samples)`);
        return false;
      }

      // 准备训练数据
      const features: FeatureVector[] = [...normalTransactions, ...riskTransactions];
      const labels: number[] = [
        ...normalTransactions.map(() => 0), // 0 = 正常
        ...riskTransactions.map(() => 1)     // 1 = 风险
      ];

      await this.xgboostModel.train(features, labels);
      console.log(`[MLService] XGBoost model trained with ${features.length} samples`);
      return true;
    } catch (error) {
      console.error('[MLService] Failed to train XGBoost model:', error);
      return false;
    }
  }

  /**
   * 获取 XGBoost 模型训练状态
   */
  getXGBoostModelStatus() {
    return this.xgboostModel.getTrainingStatus();
  }

  /**
   * 获取特征缓存统计信息
   */
  getFeatureCacheStats(): {
    recipientCacheSize: number;
    userCacheSize: number;
    commonRecipientsCount: number;
  } {
    return this.featureCache.getStats();
  }

  /**
   * 预计算常用收款地址的特征
   */
  async precomputeCommonRecipients(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.featureCache.precomputeCommonRecipients(async (recipient: string) => {
      const intent: PaymentIntent = {
        recipient,
        amount: '0',
        amountNumber: 0,
        currency: 'USDC',
        purpose: 'precomputation',
        confidence: 0,
        riskLevel: 'low',
        reasoning: '',
        parsedSuccessfully: false
      };
      const context: RiskContext = {};
      return await this.featureService.computeFeatures(intent, context);
    });
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.dataCollector) {
      await this.dataCollector.cleanup();
    }
    this.featureCache.clearCache();
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
